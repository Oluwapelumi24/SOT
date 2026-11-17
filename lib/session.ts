import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

const COOKIE = "sot_session";
const key = () => new TextEncoder().encode(process.env.SESSION_SECRET || "dev-only-secret-change-me");

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function currentUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function currentUser() {
  const id = await currentUserId();
  if (!id) return null;
  return db.user.findUnique({ where: { id } });
}

/** Signed-in user plus their (first) workspace membership. Redirects when missing. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireMember() {
  const user = await requireUser();
  if (!user.userType) redirect("/onboarding");
  const membership = await db.membership.findFirst({
    where: { userId: user.id },
    include: { workspace: true },
    orderBy: { id: "asc" },
  });
  if (!membership) redirect("/onboarding");
  return { user, membership, workspace: membership.workspace };
}
