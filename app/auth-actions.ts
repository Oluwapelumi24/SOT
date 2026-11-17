"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";

const err = (path: string, msg: string) => redirect(`${path}?error=${encodeURIComponent(msg)}`);

export async function signup(form: FormData) {
  const parsed = z
    .object({ name: z.string().trim().min(1, "Enter your name"), email: z.string().trim().toLowerCase().email("Enter a valid email"), password: z.string().min(8, "Password must be at least 8 characters") })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return err("/signup", parsed.error.issues[0].message);
  const { name, email, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (existing?.passwordHash) return err("/signup", "An account with this email already exists. Sign in instead.");
  const passwordHash = await bcrypt.hash(password, 10);
  // An invited person already has a user row without a password: claim it.
  const user = existing
    ? await db.user.update({ where: { id: existing.id }, data: { name, passwordHash } })
    : await db.user.create({ data: { name, email, passwordHash } });
  await createSession(user.id);
  redirect("/onboarding");
}

export async function login(form: FormData) {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return err("/login", "Email or password is wrong.");
  await createSession(user.id);
  redirect("/app");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
