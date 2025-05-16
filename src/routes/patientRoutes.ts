import express from "express";
import { authenticateUser, authorizeAdmin } from "../middleware/authMiddleware";
import {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
} from "../controller/patientController";

const router = express.Router();

// All patient routes require authentication
router.use(authenticateUser);

// Create patient - Admin only
router.post("/", authorizeAdmin, createPatient);

// Get all patients
router.get("/", authenticateUser, getAllPatients);

// Get patient by ID
router.get("/:id", authenticateUser, getPatientById);

// Update patient - Admin only
router.put("/:id", authenticateUser, authorizeAdmin, updatePatient);

// Delete patient - Admin only
router.delete("/:id", authenticateUser, authorizeAdmin, deletePatient);

export default router;