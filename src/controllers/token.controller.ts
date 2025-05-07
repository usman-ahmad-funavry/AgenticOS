import { Context } from "hono";
import { env } from "../config/env";
import { saveTokens } from "../utils/encryption";
import { ApiResponse, TokenLoadRequest } from "../types";

/**
 * Load and encrypt Twitter tokens
 * @param c - Hono context
 * @returns Response with token save result
 */
export const loadTokens = async (c: Context): Promise<Response> => {
  try {
    const { accessToken, refreshToken, password } =
      await c.req.json<TokenLoadRequest>();

    if (!accessToken || !refreshToken || !password) {
      return c.json<ApiResponse>(
        {
          success: false,
          message: "Access token, refresh token and password are required",
          error:
            "Missing required fields: accessToken and/or refreshToken and/or password",
        },
        400
      );
    }
    // Verify password
    const isPasswordValid = password === env.PASSWORD_AUTH;
    // If using bcrypt:
    // const isPasswordValid = await compare(body.password, env.TOKEN_SET_PASSWORD);

    if (!isPasswordValid) {
      return c.json(
        {
          success: false,
          message: "Unauthorized: Invalid password",
        },
        401
      );
    }
    await saveTokens(accessToken, refreshToken, env.ENCRYPTION_KEY);

    return c.json<ApiResponse>({
      success: true,
      message: "Tokens saved successfully",
    });
  } catch (error) {
    console.error("Error saving tokens:", error);

    return c.json<ApiResponse>(
      {
        success: false,
        message: "Failed to save tokens",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
};
