import crypto from "crypto";

const envOtpSecret = process.env.OTP_SECRET;

if (!envOtpSecret) {
  throw new Error("OTP_SECRET is not defined");
}

const OTP_SECRET: string = envOtpSecret;
const OTP_TTL = 10 * 60 * 1000; // 10 minutes

const ENCRYPTION_KEY = crypto.createHash("sha256").update(OTP_SECRET).digest();

export type OtpPurpose = "verification" | "password-reset";

export interface OtpPayload {
  email: string;
  otp: string;
  purpose: OtpPurpose;
  expiresAt: number;
  data?: {
    passwordHash?: string | undefined;
    name?: string | null | undefined;
  } | undefined;
}

export type VerifyOtpResult =
  | {
      valid: true;
      purpose: OtpPurpose | "legacy";
      data?: {
        email: string;
        passwordHash?: string | undefined;
        name: string | null;
      } | undefined;
    }
  | {
      valid: false;
      reason: "INVALID_TOKEN" | "EXPIRED_OTP" | "EMAIL_MISMATCH" | "INVALID_OTP" | "PURPOSE_MISMATCH";
      error: string;
    };

/**
 * Single unified function to generate OTPs for any purpose (verification, password reset, etc.)
 */
export function generateOtp(params: {
  email: string;
  purpose: OtpPurpose;
  data?: {
    passwordHash?: string | undefined;
    name?: string | null | undefined;
  } | undefined;
}): { otp: string; hashPayload: string; expiresIn: number } {
  // Cryptographically secure 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();
  const expiresAt = Date.now() + OTP_TTL;

  const payload: OtpPayload = {
    email: params.email.toLowerCase().trim(),
    otp,
    purpose: params.purpose,
    expiresAt,
    data: params.data,
  };

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const hashPayload = `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;

  return {
    otp,
    hashPayload,
    expiresIn: Math.floor(OTP_TTL / 1000),
  };
}

/**
 * Single unified function to verify all types of OTPs (verification, password reset, and legacy HMAC).
 */
export function verifyOtp(
  email: string,
  otp: string,
  hashPayload: string,
  expectedPurpose?: OtpPurpose
): VerifyOtpResult {
  try {
    const parts = hashPayload.split(".");

    // Case 1: Unified encrypted token (3 parts: iv.tag.ciphertext)
    if (parts.length === 3) {
      const [ivB64, tagB64, dataB64] = parts;
      if (!ivB64 || !tagB64 || !dataB64) {
        return { valid: false, reason: "INVALID_TOKEN", error: "Invalid OTP token" };
      }

      const iv = Buffer.from(ivB64, "base64url");
      const tag = Buffer.from(tagB64, "base64url");
      const encryptedData = Buffer.from(dataB64, "base64url");

      if (iv.length !== 12 || tag.length !== 16) {
        return { valid: false, reason: "INVALID_TOKEN", error: "Invalid OTP token" };
      }

      const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      const payload: OtpPayload = JSON.parse(decrypted.toString("utf8"));

      if (!payload.expiresAt || Date.now() > payload.expiresAt) {
        return { valid: false, reason: "EXPIRED_OTP", error: "OTP has expired. Please request a new one." };
      }

      if (payload.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
        return { valid: false, reason: "EMAIL_MISMATCH", error: "Invalid email for this OTP" };
      }

      if (expectedPurpose && payload.purpose !== expectedPurpose) {
        return { valid: false, reason: "PURPOSE_MISMATCH", error: "Invalid OTP for this action" };
      }

      const clientOtpBuffer = Buffer.from(otp.trim());
      const expectedOtpBuffer = Buffer.from(payload.otp.trim());

      if (
        clientOtpBuffer.length !== expectedOtpBuffer.length ||
        !crypto.timingSafeEqual(clientOtpBuffer, expectedOtpBuffer)
      ) {
        return { valid: false, reason: "INVALID_OTP", error: "Invalid OTP" };
      }

      return {
        valid: true,
        purpose: payload.purpose,
        data: {
          email: payload.email,
          passwordHash: payload.data?.passwordHash,
          name: payload.data?.name ?? null,
        },
      };
    }

    // Case 2: Legacy HMAC hash (2 parts: hash.expiresAt)
    if (parts.length === 2) {
      const [clientHash, expiresAtString] = parts;
      if (!clientHash || !expiresAtString) {
        return { valid: false, reason: "INVALID_TOKEN", error: "Invalid OTP token" };
      }

      const expiresAt = Number(expiresAtString);
      if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
        return { valid: false, reason: "EXPIRED_OTP", error: "OTP has expired. Please request a new one." };
      }

      const dataToHash = `${email}.${otp}.${expiresAt}`;
      const computedHash = crypto
        .createHmac("sha256", OTP_SECRET)
        .update(dataToHash)
        .digest("hex");

      const clientBuffer = Buffer.from(clientHash, "hex");
      const computedBuffer = Buffer.from(computedHash, "hex");

      if (
        clientBuffer.length !== computedBuffer.length ||
        !crypto.timingSafeEqual(clientBuffer, computedBuffer)
      ) {
        return { valid: false, reason: "INVALID_OTP", error: "Invalid OTP" };
      }

      return {
        valid: true,
        purpose: "legacy",
        data: {
          email,
          name: null,
        },
      };
    }

    return { valid: false, reason: "INVALID_TOKEN", error: "Invalid OTP format" };
  } catch {
    return { valid: false, reason: "INVALID_TOKEN", error: "Invalid OTP token" };
  }
}

// Aliases for backwards compatibility:
export function generateOtpWithHash(email: string) {
  return generateOtp({ email, purpose: "password-reset" });
}

export function verifyOtpToken(email: string, otp: string, hashPayload: string): boolean {
  return verifyOtp(email, otp, hashPayload).valid;
}