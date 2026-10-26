"use server";

import { AuthenticationFactor, AuthenticatorType } from "node-appwrite";
import { revalidatePath } from "next/cache";
import { createAdminClient, createSessionClient } from "@/lib/appwrite/server";
import { requireUser } from "@/lib/auth";
import { authErrorMessage, needsFreshCode, passwordProblem } from "@/lib/auth-rules";
import { isValidEmail, normalizeEmail, normalizeName } from "@/lib/contact-rules";
import { rateLimit } from "@/lib/rate-limit";

export type SettingsState = { error?: string; message?: string } | undefined;
export type Result = { ok: boolean; message: string };
export type TwoFactorState =
  | { error?: string; message?: string; recoveryCodes?: string[] | null; needCode?: boolean; done?: boolean }
  | undefined;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const errorType = (e: unknown) => (e as { type?: string })?.type;

// Wrong current passwords and wrong codes: at most 10 tries in 15 minutes per account.
async function tooManyTries(userId: string) {
  const r = await rateLimit("account-check", userId, 10, 900);
  return r.ok ? null : `Too many attempts. Try again in ${Math.max(1, Math.ceil(r.retryAfter / 60))} minutes.`;
}

function refresh() {
  revalidatePath("/", "layout"); // the header shows the email, the banner shows the verification
}

// ---------- profile ----------
export async function updateName(_: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireUser();
  const name = normalizeName(String(formData.get("name") ?? "")).slice(0, 128);
  if (!name) return { error: "Enter your name." };
  try {
    await (await createSessionClient()).account.updateName({ name });
  } catch (e) {
    return { error: authErrorMessage(e, "Your name could not be saved.") };
  }
  refresh();
  return { message: "Name saved." };
}

export async function updateEmail(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  if (email === user.email) return { error: "This is already your email address." };
  if (!password) return { error: "Enter your password to confirm the change." };
  const limited = await tooManyTries(user.$id);
  if (limited) return { error: limited };

  const { account } = await createSessionClient();
  try {
    await account.updateEmail({ email, password });
  } catch (e) {
    return { error: errorType(e) === "user_invalid_credentials" ? "Your password is wrong." : authErrorMessage(e, "Your email could not be changed.") };
  }
  // The new address must be verified again.
  await account.createEmailVerification({ url: `${APP_URL}/verify` }).catch(() => {});
  refresh();
  return { message: `Your email is now ${email}. We sent a link to verify it.` };
}

// ---------- password ----------
// Ends every session of the account except this one. Returns how many ended.
async function endOtherSessions() {
  const { account } = await createSessionClient();
  const { sessions } = await account.listSessions();
  const others = sessions.filter((s) => !s.current);
  await Promise.all(others.map((s) => account.deleteSession({ sessionId: s.$id }).catch(() => {})));
  return others.length;
}

export async function changePassword(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!current) return { error: "Enter your current password." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "The two new passwords are not the same." };
  if (password === current) return { error: "The new password must be different from the current one." };
  const problem = passwordProblem(password, { email: user.email, name: user.name });
  if (problem) return { error: problem };
  const limited = await tooManyTries(user.$id);
  if (limited) return { error: limited };

  try {
    await (await createSessionClient()).account.updatePassword({ password, oldPassword: current });
  } catch (e) {
    return { error: errorType(e) === "user_invalid_credentials" ? "Your current password is wrong." : authErrorMessage(e, "Your password could not be changed.") };
  }

  const ended = formData.get("signOutOthers") === "on" ? await endOtherSessions() : 0;
  refresh();
  return { message: ended > 0 ? `Password changed. ${ended} other ${ended === 1 ? "device was" : "devices were"} logged out.` : "Password changed." };
}

// ---------- devices ----------
export async function endSession(formData: FormData): Promise<Result> {
  await requireUser();
  try {
    await (await createSessionClient()).account.deleteSession({ sessionId: String(formData.get("id") ?? "") });
  } catch (e) {
    return { ok: false, message: authErrorMessage(e, "The device could not be logged out.") };
  }
  revalidatePath("/settings");
  return { ok: true, message: "The device is logged out." };
}

export async function endAllOtherSessions(): Promise<Result> {
  await requireUser();
  const ended = await endOtherSessions();
  revalidatePath("/settings");
  return { ok: true, message: ended > 0 ? `${ended} other ${ended === 1 ? "device was" : "devices were"} logged out.` : "No other devices were logged in." };
}

// ---------- 2-step verification ----------
// Checks a code from the authenticator app (or a recovery code) for this session.
async function proveCode(code: string, kind: "totp" | "recovery" = "totp") {
  const { account } = await createSessionClient();
  const factor = kind === "recovery" ? AuthenticationFactor.Recoverycode : AuthenticationFactor.Totp;
  const challenge = await account.createMFAChallenge({ factor });
  await account.updateMFAChallenge({ challengeId: challenge.$id, otp: code.replace(/\s/g, "") });
}

/** Step 1: a new secret for the authenticator app, with its QR code. */
export async function startTwoFactorSetup(): Promise<Result & { secret?: string; qr?: string }> {
  const user = await requireUser();
  if (user.mfa) return { ok: false, message: "2-step verification is already on." };
  const { account } = await createSessionClient();

  let setup;
  try {
    setup = await account.createMFAAuthenticator({ type: AuthenticatorType.Totp });
  } catch {
    // An unfinished setup from before: remove it and start again.
    try {
      await account.deleteMFAAuthenticator({ type: AuthenticatorType.Totp });
      setup = await account.createMFAAuthenticator({ type: AuthenticatorType.Totp });
    } catch (e) {
      return { ok: false, message: authErrorMessage(e, "The setup could not start. Try again.") };
    }
  }

  // The QR code is made by Appwrite (Avatars API), so the secret never goes to another service.
  // Without it (for example, the API key has no "avatars.read" scope), the user types the key instead.
  const qr = await createAdminClient()
    .avatars.getQR({ text: setup.uri, size: 400, margin: 1 })
    .then((png) => `data:image/png;base64,${Buffer.from(png).toString("base64")}`)
    .catch((e) => {
      console.error("Could not make the QR code", e);
      return "";
    });
  return { ok: true, message: "", secret: setup.secret, qr };
}

/**
 * Step 2: check the first code, make the recovery codes, and turn 2-step verification on.
 * If Appwrite wants a fresh code before "turn on", the screen asks for one (needCode) and calls again with step=enable.
 */
export async function finishTwoFactorSetup(prev: TwoFactorState, formData: FormData): Promise<TwoFactorState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { ...prev, error: "Enter the 6-digit code from your app." };
  const limited = await tooManyTries(user.$id);
  if (limited) return { ...prev, error: limited };
  const { account } = await createSessionClient();
  let recoveryCodes = prev?.recoveryCodes ?? null;

  try {
    if (formData.get("step") === "enable") {
      await proveCode(code);
    } else {
      await account.updateMFAAuthenticator({ type: AuthenticatorType.Totp, otp: code });
      recoveryCodes = await account
        .createMFARecoveryCodes()
        .then((r) => r.recoveryCodes)
        .catch(() => null); // made before: the old codes still work
    }
  } catch (e) {
    return { ...prev, error: authErrorMessage(e, "The code is wrong or expired. Wait for the next code and try again.") };
  }

  try {
    await account.updateMFA({ mfa: true });
  } catch (e) {
    if (needsFreshCode(e)) return { recoveryCodes, needCode: true, message: "Enter one more code to finish." };
    return { recoveryCodes, error: authErrorMessage(e, "2-step verification could not be turned on.") };
  }
  refresh();
  return { recoveryCodes, done: true, message: "2-step verification is on." };
}

export async function disableTwoFactor(_: SettingsState, formData: FormData): Promise<SettingsState> {
  const user = await requireUser();
  if (!user.mfa) return { message: "2-step verification is already off." };
  const limited = await tooManyTries(user.$id);
  if (limited) return { error: limited };
  const { account } = await createSessionClient();
  try {
    // A code is needed even when logged in: someone at an unlocked computer cannot turn it off.
    await proveCode(String(formData.get("code") ?? ""), formData.get("method") === "recovery" ? "recovery" : "totp");
    await account.updateMFA({ mfa: false });
  } catch (e) {
    return { error: authErrorMessage(e, "The code is wrong or expired. Try again.") };
  }
  await account.deleteMFAAuthenticator({ type: AuthenticatorType.Totp }).catch(() => {});
  refresh();
  return { message: "2-step verification is off." };
}

export async function regenerateRecoveryCodes(_: TwoFactorState, formData: FormData): Promise<TwoFactorState> {
  const user = await requireUser();
  const limited = await tooManyTries(user.$id);
  if (limited) return { error: limited };
  const { account } = await createSessionClient();
  try {
    await proveCode(String(formData.get("code") ?? ""));
    const { recoveryCodes } = await account.updateMFARecoveryCodes();
    return { recoveryCodes, done: true, message: "New recovery codes are ready. The old codes no longer work." };
  } catch (e) {
    return { error: authErrorMessage(e, "The code is wrong or expired. Try again.") };
  }
}
