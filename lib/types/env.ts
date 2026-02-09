import "server-only";
import { z } from "zod";
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  DATABASE_URL: z.string(),
  EMAIL_FROM: z.string(),
  RESEND_API_KEY: z.string(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  // NextAuth
  NEXTAUTH_URL: z.string().optional(),
  NEXTAUTH_SECRET: z.string(),
});

export const env = schema.parse(process.env);