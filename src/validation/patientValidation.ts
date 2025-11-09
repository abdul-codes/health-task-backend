import { z } from "zod";

// Schema for creating a patient
export const createPatientSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  dob: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Invalid date format for date of birth"),
  roomNumber: z.string().optional(),
  medicalRecord: z.string().min(1, "Medical record is required"),
  assignedToIds: z.array(z.string()).optional(),
});

// Schema for updating a patient
export const updatePatientSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .optional(),
    dob: z
      .string()
      .refine((val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      }, "Invalid date format for date of birth")
      .optional(),
    medicalRecord: z.string().min(1, "Medical record is required").optional(),
    roomNumber: z.string().min(1, "Room number is required").optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

// Medical History creation schema
export const createMedicalHistorySchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  eventType: z.enum(["GENERAL", "DIAGNOSIS", "PRESCRIPTION", "LAB_RESULT", "VITAL_SIGNS", "ALLERGY", "SURGERY", "VACCINATION", "EMERGENCY", "ADMISSION", "DISCHARGE"]).default("GENERAL"),
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title cannot exceed 200 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description cannot exceed 2000 characters"),
  date: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date <= new Date();
  }, "Invalid date format or date cannot be in the future"),
  doctorId: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  attachments: z.array(z.object({
    fileName: z.string().min(1, "File name is required"),
    fileUrl: z.string().url("Invalid file URL"),
    fileType: z.enum(["DOCUMENT", "IMAGE", "VIDEO", "AUDIO", "XRAY", "SCAN"]),
    fileSize: z.number().min(1, "File size must be greater than 0"),
    description: z.string().optional()
  })).optional()
});

// Medical History update schema
export const updateMedicalHistorySchema = z.object({
  eventType: z.enum(["GENERAL", "DIAGNOSIS", "PRESCRIPTION", "LAB_RESULT", "VITAL_SIGNS", "ALLERGY", "SURGERY", "VACCINATION", "EMERGENCY", "ADMISSION", "DISCHARGE"]).optional(),
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title cannot exceed 200 characters").optional(),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description cannot exceed 2000 characters").optional(),
  date: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date <= new Date();
  }, "Invalid date format or date cannot be in the future").optional(),
  doctorId: z.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});

// Types derived from schemas
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type CreateMedicalHistoryInput = z.infer<typeof createMedicalHistorySchema>;
export type UpdateMedicalHistoryInput = z.infer<typeof updateMedicalHistorySchema>;
