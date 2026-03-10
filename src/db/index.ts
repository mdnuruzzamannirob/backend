import mongoose from "mongoose";
import { config } from "../config";
import logger from "../utils/logger";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.DATABASE_URL);
    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB connection error", { error });
    process.exit(1);
  }
};
