// Augment Express Request — no top-level imports so this stays an ambient module
declare namespace Express {
  interface Request {
    user?: {
      userId: string;
      role: "user" | "admin";
    };
  }
}
