const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  `http://${window.location.hostname}:5000/api`;

// Get the saved login token from localStorage
const getToken = () => localStorage.getItem("token");

// Shared headers for protected API requests
const getAuthHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const getFleet = async () => {
  const res = await fetch(`${API_URL}/fleet`, {
    headers: getAuthHeaders(),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error("Failed to fetch fleet");
  }

  return json.data;
};

export const getBusById = async (id: string) => {
  const res = await fetch(`${API_URL}/fleet/${id}`, {
    headers: getAuthHeaders(),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error("Failed to fetch bus");
  }

  return json.data;
};

export const getBusARContext = async (id: string) => {
  const res = await fetch(`${API_URL}/fleet/${id}/ar-context`, {
    headers: getAuthHeaders(),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Failed to fetch AR context");
  }

  return json.data;
};

export const addMaintenanceEntry = async (
  busId: string,
  componentId: string,
  entry: any
) => {
  const res = await fetch(
    `${API_URL}/fleet/${busId}/components/${componentId}/history`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(entry),
    }
  );

  const json = await res.json();

  if (!json.success) {
    throw new Error("Failed to add maintenance entry");
  }

  return json.data;
};

export const loginUser = async (username: string, password: string) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      // Send both keys to avoid backend field-name mismatches.
      body: JSON.stringify({ username, email: username, password }),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.success) {
      throw new Error(
        json?.error ||
          json?.message ||
          `Login request failed (${res.status})`
      );
    }

    return json.data;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Login request timed out while calling ${API_URL}/auth/login`);
    }

    if (error instanceof TypeError) {
      throw new Error(
        `Cannot reach API at ${API_URL}. Make sure backend is running and CORS is configured.`
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const getJobs = async () => {
  const res = await fetch(`${API_URL}/jobs`, {
    headers: getAuthHeaders(),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Failed to fetch jobs");
  }

  return json.data;
};

export const getSummary = async () => {
  const res = await fetch(`${API_URL}/summary`, {
    headers: getAuthHeaders(),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Failed to fetch summary");
  }

  return json.data;
};

// Verify 2FA code
export const verify2FA = async (email: string, code: string) => {
  const res = await fetch(`${API_URL}/auth/verify-2fa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, code }),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "2FA verification failed");
  }

  return json.data;
};

export const createFault = async ({
  title,
  description,
  priority,
  bus_part_id,
  issue_type_id,
  created_by,
  assigned_user_id,
  source,
}: {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  bus_part_id?: string;
  issue_type_id?: string;
  created_by?: string;
  assigned_user_id?: string;
  source?: string;
}) => {
  const res = await fetch(`${API_URL}/faults`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title,
      description,
      priority,
      bus_part_id,
      issue_type_id,
      created_by,
      assigned_user_id,
      source,
    }),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Failed to create issue");
  }

  return json.data;
};

export const addFaultUpdate = async (
  issueId: string,
  update: {
    created_by?: string | null;
    update_type: "comment" | "status_change" | "sign_off";
    description: string;
    status_from?: string | null;
    status_to?: string | null;
  }
) => {
  const res = await fetch(`${API_URL}/faults/${issueId}/updates`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(update),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error || "Failed to add issue update");
  }

  return json.data;
};