import { Request, Response } from "express";
import { asyncMiddleware } from "../middleware/asyncMiddleware";
import { prisma } from "../utils/db";
import {
  createPatientSchema,
  updatePatientSchema,
} from "../validation/patientValidation";
import { sendPushNotifications } from "../utils/pushNotification";
import { AppError } from "../utils/AppError";
/**
 * Create a new patient (Admin only)
 * POST /api/patients
 */
export const createPatient = asyncMiddleware(
  async (req: Request, res: Response) => {
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

    // After successful patient creation:
    if (assignedToIds && assignedToIds.length > 0) {
      // Get push tokens for all assigned user
      const notificationTitle = "New Patient Assigned";
      const notificationBody = `Patient ${patient.name} has been assigned to you`;
      
      await sendPushNotifications(
        assignedToIds,
        notificationTitle,
        notificationBody,
        { patientId: patient.id }
      );
    }
  },
);

/**
 * Get all patients
 * GET /api/patients
 */
 
 export const getAllPatients = asyncMiddleware(async (req: Request, res: Response) => {
   const { id: userId, role: userRole } = req.user!;

   let whereClause: any = {};

   if (userRole === 'ADMIN') {
     // Admins can see all patients.
     whereClause = {};
   } else if (userRole === 'DOCTOR') {
     // Doctors see patients they created OR are assigned to.
     whereClause = {
       OR: [
         { createdById: userId },
         { assignedTo: { some: { id: userId } } },
       ],
     };
   } else {
     // Nurses and Labtechs only see patients they are assigned to.
     whereClause = {
       assignedTo: { some: { id: userId } },
     };
   }

   const patients = await prisma.patient.findMany({
     where: whereClause,
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
     ...( {cacheStrategy: {
      swr: 60,
      ttl: 30,
    } }as any)
   });

   res.json(patients);
 });

 // Add this new function to your patientController.ts
 
/**
 * Get all patients for selection dropdowns.
 * GET /api/patients/dropdown
 */
 export const getPatientsForDropdown = asyncMiddleware(async (req: Request, res: Response) => {
   const patients = await prisma.patient.findMany({
     select: {
       id: true,
       name: true,
       roomNumber: true, // Including room number can be helpful for selection
     },
     orderBy: {
       name: 'asc' // Sort alphabetically for a better user experience
     },
     ...( {cacheStrategy: {
      swr: 60,
      ttl: 30,
    } }as any)
   });

   res.json(patients); // Send the direct array of patients
 });


/**
 * Get patient by ID
 * GET /api/patients/:id
 */
export const getPatientById = asyncMiddleware(
  async (req: Request, res: Response) => {
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
      ...( {cacheStrategy: {
        swr: 60,
        ttl: 30,
      } }as any)
    });

    if (!patient) {
      throw new AppError('Patient not found', 404, 'patientController');
    }

    res.json(patient);
  },
);

/**
 * Update patient
 * PUT /api/patients/:id
 */
export const updatePatient = asyncMiddleware(
  async (req: Request, res: Response) => {
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
      throw new AppError('Patient not found', 404, 'patientController');
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
  },
);

/**
 * Delete patient
 * DELETE /api/patients/:id
 */
export const deletePatient = asyncMiddleware(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if patient exists
    const existingPatient = await prisma.patient.findUnique({
      where: { id },
    });

    if (!existingPatient) {
      throw new AppError('Patient not found', 404, 'patientController');
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
  },
);
