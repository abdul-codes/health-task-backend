import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import {
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  deleteUserAccount,
  getPendingUsers,
  approveUser,
  rejectUser
} from "../controller/userController";
import { validateUpdateProfile, validateUpdatePassword } from "../validation/userValidation";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// User profile routes
router.get("/userprofile", getUserProfile);
router.put("/userprofile", validateUpdateProfile, updateUserProfile);
router.put("/password", validateUpdatePassword, updateUserPassword);
router.delete("/account", deleteUserAccount);

// Admin routes for user approval
router.get("/pending", getPendingUsers);
router.put("/approve/:userId", approveUser);
router.delete("/reject/:userId", rejectUser);

export default router;
