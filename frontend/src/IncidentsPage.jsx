
import { useState, useEffect, useCallback, useMemo } from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Cpu,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Search,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  XCircle,
  History,
  Server,
  Info,
  SearchCheck,
  Database,
  Folder,
  File,
  LoaderCircle,
  Zap,
} from "lucide-react";

import {
  getIncidents,
  getIncidentHistory,
  updateIncidentStatus,
  default as API,
} from "./api";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function formatValue(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(1);
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || !Number.isFinite(Number(bytes))) {
    return "—";
  }

  const value = Number(bytes);

  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;

  return `${(value / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function getSeverityStyle(severity) {
  if (String(severity).toLowerCase() === "critical") {
    return {
      background: "#FDECEC",
      color: "#C43D3D",
      border: "#F5CACA",
    };
  }

  return {
    background: "#FFF5E5",
    color: "#B7791F",
    border: "#F4DFB9",
  };
}

function getStatusStyle(status) {
  const value = String(status).toLowerCase();

  if (value === "resolved") {
    return {
      background: "#E8F5EF",
      color: "#16845B",
      border: "#C9E8D8",
    };
  }

  if (value === "acknowledged") {
    return {
      background: "#EAF0FF",
      color: "#3157D5",
      border: "#D3DFFF",
    };
  }

  return {
    background: "#F1F3F6",
    color: "#596579",
    border: "#E0E4EA",
  };
}

function getResourceIcon(resource) {
  const name = String(resource || "").toLowerCase();

  if (name === "cpu") return Cpu;
  if (name === "memory") return MemoryStick;
  if (name === "disk") return HardDrive;

  return Server;
}

// --------------------------------------------------
// SUMMARY CARD
// --------------------------------------------------

function SummaryCard({ label, value, icon: Icon, color, description }) {
  return (
    <article
      style={{
        background: "#FFFFFF",
        border: "1px solid #E7EAF0",
        borderRadius: 11,
        padding: 18,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ color: "#697586", fontSize: 11, fontWeight: 700 }}>
          {label.toUpperCase()}
        </span>

        <div style={{
          width: 35,
          height: 35,
          borderRadius: 9,
          display: "grid",
          placeItems: "center",
          background: `${color}15`,
          color,
        }}>
          <Icon size={18} />
        </div>
      </div>

      <strong style={{
        display: "block",
        marginTop: 12,
        color: "#17243A",
        fontSize: 29,
        lineHeight: 1.2,
      }}>
        {value}
      </strong>

      <p style={{ margin: "6px 0 0", color: "#8A94A3", fontSize: 11 }}>
        {description}
      </p>
    </article>
  );
}

// --------------------------------------------------
// DETAIL ROW
// --------------------------------------------------

function DetailRow({ label, value }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "145px minmax(0, 1fr)",
      gap: 10,
      padding: "9px 0",
      borderBottom: "1px solid #EDF0F4",
    }}>
      <span style={{ color: "#8A94A3", fontSize: 12 }}>
        {label}
      </span>

      <span style={{
        color: "#344256",
        fontSize: 12,
        fontWeight: 600,
        overflowWrap: "anywhere",
      }}>
        {value ?? "Not available"}
      </span>
    </div>
  );
}

// --------------------------------------------------
// METRIC BOX
// --------------------------------------------------

function MetricBox({ label, value, color }) {
  return (
    <div style={{
      padding: 11,
      borderRadius: 8,
      background: "#F7F8FA",
      border: "1px solid #EDF0F4",
    }}>
      <span style={{ color: "#8A94A3", fontSize: 10 }}>
        {label}
      </span>

      <strong style={{
        display: "block",
        marginTop: 5,
        color,
        fontSize: 17,
      }}>
        {value}
      </strong>
    </div>
  );
}

// --------------------------------------------------
// PROCESS INVESTIGATION
// --------------------------------------------------

function ProcessInvestigation({ analysis }) {
  const process = analysis?.top_process;

  if (!process) {
    return (
      <div style={{
        padding: 13,
        background: "#FFF5E5",
        borderRadius: 8,
        color: "#94651B",
        fontSize: 12,
      }}>
        No top-process information was returned by the backend.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 13, marginTop: 14 }}>
      <div style={{
        padding: 14,
        background: "#FFFFFF",
        border: "1px solid #E7EAF0",
        borderRadius: 9,
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 13,
        }}>
          <strong style={{ color: "#17243A", fontSize: 13 }}>
            <Zap size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Top resource-consuming process
          </strong>

          <span style={{
            padding: "5px 9px",
            borderRadius: 20,
            background: "#EAF0FF",
            color: "#3157D5",
            fontSize: 10,
            fontWeight: 700,
          }}>
            Process analysis
          </span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
          gap: 12,
        }}>
          <div>
            <span style={{ color: "#8A94A3", fontSize: 10 }}>PROCESS NAME</span>
            <strong style={{
              display: "block",
              marginTop: 5,
              color: "#26364D",
              fontSize: 13,
              overflowWrap: "anywhere",
            }}>
              {process.name || "Unknown"}
            </strong>
          </div>

          <div>
            <span style={{ color: "#8A94A3", fontSize: 10 }}>PROCESS ID</span>
            <strong style={{
              display: "block",
              marginTop: 5,
              color: "#26364D",
              fontSize: 13,
            }}>
              {process.pid ?? "—"}
            </strong>
          </div>

          <div>
            <span style={{ color: "#8A94A3", fontSize: 10 }}>USERNAME</span>
            <strong style={{
              display: "block",
              marginTop: 5,
              color: "#26364D",
              fontSize: 12,
              overflowWrap: "anywhere",
            }}>
              {process.username || "Unavailable"}
            </strong>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10,
          marginTop: 15,
        }}>
          <MetricBox
            label="CPU usage"
            value={`${formatValue(process.cpu_percent)}%`}
            color="#C43D3D"
          />

          <MetricBox
            label="Memory usage"
            value={`${formatValue(process.memory_percent)}%`}
            color="#3157D5"
          />

          <MetricBox
            label="Memory consumed"
            value={
              process.memory_mb !== undefined
                ? `${formatValue(process.memory_mb)} MB`
                : "—"
            }
            color="#16845B"
          />
        </div>
      </div>

      <div style={{
        padding: 13,
        borderRadius: 8,
        background: "#EEF3FF",
        border: "1px solid #DCE6FF",
      }}>
        <strong style={{ color: "#3157A5", fontSize: 12 }}>
          Process investigation recommendation
        </strong>

        <p style={{
          margin: "6px 0 0",
          color: "#465B80",
          fontSize: 12,
          lineHeight: 1.6,
        }}>
          {analysis.recommendation || "Review this process and investigate whether it is consuming resources unexpectedly."}
        </p>
      </div>
    </div>
  );
}

// --------------------------------------------------
// DISK INVESTIGATION
// --------------------------------------------------

function DiskInvestigation({ analysis }) {
  const directories = analysis?.largest_directories || [];
  const files = analysis?.largest_files || [];
  const recommendations = analysis?.recommendations || [];

  return (
    <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
      <div style={{
        padding: 13,
        background: "#FFFFFF",
        border: "1px solid #E7EAF0",
        borderRadius: 9,
      }}>
        <strong style={{ color: "#17243A", fontSize: 13 }}>
          <Database size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
          Disk scan information
        </strong>

        <div style={{ marginTop: 10 }}>
          <DetailRow label="Scan location" value={analysis.scan_location} />
          <DetailRow label="Files scanned" value={analysis.total_files_scanned?.toLocaleString?.() ?? analysis.total_files_scanned} />
          <DetailRow label="Total scanned size" value={analysis.total_scanned_size} />
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
        gap: 12,
      }}>
        <div style={{
          padding: 13,
          background: "#FFFFFF",
          border: "1px solid #E7EAF0",
          borderRadius: 9,
        }}>
          <strong style={{ color: "#26364D", fontSize: 12 }}>
            <Folder size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Largest directories
          </strong>

          {directories.length === 0 ? (
            <p style={{ color: "#8A94A3", fontSize: 11 }}>No directory data available.</p>
          ) : directories.slice(0, 5).map((item, index) => (
            <div key={`${item.directory}-${index}`} style={{
              padding: "9px 0",
              borderBottom: "1px solid #EDF0F4",
            }}>
              <strong style={{
                display: "block",
                color: "#344256",
                fontSize: 11,
                overflowWrap: "anywhere",
              }}>
                {item.directory}
              </strong>
              <span style={{ color: "#8A94A3", fontSize: 10 }}>
                {item.size || formatBytes(item.size_bytes)}
              </span>
            </div>
          ))}
        </div>

        <div style={{
          padding: 13,
          background: "#FFFFFF",
          border: "1px solid #E7EAF0",
          borderRadius: 9,
        }}>
          <strong style={{ color: "#26364D", fontSize: 12 }}>
            <File size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
            Largest files
          </strong>

          {files.length === 0 ? (
            <p style={{ color: "#8A94A3", fontSize: 11 }}>No file data available.</p>
          ) : files.slice(0, 5).map((item, index) => (
            <div key={`${item.path}-${index}`} style={{
              padding: "9px 0",
              borderBottom: "1px solid #EDF0F4",
            }}>
              <strong style={{
                display: "block",
                color: "#344256",
                fontSize: 11,
                overflowWrap: "anywhere",
              }}>
                {item.file_name}
              </strong>
              <span style={{
                display: "block",
                marginTop: 3,
                color: "#8A94A3",
                fontSize: 10,
                overflowWrap: "anywhere",
              }}>
                {item.path}
              </span>
              <span style={{ color: "#3157D5", fontSize: 10 }}>
                {item.size || formatBytes(item.size_bytes)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {recommendations.length > 0 && (
        <div style={{
          padding: 13,
          borderRadius: 8,
          background: "#EEF3FF",
          border: "1px solid #DCE6FF",
        }}>
          <strong style={{ color: "#3157A5", fontSize: 12 }}>
            Disk recommendations
          </strong>

          {recommendations.map((recommendation, index) => (
            <p key={index} style={{
              margin: "7px 0 0",
              color: "#465B80",
              fontSize: 11,
              lineHeight: 1.6,
            }}>
              {index + 1}. {recommendation}
            </p>
          ))}
        </div>
      )}

      <p style={{
        margin: 0,
        color: "#8A94A3",
        fontSize: 10,
      }}>
        CloudOps performs a read-only disk scan. It does not delete files or modify directories.
      </p>
    </div>
  );
}

// --------------------------------------------------
// INVESTIGATION PANEL
// --------------------------------------------------

function InvestigationPanel({ incident, result, loading, error }) {
  const resource = String(incident.resource || "").toLowerCase();

  const analysis = result?.analysis;
  const matchingIncident = result?.incident;

  return (
    <div style={{
      padding: 16,
      background: "#FAFBFC",
      borderTop: "1px solid #EDF0F4",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        marginBottom: 13,
      }}>
        <div style={{
          width: 32,
          height: 32,
          display: "grid",
          placeItems: "center",
          borderRadius: 8,
          background: "#EAF0FF",
          color: "#3157D5",
        }}>
          <SearchCheck size={17} />
        </div>

        <div>
          <strong style={{ color: "#17243A", fontSize: 13 }}>
            Incident investigation
          </strong>
          <p style={{ margin: "3px 0 0", color: "#8A94A3", fontSize: 10 }}>
            Live process and resource analysis
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{
          padding: 25,
          textAlign: "center",
          color: "#697586",
          fontSize: 12,
        }}>
          <LoaderCircle size={22} className="incident-spinning" />
          <p>Analyzing {incident.resource} resources and processes...</p>
        </div>
      ) : error ? (
        <div role="alert" style={{
          padding: 13,
          background: "#FFF1F0",
          color: "#B42318",
          borderRadius: 8,
          fontSize: 12,
        }}>
          <XCircle size={15} style={{ verticalAlign: "middle", marginRight: 6 }} />
          {error}
        </div>
      ) : !result ? (
        <div style={{
          padding: 13,
          background: "#FFF5E5",
          color: "#94651B",
          borderRadius: 8,
          fontSize: 12,
        }}>
          No matching active {incident.resource} analysis was returned.
          This incident may be historical or the resource may no longer be above its detection threshold.
        </div>
      ) : analysis?.status === "not_analyzed" ? (
        <div style={{
          padding: 13,
          background: "#FFF5E5",
          color: "#94651B",
          borderRadius: 8,
          fontSize: 12,
        }}>
          {analysis.message}
        </div>
      ) : (
        <>
          <div style={{
            padding: 11,
            background: "#FFFFFF",
            border: "1px solid #E7EAF0",
            borderRadius: 8,
          }}>
            <DetailRow
              label="Resource"
              value={matchingIncident?.resource || incident.resource}
            />
            <DetailRow
              label="Current system usage"
              value={
                matchingIncident?.usage_percent !== undefined
                  ? `${formatValue(matchingIncident.usage_percent)}%`
                  : analysis?.system_usage_percent !== undefined
                    ? `${formatValue(analysis.system_usage_percent)}%`
                    : `${formatValue(incident.usage_percent)}% (recorded)`
              }
            />
            <DetailRow
              label="Analysis type"
              value={resource === "disk" ? "Disk space investigation" : "Process investigation"}
            />
          </div>

          {resource === "disk" ? (
            <DiskInvestigation analysis={analysis} />
          ) : (
            <ProcessInvestigation analysis={analysis} />
          )}
        </>
      )}
    </div>
  );
}

// --------------------------------------------------
// MAIN INCIDENT MANAGEMENT PAGE
// --------------------------------------------------

function IncidentsPage() {
  const [items, setItems] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [expandedId, setExpandedId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [investigations, setInvestigations] = useState({});
  const [investigationLoadingId, setInvestigationLoadingId] = useState(null);
  const [investigationErrors, setInvestigationErrors] = useState({});

  // --------------------------------------------------
  // LOAD INCIDENT HISTORY
  // --------------------------------------------------

  const loadHistory = useCallback(async () => {
    const data = await getIncidentHistory();

    const rows = Array.isArray(data)
      ? data
      : Array.isArray(data?.history)
        ? data.history
        : Array.isArray(data?.incidents)
          ? data.incidents
          : [];

    setItems(rows);
    setLastUpdated(new Date());
  }, []);

  // --------------------------------------------------
  // RESOURCE-SPECIFIC INVESTIGATION
  // --------------------------------------------------

  const investigateIncident = useCallback(async (incident) => {
    const id = incident.id ?? incident.incident_id;

    if (id === undefined || id === null) return;

    const resource = String(incident.resource || "").trim().toLowerCase();

    if (!["cpu", "memory", "disk"].includes(resource)) {
      setInvestigationErrors((previous) => ({
        ...previous,
        [id]: "Unsupported incident resource.",
      }));
      return;
    }

    setInvestigationLoadingId(id);

    setInvestigationErrors((previous) => ({
      ...previous,
      [id]: "",
    }));

    setInvestigations((previous) => ({
      ...previous,
      [id]: undefined,
    }));

    try {
      // Request only the resource being investigated.
      const response = await API.get("/incidents/analyze", {
        params: {
          resource,
        },
        // Disk scanning may take longer than CPU or Memory analysis.
        timeout: resource === "disk" ? 120000 : 20000,
      });

      const analyses = Array.isArray(response.data?.analyses)
        ? response.data.analyses
        : [];

      const matchingResult = analyses.find((entry) => {
        return String(entry?.incident?.resource || "").toLowerCase() === resource;
      });

      if (!matchingResult) {
        setInvestigations((previous) => ({
          ...previous,
          [id]: null,
        }));

        return;
      }

      setInvestigations((previous) => ({
        ...previous,
        [id]: matchingResult,
      }));

    } catch (err) {
      let errorMessage = "Unable to investigate this incident.";

      if (err.code === "ECONNABORTED") {
        errorMessage = "Investigation timed out. Please try again.";
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setInvestigationErrors((previous) => ({
        ...previous,
        [id]: errorMessage,
      }));
    } finally {
      setInvestigationLoadingId(null);
    }
  }, []);

  // --------------------------------------------------
  // REFRESH INCIDENTS
  // --------------------------------------------------

  const refreshIncidents = useCallback(async () => {
    setRefreshing(true);
    setError("");
    setSuccessMessage("");

    try {
      await getIncidents();
      await loadHistory();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        "Unable to refresh incidents. Check whether the CloudOps backend is running."
      );

      try {
        await loadHistory();
      } catch {
        // Preserve original error.
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadHistory]);

  // --------------------------------------------------
  // INITIAL LOAD + AUTO REFRESH
  // --------------------------------------------------

  useEffect(() => {
    refreshIncidents();

    const interval = setInterval(() => {
      refreshIncidents();
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshIncidents]);

  // --------------------------------------------------
  // EXPAND / COLLAPSE
  // --------------------------------------------------

  function toggleInvestigation(incident, isExpanded) {
    const id = incident.id ?? incident.incident_id;

    if (isExpanded) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    investigateIncident(incident);
  }

  // --------------------------------------------------
  // UPDATE INCIDENT STATUS
  // --------------------------------------------------

  async function changeStatus(incident, nextStatus) {
    const id = incident.id ?? incident.incident_id;

    if (id === undefined || id === null) {
      setError("This incident does not have a valid ID.");
      return;
    }

    setActionId(id);
    setError("");
    setSuccessMessage("");

    try {
      await updateIncidentStatus(id, nextStatus);
      await loadHistory();

      setSuccessMessage(
        `Incident #${id} successfully ${nextStatus.toLowerCase()}.`
      );
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        `Unable to update incident #${id}.`
      );
    } finally {
      setActionId(null);
    }
  }

  // --------------------------------------------------
  // INCIDENT STATISTICS
  // --------------------------------------------------

  const statistics = useMemo(() => ({
    total: items.length,

    critical: items.filter(
      (item) => String(item.severity).toLowerCase() === "critical"
    ).length,

    open: items.filter(
      (item) => String(item.status || "Open").toLowerCase() === "open"
    ).length,

    acknowledged: items.filter(
      (item) => String(item.status || "Open").toLowerCase() === "acknowledged"
    ).length,

    resolved: items.filter(
      (item) => String(item.status || "Open").toLowerCase() === "resolved"
    ).length,
  }), [items]);

  // --------------------------------------------------
  // SEARCH + FILTER
  // --------------------------------------------------

  const filteredItems = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return items.filter((incident) => {
      const id = String(incident.id ?? incident.incident_id ?? "");
      const resource = String(incident.resource || "").toLowerCase();
      const message = String(incident.message || "").toLowerCase();
      const recommendation = String(incident.recommendation || "").toLowerCase();

      const severity = String(incident.severity || "Warning").toLowerCase();
      const status = String(incident.status || "Open").toLowerCase();

      const matchesSearch =
        !query ||
        id.includes(query) ||
        resource.includes(query) ||
        message.includes(query) ||
        recommendation.includes(query);

      const matchesSeverity =
        severityFilter === "All" ||
        severity === severityFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "All" ||
        status === statusFilter.toLowerCase();

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [items, searchTerm, severityFilter, statusFilter]);

  // --------------------------------------------------
  // STYLES
  // --------------------------------------------------

  const selectStyle = {
    width: "100%",
    minWidth: 140,
    padding: "10px 12px",
    border: "1px solid #DCE2EA",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "#26364D",
    fontSize: 12,
    outline: "none",
  };

  const actionButton = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 11px",
    border: "1px solid #DCE2EA",
    borderRadius: 7,
    background: "#FFFFFF",
    color: "#3157D5",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <section style={{ display: "grid", gap: 18 }}>

      {/* SUMMARY CARDS */}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
        gap: 13,
      }}>
        <SummaryCard
          label="Total incidents"
          value={loading ? "—" : statistics.total}
          icon={Activity}
          color="#3157D5"
          description="Recorded in incident history"
        />

        <SummaryCard
          label="Critical incidents"
          value={loading ? "—" : statistics.critical}
          icon={AlertTriangle}
          color="#C43D3D"
          description="High-priority resource issues"
        />

        <SummaryCard
          label="Open incidents"
          value={loading ? "—" : statistics.open}
          icon={CircleAlert}
          color="#B7791F"
          description="Awaiting investigation"
        />

        <SummaryCard
          label="Resolved incidents"
          value={loading ? "—" : statistics.resolved}
          icon={CheckCircle2}
          color="#16845B"
          description="Successfully marked resolved"
        />
      </div>

      {/* INCIDENT MANAGEMENT PANEL */}

      <article style={{
        background: "#FFFFFF",
        border: "1px solid #E7EAF0",
        borderRadius: 11,
        padding: 19,
      }}>

        {/* HEADER */}

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 15,
          flexWrap: "wrap",
          marginBottom: 18,
        }}>
          <div>
            <h2 style={{ margin: 0, color: "#17243A", fontSize: 18 }}>
              Incident management
            </h2>

            <p style={{ margin: "6px 0 0", color: "#697586", fontSize: 12 }}>
              Detect, investigate and manage infrastructure incidents.
            </p>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={refreshIncidents}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "incident-spinning" : ""}
            />
            {refreshing ? "Checking..." : "Run detection"}
          </button>
        </div>

        {/* DETECTION INFORMATION */}

        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          padding: 12,
          marginBottom: 17,
          borderRadius: 8,
          background: "#F1F5FF",
          color: "#3157A5",
        }}>
          <Info size={17} style={{ flexShrink: 0, marginTop: 1 }} />

          <div>
            <strong style={{ fontSize: 12 }}>
              Automatic resource monitoring
            </strong>

            <p style={{
              margin: "4px 0 0",
              fontSize: 11,
              lineHeight: 1.6,
            }}>
              CloudOps checks CPU, Memory and Disk utilization.
              Warning incidents start at 80% and Critical incidents
              start at 90%. Detection runs when you refresh and
              automatically every 15 seconds while this page is open.
              Expand an incident to investigate its resource usage.
            </p>
          </div>
        </div>

        {/* SUCCESS MESSAGE */}

        {successMessage && (
          <div role="status" style={{
            padding: "11px 13px",
            marginBottom: 13,
            borderRadius: 8,
            background: "#E8F5EF",
            color: "#16845B",
            fontSize: 12,
          }}>
            <Check size={15} style={{ verticalAlign: "middle" }} />{" "}
            {successMessage}
          </div>
        )}

        {/* ERROR MESSAGE */}

        {error && (
          <div role="alert" style={{
            padding: "11px 13px",
            marginBottom: 13,
            borderRadius: 8,
            background: "#FFF1F0",
            color: "#B42318",
            fontSize: 12,
          }}>
            <XCircle size={15} style={{ verticalAlign: "middle", marginRight: 5 }} />
            {error}
          </div>
        )}

        {/* FILTERS */}

        <div className="incident-filter-grid" style={{
          display: "grid",
          gridTemplateColumns: "minmax(200px, 1.6fr) repeat(2, minmax(140px, 1fr))",
          gap: 11,
          marginBottom: 16,
        }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#697586", fontSize: 10, fontWeight: 700 }}>
              SEARCH INCIDENTS
            </span>

            <div style={{ position: "relative" }}>
              <Search size={16} style={{
                position: "absolute",
                left: 11,
                top: 11,
                color: "#8A94A3",
              }} />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search ID, resource or message..."
                style={{ ...selectStyle, paddingLeft: 35 }}
              />
            </div>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#697586", fontSize: 10, fontWeight: 700 }}>
              SEVERITY
            </span>

            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value)}
              style={selectStyle}
            >
              <option value="All">All severities</option>
              <option value="Critical">Critical</option>
              <option value="Warning">Warning</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#697586", fontSize: 10, fontWeight: 700 }}>
              STATUS
            </span>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              style={selectStyle}
            >
              <option value="All">All statuses</option>
              <option value="Open">Open</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Resolved">Resolved</option>
            </select>
          </label>
        </div>

        {/* RESULT COUNT */}

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          padding: "11px 0",
          borderTop: "1px solid #EDF0F4",
          borderBottom: "1px solid #EDF0F4",
        }}>
          <span style={{ color: "#697586", fontSize: 11 }}>
            Showing <strong style={{ color: "#26364D" }}>{filteredItems.length}</strong> of {items.length} incidents
          </span>

          <span style={{ color: "#8A94A3", fontSize: 11 }}>
            {statistics.acknowledged} acknowledged
          </span>
        </div>

        {/* INCIDENT LIST */}

        <div style={{ display: "grid", gap: 12, marginTop: 15 }}>
          {loading && items.length === 0 ? (
            <div style={{
              padding: 38,
              textAlign: "center",
              color: "#697586",
            }}>
              <Activity size={24} />
              <p style={{ fontSize: 12 }}>Loading incident information...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{
              padding: "40px 18px",
              textAlign: "center",
              border: "1px dashed #DCE2EA",
              borderRadius: 9,
            }}>
              <CheckCircle2 size={29} style={{ color: "#16845B" }} />

              <h3 style={{
                margin: "11px 0 5px",
                color: "#26364D",
                fontSize: 15,
              }}>
                {items.length === 0 ? "No incident history found" : "No matching incidents"}
              </h3>

              <p style={{ margin: 0, color: "#697586", fontSize: 12 }}>
                {items.length === 0
                  ? "Run detection to check your infrastructure for resource issues."
                  : "Try changing your search term or filters."}
              </p>
            </div>
          ) : (
            filteredItems.map((incident) => {
              const id = incident.id ?? incident.incident_id;
              const severity = incident.severity || "Warning";
              const status = incident.status || "Open";

              const isCritical = severity.toLowerCase() === "critical";
              const isExpanded = expandedId === id;
              const isBusy = actionId === id;

              const ResourceIcon = getResourceIcon(incident.resource);
              const severityStyle = getSeverityStyle(severity);
              const statusStyle = getStatusStyle(status);

              return (
                <article key={id} style={{
                  border: "1px solid #E7EAF0",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#FFFFFF",
                }}>

                  {/* INCIDENT SUMMARY */}

                  <div style={{
                    padding: 15,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 13,
                    flexWrap: "wrap",
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 11,
                      minWidth: 0,
                      flex: 1,
                    }}>
                      <div style={{
                        width: 39,
                        height: 39,
                        flexShrink: 0,
                        borderRadius: 9,
                        display: "grid",
                        placeItems: "center",
                        background: isCritical ? "#FDECEC" : "#FFF5E5",
                        color: isCritical ? "#C43D3D" : "#B7791F",
                      }}>
                        <ResourceIcon size={19} />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}>
                          <strong style={{ color: "#17243A", fontSize: 14 }}>
                            {incident.resource || "Infrastructure"} incident
                          </strong>

                          <span style={{ color: "#8A94A3", fontSize: 10 }}>
                            #{id}
                          </span>
                        </div>

                        <p style={{
                          margin: "5px 0 0",
                          color: "#697586",
                          fontSize: 12,
                          lineHeight: 1.5,
                        }}>
                          {incident.message ||
                            `${incident.resource} usage is ${formatValue(incident.usage_percent)}%.`}
                        </p>

                        <p style={{
                          margin: "7px 0 0",
                          color: "#8A94A3",
                          fontSize: 10,
                        }}>
                          <Clock3 size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                          {formatDate(incident.timestamp || incident.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* BADGES + USAGE */}

                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      flexWrap: "wrap",
                    }}>
                      <span style={{
                        padding: "5px 9px",
                        borderRadius: 20,
                        background: severityStyle.background,
                        color: severityStyle.color,
                        border: `1px solid ${severityStyle.border}`,
                        fontSize: 10,
                        fontWeight: 700,
                      }}>
                        {severity}
                      </span>

                      <span style={{
                        padding: "5px 9px",
                        borderRadius: 20,
                        background: statusStyle.background,
                        color: statusStyle.color,
                        border: `1px solid ${statusStyle.border}`,
                        fontSize: 10,
                        fontWeight: 700,
                      }}>
                        {status}
                      </span>

                      <strong style={{
                        color: isCritical ? "#C43D3D" : "#26364D",
                        fontSize: 16,
                        marginLeft: 5,
                      }}>
                        {formatValue(incident.usage_percent)}%
                      </strong>
                    </div>
                  </div>

                  {/* USAGE BAR */}

                  <div style={{ height: 4, background: "#F0F2F5" }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, Math.max(0, Number(incident.usage_percent) || 0))}%`,
                      background: isCritical ? "#C43D3D" : "#D69A35",
                      transition: "width 0.3s ease",
                    }} />
                  </div>

                  {/* EXPAND INVESTIGATION */}

                  <button
                    type="button"
                    onClick={() => toggleInvestigation(incident, isExpanded)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "11px 15px",
                      border: "none",
                      borderTop: "1px solid #EDF0F4",
                      background: "#FAFBFC",
                      color: "#596579",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                    }}>
                      <SearchCheck size={15} />
                      {isExpanded ? "Hide investigation details" : "Investigate this incident"}
                    </span>

                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {/* INVESTIGATION CONTENT */}

                  {isExpanded && (
                    <InvestigationPanel
                      incident={incident}
                      result={investigations[id]}
                      loading={investigationLoadingId === id}
                      error={investigationErrors[id]}
                    />
                  )}

                  {/* INCIDENT DETAILS */}

                  <div style={{
                    padding: "11px 15px",
                    background: "#FFFFFF",
                    borderTop: "1px solid #EDF0F4",
                  }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: 9,
                    }}>
                      <span style={{ color: "#8A94A3", fontSize: 10 }}>
                        <History size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />
                        Incident lifecycle
                      </span>

                      <span style={{ color: "#697586", fontSize: 10 }}>
                        {incident.acknowledged_at
                          ? `Acknowledged: ${formatDate(incident.acknowledged_at)}`
                          : "Not acknowledged"}
                      </span>
                    </div>

                    <p style={{
                      margin: 0,
                      color: "#596579",
                      fontSize: 11,
                      lineHeight: 1.5,
                    }}>
                      <strong>Recommendation:</strong>{" "}
                      {incident.recommendation || "No recommendation available."}
                    </p>
                  </div>

                  {/* INCIDENT ACTIONS */}

                  <div style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    padding: "11px 14px",
                    borderTop: "1px solid #EDF0F4",
                    flexWrap: "wrap",
                  }}>
                    {status === "Open" && (
                      <button
                        type="button"
                        style={actionButton}
                        disabled={isBusy}
                        onClick={() => changeStatus(incident, "Acknowledged")}
                      >
                        <ShieldCheck size={14} />
                        {isBusy ? "Updating..." : "Acknowledge"}
                      </button>
                    )}

                    {status !== "Resolved" && (
                      <button
                        type="button"
                        style={{
                          ...actionButton,
                          background: "#16845B",
                          borderColor: "#16845B",
                          color: "#FFFFFF",
                        }}
                        disabled={isBusy}
                        onClick={() => changeStatus(incident, "Resolved")}
                      >
                        <CheckCircle2 size={14} />
                        {isBusy ? "Updating..." : "Resolve"}
                      </button>
                    )}

                    {status === "Resolved" && (
                      <button
                        type="button"
                        style={actionButton}
                        disabled={isBusy}
                        onClick={() => changeStatus(incident, "Open")}
                      >
                        <RotateCcw size={14} />
                        {isBusy ? "Updating..." : "Reopen"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* FOOTER */}

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 17,
          paddingTop: 13,
          borderTop: "1px solid #EDF0F4",
        }}>
          <span style={{ color: "#8A94A3", fontSize: 10 }}>
            <Activity size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />
            CloudOps incident monitoring
          </span>

          <span style={{ color: "#8A94A3", fontSize: 10 }}>
            {lastUpdated
              ? `Last updated ${lastUpdated.toLocaleTimeString()}`
              : "Waiting for first refresh"}
          </span>
        </div>
      </article>

      <style>
        {`
          .incident-spinning {
            animation: incidentSpin 1s linear infinite;
          }

          @keyframes incidentSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @media (max-width: 700px) {
            .incident-filter-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </section>
  );
}

export default IncidentsPage;
