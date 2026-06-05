import "@testing-library/jest-dom/vitest";
import { TextEncoder, TextDecoder } from "node:util";

// Some happy-dom features need these polyfilled explicitly.
if (typeof globalThis.TextEncoder === "undefined") {
  globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === "undefined") {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
}
