"use server";

import { ID } from "node-appwrite";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient, createSessionClient, SESSION_COOKIE } from "@/lib/appwrite/server";

type State = { error?: string; message?: string } | undefined;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

function getMessage(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}

async function setSessionCookie(secret: string) {
  (await cookies()).set(SESSION_COOKIE, secret, {
    path: "/",
    httpOnly: true,
    sameSite: "lax", // "lax" so email links still keep the user logged in
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signUp(_: State, formData: FormData): Promise<State> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 8) {
    return { error: "Enter your name, email, and a password of at least 8 characters." };
  }

  try {
    const { account } = createAdminClient();
    await account.create({ userId: ID.unique(), email, password, name });
    const session = await account.createEmailPasswordSession({ email, password });
    await setSessionCookie(session.secret);
  } catch (e) {
    return { error: getMessage(e) };
  }

  // Send the verification email. Do not block sign up if this fails.
  try {
    const { account } = await createSessionClient();
    await account.createVerification({ url: `${APP_URL}/verify` });
  } catch {}

  redirect("/dashboard");
}

export async function signIn(_: State, formData: FormData): Promise<State> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  try {
    const { account } = createAdminClient();
    const session = await account.createEmailPasswordSession({ email, password });
    await setSessionCookie(session.secret);
  } catch (e) {
    console.error("signIn error:", e);
    return { error: "Wrong email or password." };
  }

  redirect("/dashboard");
}

export async function signOut() {
  try {
    const { account } = await createSessionClient();
    await account.deleteSession({ sessionId: "current" });
  } catch {}
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function resendVerification(): Promise<State> {
  try {
    const { account } = await createSessionClient();
    await account.createVerification({ url: `${APP_URL}/verify` });
    return { message: "Verification email sent." };
  } catch (e) {
    return { error: getMessage(e) };
  }
}

export async function forgotPassword(_: State, formData: FormData): Promise<State> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { error: "Please enter your email address." };
  }
  try {
    const { account } = createAdminClient();
    await account.createRecovery({ email, url: `${APP_URL}/reset-password` });
  } catch (e) {
    console.error("forgotPassword error:", e);
  }
  // Same message always, so nobody can find out which emails exist.
  return { message: "If this email has an account, we sent a reset link." };
}

export async function resetPassword(_: State, formData: FormData): Promise<State> {
  const userId = String(formData.get("userId") ?? "");
  const secret = String(formData.get("secret") ?? "");
  const password = String(formData.get("password") ?? "");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  try {
    const { account } = createAdminClient();
    await account.updateRecovery({ userId, secret, password });
  } catch (e) {
    console.error("resetPassword error:", e);
    return { error: "This reset link is wrong or expired. Ask for a new one." };
  }

  redirect("/login");
}
