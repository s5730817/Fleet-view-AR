const DAY_IN_MS = 24 * 60 * 60 * 1000;
const REFERENCE_TODAY = "2026-05-05";

const toDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const shiftDate = (value) => {
  const date = toDate(value);
  const referenceDate = toDate(REFERENCE_TODAY);
  const currentDate = new Date();

  if (!date || !referenceDate) {
    return value;
  }

  const currentUtcDay = Date.UTC(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    currentDate.getUTCDate()
  );
  const referenceUtcDay = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate()
  );
  const deltaDays = Math.floor((currentUtcDay - referenceUtcDay) / DAY_IN_MS);

  const shiftedDate = new Date(date.getTime());
  shiftedDate.setUTCDate(shiftedDate.getUTCDate() + deltaDays);
  return shiftedDate;
};

const shiftDemoDate = (value) => {
  const shifted = shiftDate(value);
  return shifted instanceof Date ? shifted.toISOString().slice(0, 10) : value;
};

const shiftDemoTimestamp = (value) => {
  const shifted = shiftDate(value);
  return shifted instanceof Date ? shifted.toISOString() : value;
};

const getRelativeDemoDate = (offsetDays) => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

module.exports = {
  getRelativeDemoDate,
  shiftDemoDate,
  shiftDemoTimestamp
};