import { Schema, model } from "mongoose";
import { IPayment, PaymentModel } from "./payment.interface";

const paymentSchema = new Schema<IPayment, PaymentModel>(
  {
    fine: {
      type: Schema.Types.ObjectId,
      ref: "Fine",
      required: true,
    },
    member: {
      type: Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["stripe", "cash", "card"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    stripePaymentIntentId: { type: String },
    stripeClientSecret: { type: String },
    transactionId: { type: String, required: true, unique: true },
    paidAt: { type: Date },
  },
  { timestamps: true },
);

paymentSchema.index({ fine: 1 });
paymentSchema.index({ member: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });

const Payment = model<IPayment, PaymentModel>("Payment", paymentSchema);

export default Payment;
