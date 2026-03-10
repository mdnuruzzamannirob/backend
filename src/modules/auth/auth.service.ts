import jwt, { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import User from "../user/user.model";
import AppError from "../../errors/AppError";
import { config } from "../../config";
import {
  ILoginPayload,
  IRegisterPayload,
  ITokenPayload,
  IChangePasswordPayload,
  IForgotPasswordPayload,
  IVerifyEmailPayload,
  IVerifyResetOtpPayload,
  IResendOtpPayload,
  IResetPasswordPayload,
} from "./auth.interface";
import { sendEmail, emailTemplates } from "../../utils/email";
import { OtpService } from "../otp/otp.service";

const createToken = (
  payload: ITokenPayload,
  secret: string,
  expiresIn: string,
): string => {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
};

const register = async (payload: IRegisterPayload) => {
  const existing = await User.findOne({ email: payload.email });
  if (existing) {
    throw new AppError("Email already in use", StatusCodes.CONFLICT);
  }

  const user = await User.create({
    ...payload,
    role: "user",
    isVerified: false,
  });

  const otp = await OtpService.createOtp(user.email, "email_verification");
  const template = emailTemplates.otpVerification(user.name, otp);
  await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
  });

  return {
    message:
      "Verification OTP sent to your email. Please verify to complete registration.",
  };
};

const verifyEmail = async (payload: IVerifyEmailPayload) => {
  const user = await User.findOne({ email: payload.email.toLowerCase() });
  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }
  if (user.isVerified) {
    throw new AppError("Email is already verified", StatusCodes.BAD_REQUEST);
  }

  await OtpService.verifyOtp(payload.email, payload.otp, "email_verification");

  user.isVerified = true;
  await user.save({ validateModifiedOnly: true });

  // Send welcome email after successful verification
  const template = emailTemplates.welcome(user.name);
  await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
  });

  const tokenPayload: ITokenPayload = {
    userId: user._id.toString(),
    role: user.role,
  };
  const accessToken = createToken(
    tokenPayload,
    config.JWT_ACCESS_SECRET,
    config.JWT_ACCESS_EXPIRES_IN,
  );
  const refreshToken = createToken(
    tokenPayload,
    config.JWT_REFRESH_SECRET,
    config.JWT_REFRESH_EXPIRES_IN,
  );

  return { accessToken, refreshToken };
};

const login = async (payload: ILoginPayload) => {
  const user = await User.findOne({ email: payload.email }).select("+password");
  if (!user) {
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }
  if (!user.isVerified) {
    throw new AppError(
      "Email not verified. Please verify your email before logging in.",
      StatusCodes.FORBIDDEN,
    );
  }
  if (!user.isActive) {
    throw new AppError("Account is deactivated", StatusCodes.FORBIDDEN);
  }

  const isMatch = await user.isPasswordMatch(payload.password, user.password);
  if (!isMatch) {
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
  }

  const tokenPayload: ITokenPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const accessToken = createToken(
    tokenPayload,
    config.JWT_ACCESS_SECRET,
    config.JWT_ACCESS_EXPIRES_IN,
  );
  const refreshToken = createToken(
    tokenPayload,
    config.JWT_REFRESH_SECRET,
    config.JWT_REFRESH_EXPIRES_IN,
  );

  return { accessToken, refreshToken };
};

const refreshAccessToken = async (token: string) => {
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new AppError(
      "Invalid or expired refresh token",
      StatusCodes.UNAUTHORIZED,
    );
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }
  if (!user.isActive) {
    throw new AppError("Account is deactivated", StatusCodes.FORBIDDEN);
  }
  if (user.isPasswordChangedAfter(decoded.iat as number)) {
    throw new AppError(
      "Password changed recently. Please log in again",
      StatusCodes.UNAUTHORIZED,
    );
  }

  const tokenPayload: ITokenPayload = {
    userId: user._id.toString(),
    role: user.role,
  };
  const accessToken = createToken(
    tokenPayload,
    config.JWT_ACCESS_SECRET,
    config.JWT_ACCESS_EXPIRES_IN,
  );

  return { accessToken };
};

const changePassword = async (
  userId: string,
  payload: IChangePasswordPayload,
) => {
  const user = await User.findById(userId).select("+password");
  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  const isMatch = await user.isPasswordMatch(
    payload.currentPassword,
    user.password,
  );
  if (!isMatch) {
    throw new AppError(
      "Current password is incorrect",
      StatusCodes.UNAUTHORIZED,
    );
  }

  user.password = payload.newPassword;
  await user.save();
  return null;
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const user = await User.findOne({ email: payload.email });
  if (!user) {
    // Don't reveal whether the email exists
    return null;
  }

  const otp = await OtpService.createOtp(user.email, "password_reset");
  const template = emailTemplates.passwordResetOtp(user.name, otp);
  await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
  });

  return null;
};

const verifyResetOtp = async (payload: IVerifyResetOtpPayload) => {
  const user = await User.findOne({ email: payload.email.toLowerCase() });
  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  await OtpService.verifyOtp(payload.email, payload.otp, "password_reset");

  // Issue a short-lived reset token (10 min)
  const resetToken = createToken(
    { userId: user._id.toString(), role: user.role },
    config.JWT_ACCESS_SECRET,
    config.PASSWORD_RESET_EXPIRES_IN,
  );

  return { resetToken };
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(
      payload.resetToken,
      config.JWT_ACCESS_SECRET,
    ) as JwtPayload;
  } catch {
    throw new AppError(
      "Invalid or expired reset token",
      StatusCodes.BAD_REQUEST,
    );
  }

  const user = await User.findById(decoded.userId).select("+password");
  if (!user) {
    throw new AppError("User not found", StatusCodes.NOT_FOUND);
  }

  user.password = payload.newPassword;
  await user.save();
  return null;
};

const resendOtp = async (payload: IResendOtpPayload) => {
  const user = await User.findOne({ email: payload.email.toLowerCase() });
  if (!user) {
    // Don't reveal whether the email exists
    return null;
  }

  if (payload.type === "email_verification" && user.isVerified) {
    throw new AppError("Email is already verified", StatusCodes.BAD_REQUEST);
  }

  const otp = await OtpService.createOtp(user.email, payload.type);

  if (payload.type === "email_verification") {
    const template = emailTemplates.otpVerification(user.name, otp);
    await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
    });
  } else {
    const template = emailTemplates.passwordResetOtp(user.name, otp);
    await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
    });
  }

  return null;
};

export const AuthService = {
  register,
  verifyEmail,
  login,
  refreshAccessToken,
  changePassword,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  resendOtp,
};
