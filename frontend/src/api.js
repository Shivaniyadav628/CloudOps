
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// -----------------------------------------
// HEALTH CHECK
// -----------------------------------------

export const getHealth = async () => {
  const response = await API.get("/health");
  return response.data;
};

// -----------------------------------------
// SYSTEM METRICS
// -----------------------------------------

export const getSystemMetrics = async () => {
  const response = await API.get("/metrics");
  return response.data;
};

// -----------------------------------------
// ACTIVE INCIDENTS
// -----------------------------------------

export const getIncidents = async () => {
  const response = await API.get("/incidents");
  return response.data;
};

// -----------------------------------------
// COMPLETE INCIDENT HISTORY
// -----------------------------------------

export const getIncidentHistory = async () => {
  const response = await API.get("/incidents/history");
  return response.data;
};

// -----------------------------------------
// UPDATE INCIDENT STATUS
// Open / Acknowledged / Resolved
// -----------------------------------------

export const updateIncidentStatus = async (incidentId, status) => {
  const response = await API.patch(
    `/incidents/${incidentId}/status`,
    { status }
  );

  return response.data;
};

// -----------------------------------------
// TOP PROCESSES
// -----------------------------------------

export const getTopProcesses = async () => {
  const response = await API.get("/processes/top");
  return response.data;
};

// -----------------------------------------
// EXPORT API INSTANCE
// -----------------------------------------

export default API;
