import dotenv from "dotenv";

dotenv.config();

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const requiredInProduction = (name: string, value: string | undefined) => {
  if (process.env.NODE_ENV === "production" && !value) {
    throw new Error(`Missing required production environment variable: ${name}`);
  }
  return value ?? "";
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: toNumber(process.env.PORT, 4000),
  DATABASE_URL: requiredInProduction("DATABASE_URL", process.env.DATABASE_URL),
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-only-change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
  CLIENT_URL: process.env.CLIENT_URL ?? "http://localhost:5173",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-1.5-flash",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ?? "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",
  MAX_FILE_SIZE_MB: toNumber(process.env.MAX_FILE_SIZE_MB, 15),
  MAX_FILES_PER_MESSAGE: toNumber(process.env.MAX_FILES_PER_MESSAGE, 5)
};

export const isProduction = env.NODE_ENV === "production";
export const allowedOrigins = env.CLIENT_URL.split(",").map((origin) => origin.trim());
