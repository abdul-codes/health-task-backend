import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import { refreshToken } from "../controller/jwtController";
import { loginUser, logoutUser, registerUser } from "../controller/authController";
import { loginValidation, registervalidation, validateResendOtp, validateVeirfyOtp } from "../validation/authValidation";
import { verifyOtp } from "../controller/verifyOtp";
import { resendOtp } from "../controller/resendOtp";


const router =  Router()

router.post("/refresh", authenticateUser, refreshToken)
router.post("/register", registervalidation, registerUser)
router.post("/login", loginValidation, loginUser)
router.post("/verifyOtp", validateVeirfyOtp, authenticateUser, verifyOtp)
router.post("/resendOtp",validateResendOtp, authenticateUser, resendOtp)
router.post("/logout", logoutUser)


export default router;