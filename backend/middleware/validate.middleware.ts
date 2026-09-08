import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

/**
 * Middleware that validates req.body against a Zod schema.
 * Replaces req.body with the parsed/sanitized data if successful,
 * or returns a 400 response with detailed validation issues.
 */
export const validateBody = (schema: ZodType) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: "Validation error",
        details: result.error.flatten(),
      });
      return;
    }

    req.body = result.data;
    next();
  };
};
