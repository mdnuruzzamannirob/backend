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

const resetPassword = z.object({
  body: z.object({
    token: z.string({ error: "Token is required" }),
    newPassword: passwordSchema,
  }),
});

export const AuthValidation = {
  register,
  login,
  changePassword,
  refreshToken,
  forgotPassword,
  resetPassword,
};
