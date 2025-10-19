import { describe, it, expect } from "vitest";
import { encryptString, decryptString } from "../keys";

describe("crypto keys", () => {
  it("encrypts and decrypts round-trip", async () => {
    const msg = "secret";
    const enc = await encryptString(msg);
    const dec = await decryptString(enc);
    expect(dec).toBe(msg);
  });
});