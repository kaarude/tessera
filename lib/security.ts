import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export function sha256(value: string | Buffer) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(prefix: string) {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

function encryptionKey() {
  return createHash("sha256")
    .update(process.env.SESSION_SECRET || "")
    .digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptSecret(value: string) {
  const [ivRaw, tagRaw, encryptedRaw] = value.split(".");
  if (!ivRaw || !tagRaw || !encryptedRaw) throw new Error("Invalid secret");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivRaw, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptBuffer(value: Buffer) {
  return Buffer.from(encryptSecret(value.toString("base64")), "utf8");
}

export function decryptBuffer(value: Buffer) {
  return Buffer.from(decryptSecret(value.toString("utf8")), "base64");
}

export function validateOutboundUrl(raw: string) {
  const url = new URL(raw);
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("Webhook URLs must use HTTPS");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    throw new Error("Private network webhook URLs are not allowed");
  }
  return url.toString();
}

export function assertTrustedOrigin(request: Request) {
  if (process.env.NODE_ENV === "test") return;
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  if (request.headers.get("authorization")?.startsWith("Bearer ")) return;
  const origin = request.headers.get("origin");
  const expected = process.env.NEXT_PUBLIC_APP_URL;
  if (
    !origin ||
    !expected ||
    new URL(origin).origin !== new URL(expected).origin
  ) {
    throw new Error("Forbidden: Invalid request origin");
  }
}
