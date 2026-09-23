import cloudinary from "cloudinary";
import jwt from "jsonwebtoken";
import FacebookAccount from "../models/facebookAccount.js";
import FacebookPage from "../models/facebookPage.js";
import FacebookPost from "../models/facebookPost.js";
import { encryptToken, decryptToken } from "../services/tokenCryptoService.js";
import {
  buildFacebookConnectUrl,
  exchangeCodeForShortToken,
  exchangeForLongLivedToken,
  fetchAdminPages,
  refreshLongLivedToken
} from "../services/facebookService.js";
import { enqueueFacebookPost } from "../queues/facebookPostQueue.js";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

function assertFacebookEnv(res) {
  const required = ["FB_APP_ID", "FB_APP_SECRET", "FB_REDIRECT_URI"];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    res.status(500).json({ message: `Missing env: ${missing.join(", ")}` });
    return false;
  }
  return true;
}

export async function getFacebookConnectUrl(req, res) {
  if (!assertFacebookEnv(res)) return;
  const state = jwt.sign(
    {
      userId: req.user.id
    },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
  return res.json({ url: buildFacebookConnectUrl(state) });
}

export async function facebookCallback(req, res) {
  if (!assertFacebookEnv(res)) return;
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).json({ message: "Missing code/state" });
  }

  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    const shortToken = await exchangeCodeForShortToken(code);
    const longToken = await exchangeForLongLivedToken(shortToken.access_token);
    const expiry = new Date(Date.now() + (longToken.expires_in || 60 * 24 * 60 * 60) * 1000);

    await FacebookAccount.findOneAndUpdate(
      { userId: decoded.userId },
      {
        userId: decoded.userId,
        accessToken: encryptToken(longToken.access_token),
        tokenExpiry: expiry
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard?facebook=connected`);
  } catch (error) {
    return res.status(500).json({ message: "Facebook callback failed", error: error.message });
  }
}

export async function listFacebookPages(req, res) {
  try {
    const account = await FacebookAccount.findOne({ userId: req.user.id });
    if (!account) {
      return res.status(400).json({ message: "Facebook account not connected" });
    }

    let userToken = decryptToken(account.accessToken);

    if (new Date(account.tokenExpiry).getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      const refreshed = await refreshLongLivedToken(userToken);
      userToken = refreshed.access_token;
      account.accessToken = encryptToken(userToken);
      account.tokenExpiry = new Date(Date.now() + (refreshed.expires_in || 60 * 24 * 60 * 60) * 1000);
      await account.save();
    }

    const pages = await fetchAdminPages(userToken);
    return res.json({
      pages: pages.map((p) => ({
        id: p.id,
        name: p.name,
        perms: p.perms || [],
        tasks: p.tasks || []
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch pages", error: error.message });
  }
}

export async function saveSelectedPages(req, res) {
  const { pages } = req.body;
  if (!Array.isArray(pages) || pages.length === 0) {
    return res.status(400).json({ message: "pages[] is required" });
  }

  try {
    const account = await FacebookAccount.findOne({ userId: req.user.id });
    if (!account) {
      return res.status(400).json({ message: "Facebook account not connected" });
    }

    const availablePages = await fetchAdminPages(decryptToken(account.accessToken));
    const selected = availablePages.filter((p) => pages.includes(p.id));

    await FacebookPage.deleteMany({ userId: req.user.id });
    if (selected.length) {
      await FacebookPage.insertMany(
        selected.map((page) => ({
          userId: req.user.id,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: encryptToken(page.access_token)
        }))
      );
    }

    return res.json({ connectedPages: selected.length });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save pages", error: error.message });
  }
}

export async function listSelectedPages(req, res) {
  try {
    const pages = await FacebookPage.find({ userId: req.user.id })
      .select("_id pageId pageName")
      .sort({ createdAt: -1 });
    return res.json({ pages });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch selected pages", error: error.message });
  }
}

export async function createScheduledPost(req, res) {
  try {
    const { pageId, content, scheduledAt, linkUrl } = req.body;
    if (!pageId || !content || !scheduledAt) {
      return res.status(400).json({ message: "pageId, content, scheduledAt are required" });
    }

    const parsedDate = new Date(scheduledAt);
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid scheduledAt" });
    }

    const page = await FacebookPage.findOne({
      userId: req.user.id,
      $or: [{ _id: pageId }, { pageId }]
    });
    if (!page) {
      return res.status(404).json({ message: "Selected page not found" });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = await new Promise((resolve, reject) => {
        const stream = cloudinary.v2.uploader.upload_stream(
          { folder: "fb-scheduler", resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            return resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });
    }

    const post = await FacebookPost.create({
      userId: req.user.id,
      pageRef: page._id,
      content,
      linkUrl: linkUrl || null,
      imageUrl,
      scheduledAt: parsedDate,
      status: "pending"
    });

    await enqueueFacebookPost(post);
    return res.status(201).json({ message: "Post scheduled", post });
  } catch (error) {
    return res.status(500).json({ message: "Failed to schedule post", error: error.message });
  }
}

export async function listScheduledPosts(req, res) {
  try {
    const posts = await FacebookPost.find({ userId: req.user.id })
      .populate("pageRef", "pageId pageName")
      .sort({ scheduledAt: -1 });
    return res.json({ posts });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch posts", error: error.message });
  }
}

export async function deleteScheduledPost(req, res) {
  try {
    const { id } = req.params;
    const post = await FacebookPost.findOne({ _id: id, userId: req.user.id });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }
    await FacebookPost.deleteOne({ _id: id });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete post", error: error.message });
  }
}
