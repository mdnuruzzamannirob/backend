import { Router } from "express";
import { ReservationController } from "./reservation.controller";
import { ReservationValidation } from "./reservation.validation";
import validateRequest from "../../middleware/validate";
import auth from "../../middleware/auth";

const router = Router();

// User's own reservations
router.get(
  "/me",
  auth("user", "admin"),
  ReservationController.getMyReservations,
);

// Create a reservation
router.post(
  "/",
  auth("user", "admin"),
  validateRequest(ReservationValidation.createReservation),
  ReservationController.createReservation,
);

// Admin: list all reservations
router.get("/", auth("admin"), ReservationController.getAllReservations);

// Cancel a reservation
router.patch(
  "/:id/cancel",
  auth("user", "admin"),
  validateRequest(ReservationValidation.cancelReservation),
  ReservationController.cancelReservation,
);

export const ReservationRoutes = router;
