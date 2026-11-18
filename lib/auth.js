import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "");

export async function createSession(adminId) {
  const t = await new SignJWT({ id: adminId }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(key());
  cookies().set("nl_admin", t, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 604800 });
}
export async function getAdminId() {
  const c = cookies().get("nl_admin");
  if (!c) return null;
  try { const { payload } = await jwtVerify(c.value, key()); return payload.id; } catch { return null; }
}
export function clearSession() { cookies().delete("nl_admin"); }
