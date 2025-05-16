import { body, validationResult } from "express-validator"
import { NextFunction, Request, Response } from "express"
import { asyncMiddleware } from "../middleware/asyncMiddleware"

const handleValidationErrors = asyncMiddleware(async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            message: "Validation failed",
            errors: errors.array() 
        })
    }
    next()
})

// Validation for updating user profile
export const validateUpdateProfile = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2 })
    .withMessage("First name must be at least 2 characters long"),
  
  body("lastName")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ min: 2 })
    .withMessage("Last name must be at least 2 characters long"),
  
  body("department")
    .trim()
    .notEmpty()
    .withMessage("Department is required"),
  
  body("phoneNumber")
    .optional()
    .trim()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Invalid phone number format"),
  
  body("profilePicture")
    .optional()
    .trim()
    .isURL()
    .withMessage("Profile picture must be a valid URL"),
  
  handleValidationErrors,
];

// Validation for updating password
export const validateUpdatePassword = [
  body("currentPassword")
    .trim()
    .notEmpty()
    .withMessage("Current password is required"),
  
  body("newPassword")
    .trim()
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage("Password must include uppercase, lowercase, number, and special character"),
  
  handleValidationErrors,
];
