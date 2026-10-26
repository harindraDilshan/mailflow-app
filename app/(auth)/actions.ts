"use server";

import { AuthenticationFactor, ID } from "node-appwrite";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  createAdminClient, createSessionClient, sessionCookieOptions, SESSION_COOKIE,
} from "@/lib/appwrite/server";
import { getSessionState } from "@/lib/auth";
import { authErrorMessage, needsSecondFactor, passwordProblem, safeNext } from "@/lib/auth-rules";
import { isValidEmail, normalizeEmail, normalizeName } from "@/lib/contact-rules";
import { clientIp } from "@/lib/api-helpers";
import { rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string; message?: string } | undefined;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

async function visitor() {
  const h = await headers();
  return { ip: clientIp(h), userAgent: h.get("user-agent") ?? undefined };
}

/**
 * The server calls Appwrite with an API key, and Appwrite does not rate-limit API-key calls.
 * So these limits are the only protection against password guessing and email flooding.
 * Returns a message when one of the counters is over its limit.
 */
async function overLimit(name: string, ids: string[], limit: number, windowSec: number) {
  for (const id of ids) {
    const r = await rateLimit(name, id, limit, windowSec);
    if (!r.ok) return `Too many attempts. Try again in ${Math.max(1, Math.ceil(r.retryAfter / 60))} minutes.`;
  }
  return null;
}

async function startSession(secret: string, expire: string, remember: boolean) {
  (await cookies()).set(SESSION_COOKIE, secret, sessionCookieOptions(remember ? new Date(expire) : undefined));
}

// Same attributes as when it was set: a "__Host-" cookie is only removed with Secure and Path=/.
async function clearSession() {
  (await cookies()).set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}

// ---------- sign up ----------
export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const name = normalizeName(String(formData.get("name") ?? "")).slice(0, 128);
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Enter your name." };
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  const problem = passwordProblem(password, { email, name });
  if (problem) return { error: problem };

  const { ip, userAgent } = await visitor();
  const limited = await overLimit("signup-ip", [ip], 5, 3600);
  if (limited) return { error: limited };

  let secret: string;
  try {
    const { account } = createAdminClient({ userAgent });
    await account.create({ userId: ID.unique(), email, password, name });
    const session = await account.createEmailPasswordSession({ email, password });
    secret = session.secret;
    await startSession(session.secret, session.expire, true);
  } catch (e) {
    return { error: authErrorMessage(e, "Your account could not be created. Try again.") };
  }

  // Send the verification email. Sign-up does not fail if this fails: the dashboard offers "Resend".
  try {
    const { account } = await createSessionClient(secret);
    await account.createEmailVerification({ url: `${APP_URL}/verify` });
  } catch (e) {
    console.error("Could not send the verification email", e);
  }

  redirect("/dashboard");
}

// ---------- log in ----------
export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const next = safeNext(formData.get("next"));

  if (!email || !password) return { error: "Enter your email and password." };

  const { ip, userAgent } = await visitor();
  // Per visitor: one person trying many accounts. Per email: many visitors trying one account.
  const limited = (await overLimit("login-ip", [ip], 20, 900)) ?? (await overLimit("login-email", [email], 10, 900));
  if (limited) return { error: limited };

  let secret: string;
  try {
    const { account } = createAdminClient({ userAgent });
    const session = await account.createEmailPasswordSession({ email, password });
    secret = session.secret;
    await startSession(session.secret, session.expire, remember);
  } catch (e) {
    return { error: authErrorMessage(e, "Could not log in. Try again in a moment.") };
  }

  // With 2-step verification on, the new session needs a code before it can do anything.
  let secondStep = false;
  try {
    const { account } = await createSessionClient(secret);
    await account.get();
  } catch (e) {
    secondStep = needsSecondFactor(e);
  }
  redirect(secondStep ? `/login/verify?next=${encodeURIComponent(next)}` : next);
}

// ---------- the second step: authenticator code, recovery code, or email code ----------
export type SecondFactorState = { error?: string; message?: string; challengeId?: string } | undefined;

export async function sendEmailCode(): Promise<SecondFactorState> {
  const state = await getSessionState();
  if (state.status !== "second-factor") return { error: "Log in again." };

  const secret = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const limited = await overLimit("mfa-email", [secret], 3, 600);
  if (limited) return { error: limited };

  try {
    const { account } = await createSessionClient();
    const challenge = await account.createMFAChallenge({ factor: AuthenticationFactor.Email });
    return { message: "We sent a 6-digit code to your email.", challengeId: challenge.$id };
  } catch (e) {
    return { error: authErrorMessage(e, "The code could not be sent. Try again.") };
  }
}

export async function verifySecondFactor(prev: SecondFactorState, formData: FormData): Promise<SecondFactorState> {
  const method = String(formData.get("method") ?? "totp");
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  const next = safeNext(formData.get("next"));

  const state = await getSessionState();
  if (state.status === "signed-in") redirect(next);
  if (state.status === "signed-out") redirect("/login?reason=expired");
  if (!code) return { ...prev, error: "Enter the code." };

  // 10 tries per session. A 6-digit code has a million values, so guessing needs far more.
  const secret = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const limited = await overLimit("mfa-verify", [secret], 10, 900);
  if (limited) return { ...prev, error: limited };

  try {
    const { account } = await createSessionClient();
    let challengeId = String(formData.get("challengeId") ?? "");
    if (method !== "email") {
      const factor = method === "recovery" ? AuthenticationFactor.Recoverycode : AuthenticationFactor.Totp;
      challengeId = (await account.createMFAChallenge({ factor })).$id;
    }
    if (!challengeId) return { ...prev, error: "Ask for an email code first." };
    await account.updateMFAChallenge({ challengeId, otp: code });
  } catch (e) {
    return { ...prev, error: authErrorMessage(e, "The code is wrong or expired. Try again.") };
  }
  redirect(next);
}

// ---------- log out ----------
export async function signOut() {
  try {
    const { account } = await createSessionClient();
    await account.deleteSession({ sessionId: "current" });
  } catch {}
  await clearSession();
  redirect("/login?reason=signed-out");
}

// ---------- email verification ----------
export async function resendVerification(): Promise<AuthState> {
  const state = await getSessionState();
  if (state.status !== "signed-in") return { error: "Log in first." };
  if (state.user.emailVerification) return { message: "Your email is already verified." };

  const limited = await overLimit("verify-email", [state.user.$id], 3, 3600);
  if (limited) return { error: limited };
  try {
    const { account } = await createSessionClient();
    await account.createEmailVerification({ url: `${APP_URL}/verify` });
    return { message: `We sent a new link to ${state.user.email}.` };
  } catch (e) {
    return { error: authErrorMessage(e, "The email could not be sent. Try again later.") };
  }
}

// ---------- forgotten password ----------
export async function forgotPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };

  const { ip } = await visitor();
  const limited = (await overLimit("recovery-ip", [ip], 5, 900)) ?? (await overLimit("recovery-email", [email], 3, 3600));
  if (limited) return { error: limited };

  try {
    const { account } = createAdminClient();
    await account.createRecovery({ email, url: `${APP_URL}/reset-password` });
  } catch (e) {
    console.error("forgotPassword error:", e);
  }
  // The same answer always, so nobody can find out which emails have an account.
  return { message: "If this email has an account, we sent a link to reset the password. The link works for 1 hour." };
}

export async function resetPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const userId = String(formData.get("userId") ?? "");
  const secret = String(formData.get("secret") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password !== String(formData.get("confirm") ?? "")) return { error: "The two passwords are not the same." };

  const { users, account } = createAdminClient();
  const user = await users.get({ userId }).catch(() => null);
  const problem = passwordProblem(password, { email: user?.email, name: user?.name });
  if (problem) return { error: problem };

  try {
    await account.updateRecovery({ userId, secret, password });
  } catch (e) {
    return { error: authErrorMessage(e, "This reset link is wrong or expired. Ask for a new one.") };
  }

  // Someone who knew the old password may still be logged in somewhere. End every session.
  await users.deleteSessions({ userId }).catch((e) => console.error("Could not end the old sessions", e));
  await clearSession();
  redirect("/login?reason=password-reset");
}
