import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import {
  getUserProfile,
  updateUserProfile,
  updateUserPassword,
  deleteUserAccount,
  getPendingUsers,
  approveUser,
  rejectUser,
  getAllUsers,
  getUsersForDropdown,
  setPushToken
} from "../controller/userController";
import { validateUpdateProfile, validateUpdatePassword } from "../validation/userValidation";

const router = Router();

// All routes require authentication
router.use(authenticateUser);

// Get all users route
router.get("/", getAllUsers);
router.get("/dropdown", getUsersForDropdown); // Get users for dropdown selection

// User profile routes
router.get("/userprofile", getUserProfile);
router.put("/userprofile", validateUpdateProfile, updateUserProfile);
router.put("/password", validateUpdatePassword, updateUserPassword);
router.delete("/account", deleteUserAccount);

// Admin routes for user approval
router.get("/pending", getPendingUsers);
router.put("/approve/:userId", approveUser);
router.delete("/reject/:userId", rejectUser);


// User routes for push token management
router.post("/push-token", setPushToken);

export default router;
