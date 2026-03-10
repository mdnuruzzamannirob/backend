import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain an uppercase letter, a lowercase letter, and a number",
  );

const register = z.object({
  body: z.object({
    name: z
      .string({ error: "Name is required" })
      .min(2, "Name must be at least 2 characters")
      .max(50)
      .trim(),
    email: z
      .string({ error: "Email is required" })
      .email("Invalid email address")
      .toLowerCase(),
    password: passwordSchema,
  }),
});

const login = z.object({
  body: z.object({
    email: z
      .string({ error: "Email is required" })
      .email("Invalid email address"),
    password: z.string({ error: "Password is required" }),
  }),
});

const changePassword = z.object({
  body: z.object({
    currentPassword: z.string({ error: "Current password is required" }),
    newPassword: passwordSchema,
  }),
});

const refreshToken = z.object({
  cookies: z.object({
    refreshToken: z.string({ error: "Refresh token is required" }),
  }),
});

const forgotPassword = z.object({
  body: z.object({
    email: z
      .string({ error: "Email is required" })
      .email("Invalid email address"),
  }),
});

const verifyResetOtp = z.object({
  body: z.object({
    email: z
      .string({ error: "Email is required" })
      .email("Invalid email address"),
    otp: z
      .string({ error: "OTP is required" })
      .length(6, "OTP must be 6 digits")
      .regex(/^\d+$/, "OTP must be numeric"),
  }),
});

const resetPassword = z.object({
  body: z.object({
    resetToken: z.string({ error: "Reset token is required" }),
    newPassword: passwordSchema,
  }),
});

const verifyEmail = z.object({
  body: z.object({
    email: z
      .string({ error: "Email is required" })
      .email("Invalid email address"),
    otp: z
      .string({ error: "OTP is required" })
      .length(6, "OTP must be 6 digits")
      .regex(/^\d+$/, "OTP must be numeric"),
  }),
});

const resendOtp = z.object({
  body: z.object({
    email: z
      .string({ error: "Email is required" })
      .email("Invalid email address"),
    type: z.enum(["email_verification", "password_reset"], {
      error: "Type must be email_verification or password_reset",
    }),
  }),
});

export const AuthValidation = {
  register,
  verifyEmail,
  login,
  changePassword,
  refreshToken,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  resendOtp,
};
