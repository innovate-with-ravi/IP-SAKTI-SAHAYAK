const apiKey = process.env.BREVO_API_KEY;

if (!apiKey) {
  throw new Error("BREVO_API_KEY is not defined");
}

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

const sender = process.env.EMAIL_FROM;

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

  const html = `
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
    `;

  const text =
    `${heading}\n\nYour OTP is: ${otp}\n\n` +
    `This OTP is valid for 10 minutes.\n\n` +
    `If you did not request this, you can safely ignore this email.`;

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey as string,
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "IP-SAKTI Sahayak",
        email: process.env.EMAIL_FROM || "nitin20071501@gmail.com",
      },
      to: [{ email }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    messageId?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      `Failed to send email: ${data.message ?? `Brevo API error ${response.status}`}`
    );
  }

  return data; // { messageId: "<...>" }
}