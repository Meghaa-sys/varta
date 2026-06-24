import type { RequestHandler } from "express";
import type { AnyZodObject, ZodTypeAny } from "zod";

export const validateBody =
  (schema: AnyZodObject): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };

export const validateQuery =
  (schema: ZodTypeAny): RequestHandler =>
  (req, _res, next) => {
    req.query = schema.parse(req.query);
    next();
  };
