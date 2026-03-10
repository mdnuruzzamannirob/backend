import { Schema, model } from "mongoose";
import { IOtp, OtpModel } from "./otp.interface";

const otpSchema = new Schema<IOtp, OtpModel>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    otp: { type: String, required: true },
    type: {
      type: String,
      enum: ["email_verification", "password_reset"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// TTL index: MongoDB auto-deletes expired OTP documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ email: 1, type: 1 });

const Otp = model<IOtp, OtpModel>("Otp", otpSchema);

export default Otp;
