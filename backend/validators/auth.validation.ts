import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long").max(100),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100).optional(),
});

export const verifyEmailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  otp: z.string().trim().length(6, "OTP must be 6 digits"),
  hashPayload: z.string().trim().min(1, "hashPayload is required"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  otp: z.string().trim().length(6, "OTP must be 6 digits"),
  hashPayload: z.string().trim().min(1, "hashPayload is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long").max(100),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, "Refresh token is required"),
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
