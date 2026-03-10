import { Router } from "express";
import { AuthController } from "./auth.controller";
import { AuthValidation } from "./auth.validation";
import validateRequest from "../../middleware/validate";
import auth from "../../middleware/auth";

const router = Router();

router.post(
  "/register",
  validateRequest(AuthValidation.register),
  AuthController.register,
);

router.post(
  "/verify-email",
  validateRequest(AuthValidation.verifyEmail),
  AuthController.verifyEmail,
);

router.post(
  "/login",
  validateRequest(AuthValidation.login),
  AuthController.login,
);

router.post(
  "/refresh-token",
  validateRequest(AuthValidation.refreshToken),
  AuthController.refreshToken,
);

router.post(
  "/change-password",
  auth("user", "admin"),
  validateRequest(AuthValidation.changePassword),
  AuthController.changePassword,
);

router.post("/logout", auth("user", "admin"), AuthController.logout);

router.post(
  "/forgot-password",
  validateRequest(AuthValidation.forgotPassword),
  AuthController.forgotPassword,
);

router.post(
  "/verify-reset-otp",
  validateRequest(AuthValidation.verifyResetOtp),
  AuthController.verifyResetOtp,
);

router.post(
  "/reset-password",
  validateRequest(AuthValidation.resetPassword),
  AuthController.resetPassword,
);

router.post(
  "/resend-otp",
  validateRequest(AuthValidation.resendOtp),
  AuthController.resendOtp,
);

export const AuthRoutes = router;
