const { z } = require("zod");
const prisma = require("../config/prisma");
const cloudinary = require("../config/cloudinary");
const { enqueuePost } = require("../queues/postQueue");
const { generateCaption } = require("../services/captionService");

const createPostSchema = z.object({
  pageId: z.string().min(1),
  content: z.string().min(1).max(5000),
  linkUrl: z.string().url().optional(),
  scheduledAt: z.coerce.date()
});

const postIdParamSchema = z.object({
  id: z.string().min(1)
});

const captionSchema = z.object({
  seed: z.string().min(3).max(1000)
});

async function createPost(req, res) {
  const { pageId, content, linkUrl, scheduledAt } = req.body;
  const page = await prisma.page.findFirst({
    where: {
      userId: req.user.id,
      OR: [{ id: pageId }, { pageId }]
    }
  });

  if (!page) {
    return res.status(404).json({ message: "Page not found" });
  }

  let imageUrl = null;
  if (req.file) {
    imageUrl = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "fb-scheduler", resource_type: "image" },
        (error, result) => {
          if (error) return reject(error);
          return resolve(result.secure_url);
        }
      );
      stream.end(req.file.buffer);
    });
  }

  const post = await prisma.post.create({
    data: {
      userId: req.user.id,
      pageId: page.id,
      content,
      linkUrl,
      imageUrl,
      scheduledAt,
      status: "pending"
    },
    include: { page: true }
  });

  await enqueuePost(post);
  return res.status(201).json(post);
}

async function listPosts(req, res) {
  const posts = await prisma.post.findMany({
    where: { userId: req.user.id },
    orderBy: { scheduledAt: "desc" },
    include: { page: true }
  });
  return res.json({ posts });
}

async function deletePost(req, res) {
  const { id } = req.params;
  const post = await prisma.post.findFirst({ where: { id, userId: req.user.id } });
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }
  await prisma.post.delete({ where: { id } });
  return res.status(204).send();
}

async function aiCaption(req, res, next) {
  try {
    const out = await generateCaption(req.body.seed);
    return res.json(out);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPostSchema,
  postIdParamSchema,
  captionSchema,
  createPost,
  listPosts,
  deletePost,
  aiCaption
};
