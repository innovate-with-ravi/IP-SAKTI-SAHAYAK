import jwt from "jsonwebtoken";

const envJwtSecret = process.env.JWT_SECRET;

if (!envJwtSecret) {
  throw new Error("JWT_SECRET is not defined");
}

const JWT_SECRET: string = envJwtSecret;

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateAccessToken(
  payload: AccessTokenPayload
): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "15m",
  });
}