// This file contains helper functions for date calculations used in the UI.

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const toUtcDayStamp = (dateStr: string): number => {
  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return Number.NaN;
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const getTodayUtcDayStamp = (): number => {
  const today = new Date();
  return Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
};

// Calculate how many days ago a date was
export const getDaysAgo = (dateStr: string): number => {
  const dateStamp = toUtcDayStamp(dateStr);
  const todayStamp = getTodayUtcDayStamp();

  if (Number.isNaN(dateStamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((todayStamp - dateStamp) / DAY_IN_MS));
};

// Calculate how many days until a date
export const getDaysUntil = (dateStr: string): number => {
  const dateStamp = toUtcDayStamp(dateStr);
  const todayStamp = getTodayUtcDayStamp();

  if (Number.isNaN(dateStamp)) {
    return 0;
  }

  return Math.floor((dateStamp - todayStamp) / DAY_IN_MS);
};

export const isPastDate = (dateStr: string): boolean => getDaysUntil(dateStr) < 0;