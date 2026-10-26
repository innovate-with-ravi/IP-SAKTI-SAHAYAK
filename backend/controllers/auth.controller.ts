import type { Request, Response } from "express";

import {
  createUser,
  createVerifiedUser,
  hashPassword,
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
  generateOtp,
  verifyOtp,
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

    // Check if user already exists in the database
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        error: "User already exists",
      });
    }

    // Hash the password securely
    const passwordHash = await hashPassword(password);

    // Generate encrypted registration token with 6-digit OTP
    const { otp, hashPayload, expiresIn } = generateOtp({
      email,
      purpose: "verification",
      data: {
        passwordHash,
        name,
      },
    });

  
    await sendOtpEmail(
      email,
      otp,
      "verification"
     );

    return res.status(200).json({
      message:
        "OTP sent to your email. Please verify to complete registration.",

      verification: {
        hashPayload,
        expiresIn,
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
      error: "Failed to initiate registration",
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

    // Use single unified verifyOtp function
    const result = verifyOtp(email, otp, hashPayload, "verification");

    if (!result.valid) {
      return res.status(400).json({
        error: result.error,
      });
    }
    

    let user;

    // If registration payload has passwordHash, create the verified user now
    if (result.data?.passwordHash) {
      const existingUser = await findUserByEmail(result.data.email);
      if (existingUser) {
        return res.status(409).json({
          error: "User already exists",
        });
      }

      user = await createVerifiedUser(
        result.data.email,
        result.data.passwordHash,
        result.data.name
      );
    } else {
      // Fallback for existing user in database
      const existingUser = await findUserByEmail(email);
      if (!existingUser) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      user = await markEmailVerified(email);
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshTokenRecord = await createRefreshToken(user.id);

    return res.status(201).json({
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

    
    if (!user.emailVerified) {
      return res.status(403).json({
        error:
          "Please verify your email before logging in",
      });
    }
    

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
      expiresIn,
    } = generateOtp({
      email,
      purpose: "password-reset",
    });

     
     await sendOtpEmail(
      email,
      otp,
      "password-reset"
    );

    return res.json({
      message: "Password reset OTP sent",

      reset: {
        hashPayload,
        expiresIn,
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

    const result = verifyOtp(
      email,
      otp,
      hashPayload,
      "password-reset"
    );

    if (!result.valid) {
      return res.status(400).json({
        error: result.error,
      });
    }     

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
