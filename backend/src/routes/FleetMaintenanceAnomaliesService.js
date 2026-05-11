export async function getMaintenanceAnomalies(token) {

  const response = await fetch("/api/fleet/maintenance-anomalies", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to load maintenance anomalies");
  }

  const result = await response.json();

  return result.data;
}

export function getImportantAnomalies(anomalies) {
  if (!Array.isArray(anomalies)) {
    return [];
  }

  return anomalies.filter((anomaly) => {
    return anomaly.riskLevel === "medium" || anomaly.riskLevel === "high";
  });
}
