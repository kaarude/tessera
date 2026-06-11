import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  sha256,
  validateOutboundUrl,
} from "@/lib/security";

describe("security helpers", () => {
  it("hashes values deterministically", () => {
    expect(sha256("token")).toHaveLength(64);
    expect(sha256("token")).toBe(sha256("token"));
  });

  it("encrypts and decrypts webhook secrets", () => {
    const encrypted = encryptSecret("secret-value");
    expect(encrypted).not.toContain("secret-value");
    expect(decryptSecret(encrypted)).toBe("secret-value");
  });

  it("rejects local webhook targets", () => {
    expect(() => validateOutboundUrl("http://127.0.0.1/hook")).toThrow(
      "Private network",
    );
  });
});
