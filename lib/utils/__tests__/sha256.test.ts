import { describe, expect, it } from "vitest";
import { sha256Hex } from "../sha256";

describe("sha256Hex", () => {
  // NIST test vectors — https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program/secure-hashing
  it("matches the known SHA-256 hash of an empty string", async () => {
    expect(await sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("matches the known SHA-256 hash of 'abc'", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("is deterministic for the same input", async () => {
    const a = await sha256Hex("some-webhook-token");
    const b = await sha256Hex("some-webhook-token");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", async () => {
    const a = await sha256Hex("token-a");
    const b = await sha256Hex("token-b");
    expect(a).not.toBe(b);
  });
});
