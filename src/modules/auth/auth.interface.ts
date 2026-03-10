export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IRegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface ITokenPayload {
  userId: string;
  role: string;
}

export interface IChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface IForgotPasswordPayload {
  email: string;
}

export interface IVerifyEmailPayload {
  email: string;
  otp: string;
}

export interface IVerifyResetOtpPayload {
  email: string;
  otp: string;
}

export interface IResendOtpPayload {
  email: string;
  type: "email_verification" | "password_reset";
}

export interface IResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}
