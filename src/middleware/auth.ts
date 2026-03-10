import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";
import { config } from "../config";
import AppError from "../errors/AppError";
import User from "../modules/user/user.model";
import { TUserRole } from "../modules/user/user.interface";

const auth = (...requiredRoles: TUserRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError("No token provided", StatusCodes.UNAUTHORIZED);
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;

      const user = await User.findById(decoded.userId);
      if (!user) {
        throw new AppError("User not found", StatusCodes.UNAUTHORIZED);
      }
      if (!user.isActive) {
        throw new AppError("Account is deactivated", StatusCodes.FORBIDDEN);
      }
      if (!user.isVerified) {
        throw new AppError(
          "Email not verified. Please verify your email first.",
          StatusCodes.FORBIDDEN,
        );
      }
      if (user.isPasswordChangedAfter(decoded.iat as number)) {
        throw new AppError(
          "Password changed recently. Please log in again",
          StatusCodes.UNAUTHORIZED,
        );
      }

      if (
        requiredRoles.length &&
        !requiredRoles.includes(decoded.role as TUserRole)
      ) {
        throw new AppError(
          "You do not have permission to perform this action",
          StatusCodes.FORBIDDEN,
        );
      }

      req.user = { userId: decoded.userId, role: decoded.role as TUserRole };
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default auth;
