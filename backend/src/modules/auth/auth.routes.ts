import { Router } from "express";
import { z } from "zod";
import { uploadBufferToCloudinary } from "../../config/cloudinary";
import { requireAuth } from "../../middleware/auth.middleware";
import { upload } from "../../middleware/upload.middleware";
import { validateBody } from "../../middleware/validate.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { getUserByUsername, searchUsers } from "../users/user.service";
import {
  getCurrentUser,
  loginUser,
  registerUser,
  updateAvatar,
  updatePreferences
} from "./auth.service";
import { loginSchema, preferencesSchema, registerSchema } from "./auth.schemas";

export const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  })
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await loginUser(req.body);
    res.json(result);
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await getCurrentUser(req.user!.id) });
  })
);

authRouter.patch(
  "/me/preferences",
  requireAuth,
  validateBody(preferencesSchema),
  asyncHandler(async (req, res) => {
    res.json({ user: await updatePreferences(req.user!.id, req.body) });
  })
);

authRouter.post(
  "/me/avatar",
  requireAuth,
  upload.single("avatar"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Avatar file is required" });
    }

    const uploaded = await uploadBufferToCloudinary(req.file, `ai-chat/avatars/${req.user!.id}`);
    res.json({ user: await updateAvatar(req.user!.id, uploaded.secure_url) });
  })
);

authRouter.get(
  "/users/search",
  requireAuth,
  asyncHandler(async (req, res) => {
    const query = z.string().default("").parse(req.query.q);
    res.json({ users: await searchUsers(req.user!.id, query) });
  })
);
authRouter.get(
  "/users/:username",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getUserByUsername(req.params.username);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  })
);