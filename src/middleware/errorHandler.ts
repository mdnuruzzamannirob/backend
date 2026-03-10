import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import AppError from "../errors/AppError";
import { config } from "../config";
import logger from "../utils/logger";

const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
  let message = "Internal server error";
  let errors: { path: string; message: string }[] | undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Validation error";
    errors = err.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = "Validation error";
    errors = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if ((err as any).code === 11000) {
    statusCode = StatusCodes.CONFLICT;
    const field = Object.keys((err as any).keyValue || {})[0];
    message = `Duplicate value for field: ${field}`;
  } else if (err.name === "JsonWebTokenError") {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    statusCode = StatusCodes.UNAUTHORIZED;
    message = "Token expired";
  }

  const response: Record<string, unknown> = {
    success: false,
    statusCode,
    message,
    ...(errors && { errors }),
  };

  if (config.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  // Log unexpected server errors at error level; operational errors at warn
  if (statusCode >= 500) {
    logger.error(err.message, { stack: err.stack, statusCode });
  } else if (!(err instanceof AppError)) {
    logger.warn(err.message, { statusCode });
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
