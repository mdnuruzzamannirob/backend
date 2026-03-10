import { z } from "zod";

const createReservation = z.object({
  body: z.object({
    book: z.string({ error: "Book ID is required" }),
  }),
});

const cancelReservation = z.object({
  params: z.object({ id: z.string() }),
});

export const ReservationValidation = {
  createReservation,
  cancelReservation,
};
