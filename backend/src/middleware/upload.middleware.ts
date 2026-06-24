import multer from "multer";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
    files: env.MAX_FILES_PER_MESSAGE,
  },
  fileFilter: (_req, file, callback) => {
    if (
      !allowedMimeTypes.has(file.mimetype) &&
      !file.mimetype.startsWith("audio/")
    ) {
      callback(new ApiError(400, `Unsupported file type: ${file.mimetype}`));
      return;
    }

    callback(null, true);
  },
});
