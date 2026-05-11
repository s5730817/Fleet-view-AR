// @vitest-environment node
// tests/validation/validation.test.ts
//
// run server with test ENV command for test
// $env:NODE_ENV="test"; npx nodemon src/server.js
//
import { describe, test, expect, beforeAll } from "vitest";

const BASE = "http://localhost:5000/api";

let TOKEN = "";

beforeAll(async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "manager@test.com", password: "password123" }),
  });
  const json = await res.json();
  TOKEN = json?.data?.token ?? "";

  if (!TOKEN) {
    throw new Error(
      `Login failed — check that 2FA is disabled for manager@test.com. Response: ${JSON.stringify(json)}`
    );
  }
});

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function patch(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

// ---------------------------------------------------------------------------
// POST /faults — validateCreateFault
// ---------------------------------------------------------------------------
describe("Input Validation — POST /faults", () => {
  test("rejects empty body", async () => {
    const { status, body } = await post("/faults", {});
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("rejects missing title", async () => {
    const { status, body } = await post("/faults", {
      description: "No title provided",
      priority: "low",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: "Title is required" }),
      ])
    );
  });

  test("rejects empty title string", async () => {
    const { status, body } = await post("/faults", {
      title: "",
      description: "Empty title test",
      priority: "low",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("rejects whitespace-only title", async () => {
    const { status, body } = await post("/faults", {
      title: "   ",
      description: "Whitespace title",
      priority: "low",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("rejects missing description", async () => {
    const { status, body } = await post("/faults", {
      title: "Valid title",
      priority: "low",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: "Description is required" }),
      ])
    );
  });

  test("rejects missing priority", async () => {
    const { status, body } = await post("/faults", {
      title: "Valid title",
      description: "Valid description",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("rejects invalid priority value", async () => {
    const { status, body } = await post("/faults", {
      title: "Valid title",
      description: "Valid description",
      priority: "urgent",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: "Priority must be low, medium or high" }),
      ])
    );
  });

  test("does not crash with unexpected input types", async () => {
    const { status } = await post("/faults", {
      title: 12345,
      description: null,
      priority: ["high"],
    });
    expect(status).not.toBe(500);
  });
});

// ---------------------------------------------------------------------------
// PATCH /faults/:id/status — validateUpdateFaultStatus
// ---------------------------------------------------------------------------
describe("Input Validation — PATCH /faults/:id/status", () => {
  test("rejects empty body", async () => {
    const { status, body } = await patch("/faults/test-id/status", {});
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("rejects invalid status: fixed", async () => {
    const { status, body } = await patch("/faults/test-id/status", {
      status: "fixed",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: "Invalid status value" }),
      ])
    );
  });

  test("rejects invalid status: done", async () => {
    const { status, body } = await patch("/faults/test-id/status", {
      status: "done",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("rejects invalid status: closed", async () => {
    const { status, body } = await patch("/faults/test-id/status", {
      status: "closed",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("does not crash with unexpected input types", async () => {
    const { status } = await patch("/faults/test-id/status", {
      status: 99999,
    });
    expect(status).not.toBe(500);
  });
});

// ---------------------------------------------------------------------------
// POST /faults/:id/updates — validateAddFaultUpdate
// ---------------------------------------------------------------------------
describe("Input Validation — POST /faults/:id/updates", () => {
  test("rejects empty body", async () => {
    const { status, body } = await post("/faults/test-id/updates", {});
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("rejects invalid update_type: note", async () => {
    const { status, body } = await post("/faults/test-id/updates", {
      update_type: "note",
      description: "This type does not exist",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: "Invalid update_type value" }),
      ])
    );
  });

  test("rejects invalid update_type: log", async () => {
    const { status, body } = await post("/faults/test-id/updates", {
      update_type: "log",
      description: "Another invalid type",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("rejects missing description", async () => {
    const { status, body } = await post("/faults/test-id/updates", {
      update_type: "comment",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ msg: "Description is required" }),
      ])
    );
  });

  test("rejects empty description string", async () => {
    const { status, body } = await post("/faults/test-id/updates", {
      update_type: "comment",
      description: "",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("rejects missing update_type", async () => {
    const { status, body } = await post("/faults/test-id/updates", {
      description: "No update type provided",
    });
    expect(status).toBe(400);
    expect(body.success).toBe(false);
  });

  test("does not crash with unexpected input types", async () => {
    const { status } = await post("/faults/test-id/updates", {
      update_type: 99999,
      description: null,
    });
    expect(status).not.toBe(500);
  });
});