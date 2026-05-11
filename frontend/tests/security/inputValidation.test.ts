// @vitest-environment node
// tests/security/inputValidation.test.ts
// run server with test ENV command for test
// $env:NODE_ENV="test"; npx nodemon src/server.js

import { describe, test, expect } from "vitest";

const BASE = "http://localhost:5000/api/auth";

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// Register uses a less aggressive rate limiter than login —
// safe to use for most validation tests
describe("Input Validation — Register Endpoint", () => {
  test("rejects empty body", async () => {
    const { status, body } = await post("/register", {});
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("rejects empty string name", async () => {
    const { status, body } = await post("/register", {
      name: "",
      email: "test@test.com",
      password: "password123",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("rejects missing email", async () => {
    const { status, body } = await post("/register", {
      name: "Test",
      password: "password123",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/email/i);
  });

  test("rejects password under 6 characters", async () => {
    const { status, body } = await post("/register", {
      name: "Test",
      email: "test@test.com",
      password: "12",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toMatch(/password/i);
  });

  test("does not return a 500 for unexpected input types", async () => {
    const { status } = await post("/register", {
      name: 12345,
      email: ["not", "an", "email"],
      password: null,
    });
    expect(status).not.toBe(500);
  });
});

// Login and 2FA are rate limited — accept 429 as valid alongside 400
describe("Input Validation — Login Endpoint", () => {
  test("rejects empty body", async () => {
    const { status, body } = await post("/login", {});
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
  });

  test("rejects missing email", async () => {
    const { status, body } = await post("/login", { password: "password123" });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
  });

  test("rejects missing password", async () => {
    const { status, body } = await post("/login", { email: "x@x.com" });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
  });

  test("does not crash with very long input strings", async () => {
    const { status } = await post("/login", {
      email: "a".repeat(500) + "@test.com",
      password: "b".repeat(500),
    });
    expect(status).not.toBe(500);
  });
});

describe("Input Validation — 2FA Endpoint", () => {
  test("rejects empty body", async () => {
    const { status, body } = await post("/verify-2fa", {});
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
  });

  test("rejects missing code", async () => {
    const { status, body } = await post("/verify-2fa", {
      email: "test@test.com",
    });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
  });

  test("rejects missing email", async () => {
    const { status, body } = await post("/verify-2fa", { code: "123456" });
    expect([400, 429]).toContain(status);
    expect(body.success).toBe(false);
  });
});