import { Document, Model } from "mongoose";

export type TOtpType = "email_verification" | "password_reset";

export interface IOtp extends Document {
  email: string;
  otp: string;
  type: TOtpType;
  expiresAt: Date;
  isUsed: boolean;
}

export type OtpModel = Model<IOtp>;
