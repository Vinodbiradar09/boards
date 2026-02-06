import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string" || email.length < 5) return false;
  const index = email.indexOf("@");
  if (
    index < 1 ||
    index === email.length - 1 ||
    email.indexOf("@", index + 1) !== -1
  ) {
    return false;
  }
  if (
    email.includes("..") ||
    email.startsWith(".") ||
    email.endsWith(".") ||
    email.endsWith("@") ||
    email.startsWith("@")
  ) {
    return false;
  }
  return EMAIL_REGEX.test(email);
}
