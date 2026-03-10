import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import Otp from "./otp.model";
import AppError from "../../errors/AppError";
import { TOtpType } from "./otp.interface";

const OTP_TTL_MINUTES = 10;

const generateOtp = (): string => {
  // Cryptographically-safe 6-digit OTP
  return String(Math.floor(100000 + Math.random() * 900000));
};

const createOtp = async (email: string, type: TOtpType): Promise<string> => {
  // Invalidate any previous unused OTPs of same type
  await Otp.deleteMany({ email, type });

  const plainOtp = generateOtp();
  const hashedOtp = await bcrypt.hash(plainOtp, 10);

  await Otp.create({
    email: email.toLowerCase(),
    otp: hashedOtp,
    type,
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
  });

  return plainOtp;
};

const verifyOtp = async (
  email: string,
  plainOtp: string,
  type: TOtpType,
): Promise<void> => {
  const record = await Otp.findOne({
    email: email.toLowerCase(),
    type,
    isUsed: false,
  });

  if (!record) {
    throw new AppError(
      "OTP not found or already used",
      StatusCodes.BAD_REQUEST,
    );
  }

  if (record.expiresAt < new Date()) {
    await record.deleteOne();
    throw new AppError(
      "OTP has expired. Please request a new one",
      StatusCodes.BAD_REQUEST,
    );
  }

  const isMatch = await bcrypt.compare(plainOtp, record.otp);
  if (!isMatch) {
    throw new AppError("Invalid OTP", StatusCodes.BAD_REQUEST);
  }

  record.isUsed = true;
  await record.save();
};

export const OtpService = { createOtp, verifyOtp };
