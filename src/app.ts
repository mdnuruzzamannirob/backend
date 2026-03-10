import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import router from "./routes";
import errorHandler from "./middleware/errorHandler";
import notFound from "./middleware/notFound";
import httpLogger from "./middleware/httpLogger";
import { config } from "./config";

const app: Application = express();

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  }),
);

// Rate limiting (100 requests per 15 minutes per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
});
app.use("/api", apiLimiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: "Too many auth attempts, please try again after 15 minutes",
  },
});
app.use("/api/v1/auth", authLimiter);

// Stripe webhook needs raw body — must come BEFORE json parser
app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));

// Body parsers
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// HTTP request logging (all environments except test)
app.use(httpLogger);

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res
    .status(200)
    .json({ success: true, status: "OK", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/v1", router);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
