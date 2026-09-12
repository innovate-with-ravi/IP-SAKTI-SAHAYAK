import type { Request, Response } from "express";

import {
  createUser,
  findUserByEmail,
  markEmailVerified,
  updatePassword,
  verifyPassword,
  createRefreshToken,
  findValidRefreshToken,
  findUserById,
  revokeRefreshToken
} from "../services/auth.js";

import {
  generateOtpWithHash,
  verifyOtpToken,
} from "../services/otp.js";

import { sendOtpEmail } from "../services/email.js";

import { generateAccessToken } from "../utils/jwt.util.js";

//signup
export async function signup(
  req: Request,
  res: Response
) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const user = await createUser(
      email,
      password,
      name
    );

    const { otp, hashPayload } =
      generateOtpWithHash(email);

    // Commented out email sending for now (hackathon demo / Resend limits):
    // await sendOtpEmail(
    //   email,
    //   otp,
    //   "verification"
    // );

    return res.status(201).json({
      message:
        "Account created. Please verify your email.",

      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },

      verification: {
        hashPayload,
        expiresIn: 600,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "USER_EXISTS"
    ) {
      return res.status(409).json({
        error: "User already exists",
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "Failed to create account",
    });
  }
}

//verify email
export async function verifyEmail(
  req: Request,
  res: Response
) {
  try {
    const {
      email,
      otp,
      hashPayload,
    } = req.body;

    if (!email || !otp || !hashPayload) {
      return res.status(400).json({
        error:
          "Email, OTP and hashPayload are required",
      });
    }

    // Commented out OTP verification check for now (hackathon demo):
    /*
    const valid = verifyOtpToken(
      email,
      otp,
      hashPayload
    );

    if (!valid) {
      return res.status(400).json({
        error: "Invalid or expired OTP",
      });
    }
    */

    const user = await markEmailVerified(email);

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshTokenRecord = await createRefreshToken(user.id);

    return res.json({
      message: "Email verified successfully",

      accessToken,
      refreshToken: refreshTokenRecord.token,

      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Email verification failed",
    });
  }
}

//login
export async function login(
  req: Request,
  res: Response
) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const passwordValid =
      await verifyPassword(
        password,
        user.passwordHash
      );

    if (!passwordValid) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    // Commented out email verification check for now (hackathon demo):
    /*
    if (!user.emailVerified) {
      return res.status(403).json({
        error:
          "Please verify your email before logging in",
      });
    }
    */

    const accessToken =
      generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

    const refreshTokenRecord = await createRefreshToken(user.id);

    return res.json({
      message: "Login successful",

      accessToken,
      refreshToken: refreshTokenRecord.token,

      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Login failed",
    });
  }
}

//forgot password
export async function forgotPassword(
  req: Request,
  res: Response
) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const {
      otp,
      hashPayload,
    } = generateOtpWithHash(email);

    // Commented out email sending for now (hackathon demo / Resend limits):
    // await sendOtpEmail(
    //   email,
    //   otp,
    //   "password-reset"
    // );

    return res.json({
      message: "Password reset OTP sent",

      reset: {
        hashPayload,
        expiresIn: 600,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to send reset OTP",
    });
  }
}

//Reset password
export async function resetPassword(
  req: Request,
  res: Response
) {
  try {
    const {
      email,
      otp,
      hashPayload,
      newPassword,
    } = req.body;

    if (
      !email ||
      !otp ||
      !hashPayload ||
      !newPassword
    ) {
      return res.status(400).json({
        error:
          "Email, OTP, hashPayload and newPassword are required",
      });
    }

    // Commented out OTP verification check for now (hackathon demo):
    /*
    const valid = verifyOtpToken(
       email,
       otp,
       hashPayload
     );

     if (!valid) {
       return res.status(400).json({
         error: "Invalid or expired OTP",
       });
     }
     */

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    await updatePassword(
      user.id,
      newPassword
    );

    return res.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to reset password",
    });
  }
}

// Refresh token
export async function refreshToken(
  req: Request,
  res: Response
) {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "Refresh token is required",
      });
    }

    const storedToken = await findValidRefreshToken(token);

    if (!storedToken) {
      return res.status(401).json({
        error: "Invalid or expired refresh token",
      });
    }

    const user = await findUserById(storedToken.userId);

    if (!user) {
      return res.status(401).json({
        error: "User not found",
      });
    }

    // Rotate refresh token: revoke existing and issue a new one
    await revokeRefreshToken(token);
    const newRefreshToken = await createRefreshToken(user.id);

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return res.json({
      accessToken,
      refreshToken: newRefreshToken.token,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to refresh token",
    });
  }
}

// Logout
export async function logout(
  req: Request,
  res: Response
) {
  try {
    const { refreshToken: token } = req.body;

    if (token) {
      await revokeRefreshToken(token);
    }

    return res.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Failed to log out",
    });
  }
}
