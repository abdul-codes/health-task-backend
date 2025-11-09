import { prisma } from './db';
import { AppError } from './AppError';

/**
 * Check if user has access to a specific patient
 * @param userId - The ID of the user trying to access
 * @param patientId - The ID of the patient being accessed
 * @param userRole - The role of the user
 * @returns Promise<boolean> - True if user has access, false otherwise
 */
export const hasPatientAccess = async (
  userId: string,
  patientId: string,
  userRole: string
): Promise<boolean> => {
  try {
    // Admins have access to all patients
    if (userRole === 'ADMIN') {
      return true;
    }

    // Check patient access based on role
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        OR: [
          // Doctors can access patients they created or are assigned to
          ...(userRole === 'DOCTOR' ? [
            { createdById: userId },
            { assignedTo: { some: { id: userId } } }
          ] : []),
          // Nurses and Labtechs can only access patients they are assigned to
          ...(userRole !== 'DOCTOR' ? [
            { assignedTo: { some: { id: userId } } }
          ] : [])
        ],
      },
    });

    return !!patient;
  } catch (error) {
    console.error('Error checking patient access:', error);
    return false;
  }
};

/**
 * Middleware to check patient access before proceeding
 * @param userId - The ID of the user
 * @param patientId - The ID of the patient
 * @param userRole - The role of the user
 * @param context - Context for error reporting (e.g., 'patientController')
 * @throws AppError if user doesn't have access
 */
export const checkPatientAccess = async (
  userId: string,
  patientId: string,
  userRole: string,
  context: string
): Promise<void> => {
  const hasAccess = await hasPatientAccess(userId, patientId, userRole);
  
  if (!hasAccess) {
    throw new AppError(
      'Access denied: You do not have permission to access this patient',
      403,
      context
    );
  }
};

/**
 * Get patients that a user has access to
 * @param userId - The ID of the user
 * @param userRole - The role of the user
 * @returns Promise<string[]> - Array of patient IDs the user can access
 */
export const getAccessiblePatientIds = async (
  userId: string,
  userRole: string
): Promise<string[]> => {
  try {
    let whereClause: any = {};

    if (userRole === 'ADMIN') {
      // Admins can see all patients
      whereClause = {};
    } else if (userRole === 'DOCTOR') {
      // Doctors see patients they created OR are assigned to
      whereClause = {
        OR: [
          { createdById: userId },
          { assignedTo: { some: { id: userId } } },
        ],
      };
    } else {
      // Nurses and Labtechs only see patients they are assigned to
      whereClause = {
        assignedTo: { some: { id: userId } },
      };
    }

    const patients = await prisma.patient.findMany({
      where: whereClause,
      select: { id: true },
    });

    return patients.map(patient => patient.id);
  } catch (error) {
    console.error('Error getting accessible patient IDs:', error);
    return [];
  }
};