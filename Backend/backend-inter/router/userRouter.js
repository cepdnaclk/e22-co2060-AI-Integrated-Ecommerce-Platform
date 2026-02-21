import express from "express";
import { getUserProfile } from "../controllers/userController.js";
import verifyToken from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/profile", verifyToken, getUserProfile);

export default userRouter;
