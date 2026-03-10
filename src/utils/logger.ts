import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const logsDir = path.join(process.cwd(), "logs");

// ── Console format (human-friendly, colorised) ─────────────────────────────
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level}: ${stack || message}${extras}`;
  }),
);

// ── File format (structured JSON) ──────────────────────────────────────────
const fileFormat = combine(timestamp(), errors({ stack: true }), json());

const dailyRotateOptions = {
  dirname: logsDir,
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
};

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  transports: [
    // All levels → combined.log (rotated daily)
    new DailyRotateFile({
      ...dailyRotateOptions,
      filename: "combined-%DATE%.log",
      format: fileFormat,
    }),
    // Errors only → error.log (rotated daily)
    new DailyRotateFile({
      ...dailyRotateOptions,
      filename: "error-%DATE%.log",
      level: "error",
      format: fileFormat,
    }),
  ],
});

// Print to console in all environments
logger.add(new winston.transports.Console({ format: consoleFormat }));

export default logger;
