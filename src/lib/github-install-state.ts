import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const INSTALL_STATE_COOKIE = "github_stars_install_state";
export const INSTALL_STATE_MAX_AGE_SEC = 10 * 60;

export function signInstallState(userId: string, nonce: string, secret: string) {
  const payload = `${userId}.${nonce}`;
  const mac = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function createInstallState(userId: string, secret: string) {
  const nonce = randomBytes(16).toString("base64url");
  return { nonce, value: signInstallState(userId, nonce, secret) };
}

export function verifyInstallState(
  value: string | undefined,
  userId: string,
  nonce: string | undefined,
  secret: string,
): boolean {
  if (!value || !nonce) return false;
  const expected = signInstallState(userId, nonce, secret);
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  if (!timingSafeEqual(left, right)) return false;
  const [storedUser] = value.split(".");
  return storedUser === userId;
}
