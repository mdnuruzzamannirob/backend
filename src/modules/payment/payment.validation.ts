import { z } from "zod";

const createStripePayment = z.object({
  body: z.object({
    fineId: z.string({ error: "Fine ID is required" }),
  }),
});

const recordManualPayment = z.object({
  body: z.object({
    fineId: z.string({ error: "Fine ID is required" }),
    method: z.enum(["cash", "card"], {
      error: "Method must be 'cash' or 'card'",
    }),
  }),
});

export const PaymentValidation = {
  createStripePayment,
  recordManualPayment,
};
