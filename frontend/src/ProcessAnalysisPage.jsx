
import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Cpu,
  MemoryStick,
  RefreshCw,
  Server,
  Search,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Clock3,
} from "lucide-react";

import {
  getTopProcesses,
  getSystemMetrics,
} from "./api";

import API from "./api";

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}%` : "—";
}

function formatMemory(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return number >= 1024
    ? `${(number / 1024).toFixed(2)} GB`
    : `${number.toFixed(1)} MB`;
}

function getProcessName(process) {
  return (
    process.name ||
    process.process_name ||
    process.username ||
    "Unknown process"
  );
}

function getProcessId(process) {
  return process.pid ?? process.process_id ?? "—";
}

function getCpuUsage(process) {
  return Number(
    process.cpu_percent ??
    process.cpu_usage ??
    process.cpu ??
    0
  );
}

function getMemoryUsage(process) {
  return Number(
    process.memory_mb ??
    process.memory_usage_mb ??
    process.memory_percent ??
    process.memory_percent_usage ??
    0
  );
}

function ProcessTable({ processes, type }) {
  if (!processes.length) {
    return (
      <div className="empty-state">
        <Activity size={24} />
        <strong>No process information available</strong>
        <p>Refresh to retrieve the latest process information.</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: 480,
          fontSize: 13,
        }}
      >
        <thead>
          <tr style={{ background: "#F7F8FA", textAlign: "left" }}>
            {["PROCESS", "PID", type === "cpu" ? "CPU USAGE" : "MEMORY USAGE"].map(
              (heading) => (
                <th
                  key={heading}
                  style={{
                    padding: "12px 14px",
                    color: "#697586",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: ".04em",
                    borderBottom: "1px solid #E7EAF0",
                  }}
                >
                  {heading}
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {processes.map((process, index) => {
            const usage =
              type === "cpu"
                ? getCpuUsage(process)
                : getMemoryUsage(process);

            return (
              <tr
                key={`${getProcessId(process)}-${index}`}
                style={{ borderBottom: "1px solid #EEF0F4" }}
              >
                <td style={{ padding: "14px", color: "#26364D", fontWeight: 600 }}>
                  {getProcessName(process)}
                </td>

                <td style={{ padding: "14px", color: "#697586" }}>
                  {getProcessId(process)}
                </td>

                <td style={{ padding: "14px", color: "#26364D", fontWeight: 600 }}>
                  {type === "cpu"
                    ? formatPercent(usage)
                    : process.memory_mb !== undefined ||
                        process.memory_usage_mb !== undefined
                      ? formatMemory(usage)
                      : formatPercent(usage)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ProcessAnalysisPage() {
  const [processData, setProcessData] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);

  const [selectedResource, setSelectedResource] = useState("CPU");
  const [analysis, setAnalysis] = useState(null);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadProcessData = useCallback(async () => {
    try {
      setError("");

      const [processes, metrics] = await Promise.all([
        getTopProcesses(),
        getSystemMetrics(),
      ]);

      setProcessData(processes);
      setSystemMetrics(metrics);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        "Unable to retrieve process information. Check your backend connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProcessData();

    const interval = setInterval(loadProcessData, 15000);

    return () => clearInterval(interval);
  }, [loadProcessData]);

  const cpuProcesses = Array.isArray(processData?.top_cpu_processes)
    ? processData.top_cpu_processes
    : [];

  const memoryProcesses = Array.isArray(processData?.top_memory_processes)
    ? processData.top_memory_processes
    : [];

  const totalProcesses = processData?.total_processes ?? "—";

  const currentResource =
    selectedResource === "CPU"
      ? systemMetrics?.cpu
      : systemMetrics?.memory;

  async function runAnalysis() {
    try {
      setAnalyzing(true);
      setAnalysisError("");
      setAnalysis(null);

      const usage = Number(currentResource?.usage_percent);

      if (!Number.isFinite(usage)) {
        setAnalysisError(
          "Current resource usage is unavailable. Refresh system metrics and try again."
        );
        return;
      }

      const response = await API.post("/incidents/analyze", {
        resource: selectedResource,
        usage_percent: usage,
      });

      setAnalysis(response.data);
    } catch (err) {
      setAnalysisError(
        err?.response?.data?.detail ||
        "Unable to analyse this resource. Check the backend API."
      );
    } finally {
      setAnalyzing(false);
    }
  }

  const cardStyle = {
    background: "#FFFFFF",
    border: "1px solid #E7EAF0",
    borderRadius: 10,
    padding: 19,
  };

  const sectionTitle = {
    margin: 0,
    color: "#17243A",
    fontSize: 17,
  };

  const sectionDescription = {
    margin: "5px 0 0",
    color: "#697586",
    fontSize: 12,
  };

  return (
    <section style={{ display: "grid", gap: 18 }}>

      {/* SUMMARY CARDS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
        }}
      >
        {[
          {
            label: "TOTAL PROCESSES",
            value: totalProcesses,
            icon: Server,
            color: "#3157D5",
          },
          {
            label: "CPU UTILIZATION",
            value: formatPercent(systemMetrics?.cpu?.usage_percent),
            icon: Cpu,
            color: "#7655C9",
          },
          {
            label: "MEMORY UTILIZATION",
            value: formatPercent(systemMetrics?.memory?.usage_percent),
            icon: MemoryStick,
            color: "#16845B",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.label} style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    color: "#697586",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {item.label}
                </span>

                <Icon size={19} color={item.color} />
              </div>

              <strong
                style={{
                  display: "block",
                  marginTop: 13,
                  fontSize: 27,
                  color: "#17243A",
                }}
              >
                {loading ? "—" : item.value}
              </strong>
            </article>
          );
        })}
      </div>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          style={{
            padding: 13,
            background: "#FFF4E5",
            color: "#925500",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {/* PROCESS TABLES */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 400px), 1fr))",
          gap: 16,
        }}
      >
        <article style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 17,
            }}
          >
            <div>
              <h2 style={sectionTitle}>Top CPU processes</h2>
              <p style={sectionDescription}>
                Processes ranked by CPU consumption
              </p>
            </div>

            <Cpu size={21} color="#3157D5" />
          </div>

          {loading ? (
            <p style={sectionDescription}>Loading CPU processes...</p>
          ) : (
            <ProcessTable processes={cpuProcesses} type="cpu" />
          )}
        </article>

        <article style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 17,
            }}
          >
            <div>
              <h2 style={sectionTitle}>Top memory processes</h2>
              <p style={sectionDescription}>
                Processes ranked by memory consumption
              </p>
            </div>

            <MemoryStick size={21} color="#7655C9" />
          </div>

          {loading ? (
            <p style={sectionDescription}>Loading memory processes...</p>
          ) : (
            <ProcessTable processes={memoryProcesses} type="memory" />
          )}
        </article>
      </div>

      {/* INCIDENT ANALYSIS */}

      <article style={cardStyle}>
        <div style={{ marginBottom: 17 }}>
          <h2 style={sectionTitle}>Resource troubleshooting</h2>
          <p style={sectionDescription}>
            Analyse current resource utilization and receive troubleshooting guidance.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "end",
            gap: 13,
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              display: "grid",
              gap: 7,
              color: "#697586",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            SELECT RESOURCE

            <select
              value={selectedResource}
              onChange={(event) => {
                setSelectedResource(event.target.value);
                setAnalysis(null);
                setAnalysisError("");
              }}
              style={{
                minWidth: 180,
                padding: "11px 13px",
                border: "1px solid #DCE2EA",
                borderRadius: 8,
                background: "#FFFFFF",
                color: "#26364D",
                fontSize: 13,
              }}
            >
              <option value="CPU">CPU</option>
              <option value="Memory">Memory</option>
            </select>
          </label>

          <div
            style={{
              padding: "11px 14px",
              border: "1px solid #E7EAF0",
              borderRadius: 8,
              color: "#26364D",
              fontSize: 13,
            }}
          >
            Current usage: <strong>{formatPercent(currentResource?.usage_percent)}</strong>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={runAnalysis}
            disabled={analyzing || loading}
          >
            <Search size={16} />
            {analyzing ? "Analysing..." : "Analyse resource"}
          </button>
        </div>

        {analysisError && (
          <div
            role="alert"
            style={{
              marginTop: 16,
              padding: 12,
              background: "#FFF4E5",
              borderRadius: 8,
              color: "#925500",
              fontSize: 13,
            }}
          >
            {analysisError}
          </div>
        )}

        {analysis && (
          <div
            style={{
              marginTop: 20,
              padding: 17,
              border: "1px solid #DCE7F7",
              borderRadius: 9,
              background: "#F7F9FD",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 9,
                alignItems: "center",
                marginBottom: 13,
              }}
            >
              <CheckCircle2 size={20} color="#16845B" />

              <strong style={{ color: "#17243A", fontSize: 15 }}>
                Resource analysis report
              </strong>
            </div>

            <div style={{ display: "grid", gap: 11 }}>
              {Object.entries(analysis).map(([key, value]) => (
                <div key={key}>
                  <strong
                    style={{
                      color: "#3157D5",
                      fontSize: 12,
                      textTransform: "capitalize",
                    }}
                  >
                    {key.replaceAll("_", " ")}
                  </strong>

                  <p
                    style={{
                      margin: "4px 0 0",
                      color: "#596579",
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {typeof value === "object"
                      ? JSON.stringify(value, null, 2)
                      : String(value ?? "—")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!analysis && !analysisError && (
          <div
            style={{
              marginTop: 17,
              padding: 15,
              borderRadius: 8,
              background: "#F7F8FA",
              display: "flex",
              gap: 11,
              alignItems: "center",
            }}
          >
            <Lightbulb size={20} color="#B7791F" />

            <p
              style={{
                margin: 0,
                color: "#697586",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              Select a resource and run an analysis to receive troubleshooting
              information from the CloudOps backend.
            </p>
          </div>
        )}
      </article>

      {/* FOOTER INFORMATION */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          color: "#8A94A3",
          fontSize: 11,
        }}
      >
        <span>
          <Clock3 size={13} style={{ verticalAlign: "middle", marginRight: 5 }} />
          Auto-refresh every 15 seconds
        </span>

        <button
          type="button"
          className="secondary-button"
          onClick={loadProcessData}
          disabled={loading}
        >
          <RefreshCw size={15} />
          {loading ? "Loading..." : "Refresh processes"}
        </button>

        {lastUpdated && (
          <span>Last updated {lastUpdated.toLocaleTimeString()}</span>
        )}
      </div>
    </section>
  );
}
