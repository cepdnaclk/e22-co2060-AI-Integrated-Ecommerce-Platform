import express from "express";
import { getUserProfile, updateUserProfile } from "../controllers/userController.js";
import verifyToken from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/profile", verifyToken, getUserProfile);
userRouter.put("/profile", verifyToken, updateUserProfile);

export default userRouter;
