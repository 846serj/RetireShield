import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { decrypt, encrypt } from "../lib/crypto";

test("encrypt decrypt round-trips Plaid access tokens", () => {
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  const token = "access-sandbox-test-token";
  const encrypted = encrypt(token);

  assert.notEqual(encrypted, token);
  assert.equal(decrypt(encrypted), token);
});
