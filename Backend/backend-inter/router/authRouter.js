import express from "express";
import { firebaseLogin } from "../controllers/firebaseAuthController.js";

const authRouter = express.Router();

authRouter.post("/login", firebaseLogin);

export default authRouter;
