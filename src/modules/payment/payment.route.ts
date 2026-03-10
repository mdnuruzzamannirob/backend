import { Router } from "express";
import express from "express";
import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";
import validateRequest from "../../middleware/validate";
import auth from "../../middleware/auth";

const router = Router();

// Stripe webhook (must use raw body parser, no auth)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  PaymentController.stripeWebhook,
);

// User's own payments
router.get("/me", auth("user", "admin"), PaymentController.getMyPayments);

// Create Stripe payment intent
router.post(
  "/stripe",
  auth("user", "admin"),
  validateRequest(PaymentValidation.createStripePayment),
  PaymentController.createStripePayment,
);

// Admin: record manual payment
router.post(
  "/manual",
  auth("admin"),
  validateRequest(PaymentValidation.recordManualPayment),
  PaymentController.recordManualPayment,
);

// Admin: list all payments
router.get("/", auth("admin"), PaymentController.getAllPayments);

export const PaymentRoutes = router;
