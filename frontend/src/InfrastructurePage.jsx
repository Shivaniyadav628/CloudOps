
import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Monitor,
} from "lucide-react";

import { getSystemMetrics } from "./api";

function formatNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(1);
}

function formatGB(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return `${Number(value).toFixed(2)} GB`;
}

function getStatus(value) {
  const usage = Number(value);

  if (!Number.isFinite(usage)) return "Unavailable";
  if (usage >= 90) return "Critical";
  if (usage >= 80) return "Warning";

  return "Healthy";
}

function getStatusColor(status) {
  if (status === "Critical") return "#C43D3D";
  if (status === "Warning") return "#B7791F";
  if (status === "Healthy") return "#16845B";

  return "#8A94A3";
}

function ResourceCard({ title, value, unit, description, icon: Icon, status }) {
  const percentage = Number(value);
  const validPercentage = Number.isFinite(percentage)
    ? Math.min(Math.max(percentage, 0), 100)
    : 0;

  const color = getStatusColor(status);

  return (
    <article
      style={{
        background: "#FFFFFF",
        border: "1px solid #E7EAF0",
        borderRadius: 11,
        padding: 20,
        display: "grid",
        gap: 15,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: "#EEF2FF",
            color: "#3157D5",
          }}
        >
          <Icon size={21} />
        </div>

        <span
          style={{
            color,
            background: `${color}15`,
            borderRadius: 20,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {status}
        </span>
      </div>

      <div>
        <p
          style={{
            margin: 0,
            color: "#697586",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </p>

        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 4,
            marginTop: 8,
          }}
        >
          <strong style={{ color: "#17243A", fontSize: 34 }}>
            {value}
          </strong>
          <span style={{ color: "#697586", fontSize: 15 }}>{unit}</span>
        </div>

        <p
          style={{
            margin: "5px 0 0",
            color: "#697586",
            fontSize: 12,
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          height: 8,
          background: "#EDF0F5",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${validPercentage}%`,
            height: "100%",
            background: color,
            borderRadius: 10,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </article>
  );
}

function InfrastructurePage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadMetrics = useCallback(async () => {
    try {
      setError("");
      const data = await getSystemMetrics();

      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          "Unable to retrieve infrastructure metrics. Check your backend connection."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMetrics();

    const timer = setInterval(loadMetrics, 10000);

    return () => clearInterval(timer);
  }, [loadMetrics]);

  const cpu = metrics?.cpu;
  const memory = metrics?.memory;
  const disk = metrics?.disk;

  const resources = [
    {
      title: "CPU UTILIZATION",
      value: formatNumber(cpu?.usage_percent),
      unit: "%",
      description: "Current processor utilization",
      icon: Cpu,
      status: getStatus(cpu?.usage_percent),
    },
    {
      title: "MEMORY UTILIZATION",
      value: formatNumber(memory?.usage_percent),
      unit: "%",
      description: `${formatGB(memory?.used_gb)} used of ${formatGB(memory?.total_gb)}`,
      icon: MemoryStick,
      status: getStatus(memory?.usage_percent),
    },
    {
      title: "DISK UTILIZATION",
      value: formatNumber(disk?.usage_percent),
      unit: "%",
      description: `${formatGB(disk?.used_gb)} used of ${formatGB(disk?.total_gb)}`,
      icon: HardDrive,
      status: getStatus(disk?.usage_percent),
    },
  ];

  const statuses = resources.map((resource) => resource.status);

  const overallStatus = statuses.includes("Critical")
    ? "Critical"
    : statuses.includes("Warning")
      ? "Warning"
      : statuses.every((status) => status === "Healthy")
        ? "Healthy"
        : "Unavailable";

  const statusIcon =
    overallStatus === "Healthy"
      ? CheckCircle2
      : overallStatus === "Unavailable"
        ? XCircle
        : AlertTriangle;

  const StatusIcon = statusIcon;

  return (
    <section style={{ display: "grid", gap: 20 }}>
      {error && (
        <div
          role="alert"
          style={{
            padding: 14,
            borderRadius: 9,
            background: "#FFF4E5",
            color: "#925500",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <article
        style={{
          background: "#FFFFFF",
          border: "1px solid #E7EAF0",
          borderRadius: 11,
          padding: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 15,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              display: "grid",
              placeItems: "center",
              background: "#EEF2FF",
              color: "#3157D5",
            }}
          >
            <Monitor size={22} />
          </div>

          <div>
            <strong style={{ color: "#17243A", fontSize: 15 }}>
              Local system infrastructure
            </strong>
            <p style={{ margin: "5px 0 0", color: "#697586", fontSize: 12 }}>
              Live resource monitoring through the CloudOps backend
            </p>
          </div>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setRefreshing(true);
            loadMetrics();
          }}
          disabled={refreshing}
        >
          <RefreshCw size={16} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </article>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 15,
        }}
      >
        {resources.map((resource) => (
          <ResourceCard key={resource.title} {...resource} />
        ))}
      </div>

      <article
        style={{
          background: "#FFFFFF",
          border: "1px solid #E7EAF0",
          borderRadius: 11,
          padding: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 17,
          }}
        >
          <Server size={19} color="#3157D5" />
          <h2 style={{ margin: 0, color: "#17243A", fontSize: 17 }}>
            System information
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 18,
          }}
        >
          {[
            { label: "Operating system", value: metrics?.system || "—" },
            { label: "Hostname", value: metrics?.hostname || "—" },
            {
              label: "Last backend timestamp",
              value: metrics?.timestamp
                ? new Date(metrics.timestamp).toLocaleString()
                : "—",
            },
          ].map((item) => (
            <div key={item.label}>
              <p
                style={{
                  margin: 0,
                  color: "#8A94A3",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {item.label.toUpperCase()}
              </p>
              <strong
                style={{
                  display: "block",
                  marginTop: 7,
                  color: "#26364D",
                  fontSize: 14,
                  overflowWrap: "anywhere",
                }}
              >
                {item.value}
              </strong>
            </div>
          ))}
        </div>
      </article>

      <article
        style={{
          background: "#FFFFFF",
          border: "1px solid #E7EAF0",
          borderRadius: 11,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <StatusIcon
            size={20}
            color={getStatusColor(overallStatus)}
          />
          <h2 style={{ margin: 0, color: "#17243A", fontSize: 17 }}>
            Infrastructure health
          </h2>
        </div>

        <p style={{ color: "#697586", fontSize: 13, marginBottom: 0 }}>
          {loading
            ? "Retrieving system health information..."
            : `Overall resource status: ${overallStatus}. This status is calculated from the current CPU, memory and disk utilization.`}
        </p>

        {lastUpdated && (
          <p style={{ color: "#8A94A3", fontSize: 11, marginBottom: 0 }}>
            Last refreshed: {lastUpdated.toLocaleTimeString()} · Automatic
            refresh every 10 seconds
          </p>
        )}
      </article>
    </section>
  );
}

export default InfrastructurePage;
