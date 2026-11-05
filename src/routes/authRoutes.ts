import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import { loginLimiter, refreshLimiter, registerLimiter } from "../middleware/rateLimitMiddleware";
import { refreshToken } from "../controller/jwtController";
import { getMe, loginUser, logoutUser, registerUser } from "../controller/authController";
import { loginValidation, registervalidation, } from "../validation/authValidation";



const router =  Router()

router.get("/me", authenticateUser, getMe)

router.post("/refresh", refreshLimiter, refreshToken)
router.post("/register", registerLimiter, registervalidation, registerUser)
router.post("/login", loginLimiter, loginValidation, loginUser)

router.post("/logout", logoutUser)


export default router;
