import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { IUser, IUserMethods, UserModel } from "./user.interface";
import { config } from "../../config";

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true },
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, config.BCRYPT_SALT_ROUNDS);
  this.passwordChangedAt = new Date(Date.now() - 1000);
});

// Exclude soft-deleted users from find queries
userSchema.pre(/^find/, function (this: any) {
  this.find({ isDeleted: { $ne: true } });
});

userSchema.methods.isPasswordMatch = async function (
  candidatePassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

userSchema.methods.isPasswordChangedAfter = function (
  jwtIssuedAt: number,
): boolean {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(
      this.passwordChangedAt.getTime() / 1000,
    );
    return jwtIssuedAt < changedTimestamp;
  }
  return false;
};

const User = model<IUser, UserModel>("User", userSchema);

export default User;
