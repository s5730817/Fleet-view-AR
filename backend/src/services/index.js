const { getDataSource } = require("../config/dataSource");

const dataSource = getDataSource();

const authService = dataSource === "postgres"
  ? require("./auth.service.real")
  : require("./auth.service");

const faultService = dataSource === "postgres"
  ? require("./fault.service.real")
  : require("./fault.service");

const fleetService = dataSource === "postgres"
  ? require("./fleet.service.real")
  : require("./fleet.service");

const jobService = dataSource === "postgres"
  ? require("./job.service.real")
  : require("./job.service");

const summaryService = dataSource === "postgres"
  ? require("./summary.service.real")
  : require("./summary.service");

module.exports = {
  dataSource,
  authService,
  faultService,
  fleetService,
  jobService,
  summaryService
};