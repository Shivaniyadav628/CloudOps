
import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Cloud,
  Server,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wifi,
  WifiOff,
  Clock3,
  Database,
  ShieldCheck,
  Monitor,
  PlayCircle,
  Info,
} from "lucide-react";

import API from "./api";

// --------------------------------------------------
// DEMO DATA - SIMULATED, NOT REAL AWS RESOURCES
// --------------------------------------------------

const DEMO_INSTANCES = [
  {
    instance_id: "i-0a12bc34de56f7890",
    name: "cloudops-web-server",
    instance_type: "t3.medium",
    state: "running",
    availability_zone: "ap-south-1a",
    private_ip: "10.0.1.25",
    public_ip: "203.0.113.10",
    launch_time: "2026-11-10T09:30:00Z",
  },
  {
    instance_id: "i-0b23cd45ef67a8901",
    name: "cloudops-database-server",
    instance_type: "t3.large",
    state: "running",
    availability_zone: "ap-south-1b",
    private_ip: "10.0.2.40",
    public_ip: "203.0.113.20",
    launch_time: "2026-11-12T11:15:00Z",
  },
  {
    instance_id: "i-0c34de56fa78b9012",
    name: "cloudops-test-server",
    instance_type: "t2.micro",
    state: "stopped",
    availability_zone: "ap-south-1a",
    private_ip: "10.0.1.55",
    public_ip: "—",
    launch_time: "2026-11-15T14:00:00Z",
  },
];

const DEMO_CPU = {
  "i-0a12bc34de56f7890": {
    average: 42.6,
    minimum: 25.4,
    maximum: 68.2,
    history: [28, 35, 31, 48, 42, 55, 39, 46, 42.6],
  },
  "i-0b23cd45ef67a8901": {
    average: 76.8,
    minimum: 62.1,
    maximum: 91.4,
    history: [62, 69, 74, 81, 72, 91, 84, 78, 76.8],
  },
  "i-0c34de56fa78b9012": {
    average: 0,
    minimum: 0,
    maximum: 0,
    history: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function formatNumber(value, digits = 1) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toFixed(digits);
}

function getInstanceStatus(state) {
  const value = String(state || "").toLowerCase();

  if (value === "running") return "Running";
  if (value === "stopped") return "Stopped";
  if (value === "pending") return "Pending";
  if (value === "stopping") return "Stopping";
  if (value === "terminated") return "Terminated";

  return state || "Unknown";
}

function getInstanceColor(state) {
  const value = String(state || "").toLowerCase();

  if (value === "running") return "#16845B";
  if (value === "stopped" || value === "terminated") return "#C43D3D";
  if (value === "pending" || value === "stopping") return "#B7791F";

  return "#8A94A3";
}

function getCpuStatus(value) {
  const usage = Number(value);

  if (!Number.isFinite(usage)) return "Unavailable";
  if (usage >= 90) return "Critical";
  if (usage >= 80) return "Warning";

  return "Healthy";
}

function getCpuColor(status) {
  if (status === "Critical") return "#C43D3D";
  if (status === "Warning") return "#B7791F";
  if (status === "Healthy") return "#16845B";

  return "#8A94A3";
}

function extractInstances(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.instances)) return data.instances;

  if (Array.isArray(data?.Reservations)) {
    return data.Reservations.flatMap(
      (reservation) => reservation.Instances || []
    );
  }

  return [];
}

function getInstanceId(instance) {
  return (
    instance?.instance_id ||
    instance?.id ||
    instance?.InstanceId ||
    ""
  );
}

function getInstanceName(instance) {
  if (instance?.name) return instance.name;
  if (instance?.Name) return instance.Name;

  const tags = instance?.tags || instance?.Tags || [];
  const nameTag = tags.find((tag) => tag.Key === "Name");

  return nameTag?.Value || "Unnamed instance";
}

function getInstanceState(instance) {
  return (
    instance?.state ||
    instance?.State?.Name ||
    instance?.State ||
    "Unknown"
  );
}

// --------------------------------------------------
// SMALL REUSABLE COMPONENTS
// --------------------------------------------------

function SummaryCard({ title, value, description, icon: Icon, color }) {
  return (
    <article
      style={{
        background: "#FFFFFF",
        border: "1px solid #E7EAF0",
        borderRadius: 11,
        padding: 19,
        display: "grid",
        gap: 14,
      }}
    >
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
            letterSpacing: "0.04em",
          }}
        >
          {title}
        </span>

        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 9,
            background: `${color}15`,
            color,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon size={19} />
        </div>
      </div>

      <div>
        <strong
          style={{
            display: "block",
            fontSize: 29,
            color: "#17243A",
          }}
        >
          {value}
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 5,
            color: "#8A94A3",
            fontSize: 12,
          }}
        >
          {description}
        </span>
      </div>
    </article>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p
        style={{
          margin: 0,
          color: "#8A94A3",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {label.toUpperCase()}
      </p>

      <strong
        style={{
          display: "block",
          marginTop: 7,
          color: "#26364D",
          fontSize: 13,
          overflowWrap: "anywhere",
        }}
      >
        {value || "—"}
      </strong>
    </div>
  );
}

function CpuChart({ values }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "end",
        gap: 10,
        height: 145,
        padding: "15px 5px 0",
        borderBottom: "1px solid #E7EAF0",
      }}
    >
      {values.map((value, index) => (
        <div
          key={index}
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "end",
            alignItems: "center",
            gap: 7,
          }}
        >
          <span style={{ fontSize: 9, color: "#697586" }}>
            {value}%
          </span>

          <div
            title={`CPU utilization: ${value}%`}
            style={{
              width: "100%",
              maxWidth: 36,
              height: `${Math.max(value, 2)}%`,
              minHeight: 3,
              background:
                value >= 90
                  ? "#C43D3D"
                  : value >= 80
                    ? "#D69A32"
                    : "#3157D5",
              borderRadius: "5px 5px 0 0",
              transition: "height 0.3s ease",
            }}
          />
        </div>
      ))}
    </div>
  );
}

// --------------------------------------------------
// AWS MONITORING PAGE
// --------------------------------------------------

function AwsMonitoringPage() {
  const [mode, setMode] = useState("demo");

  const [liveInstances, setLiveInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState(
    DEMO_INSTANCES[0].instance_id
  );

  const [cpuMetrics, setCpuMetrics] = useState(null);

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [instanceError, setInstanceError] = useState("");
  const [cpuError, setCpuError] = useState("");

  const [lastUpdated, setLastUpdated] = useState(new Date());

  // --------------------------------------------------
  // CURRENT DATA SOURCE
  // --------------------------------------------------

  const instances =
    mode === "demo" ? DEMO_INSTANCES : liveInstances;

  const selected = instances.find(
    (instance) => getInstanceId(instance) === selectedInstance
  );

  const demoMetrics = DEMO_CPU[selectedInstance];

  const cpuValue =
    mode === "demo"
      ? demoMetrics?.average
      : (
          cpuMetrics?.average_cpu ??
          cpuMetrics?.average ??
          cpuMetrics?.avg_cpu ??
          cpuMetrics?.cpu_utilization ??
          cpuMetrics?.cpu_percent ??
          cpuMetrics?.average_utilization
        );

  const cpuHistory =
    mode === "demo" ? demoMetrics?.history : null;

  const cpuStatus = getCpuStatus(cpuValue);
  const cpuColor = getCpuColor(cpuStatus);

  const runningInstances = instances.filter(
    (instance) =>
      String(getInstanceState(instance)).toLowerCase() === "running"
  ).length;

  const stoppedInstances = instances.filter(
    (instance) =>
      String(getInstanceState(instance)).toLowerCase() === "stopped"
  ).length;

  const awsConnected =
    mode === "live" &&
    !instanceError &&
    liveInstances.length > 0;

  // --------------------------------------------------
  // LOAD LIVE EC2 INSTANCES
  // --------------------------------------------------

  const loadInstances = useCallback(async () => {
    setInstanceError("");

    try {
      const response = await API.get("/aws/ec2/instances");
      const rows = extractInstances(response.data);

      setLiveInstances(rows);

      if (rows.length > 0) {
        setSelectedInstance((current) => {
          const exists = rows.some(
            (instance) => getInstanceId(instance) === current
          );

          return exists ? current : getInstanceId(rows[0]);
        });
      } else {
        setSelectedInstance("");
        setCpuMetrics(null);
      }

      setLastUpdated(new Date());
    } catch (error) {
      setLiveInstances([]);
      setCpuMetrics(null);

      setInstanceError(
        error?.response?.data?.detail ||
          "Unable to connect to AWS EC2. Check AWS credentials and backend configuration."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // --------------------------------------------------
  // LOAD LIVE CLOUDWATCH METRICS
  // --------------------------------------------------

  const loadCpuMetrics = useCallback(async (instanceId) => {
    if (!instanceId) {
      setCpuMetrics(null);
      setCpuError("");
      return;
    }

    try {
      setCpuError("");

      const response = await API.get("/aws/ec2/cpu", {
        params: { instance_id: instanceId },
      });

      setCpuMetrics(response.data);
    } catch (error) {
      setCpuMetrics(null);

      setCpuError(
        error?.response?.data?.detail ||
          "Unable to retrieve CloudWatch CPU metrics for this instance."
      );
    }
  }, []);

  // --------------------------------------------------
  // LIVE MODE EFFECTS
  // --------------------------------------------------

  useEffect(() => {
    if (mode !== "live") return;

    setLoading(true);
    loadInstances();
  }, [mode, loadInstances]);

  useEffect(() => {
    if (mode !== "live" || !selectedInstance) return;

    loadCpuMetrics(selectedInstance);
  }, [mode, selectedInstance, loadCpuMetrics]);

  // --------------------------------------------------
  // MODE SWITCHING
  // --------------------------------------------------

  const switchMode = (nextMode) => {
    if (nextMode === mode) return;

    setMode(nextMode);
    setInstanceError("");
    setCpuError("");
    setCpuMetrics(null);
    setLiveInstances([]);

    if (nextMode === "demo") {
      setSelectedInstance(DEMO_INSTANCES[0].instance_id);
      setLoading(false);
      setLastUpdated(new Date());
    } else {
      setSelectedInstance("");
    }
  };

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const refreshAll = async () => {
    setRefreshing(true);

    try {
      if (mode === "demo") {
        // Refreshes the simulated dashboard timestamp.
        setLastUpdated(new Date());
      } else {
        await loadInstances();
      }
    } finally {
      setRefreshing(false);
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <section style={{ display: "grid", gap: 19 }}>

      {/* DEMO / LIVE MODE SELECTOR */}

      <article
        style={{
          background: "#FFFFFF",
          border: "1px solid #E7EAF0",
          borderRadius: 11,
          padding: 19,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 15,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Monitor size={19} color="#3157D5" />

            <strong style={{ color: "#17243A", fontSize: 15 }}>
              Monitoring environment
            </strong>
          </div>

          <p
            style={{
              margin: "6px 0 0",
              color: "#697586",
              fontSize: 12,
            }}
          >
            Choose how you want to view infrastructure monitoring.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 7,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => switchMode("demo")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 14px",
              borderRadius: 8,
              border:
                mode === "demo"
                  ? "1px solid #3157D5"
                  : "1px solid #E7EAF0",
              background: mode === "demo" ? "#EEF2FF" : "#FFFFFF",
              color: mode === "demo" ? "#3157D5" : "#697586",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <PlayCircle size={15} />
            Demo Mode
          </button>

          <button
            type="button"
            onClick={() => switchMode("live")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "10px 14px",
              borderRadius: 8,
              border:
                mode === "live"
                  ? "1px solid #3157D5"
                  : "1px solid #E7EAF0",
              background: mode === "live" ? "#EEF2FF" : "#FFFFFF",
              color: mode === "live" ? "#3157D5" : "#697586",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <Cloud size={15} />
            Live AWS Mode
          </button>
        </div>
      </article>

      {/* DEMO NOTICE */}

      {mode === "demo" && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 11,
            padding: 15,
            borderRadius: 9,
            background: "#EEF2FF",
            border: "1px solid #DCE4FF",
          }}
        >
          <Info
            size={19}
            color="#3157D5"
            style={{ flexShrink: 0, marginTop: 1 }}
          />

          <div>
            <strong
              style={{
                display: "block",
                color: "#2346AE",
                fontSize: 12,
              }}
            >
              DEMO DATA · NOT LIVE AWS
            </strong>

            <p
              style={{
                margin: "5px 0 0",
                color: "#52658F",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              This dashboard is displaying simulated EC2 instances
              and CloudWatch metrics for demonstration purposes.
              No actual AWS resources are being accessed.
            </p>
          </div>
        </div>
      )}

      {/* CONNECTION STATUS */}

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
              width: 46,
              height: 46,
              borderRadius: 11,
              background: "#EEF2FF",
              color: "#3157D5",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Cloud size={23} />
          </div>

          <div>
            <strong style={{ color: "#17243A", fontSize: 15 }}>
              Amazon Web Services
            </strong>

            <p
              style={{
                margin: "5px 0 0",
                color: "#697586",
                fontSize: 12,
              }}
            >
              EC2 instance monitoring and CloudWatch metrics
            </p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 12px",
            borderRadius: 20,
            background:
              mode === "demo"
                ? "#EEF2FF"
                : awsConnected
                  ? "#E8F5EF"
                  : "#FFF4E5",
            color:
              mode === "demo"
                ? "#3157D5"
                : awsConnected
                  ? "#16845B"
                  : "#925500",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {mode === "demo" ? (
            <Monitor size={15} />
          ) : awsConnected ? (
            <Wifi size={15} />
          ) : (
            <WifiOff size={15} />
          )}

          {mode === "demo"
            ? "Demo environment"
            : awsConnected
              ? "AWS data available"
              : "Not connected"}
        </div>
      </article>

      {/* LIVE CONNECTION ERROR */}

      {mode === "live" && instanceError && (
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
          <strong>AWS connection unavailable</strong>

          <p style={{ margin: "5px 0 0" }}>
            {instanceError}
          </p>
        </div>
      )}

      {/* SUMMARY CARDS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
        }}
      >
        <SummaryCard
          title="TOTAL EC2 INSTANCES"
          value={loading ? "—" : instances.length}
          description={
            mode === "demo"
              ? "Simulated demonstration instances"
              : "Instances returned by AWS"
          }
          icon={Server}
          color="#3157D5"
        />

        <SummaryCard
          title="RUNNING INSTANCES"
          value={loading ? "—" : runningInstances}
          description="Currently running instances"
          icon={CheckCircle2}
          color="#16845B"
        />

        <SummaryCard
          title="STOPPED INSTANCES"
          value={loading ? "—" : stoppedInstances}
          description="Instances currently stopped"
          icon={AlertTriangle}
          color="#B7791F"
        />

        <SummaryCard
          title="CLOUDWATCH"
          value={
            mode === "demo"
              ? "Simulated"
              : awsConnected
                ? "Available"
                : "Unavailable"
          }
          description={
            mode === "demo"
              ? "Sample monitoring metrics"
              : "AWS monitoring service"
          }
          icon={Activity}
          color="#8B5CF6"
        />
      </div>

      {/* EC2 INSTANCES */}

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
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 17, color: "#17243A" }}>
              EC2 instances
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#697586",
                fontSize: 12,
              }}
            >
              Review your available virtual server instances
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={refreshAll}
            disabled={refreshing || loading}
          >
            <RefreshCw
              size={16}
              style={{
                animation: refreshing ? "spin 1s linear infinite" : "none",
              }}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div
            style={{
              padding: 35,
              textAlign: "center",
              color: "#697586",
            }}
          >
            Loading EC2 instance information...
          </div>
        ) : instances.length === 0 ? (
          <div
            style={{
              padding: "38px 18px",
              textAlign: "center",
              border: "1px dashed #DCE2EA",
              borderRadius: 9,
              color: "#697586",
            }}
          >
            <Cloud
              size={30}
              color="#8A94A3"
              style={{ marginBottom: 9 }}
            />

            <h3
              style={{
                margin: "0 0 6px",
                color: "#26364D",
                fontSize: 15,
              }}
            >
              No EC2 instances available
            </h3>

            <p style={{ margin: 0, fontSize: 12 }}>
              Instance information will appear here when a valid
              AWS connection is available.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {instances.map((instance, index) => {
              const id = getInstanceId(instance);
              const state = getInstanceState(instance);
              const active = selectedInstance === id;

              return (
                <button
                  key={id || index}
                  type="button"
                  onClick={() => setSelectedInstance(id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: 15,
                    border: active
                      ? "1px solid #3157D5"
                      : "1px solid #E7EAF0",
                    borderRadius: 9,
                    background: active ? "#F5F7FF" : "#FFFFFF",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 9,
                        background: "#EEF2FF",
                        color: "#3157D5",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Server size={19} />
                    </div>

                    <div>
                      <strong
                        style={{ color: "#17243A", fontSize: 13 }}
                      >
                        {getInstanceName(instance)}
                      </strong>

                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "#8A94A3",
                          fontSize: 11,
                        }}
                      >
                        {id || "Instance ID unavailable"}
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      color: getInstanceColor(state),
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: getInstanceColor(state),
                      }}
                    />

                    {getInstanceStatus(state)}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </article>

      {/* CLOUDWATCH CPU MONITORING */}

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
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 17, color: "#17243A" }}>
              CloudWatch CPU monitoring
            </h2>

            <p
              style={{
                margin: "5px 0 0",
                color: "#697586",
                fontSize: 12,
              }}
            >
              CPU utilization for the selected EC2 instance
            </p>
          </div>

          <Activity size={20} color="#3157D5" />
        </div>

        {mode === "demo" && (
          <p
            style={{
              margin: "0 0 15px",
              color: "#3157D5",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            SIMULATED CLOUDWATCH METRICS
          </p>
        )}

        {mode === "live" && !selectedInstance ? (
          <div
            style={{
              padding: 25,
              textAlign: "center",
              color: "#697586",
              background: "#F7F8FA",
              borderRadius: 9,
              fontSize: 13,
            }}
          >
            Select an EC2 instance to view its CloudWatch metrics.
          </div>
        ) : mode === "live" && cpuError ? (
          <div
            role="alert"
            style={{
              padding: 14,
              background: "#FFF4E5",
              color: "#925500",
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            {cpuError}
          </div>
        ) : cpuValue === undefined || cpuValue === null ? (
          <div
            style={{
              padding: 25,
              textAlign: "center",
              color: "#697586",
              background: "#F7F8FA",
              borderRadius: 9,
              fontSize: 13,
            }}
          >
            CloudWatch CPU metrics are not available for this instance.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 22 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 22,
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#697586",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  AVERAGE CPU UTILIZATION
                </p>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 5,
                    marginTop: 8,
                  }}
                >
                  <strong
                    style={{ fontSize: 38, color: "#17243A" }}
                  >
                    {formatNumber(cpuValue)}
                  </strong>

                  <span style={{ color: "#697586" }}>%</span>
                </div>

                <span
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    padding: "5px 9px",
                    borderRadius: 20,
                    background: `${cpuColor}15`,
                    color: cpuColor,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {cpuStatus}
                </span>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#697586",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  CPU UTILIZATION
                </p>

                <div
                  style={{
                    marginTop: 15,
                    height: 10,
                    borderRadius: 10,
                    background: "#EDF0F5",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(Math.max(Number(cpuValue), 0), 100)}%`,
                      height: "100%",
                      background: cpuColor,
                      borderRadius: 10,
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                <p
                  style={{
                    margin: "9px 0 0",
                    color: "#697586",
                    fontSize: 12,
                    overflowWrap: "anywhere",
                  }}
                >
                  Selected instance: {selectedInstance}
                </p>
              </div>
            </div>

            {mode === "demo" && cpuHistory && (
              <div
                style={{
                  padding: 15,
                  background: "#F8FAFC",
                  borderRadius: 9,
                  border: "1px solid #E7EAF0",
                }}
              >
                <strong
                  style={{
                    fontSize: 12,
                    color: "#26364D",
                  }}
                >
                  CPU utilization history
                </strong>

                <CpuChart values={cpuHistory} />

                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 11,
                    color: "#8A94A3",
                  }}
                >
                  Illustrative sample readings · Not actual CloudWatch data
                </p>
              </div>
            )}

            {mode === "demo" && demoMetrics && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 12,
                }}
              >
                <InfoItem
                  label="Minimum CPU"
                  value={`${formatNumber(demoMetrics.minimum)}%`}
                />

                <InfoItem
                  label="Maximum CPU"
                  value={`${formatNumber(demoMetrics.maximum)}%`}
                />

                <InfoItem
                  label="Average CPU"
                  value={`${formatNumber(demoMetrics.average)}%`}
                />
              </div>
            )}
          </div>
        )}
      </article>

      {/* INSTANCE DETAILS */}

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
            marginBottom: 18,
          }}
        >
          <Database size={19} color="#3157D5" />

          <h2 style={{ margin: 0, color: "#17243A", fontSize: 17 }}>
            Instance details
          </h2>
        </div>

        {selected ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 20,
            }}
          >
            <InfoItem
              label="Instance name"
              value={getInstanceName(selected)}
            />

            <InfoItem
              label="Instance ID"
              value={getInstanceId(selected)}
            />

            <InfoItem
              label="Instance type"
              value={
                selected.instance_type ||
                selected.type ||
                selected.InstanceType
              }
            />

            <InfoItem
              label="Availability zone"
              value={
                selected.availability_zone ||
                selected.availabilityZone ||
                selected.Placement?.AvailabilityZone
              }
            />

            <InfoItem
              label="Private IP"
              value={selected.private_ip || selected.PrivateIpAddress}
            />

            <InfoItem
              label="Public IP"
              value={selected.public_ip || selected.PublicIpAddress}
            />
          </div>
        ) : (
          <p style={{ margin: 0, color: "#697586", fontSize: 13 }}>
            Instance details will appear when instance information is available.
          </p>
        )}
      </article>

      {/* MONITORING CONFIGURATION */}

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
            marginBottom: 15,
          }}
        >
          <ShieldCheck size={19} color="#3157D5" />

          <h2 style={{ margin: 0, color: "#17243A", fontSize: 17 }}>
            Monitoring configuration
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 18,
          }}
        >
          <InfoItem label="AWS region" value="ap-south-1" />

          <InfoItem
            label="Monitoring service"
            value="Amazon CloudWatch"
          />

          <InfoItem label="Metric" value="CPUUtilization" />

          <InfoItem label="Metric interval" value="300 seconds" />

          <InfoItem
            label="Environment"
            value={mode === "demo" ? "Simulation" : "Live AWS"}
          />

          <InfoItem
            label="Connection"
            value={
              mode === "demo"
                ? "Demo only · Not connected"
                : awsConnected
                  ? "AWS data available"
                  : "Not connected"
            }
          />
        </div>

        <p
          style={{
            margin: "17px 0 0",
            padding: 12,
            borderRadius: 8,
            background: "#F7F8FA",
            color: "#697586",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          {mode === "demo"
            ? "Demo mode uses predefined simulated EC2 and CPU metrics. It does not connect to AWS, create resources, or incur AWS resource charges."
            : "Live mode requests read-only EC2 and CloudWatch information through the CloudOps backend. No instance start, stop, restart, or modification actions are performed."}
        </p>
      </article>

      {/* FOOTER */}

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
          <Clock3
            size={13}
            style={{ verticalAlign: "middle", marginRight: 5 }}
          />

          {lastUpdated
            ? `Last updated ${lastUpdated.toLocaleTimeString()}`
            : "Waiting for monitoring data"}
        </span>

        <span>
          CloudOps · AWS Monitoring
          {mode === "demo" ? " · Demo Environment" : ""}
        </span>
      </div>
    </section>
  );
}

export default AwsMonitoringPage;
