import { Document, Model } from "mongoose";

export type TUserRole = "user" | "admin";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: TUserRole;
  isActive: boolean;
  isVerified: boolean;
  isDeleted: boolean;
  passwordChangedAt?: Date;
}

export interface IUserMethods {
  isPasswordMatch(
    candidatePassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
  isPasswordChangedAfter(jwtIssuedAt: number): boolean;
}

export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;
