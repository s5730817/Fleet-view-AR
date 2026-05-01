// This file tests the mock auth and fault endpoints using Jest and Supertest.
// Run npm test to execute these tests.

const request = require("supertest");
const app = require("../src/app");

describe("Auth API", () => {
  const testUser = {
    name: "Aisha Khan",
    email: "aisha@example.com",
    password: "secret123",
    role: "engineer"
  };

  test("POST /api/auth/register should register a new user", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(testUser.name);
    expect(res.body.data.email).toBe(testUser.email);
    expect(res.body.data.role).toBe(testUser.role);
  });

  test("POST /api/auth/login should log in a registered user", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  test("POST /api/auth/login should fail with wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: "wrongpassword"
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Invalid email or password");
  });
});

describe("Fault API", () => {
  let createdFaultId;

  test("GET /api/faults/summary should return summary data", async () => {
    const res = await request(app).get("/api/faults/summary");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total).toBeDefined();
    expect(res.body.data.reported).toBeDefined();
    expect(res.body.data.in_progress).toBeDefined();
    expect(res.body.data.resolved).toBeDefined();
  });

  test("GET /api/faults should return all faults", async () => {
    const res = await request(app).get("/api/faults");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.count).toBeGreaterThan(0);
  });

  test("GET /api/faults?status=reported should filter faults by status", async () => {
    const res = await request(app).get("/api/faults?status=reported");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    res.body.data.forEach((fault) => {
      expect(fault.status).toBe("reported");
    });
  });

  test("GET /api/faults?status=banana should fail with invalid filter", async () => {
    const res = await request(app).get("/api/faults?status=banana");

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Invalid status filter");
  });

  test("GET /api/faults/1 should return one fault", async () => {
    const res = await request(app).get("/api/faults/1");

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe("1");
  });

  test("GET /api/faults/999 should return 404 for missing fault", async () => {
    const res = await request(app).get("/api/faults/999");

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Fault not found");
  });

  test("POST /api/faults should create a new fault", async () => {
    const res = await request(app)
      .post("/api/faults")
      .send({
        title: "Loose overhead cable",
        description: "Cable appears detached near tunnel entrance.",
        priority: "high"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Loose overhead cable");
    expect(res.body.data.priority).toBe("high");

    createdFaultId = res.body.data.id;
  });

  test("PATCH /api/faults/:id/status should update fault status", async () => {
    const res = await request(app)
      .patch(`/api/faults/${createdFaultId}/status`)
      .send({
        status: "resolved"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("resolved");
  });

  test("GET /api/faults/:id/updates should return updates for a fault", async () => {
    const res = await request(app).get(`/api/faults/${createdFaultId}/updates`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("POST /api/faults/:id/updates should add a new update", async () => {
    const res = await request(app)
      .post(`/api/faults/${createdFaultId}/updates`)
      .send({
        created_by: "engineer_3",
        update_type: "comment",
        description: "Inspection completed and follow-up scheduled."
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.update_type).toBe("comment");
  });
});