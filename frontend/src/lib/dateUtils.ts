// This file contains helper functions for date calculations used in the UI.

// Calculate how many days ago a date was
export const getDaysAgo = (dateStr: string): number => {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
};

// Calculate how many days until a date
export const getDaysUntil = (dateStr: string): number => {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};