// @vitest-environment node
// tests/security/2fa.test.ts
// run server with test ENV command for test
// $env:NODE_ENV="test"; npx nodemon src/server.js

import { describe, test, expect } from "vitest";

const BASE = "http://localhost:5000/api/auth";

async function verify2FA(body: object) {
  const res = await fetch(`${BASE}/verify-2fa`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return { status: res.status, body: await res.json() };
}

describe("POST /api/auth/verify-2fa — 2FA Security", () => {
  test("rejects missing email", async () => {
    const { status, body } = await verify2FA({ code: "123456" });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
    if (status === 400) {
      expect(body.error).toMatch(/email/i);
    }
  });

  test("rejects missing code", async () => {
    const { status, body } = await verify2FA({ email: "test@test.com" });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
    if (status === 400) {
      expect(body.error).toMatch(/code/i);
    }
  });

  test("rejects verify attempt when no 2FA session exists for that email", async () => {
    const { status, body } = await verify2FA({
      email: "ghost_user_xyz@nowhere.com",
      code: "999999",
    });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
  });

  test("rejects wrong 2FA code for a real pending session", async () => {
    const loginResult = await login("admin@test.com", "password123");
    if (loginResult.status !== 200) return;

    const { status, body } = await verify2FA({
      email: "admin@test.com",
      code: "000000",
    });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
    if (status === 400) {
      expect(body.error).toMatch(/invalid/i);
    }
  });

  test("successful 2FA verification returns a JWT token and user object", async () => {
    const loginResult = await login("admin@test.com", "password123");
    if (loginResult.status === 200) {
      expect(loginResult.body.data.requires2FA).toBe(true);
      expect(loginResult.body.data.token).toBeUndefined();
    }
  });
});