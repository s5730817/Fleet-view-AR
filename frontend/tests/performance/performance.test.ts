// tests/performance.test.js
// run server with test ENV command for test
// $env:NODE_ENV="test"; npx nodemon src/server.js
// @vitest-environment node

import { describe, test, expect, beforeAll } from "vitest";

const BASE = "http://localhost:5000/api";

let TOKEN = "";

beforeAll(async () => {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "manager@test.com",
      password: "password123",
    }),
  });

  const json = await res.json();

  TOKEN = json?.data?.token ?? "";

  if (!TOKEN) {
    throw new Error(
      `Login failed. Check test auth bypass. Response: ${JSON.stringify(json)}`
    );
  }
});

async function get(path: string) {
  const start = performance.now();

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  const end = performance.now();

  const responseTime = end - start;

  return {
    status: res.status,
    responseTime,
    body: await res.json(),
  };
}

describe("API Performance Tests", () => {

  test("GET /fleet responds within acceptable time", async () => {
    const result = await get("/fleet");

    console.log(`/fleet: ${result.responseTime.toFixed(2)}ms`);

    expect(result.status).toBe(200);

    expect(result.responseTime).toBeLessThan(1000);
  });

  test("GET /summary responds within acceptable time", async () => {
    const result = await get("/summary");

    console.log(`/summary: ${result.responseTime.toFixed(2)}ms`);

    expect(result.status).toBe(200);

    expect(result.responseTime).toBeLessThan(1000);
  });

  test("GET /jobs responds within acceptable time", async () => {
    const result = await get("/jobs");

    console.log(`/jobs: ${result.responseTime.toFixed(2)}ms`);

    expect(result.status).toBe(200);

    expect(result.responseTime).toBeLessThan(1000);
  });

  test("GET /fleet/:id responds within acceptable time", async () => {

  // Get real bus ID
  const fleetRes = await fetch(`${BASE}/fleet`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  const fleetJson = await fleetRes.json();

  const busId = fleetJson.data[0].id;

  const start = performance.now();

  const res = await fetch(`${BASE}/fleet/${busId}`, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  const end = performance.now();

  const responseTime = end - start;

  console.log(`/fleet/${busId}: ${responseTime.toFixed(2)}ms`);

  expect(res.status).toBe(200);

  expect(responseTime).toBeLessThan(1000);

});

});