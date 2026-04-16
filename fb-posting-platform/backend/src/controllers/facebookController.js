const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../config/prisma");
const env = require("../config/env");
const {
  connectUrl,
  exchangeCodeForToken,
  exchangeLongLivedToken,
  refreshLongLivedToken,
  getUserPages
} = require("../services/facebookService");
const { decrypt, encrypt } = require("../utils/crypto");

const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1)
});

const selectPagesSchema = z.object({
  pages: z.array(z.string().min(1)).min(1)
});

async function connect(req, res) {
  const state = jwt.sign(
    {
      userId: req.user.id,
      nonce: crypto.randomUUID()
    },
    env.JWT_SECRET,
    { expiresIn: "10m" }
  );
  return res.json({ url: connectUrl(state) });
}

async function callback(req, res, next) {
  try {
    const { code, state } = callbackSchema.parse(req.query);
    const decoded = jwt.verify(state, env.JWT_SECRET);

    const shortLived = await exchangeCodeForToken(code);
    const longLived = await exchangeLongLivedToken(shortLived.access_token);
    const expiry = new Date(Date.now() + (longLived.expires_in || 60 * 24 * 60 * 60) * 1000);

    await prisma.facebookAccount.upsert({
      where: { userId: decoded.userId },
      create: {
        userId: decoded.userId,
        accessToken: encrypt(longLived.access_token),
        tokenExpiry: expiry
      },
      update: {
        accessToken: encrypt(longLived.access_token),
        tokenExpiry: expiry
      }
    });

    return res.redirect(`${env.FRONTEND_URL}/dashboard?facebook=connected`);
  } catch (error) {
    return next(error);
  }
}

async function pages(req, res, next) {
  try {
    const account = await prisma.facebookAccount.findUnique({
      where: { userId: req.user.id }
    });
    if (!account) {
      return res.status(400).json({ message: "Facebook account not connected" });
    }

    let userToken = decrypt(account.accessToken);
    if (new Date(account.tokenExpiry).getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      const refreshed = await refreshLongLivedToken(userToken);
      userToken = refreshed.access_token;
      await prisma.facebookAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encrypt(userToken),
          tokenExpiry: new Date(Date.now() + (refreshed.expires_in || 60 * 24 * 60 * 60) * 1000)
        }
      });
    }

    const pagesData = await getUserPages(userToken);
    return res.json({
      pages: pagesData.map((p) => ({
        id: p.id,
        name: p.name,
        perms: p.perms || [],
        tasks: p.tasks || []
      }))
    });
  } catch (error) {
    return next(error);
  }
}

async function selectPages(req, res, next) {
  try {
    const { pages: selectedPageIds } = req.body;
    const account = await prisma.facebookAccount.findUnique({
      where: { userId: req.user.id }
    });
    if (!account) {
      return res.status(400).json({ message: "Facebook account not connected" });
    }

    const availablePages = await getUserPages(decrypt(account.accessToken));
    const selected = availablePages.filter((p) => selectedPageIds.includes(p.id));

    await prisma.$transaction([
      prisma.page.deleteMany({ where: { userId: req.user.id } }),
      ...selected.map((page) =>
        prisma.page.create({
          data: {
            userId: req.user.id,
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: encrypt(page.access_token)
          }
        })
      )
    ]);

    return res.json({ connectedPages: selected.length });
  } catch (error) {
    return next(error);
  }
}

async function selectedPages(req, res, next) {
  try {
    const pages = await prisma.page.findMany({
      where: { userId: req.user.id },
      select: { id: true, pageId: true, pageName: true }
    });
    return res.json({ pages });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  callbackSchema,
  selectPagesSchema,
  connect,
  callback,
  pages,
  selectPages,
  selectedPages
};
