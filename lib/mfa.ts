import { createHmac, randomBytes } from "node:crypto";
import { sha256 } from "./security";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function generateMfaSecret() {
  const bytes = randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let index = 0; index < bits.length; index += 5) {
    result +=
      alphabet[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)];
  }
  return result;
}

function decodeBase32(value: string) {
  let bits = "";
  for (const character of value.replace(/=+$/, "").toUpperCase()) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid MFA secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totp(secret: string, counter: number) {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(buffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    (((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff)) %
    1_000_000;
  return code.toString().padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, now = Date.now()) {
  const counter = Math.floor(now / 30_000);
  return [-1, 0, 1].some((offset) => totp(secret, counter + offset) === code);
}

export function generateRecoveryCodes() {
  return Array.from({ length: 8 }, () =>
    randomBytes(6)
      .toString("hex")
      .match(/.{1,4}/g)!
      .join("-"),
  );
}

export function hashRecoveryCode(code: string) {
  return sha256(code.toLowerCase().replace(/\s/g, ""));
}
