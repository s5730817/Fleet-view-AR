// @vitest-environment node
// tests/security/passwordEncryption.test.ts

import { describe, test, expect } from "vitest";

const BASE = "http://localhost:5000/api/auth";

async function register(body: object) {
  const res = await fetch(`${BASE}/register`, {
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

describe("Password Encryption — API Response Checks", () => {
  test("register response never includes password field", async () => {
    const { body } = await register({
      name: "Enc Test",
      email: `enctest${Date.now()}@test.com`,
      password: "TestPassword123",
    });
    const responseStr = JSON.stringify(body);
    expect(responseStr).not.toContain("TestPassword123");
    if (body.data) {
      expect(body.data.password).toBeUndefined();
      expect(body.data.password_hash).toBeUndefined();
    }
  });

  test("register response never includes password_hash field", async () => {
    const { body } = await register({
      name: "Hash Test",
      email: `hashtest${Date.now()}@test.com`,
      password: "AnotherPassword456",
    });
    if (body.data) {
      expect(body.data.password_hash).toBeUndefined();
    }
    expect(JSON.stringify(body)).not.toMatch(/\$2[ab]\$/);
  });

  test("login error response never includes password field", async () => {
    const { body } = await login("admin@test.com", "wrongpassword");
    expect(body.data?.password).toBeUndefined();
    expect(body.data?.password_hash).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/\$2[ab]\$/);
  });

  test("login success response (2FA stage) never includes password field", async () => {
    const { status, body } = await login("admin@test.com", "password123");
    if (status === 200) {
      expect(body.data.password).toBeUndefined();
      expect(body.data.password_hash).toBeUndefined();
      expect(JSON.stringify(body)).not.toMatch(/\$2[ab]\$/);
    }
  });

  test("verify-2fa response never includes password field", async () => {
    const res = await fetch(`${BASE}/verify-2fa`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@test.com", code: "000000" }),
    });
    const body = await res.json();
    expect(body.data?.password).toBeUndefined();
    expect(body.data?.password_hash).toBeUndefined();
    expect(JSON.stringify(body)).not.toMatch(/\$2[ab]\$/);
  });
});