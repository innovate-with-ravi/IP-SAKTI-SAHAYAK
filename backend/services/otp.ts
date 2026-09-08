import crypto from "crypto";

const envOtpSecret = process.env.OTP_SECRET;

if (!envOtpSecret) {
  throw new Error("OTP_SECRET is not defined");
}

const OTP_SECRET: string = envOtpSecret;

const OTP_TTL = 10 * 60 * 1000; // 10 minutes

export function generateOtpWithHash(email: string) {
  // Cryptographically secure 6-digit OTP
  const otp = crypto.randomInt(100000, 1000000).toString();

  const expiresAt = Date.now() + OTP_TTL;

  const dataToHash = `${email}.${otp}.${expiresAt}`;

  const hash = crypto
    .createHmac("sha256", OTP_SECRET)
    .update(dataToHash)
    .digest("hex");

  const hashPayload = `${hash}.${expiresAt}`;

  return {
    otp,
    hashPayload,
    expiresAt,
  };
}

export function verifyOtpToken(
  email: string,
  otp: string,
  hashPayload: string
): boolean {
  try {
    const [clientHash, expiresAtString] = hashPayload.split(".");

    if (!clientHash || !expiresAtString) {
      return false;
    }

    const expiresAt = Number(expiresAtString);

    if (!Number.isFinite(expiresAt)) {
      return false;
    }

    // OTP expired
    if (Date.now() > expiresAt) {
      return false;
    }

    const dataToHash = `${email}.${otp}.${expiresAt}`;

    const computedHash = crypto
      .createHmac("sha256", OTP_SECRET)
      .update(dataToHash)
      .digest("hex");

    const clientBuffer = Buffer.from(clientHash, "hex");
    const computedBuffer = Buffer.from(computedHash, "hex");

    if (clientBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(clientBuffer, computedBuffer);
  } catch {
    return false;
  }
}