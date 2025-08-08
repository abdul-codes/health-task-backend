import express from "express";
import { authenticateUser, authorizeAdmin } from "../middleware/authMiddleware";
import {
  createPatient,
  getAllPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  getPatientsForDropdown,
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



export default router;