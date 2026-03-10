import app from "./app";
import { connectDB } from "./db";
import { config } from "./config";
import logger from "./utils/logger";
import { initCronJobs } from "./jobs/cronJobs";

const startServer = async () => {
  await connectDB();

  // Initialize scheduled tasks
  initCronJobs();

  const server = app.listen(config.PORT, () => {
    logger.info(
      `Server running in ${config.NODE_ENV} mode on http://localhost:${config.PORT}`,
    );
  });

  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("unhandledRejection", (err: Error) => {
    logger.error("Unhandled Rejection", {
      message: err?.message,
      stack: err?.stack,
    });
    server.close(() => process.exit(1));
  });
};

startServer();
