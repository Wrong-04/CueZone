import type { CorsOptions } from "cors";

export const getAllowedOrigins = (): string[] => {
  const envOrigins = (
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGIN ||
    ""
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaultOrigins = [
    "http://localhost:5556",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5556",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
  ];

  if (process.env.NODE_ENV === "production" && envOrigins.length > 0) {
    return envOrigins;
  }

  return Array.from(new Set([...envOrigins, ...defaultOrigins]));
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const allowed = getAllowedOrigins();
    if (allowed.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== "production") {
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost) {
        return callback(null, true);
      }
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};
