import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  throw new Error("RESEND_API_KEY is not defined");
}

const resend = new Resend(apiKey);

const emailFrom =
  process.env.EMAIL_FROM || "IP-SAKTI Sahayak <onboarding@resend.dev>";

export async function sendOtpEmail(
  email: string,
  otp: string,
  purpose: "verification" | "password-reset"
) {
  const isVerification = purpose === "verification";

  const subject = isVerification
    ? "Verify your IP-SAKTI Sahayak account"
    : "Reset your IP-SAKTI Sahayak password";

  const heading = isVerification
    ? "Verify your email"
    : "Reset your password";

  const { data, error } = await resend.emails.send({
    from: emailFrom,
    to: email,
    subject,
    html: `
      <div>
        <h2>${heading}</h2>

        <p>Your OTP is:</p>

        <h1 style="letter-spacing: 6px;">
          ${otp}
        </h1>

        <p>This OTP is valid for 10 minutes.</p>

        <p>
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}