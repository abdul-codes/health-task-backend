import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import {
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  deleteUserAccount,
} from "../controller/userController";
import { validateUpdateProfile, validateUpdatePassword } from "../validation/userValidation";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Get user profile
router.get("/userprofile", getUserProfile);

// Update user profile
router.put("/userprofile", validateUpdateProfile, updateUserProfile);

// Update user password
router.put("/password", validateUpdatePassword, updateUserPassword);

// Delete user account
router.delete("/account", deleteUserAccount);

export default router;
