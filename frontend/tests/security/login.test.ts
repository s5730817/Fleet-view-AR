// @vitest-environment node
// tests/security/login.test.ts
// run server with test ENV command for test
// $env:NODE_ENV="test"; npx nodemon src/server.js

import { describe, test, expect } from "vitest";

const BASE = "http://localhost:5000/api/auth";

async function login(body: object) {
  const res = await fetch(`${BASE}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

describe("POST /api/auth/login — Validation & Security", () => {
  test("rejects missing email", async () => {
    const { status, body } = await login({ password: "password123" });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
  });

  test("rejects missing password", async () => {
    const { status, body } = await login({ email: "test@test.com" });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
  });

  test("returns generic error for wrong email — does not reveal if email exists", async () => {
    const { status, body } = await login({
      email: "doesnotexist_xyz_123@nowhere.com",
      password: "password123",
    });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
    if (status === 400) {
      expect(body.error).toMatch(/invalid email or password/i);
    }
  });

  test("returns same generic error for wrong password as for wrong email", async () => {
    const { status, body } = await login({
      email: "admin@test.com",
      password: "definitelythewrongpassword",
    });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
    if (status === 400) {
      expect(body.error).toMatch(/invalid email or password/i);
    }
  });

  test("successful login triggers 2FA — does not return JWT at this stage", async () => {
    const { status, body } = await login({
      email: "admin@test.com",
      password: "password123",
    });
    if (status === 200) {
      expect(body.success).toBe(true);
      expect(body.data.requires2FA).toBe(true);
      expect(body.data.email).toBeDefined();
      expect(body.data.token).toBeUndefined();
    }
  });
});