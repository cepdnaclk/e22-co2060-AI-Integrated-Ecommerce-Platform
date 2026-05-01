import express from "express";
import multer from "multer";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createScheduledPost,
  deleteScheduledPost,
  facebookCallback,
  getFacebookConnectUrl,
  listFacebookPages,
  listScheduledPosts,
  listSelectedPages,
  saveSelectedPages
} from "../controllers/facebookController.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.get("/connect", authMiddleware, getFacebookConnectUrl);
router.get("/callback", facebookCallback);

router.get("/pages", authMiddleware, listFacebookPages);
router.get("/pages/selected", authMiddleware, listSelectedPages);
router.post("/pages/select", authMiddleware, saveSelectedPages);

router.post("/posts", authMiddleware, upload.single("image"), createScheduledPost);
router.get("/posts", authMiddleware, listScheduledPosts);
router.delete("/posts/:id", authMiddleware, deleteScheduledPost);

export default router;
