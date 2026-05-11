const DEFAULT_OPTIONS = {
  recentWindowDays: 30,
  baselineWindowDays: 180,
  minimumExpectedEvents: 1.0,
  mediumRiskThreshold: 1.75,
  highRiskThreshold: 2.2,
};

const PREDICTIVE_EVENT_TYPES = new Set([
  "repair",
  "service",
  "replacement",
]);

const REPAIR_EVENT_TYPES = new Set([
  "repair",
  "replacement",
]);

const SERVICE_EVENT_TYPES = new Set([
  "service",
]);

const normaliseEventType = (type) => {
  if (!type || typeof type !== "string") {
    return "";
  }

  return type.trim().toLowerCase();
};

const parseEventDate = (dateValue) => {
  if (!dateValue) {
    return null;
  }

  const parsedDate = new Date(dateValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
};

const daysBetween = (startDate, endDate) => {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.max(
    0,
    Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay)
  );
};

const isWithinDays = (dateValue, referenceDate, windowDays) => {
  const eventDate = parseEventDate(dateValue);

  if (!eventDate) {
    return false;
  }

  if (eventDate > referenceDate) {
    return false;
  }

  return daysBetween(eventDate, referenceDate) <= windowDays;
};

const countMaintenanceEvents = (
  history,
  referenceDate,
  windowDays,
  includedTypes
) => {
  if (!Array.isArray(history)) {
    return 0;
  }

  return history.filter((entry) => {
    const eventType = normaliseEventType(entry.type);

    return (
      includedTypes.has(eventType) &&
      isWithinDays(entry.date || entry.createdAt, referenceDate, windowDays)
    );
  }).length;
};

const calculateComponentAgeFactor = (busYear, referenceDate) => {
  const numericYear = Number(busYear);
  const fallbackYear = referenceDate.getFullYear();
  const busAge = Math.max(
    0,
    referenceDate.getFullYear() - (Number.isFinite(numericYear) ? numericYear : fallbackYear)
  );

  if (busAge <= 3) {
    return 1;
  }

  if (busAge <= 7) {
    return 1.15;
  }

  if (busAge <= 12) {
    return 1.35;
  }

  return 1.6;
};

const calculateMileageFactor = (mileage) => {
  const numericMileage = Number(mileage) || 0;

  if (numericMileage < 50_000) {
    return 1;
  }

  if (numericMileage < 150_000) {
    return 1.15;
  }

  if (numericMileage < 300_000) {
    return 1.35;
  }

  return 1.6;
};

const calculateHealthFactor = (healthPercent) => {
  const numericHealth = Number(healthPercent);

  if (!Number.isFinite(numericHealth)) {
    return 1;
  }

  if (numericHealth >= 85) {
    return 0.85;
  }

  if (numericHealth >= 65) {
    return 1;
  }

  if (numericHealth >= 40) {
    return 1.3;
  }

  return 1.7;
};

const calculateExpectedEvents = (
  bus,
  component,
  referenceDate,
  options
) => {
  const baselineEventCount = countMaintenanceEvents(
    component.history,
    referenceDate,
    options.baselineWindowDays,
    PREDICTIVE_EVENT_TYPES
  );

  const baselineDailyRate = baselineEventCount / options.baselineWindowDays;

  const ageFactor = calculateComponentAgeFactor(bus.year, referenceDate);
  const mileageFactor = calculateMileageFactor(bus.mileage);
  const healthFactor = calculateHealthFactor(component.healthPercent);

  const adjustedDailyRate = baselineDailyRate * ageFactor * mileageFactor * healthFactor;
  const expectedEvents = adjustedDailyRate * options.recentWindowDays;

  return Math.max(expectedEvents, options.minimumExpectedEvents);
};

const calculateAnomalyScore = (actualEvents, expectedEvents) => {
  if (expectedEvents <= 0) {
    return actualEvents > 0 ? actualEvents : 0;
  }

  return actualEvents / expectedEvents;
};

const getRiskLevel = (anomalyScore, options) => {
  if (anomalyScore >= options.highRiskThreshold) {
    return "high";
  }

  if (anomalyScore >= options.mediumRiskThreshold) {
    return "medium";
  }

  return "low";
};

const createMessage = ({
  riskLevel,
  bus,
  component,
  actualEvents,
  expectedEvents,
  anomalyScore,
}) => {
  const expectedLabel = expectedEvents.toFixed(2);
  const scoreLabel = anomalyScore.toFixed(2);
  const busLabel = bus.plateNumber || bus.name || bus.id;

  if (riskLevel === "high") {
    return `${component.name} on ${busLabel} has a high irregular rise in maintenance frequency. Actual events: ${actualEvents}, expected: ${expectedLabel}, anomaly score: ${scoreLabel}. Immediate inspection is recommended.`;
  }

  if (riskLevel === "medium") {
    return `${component.name} on ${busLabel} is showing a moderate rise in repair/service frequency. Actual events: ${actualEvents}, expected: ${expectedLabel}, anomaly score: ${scoreLabel}. Monitor closely and consider inspection.`;
  }

  return `${component.name} on ${busLabel} is within the expected maintenance frequency. Actual events: ${actualEvents}, expected: ${expectedLabel}, anomaly score: ${scoreLabel}.`;
};

const detectMaintenanceFrequencyAnomalies = (
  buses,
  modelOptions = {},
  referenceDate = new Date()
) => {
  const options = {
    ...DEFAULT_OPTIONS,
    ...modelOptions,
  };

  const results = [];

  for (const bus of buses || []) {
    for (const component of bus.components || []) {
      const recentRepairCount = countMaintenanceEvents(
        component.history,
        referenceDate,
        options.recentWindowDays,
        REPAIR_EVENT_TYPES
      );

      const recentServiceCount = countMaintenanceEvents(
        component.history,
        referenceDate,
        options.recentWindowDays,
        SERVICE_EVENT_TYPES
      );

      const actualEvents = recentRepairCount + recentServiceCount;

      const expectedEvents = calculateExpectedEvents(
        bus,
        component,
        referenceDate,
        options
      );

      const anomalyScore = calculateAnomalyScore(actualEvents, expectedEvents);
      const riskLevel = getRiskLevel(anomalyScore, options);

      results.push({
        busId: bus.id,
        busName: bus.name,
        plateNumber: bus.plateNumber,
        componentId: component.id,
        componentName: component.name,
        riskLevel,
        anomalyScore: Number(anomalyScore.toFixed(3)),
        expectedEvents: Number(expectedEvents.toFixed(3)),
        actualEvents,
        recentRepairCount,
        recentServiceCount,
        recentWindowDays: options.recentWindowDays,
        baselineWindowDays: options.baselineWindowDays,
        message: createMessage({
          riskLevel,
          bus,
          component,
          actualEvents,
          expectedEvents,
          anomalyScore,
        }),
      });
    }
  }

  return results.sort((left, right) => {
    if (right.anomalyScore !== left.anomalyScore) {
      return right.anomalyScore - left.anomalyScore;
    }

    return right.actualEvents - left.actualEvents;
  });
};

module.exports = {
  detectMaintenanceFrequencyAnomalies,
};