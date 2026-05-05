const hasValue = (value) => typeof value === "string" && value.trim().length > 0;

const isPostgresConfigured = () => {
  if (hasValue(process.env.DATABASE_URL)) {
    return true;
  }

  return [process.env.PGHOST, process.env.PGDATABASE, process.env.PGUSER].every(hasValue);
};

const getDataSource = () => {
  const requestedDataSource = (process.env.DATA_SOURCE || "").trim().toLowerCase();

  if (requestedDataSource === "mock") {
    return "mock";
  }

  if (requestedDataSource === "postgres") {
    return "postgres";
  }

  return isPostgresConfigured() ? "postgres" : "mock";
};

const shouldUsePostgres = () => getDataSource() === "postgres";

module.exports = {
  getDataSource,
  isPostgresConfigured,
  shouldUsePostgres
};