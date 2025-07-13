import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import { refreshToken } from "../controller/jwtController";
import { getMe, loginUser, logoutUser, registerUser } from "../controller/authController";
import { loginValidation, registervalidation, } from "../validation/authValidation";



const router =  Router()

router.get("/me", authenticateUser, getMe)

router.post("/refresh", refreshToken)
router.post("/register", registervalidation, registerUser)
router.post("/login", loginValidation, loginUser)

router.post("/logout", logoutUser)


export default router;
