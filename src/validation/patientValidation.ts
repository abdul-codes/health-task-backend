import { z } from "zod";

// Schema for creating a patient
export const createPatientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
  dob: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Invalid date format for date of birth"),
  medicalRecord: z.string().min(1, "Medical record is required"),
});

// Schema for updating a patient
export const updatePatientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters").optional(),
  dob: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime());
  }, "Invalid date format for date of birth").optional(),
  medicalRecord: z.string().min(1, "Medical record is required").optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});

// Types derived from schemas
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;