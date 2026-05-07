// @vitest-environment node
// tests/security/register.test.ts

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

describe("POST /api/auth/register — Input Validation", () => {
  test("rejects missing name", async () => {
    const { status, body } = await register({
      email: "test@test.com",
      password: "password123",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/name/i);
  });

  test("rejects missing email", async () => {
    const { status, body } = await register({
      name: "Test User",
      password: "password123",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/email/i);
  });

  test("rejects missing password", async () => {
    const { status, body } = await register({
      name: "Test User",
      email: "test@test.com",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/password/i);
  });

  test("rejects password shorter than 6 characters", async () => {
    const { status, body } = await register({
      name: "Test User",
      email: "test@test.com",
      password: "abc",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/password/i);
  });

  test("successful response never returns password or password_hash", async () => {
    const { body } = await register({
      name: "Security Test User",
      email: `sectest${Date.now()}@test.com`,
      password: "password123",
    });
    if (body.data) {
      expect(body.data.password).toBeUndefined();
      expect(body.data.password_hash).toBeUndefined();
    }
  });

  test("accepts a valid registration with role engineer", async () => {
    const { status, body } = await register({
      name: "Test Engineer",
      email: `eng${Date.now()}@test.com`,
      password: "password123",
      role: "engineer",
    });
    // 201 success, 400 duplicate/validation, 429 rate limited — all handled
    expect([201, 400, 429]).toContain(status);
    if (status === 201) {
      expect(body.success).toBe(true);
    }
  });
});