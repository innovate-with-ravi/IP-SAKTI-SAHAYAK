import { Router } from "express";
import {
  signup,
  verifyEmail,
  login,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
} from "../controllers/auth.controller.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  signupSchema,
  verifyEmailSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  logoutSchema,
} from "../validators/auth.validation.js";

const router = Router();

router.post("/signup", validateBody(signupSchema), signup);
router.post("/verify-email", validateBody(verifyEmailSchema), verifyEmail);
router.post("/login", validateBody(loginSchema), login);
router.post("/forgot-password", validateBody(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validateBody(resetPasswordSchema), resetPassword);
router.post("/refresh", validateBody(refreshTokenSchema), refreshToken);
router.post("/logout", validateBody(logoutSchema), logout);

export default router;
