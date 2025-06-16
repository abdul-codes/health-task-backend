import { Router } from "express";
import { authenticateUser } from "../middleware/authMiddleware";
import { refreshToken } from "../controller/jwtController";
import { loginUser, logoutUser, registerUser } from "../controller/authController";
import { loginValidation, registervalidation, } from "../validation/authValidation";



const router =  Router()

router.post("/refresh", authenticateUser, refreshToken)
router.post("/register", registervalidation, registerUser)
router.post("/login", loginValidation, loginUser)

router.post("/logout", logoutUser)


export default router;
