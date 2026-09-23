const express = require("express");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const {
  callbackSchema,
  selectPagesSchema,
  connect,
  callback,
  pages,
  selectPages,
  selectedPages
} = require("../controllers/facebookController");

const router = express.Router();

router.get("/connect", auth, connect);
router.get("/callback", validate(callbackSchema, "query"), callback);
router.get("/pages", auth, pages);
router.get("/pages/selected", auth, selectedPages);
router.post("/pages/select", auth, validate(selectPagesSchema), selectPages);

module.exports = router;
