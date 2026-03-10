import { Document, Model, Types } from "mongoose";

export type TPaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type TPaymentMethod = "stripe" | "cash" | "card";

export interface IPayment extends Document {
  fine: Types.ObjectId;
  member: Types.ObjectId;
  amount: number;
  method: TPaymentMethod;
  status: TPaymentStatus;
  stripePaymentIntentId?: string;
  stripeClientSecret?: string;
  transactionId: string;
  paidAt?: Date;
}

export type PaymentModel = Model<IPayment>;
