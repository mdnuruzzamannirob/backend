import morgan, { StreamOptions } from "morgan";
import logger from "../utils/logger";

// Pipe morgan output into winston
const stream: StreamOptions = {
  write: (message: string) => logger.http(message.trim()),
};

// Skip logging in test environment
const skip = () => process.env.NODE_ENV === "test";

const httpLogger = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  { stream, skip },
);

export default httpLogger;
