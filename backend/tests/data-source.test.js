describe("Data source integration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.DATA_SOURCE;
    delete process.env.DATABASE_URL;
    delete process.env.PGHOST;
    delete process.env.PGDATABASE;
    delete process.env.PGUSER;
    delete process.env.PGPASSWORD;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("defaults to mock mode when postgres is not configured", () => {
    const services = require("../src/services");
    const mockAuthService = require("../src/services/auth.service");

    expect(services.dataSource).toBe("mock");
    expect(services.authService.registerUser).toBe(mockAuthService.registerUser);
  });

  test("loads postgres service graph when postgres mode is requested", () => {
    process.env.DATA_SOURCE = "postgres";

    expect(() => require("../src/app")).not.toThrow();

    const services = require("../src/services");
    const realAuthService = require("../src/services/auth.service.real");

    expect(services.dataSource).toBe("postgres");
    expect(services.authService.registerUser).toBe(realAuthService.registerUser);
  });
});