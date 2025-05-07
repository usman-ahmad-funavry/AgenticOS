import { env } from "../config/env";

// Authentication middleware
export default async function authMiddleware(c: any, next: any) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader) {
    return c.json(
      {
        success: false,
        message: "Unauthorized: No password provided",
      },
      401
    );
  }

  const password = authHeader.split(" ")[1];
  if (password !== env.PASSWORD_AUTH) {
    return c.json(
      {
        success: false,
        message: "Unauthorized: Invalid password",
      },
      401
    );
  }

  await next();
}
