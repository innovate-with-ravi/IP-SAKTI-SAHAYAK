import { Router } from "express";
import {
  getProfile,
  updateProfile,
} from "../controllers/user.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { updateProfileSchema } from "../validators/user.validation.js";

const router = Router();

// All user routes require authentication
router.use(requireAuth);

router.get("/profile", getProfile);
router.patch("/profile", validateBody(updateProfileSchema), updateProfile);

export default router;
