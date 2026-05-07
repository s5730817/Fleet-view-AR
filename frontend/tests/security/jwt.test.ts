// @vitest-environment node
// tests/security/jwt.test.ts

import { describe, test, expect } from "vitest";

const BASE = "http://localhost:5000/api";

const FAKE_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpZCI6IjEiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJyb2xlIjoiZW5naW5lZXIifQ." +
  "invalidsignature";

const EXPIRED_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJpZCI6IjEiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJyb2xlIjoiZW5naW5lZXIiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0." +
  "some_signature";

// These routes are NOT subject to the login rate limiter — safe to call freely
const protectedRoutes: Array<{ method: string; path: string }> = [
  { method: "GET", path: "/faults" },
  { method: "GET", path: "/fleet" },
  { method: "GET", path: "/jobs" },
  { method: "GET", path: "/summary" },
];

async function hit(method: string, path: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { method, headers });
  return { status: res.status, body: await res.json() };
}

describe("JWT Protection — Protected Routes", () => {
  for (const { method, path } of protectedRoutes) {
    test(`${method} ${path} — 401 with no token`, async () => {
      const { status, body } = await hit(method, path);
      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });

    test(`${method} ${path} — 401 with invalid token`, async () => {
      const { status, body } = await hit(method, path, FAKE_TOKEN);
      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });

    test(`${method} ${path} — 401 with malformed Authorization header`, async () => {
      const res = await fetch(`${BASE}${path}`, {
        method,
        headers: { Authorization: "NotBearer sometoken" },
      });
      const body = await res.json();
      expect(res.status).toBe(401);
      expect(body.success).toBe(false);
    });

    test(`${method} ${path} — 401 with expired token`, async () => {
      const { status, body } = await hit(method, path, EXPIRED_TOKEN);
      expect(status).toBe(401);
      expect(body.success).toBe(false);
    });
  }

  // Auth routes use the login rate limiter — accept 429 alongside 400
  test("Auth routes are publicly accessible — no token needed (login returns 400 or 429, not 401)", async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "x@x.com", password: "wrong" }),
    });
    expect([400, 429]).toContain(res.status);
  });

  test("register route is publicly accessible — no token needed (returns 400, not 401)", async () => {
    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    // Register has a much higher rate limit — should always be 400 here
    expect(res.status).toBe(400);
  });
});