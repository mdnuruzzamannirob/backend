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
  IResetPasswordPayload,
} from "./auth.interface";
import { sendEmail, emailTemplates } from "../../utils/email";

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

  const user = await User.create({ ...payload, role: "user" });
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

  // Send welcome email
  const template = emailTemplates.welcome(user.name);
  await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
  });

  return { accessToken, refreshToken };
};

const login = async (payload: ILoginPayload) => {
  const user = await User.findOne({ email: payload.email }).select("+password");
  if (!user) {
    throw new AppError("Invalid credentials", StatusCodes.UNAUTHORIZED);
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
    // Don't reveal if user exists
    return null;
  }

  const resetToken = createToken(
    { userId: user._id.toString(), role: user.role },
    config.JWT_ACCESS_SECRET,
    config.PASSWORD_RESET_EXPIRES_IN,
  );

  const resetLink = `${config.CLIENT_URL}/reset-password?token=${resetToken}`;
  const template = emailTemplates.passwordReset(user.name, resetLink);

  await sendEmail({
    to: user.email,
    subject: template.subject,
    html: template.html,
  });

  return null;
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(payload.token, config.JWT_ACCESS_SECRET) as JwtPayload;
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

export const AuthService = {
  register,
  login,
  refreshAccessToken,
  changePassword,
  forgotPassword,
  resetPassword,
};
