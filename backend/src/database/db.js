const { Pool } = require("pg");
const { shouldUsePostgres } = require("../config/dataSource");

let pool;

const buildPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined
    };
  }

  return {
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.PGPOOLSIZE || 10)
  };
};

const getPool = () => {
  if (!shouldUsePostgres()) {
    throw new Error("PostgreSQL is not enabled. Configure DATABASE_URL or PG* variables, or use mock mode.");
  }

  if (!pool) {
    pool = new Pool(buildPoolConfig());
  }

  return pool;
};

const query = async (text, params = []) => {
  return getPool().query(text, params);
};

const withTransaction = async (callback) => {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getPool,
  query,
  withTransaction
};