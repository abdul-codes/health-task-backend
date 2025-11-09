import express from "express";
import { authenticateUser, authorizeAdmin } from "../middleware/authMiddleware";
import {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientsForDropdown,
  addMedicalHistory,
  getMedicalHistory,
  updateMedicalHistory,
  deleteMedicalHistory,
} from "../controller/patientController";

const router = express.Router();

// All patient routes require authentication
router.use(authenticateUser);

// Create patient -
router.post("/", authenticateUser, createPatient);

// Get all patients
router.get("/", authenticateUser, getAllPatients);

router.get("/dropdown", authenticateUser, getPatientsForDropdown);

// Get patient by ID
router.get("/:id", authenticateUser, getPatientById);

// Update patient -
router.put("/:id", authenticateUser, authorizeAdmin, updatePatient);


// Delete patient - Admin only
router.delete("/:id", authenticateUser, authorizeAdmin, deletePatient);

// Medical History Routes
// Add medical history entry for a patient
router.post("/:id/medical-history", authenticateUser, addMedicalHistory);

// Get medical history for a patient (timeline view with pagination)
router.get("/:id/medical-history", authenticateUser, getMedicalHistory);

// Update medical history entry
router.put("/:patientId/medical-history/:id", authenticateUser, updateMedicalHistory);

// Delete medical history entry
router.delete("/:patientId/medical-history/:id", authenticateUser, deleteMedicalHistory);

export default router;