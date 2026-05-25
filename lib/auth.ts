import "server-only";
import type { SessionOptions } from "iron-session";

export type AdminSession = {
  isAuthed?: boolean;
  loggedInAt?: number;
};

// No placeholder fallback in any environment. A weak literal secret that
// lives in the public git history would let anyone who knows the codebase
// forge an iron-session cookie on any reachable instance. Better to fail
// loud and force the operator to set a real secret.
const SECRET = process.env.ADMIN_SESSION_SECRET;
if (!SECRET || SECRET.length < 32) {
  throw new Error(
    "ADMIN_SESSION_SECRET is missing or shorter than 32 characters. " +
      "Generate one with: openssl rand -base64 36",
  );
}

export const sessionOptions: SessionOptions = {
  password: SECRET,
  cookieName: "furkanunsalan_admin",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 14, // 14 days
    path: "/",
  },
};
