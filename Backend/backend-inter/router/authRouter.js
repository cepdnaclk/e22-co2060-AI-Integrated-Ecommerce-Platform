import express from "express";
import { firebaseLogin, userPasswordLogin } from "../controllers/firebaseAuthController.js";

const authRouter = express.Router();

authRouter.post("/login/password", userPasswordLogin);
authRouter.post("/login", firebaseLogin);

export default authRouter;
