const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const {
  createPostSchema,
  postIdParamSchema,
  captionSchema,
  createPost,
  listPosts,
  deletePost,
  aiCaption
} = require("../controllers/postsController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth);
router.post("/", upload.single("image"), validate(createPostSchema), createPost);
router.get("/", listPosts);
router.delete("/:id", validate(postIdParamSchema, "params"), deletePost);
router.post("/ai-caption", validate(captionSchema), aiCaption);

module.exports = router;
