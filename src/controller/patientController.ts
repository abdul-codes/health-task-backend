import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import {
  createPatientSchema,
  updatePatientSchema,
} from "../validation/patientValidation";

/**
 * Create a new patient (Admin only)
 * POST /api/patients
 */
export const createPatient = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;

      // Validate input using Zod schema
      const validationResult = createPatientSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.format(),
        });
      }

      const { name, dob, roomNumber, medicalRecord, assignedToIds } =
        validationResult.data;
      const dobDate = new Date(dob);

      // Create the patient
      const patient = await prisma.patient.create({
        data: {
          name,
          dob: dobDate,
          medicalRecord,
          roomNumber,
          createdById: userId,
          assignedTo: {
            // Connect the patient to the users specified in assignedToIds
            connect: assignedToIds?.map((id) => ({ id })),
          },
        },
      });

      res.status(201).json({
        message: "Patient created successfully",
        patient,
      });
    } catch (error) {
      console.error("Create patient error:", error);
      res.status(500).json({
        message: "Error creating patient",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Get all patients
 * GET /api/patients
 */
 
 export const getAllPatients = asyncMiddleware(async (req: Request, res: Response) => {
   try {
     const userId = req.user?.id;
 
     // By default, fetch patients assigned to the current user
     // A query parameter could be added for admins to fetch all patients, e.g., ?all=true
     const patients = await prisma.patient.findMany({
       where: {
         assignedTo: {
           some: {
             id: userId,
           },
         },
       },
       include: {
         createdBy: {
           select: {
             id: true,
             firstName: true,
             lastName: true,
             email: true,
             createdAt: true,
           },
         },
       },
       orderBy: {
         createdAt: 'desc',
       },
     });
 
     res.json(patients);
   } catch (error) {
     console.error("Get all patients error:", error);
     res.status(500).json({
       message: "Error fetching patients",
       error: error instanceof Error ? error.message : "Unknown error",
     });
   }
 });


/**
 * Get patient by ID
 * GET /api/patients/:id
 */
export const getPatientById = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          tasks: true,
        },
      });

      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      res.json(patient);
    } catch (error) {
      console.error("Get patient by ID error:", error);
      res.status(500).json({
        message: "Error fetching patient",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Update patient
 * PUT /api/patients/:id
 */
export const updatePatient = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Validate input using Zod schema
      const validationResult = updatePatientSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation error",
          errors: validationResult.error.format(),
        });
      }

      const { name, dob, medicalRecord } = validationResult.data;

      // Check if patient exists
      const existingPatient = await prisma.patient.findUnique({
        where: { id },
      });

      if (!existingPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Convert date string to Date object if provided
      let dobDate: Date | undefined;
      if (dob) {
        dobDate = new Date(dob);
      }

      // Update patient
      const updatedPatient = await prisma.patient.update({
        where: { id },
        data: {
          name: name || undefined,
          dob: dobDate || undefined,
          medicalRecord: medicalRecord || undefined,
        },
      });

      res.json({
        message: "Patient updated successfully",
        patient: updatedPatient,
      });
    } catch (error) {
      console.error("Update patient error:", error);
      res.status(500).json({
        message: "Error updating patient",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Delete patient
 * DELETE /api/patients/:id
 */
export const deletePatient = asyncMiddleware(
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if patient exists
      const existingPatient = await prisma.patient.findUnique({
        where: { id },
      });

      if (!existingPatient) {
        return res.status(404).json({ message: "Patient not found" });
      }

      // Delete patient
      await prisma.$transaction([
        // First delete related tasks
        prisma.task.deleteMany({
          where: { patientId: id },
        }),
        // Then delete the patient
        prisma.patient.delete({
          where: { id },
        }),
      ]);

      res.json({ message: "Patient deleted successfully" });
    } catch (error) {
      console.error("Delete patient error:", error);
      res.status(500).json({
        message: "Error deleting patient",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);
