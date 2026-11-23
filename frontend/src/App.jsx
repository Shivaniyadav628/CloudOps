import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, Check, CheckCheck,
  CheckCircle2, ChevronDown, CircleAlert, CircleHelp, Cloud, Cpu,
  Gauge, HardDrive, Info, LayoutDashboard, MemoryStick, Menu, Monitor,
  RefreshCw, Search, Server, Settings as SettingsIcon, ShieldCheck,
  SlidersHorizontal, X, Save, RotateCcw, Database, Clock3, Wifi,
} from "lucide-react";
import InfrastructurePage from "./InfrastructurePage";
import ProcessAnalysisPage from "./ProcessAnalysisPage";
import AwsMonitoringPage from "./AwsMonitoringPage";
import IncidentManagementPage from "./IncidentsPage";
import API, { getHealth, getSystemMetrics, getIncidents } from "./api";
import "./App.css";

const SETTINGS_KEY = "cloudops_user_settings_v1";
const DEFAULT_SETTINGS = {
  workspaceName: "Personal Workspace",
  refreshInterval: 10,
  cpuWarning: 80,
  cpuCritical: 90,
  memoryWarning: 80,
  memoryCritical: 90,
  diskWarning: 80,
  diskCritical: 90,
  notificationsEnabled: true,
  criticalAlerts: true,
  warningAlerts: true,
  soundEnabled: false,
};

const NAV_GROUPS = [
  { title: "WORKSPACE", items: [
    { label: "Overview", path: "/", icon: LayoutDashboard },
    { label: "Infrastructure", path: "/infrastructure", icon: Server },
    { label: "Incidents", path: "/incidents", icon: Bell },
    { label: "Process Analysis", path: "/process-analysis", icon: Activity },
  ]},
  { title: "MANAGEMENT", items: [
    { label: "AWS Monitoring", path: "/aws-monitoring", icon: Cloud },
    { label: "Settings", path: "/settings", icon: SettingsIcon },
  ]},
];

const PAGE_DESCRIPTIONS = {
  Overview: "A clear view of your local infrastructure and operational health.",
  Infrastructure: "Review CPU, memory and disk utilization on this machine.",
  Incidents: "Investigate, acknowledge and resolve infrastructure incidents.",
  "Process Analysis": "Find processes consuming the most system resources.",
  "AWS Monitoring": "Explore the AWS monitoring demo environment.",
  Settings: "Configure your CloudOps workspace and monitoring preferences.",
};

function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function formatValue(value) {
  const number = Number(value);
  return value === null || value === undefined || !Number.isFinite(number)
    ? "—" : number.toFixed(1);
}
function formatGB(value) {
  const number = Number(value);
  return value === null || value === undefined || !Number.isFinite(number)
    ? "—" : `${number.toFixed(2)} GB`;
}
function resourceStatus(resource) {
  if (!resource) return "Unavailable";
  if (resource.status) return resource.status;
  const usage = Number(resource.usage_percent);
  if (!Number.isFinite(usage)) return "Unavailable";
  return usage >= 90 ? "Critical" : usage >= 80 ? "Warning" : "Healthy";
}
function notificationTime(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}
function severityIcon(severity) {
  const value = String(severity || "").toLowerCase();
  return value === "critical" ? AlertTriangle : value === "warning" ? CircleAlert : Info;
}

function NotificationCenter({ notifications, unreadCount, loading, error, onClose, onRead, onReadAll, onRefresh }) {
  return <>
    <button className="notification-backdrop" aria-label="Close notifications" onClick={onClose} />
    <section className="notification-panel" aria-label="Notification center">
      <div className="notification-panel-header">
        <div><h3>Notifications</h3><p>{unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up"}</p></div>
        <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>
      <div className="notification-toolbar">
        <button onClick={onRefresh} disabled={loading}><RefreshCw size={14} />Refresh</button>
        <button onClick={onReadAll} disabled={!unreadCount}><CheckCheck size={14} />Mark all as read</button>
      </div>
      {error && <p className="inline-error notification-error">{error}</p>}
      <div className="notification-list">
        {loading && !notifications.length ? <div className="notification-empty"><Activity size={24} /><strong>Loading notifications...</strong></div>
          : !notifications.length ? <div className="notification-empty"><CheckCircle2 size={27} /><strong>No notifications yet</strong><p>New infrastructure alerts will appear here when CloudOps detects incidents.</p></div>
          : notifications.map((item) => {
            const Icon = severityIcon(item.severity);
            const critical = String(item.severity).toLowerCase() === "critical";
            return <article className={`notification-item ${item.is_read ? "notification-read" : "notification-unread"}`} key={item.id}>
              <div className={`notification-item-icon ${critical ? "notification-critical" : "notification-warning"}`}><Icon size={18} /></div>
              <div className="notification-item-content">
                <div className="notification-item-title"><strong>{item.title}</strong>{!item.is_read && <span className="notification-unread-dot" />}</div>
                <p>{item.message}</p>
                <div className="notification-item-meta"><span>{item.resource}</span><span>·</span><span>{item.severity}</span></div>
                <time>{notificationTime(item.created_at)}</time>
                {!item.is_read && <button className="notification-read-button" onClick={() => onRead(item.id)}><Check size={14} />Mark as read</button>}
              </div>
            </article>;
          })}
      </div>
      <div className="notification-panel-footer"><span>CloudOps Notification Center</span><span>{notifications.length} notifications</span></div>
    </section>
  </>;
}

function SettingRow({ title, description, children }) {
  return <div className="setting-row"><div className="setting-row-copy"><strong>{title}</strong><p>{description}</p></div><div className="setting-row-control">{children}</div></div>;
}
function Toggle({ checked, onChange, label }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`toggle ${checked ? "toggle-on" : ""}`} onClick={() => onChange(!checked)}><span /></button>;
}

function SettingsPage({ settings, onChange, onSave, onReset, saved, apiBaseUrl, backendConnected, onTestConnection }) {
  const [activeTab, setActiveTab] = useState("General");
  const tabs = [
    { name: "General", icon: SlidersHorizontal },
    { name: "Monitoring", icon: Gauge },
    { name: "Notifications", icon: Bell },
    { name: "Connections", icon: Wifi },
  ];
  const update = (key, value) => onChange({ ...settings, [key]: value });
  const numberField = (key, min = 1, max = 99) => <input className="setting-number" type="number" min={min} max={max} value={settings[key]} onChange={(event) => update(key, Math.min(max, Math.max(min, Number(event.target.value))))} />;

  return <div className="settings-page">
    <div className="settings-intro"><div><span className="settings-kicker">WORKSPACE CONFIGURATION</span><h2>Settings</h2><p>Manage how CloudOps monitors your local system and displays alerts.</p></div><div className="settings-intro-icon"><SettingsIcon size={25} /></div></div>
    <div className="settings-layout">
      <aside className="settings-tabs" aria-label="Settings sections">
        {tabs.map(({ name, icon: Icon }) => <button key={name} className={activeTab === name ? "settings-tab active" : "settings-tab"} onClick={() => setActiveTab(name)}><Icon size={17} /><span>{name}</span><ArrowUpRight size={14} /></button>)}
        <div className="settings-sidebar-note"><ShieldCheck size={17} /><div><strong>Local preferences</strong><p>These settings are stored in this browser on this device.</p></div></div>
      </aside>
      <section className="settings-content">
        {activeTab === "General" && <>
          <div className="settings-section-heading"><div><h3>General preferences</h3><p>Basic information for your CloudOps workspace.</p></div><span className="settings-section-tag">GENERAL</span></div>
          <SettingRow title="Workspace name" description="A label used in the CloudOps sidebar."><input className="setting-text" maxLength={40} value={settings.workspaceName} onChange={(e) => update("workspaceName", e.target.value)} placeholder="Enter workspace name" /></SettingRow>
          <SettingRow title="Dashboard refresh interval" description="How often the overview requests fresh system metrics."><select className="setting-select" value={settings.refreshInterval} onChange={(e) => update("refreshInterval", Number(e.target.value))}><option value={5}>Every 5 seconds</option><option value={10}>Every 10 seconds</option><option value={15}>Every 15 seconds</option><option value={30}>Every 30 seconds</option><option value={60}>Every 60 seconds</option></select></SettingRow>
          <div className="settings-info"><Info size={17} /><span>Refresh interval applies to the CloudOps overview polling. Individual pages may have their own refresh behaviour.</span></div>
        </>}
        {activeTab === "Monitoring" && <>
          <div className="settings-section-heading"><div><h3>Monitoring thresholds</h3><p>Set the warning and critical levels shown in your local preferences.</p></div><span className="settings-section-tag">ALERT RULES</span></div>
          <div className="threshold-table"><div className="threshold-header"><span>Resource</span><span>Warning at</span><span>Critical at</span></div>
            {[{ label: "CPU utilization", warn: "cpuWarning", crit: "cpuCritical" }, { label: "Memory usage", warn: "memoryWarning", crit: "memoryCritical" }, { label: "Disk utilization", warn: "diskWarning", crit: "diskCritical" }].map((row) => <div className="threshold-row" key={row.label}><strong>{row.label}</strong><label>{numberField(row.warn, 1, 98)}<span>%</span></label><label>{numberField(row.crit, 2, 99)}<span>%</span></label></div>)}
          </div>
          <div className="settings-info warning-info"><Info size={17} /><span>These thresholds are saved as dashboard preferences only. The backend incident detector currently uses its own configured thresholds (80% warning and 90% critical); changing these values here does not change backend detection yet.</span></div>
        </>}
        {activeTab === "Notifications" && <>
          <div className="settings-section-heading"><div><h3>Notification preferences</h3><p>Choose which types of alerts you want to see in the notification centre.</p></div><span className="settings-section-tag">ALERTS</span></div>
          <SettingRow title="Enable notifications" description="Show and periodically retrieve alerts from the CloudOps API."><Toggle checked={settings.notificationsEnabled} onChange={(v) => update("notificationsEnabled", v)} label="Enable notifications" /></SettingRow>
          <SettingRow title="Critical alerts" description="Keep critical infrastructure notifications enabled."><Toggle checked={settings.criticalAlerts} onChange={(v) => update("criticalAlerts", v)} label="Critical alerts" /></SettingRow>
          <SettingRow title="Warning alerts" description="Show warning-level infrastructure notifications."><Toggle checked={settings.warningAlerts} onChange={(v) => update("warningAlerts", v)} label="Warning alerts" /></SettingRow>
          <SettingRow title="Sound alerts" description="Reserved for a future browser sound notification feature."><Toggle checked={settings.soundEnabled} onChange={(v) => update("soundEnabled", v)} label="Sound alerts" /></SettingRow>
          <div className="settings-info"><Info size={17} /><span>Alert filtering and sound playback are saved preferences. The backend still records incidents and notifications independently.</span></div>
        </>}
        {activeTab === "Connections" && <>
          <div className="settings-section-heading"><div><h3>Service connections</h3><p>Review the services connected to this CloudOps workspace.</p></div><span className="settings-section-tag">SERVICES</span></div>
          <div className="connection-setting-card"><div className="connection-setting-icon"><Server size={20} /></div><div className="connection-setting-copy"><strong>CloudOps local API</strong><p>{apiBaseUrl}</p><small>Used by the React dashboard for system metrics and incident data.</small></div><span className={`connection-state ${backendConnected ? "connected" : "disconnected"}`}><i />{backendConnected ? "Connected" : "Disconnected"}</span><button className="outline-button" onClick={onTestConnection}><RefreshCw size={14} />Test</button></div>
          <div className="connection-setting-card"><div className="connection-setting-icon aws-icon"><Cloud size={20} /></div><div className="connection-setting-copy"><strong>AWS integration</strong><p>Demo mode · No live AWS credentials</p><small>Live AWS resources are not connected. Demo mode does not create billable AWS resources.</small></div><span className="connection-state demo"><i />Demo mode</span></div>
          <div className="settings-info"><ShieldCheck size={17} /><span>Your CloudOps API endpoint is displayed from the existing frontend API configuration. To change it, update the baseURL in <code>frontend/src/api.js</code>.</span></div>
        </>}
        <div className="settings-actions"><span className={saved ? "save-state saved" : "save-state"}>{saved ? <><CheckCircle2 size={15} />All changes saved</> : "Unsaved changes"}</span><button className="outline-button" onClick={onReset}><RotateCcw size={15} />Reset defaults</button><button className="save-button" onClick={onSave}><Save size={16} />Save changes</button></div>
      </section>
    </div>
  </div>;
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const activePage = useMemo(() => NAV_GROUPS.flatMap((g) => g.items).find((item) => item.path === location.pathname)?.label || "Overview", [location.pathname]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [health, setHealth] = useState(null);
  const [systemMetrics, setSystemMetrics] = useState(null);
  const [incidentData, setIncidentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [settings, setSettings] = useState(readSettings);
  const [settingsSaved, setSettingsSaved] = useState(true);

  const apiBaseUrl = API.defaults?.baseURL || "http://127.0.0.1:8000";
  const backendConnected = Boolean(health && systemMetrics);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.allSettled([getHealth(), getSystemMetrics(), getIncidents()]);
    const errors = [];
    if (results[0].status === "fulfilled") setHealth(results[0].value); else errors.push("Backend health check failed.");
    if (results[1].status === "fulfilled") setSystemMetrics(results[1].value); else errors.push("Unable to retrieve system metrics.");
    if (results[2].status === "fulfilled") setIncidentData(results[2].value); else errors.push("Unable to retrieve incident information.");
    setError(errors.join(" "));
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!settings.notificationsEnabled) return;
    setNotificationLoading(true);
    setNotificationError("");
    try {
      const { data } = await API.get("/notifications", { params: { limit: 50 } });
      let items = Array.isArray(data.notifications) ? data.notifications : [];
      items = items.filter((item) => {
        const severity = String(item.severity || "").toLowerCase();
        if (severity === "critical" && !settings.criticalAlerts) return false;
        if (severity === "warning" && !settings.warningAlerts) return false;
        return true;
      });
      setNotifications(items);
      setUnreadCount(items.filter((item) => !item.is_read).length);
    } catch (err) {
      setNotificationError(err.response?.data?.detail || "Unable to load notifications. Check your backend connection.");
    } finally { setNotificationLoading(false); }
  }, [settings.notificationsEnabled, settings.criticalAlerts, settings.warningAlerts]);

  const handleMarkAsRead = useCallback(async (id) => {
    try {
      await API.patch(`/notifications/${id}/read`);
      setNotifications((previous) => previous.map((item) => item.id === id ? { ...item, is_read: 1 } : item));
      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (err) { setNotificationError(err.response?.data?.detail || "Unable to mark notification as read."); }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await API.post("/notifications/read-all");
      setNotifications((previous) => previous.map((item) => ({ ...item, is_read: 1 })));
      setUnreadCount(0);
      setNotificationError("");
    } catch (err) { setNotificationError(err.response?.data?.detail || "Unable to mark all notifications as read."); }
  }, []);

  useEffect(() => {
    refreshData();
    const timer = window.setInterval(refreshData, Number(settings.refreshInterval) * 1000);
    return () => window.clearInterval(timer);
  }, [refreshData, settings.refreshInterval]);

  useEffect(() => {
    refreshNotifications();
    if (!settings.notificationsEnabled) return undefined;
    const timer = window.setInterval(refreshNotifications, 15000);
    return () => window.clearInterval(timer);
  }, [refreshNotifications, settings.notificationsEnabled]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen((v) => !v); }
      if (event.key === "Escape") { setSearchOpen(false); setNotificationOpen(false); setSidebarOpen(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const changeSettings = (next) => { setSettings(next); setSettingsSaved(false); };
  const saveSettings = () => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      setSettingsSaved(true);
      refreshNotifications();
    } catch { setSettingsSaved(false); }
  };
  const resetSettings = () => { setSettings({ ...DEFAULT_SETTINGS }); setSettingsSaved(false); };
  const testConnection = () => refreshData();
  const navigateTo = (path) => { navigate(path); setSidebarOpen(false); setNotificationOpen(false); };

  const cpu = systemMetrics?.cpu;
  const memory = systemMetrics?.memory;
  const disk = systemMetrics?.disk;
  const incidents = Array.isArray(incidentData?.incidents) ? incidentData.incidents : [];
  const totalIncidents = Number.isFinite(Number(incidentData?.total_incidents)) ? Number(incidentData.total_incidents) : incidents.length;
  const metricCards = [
    { title: "CPU UTILIZATION", value: formatValue(cpu?.usage_percent), unit: "%", detail: `Status: ${resourceStatus(cpu)}`, icon: Cpu, status: resourceStatus(cpu), tone: "green" },
    { title: "MEMORY USAGE", value: formatValue(memory?.usage_percent), unit: "%", detail: `${formatGB(memory?.used_gb)} used of ${formatGB(memory?.total_gb)}`, icon: MemoryStick, status: resourceStatus(memory), tone: "gold" },
    { title: "DISK UTILIZATION", value: formatValue(disk?.usage_percent), unit: "%", detail: `${formatGB(disk?.used_gb)} used of ${formatGB(disk?.total_gb)}`, icon: HardDrive, status: resourceStatus(disk), tone: "teal" },
    { title: "ACTIVE INCIDENTS", value: loading ? "—" : String(totalIncidents), unit: "", detail: "Currently detected incidents", icon: CircleAlert, status: totalIncidents ? "Attention" : "Healthy", tone: "olive" },
  ];

  return <div className="app-shell">
    {sidebarOpen && <button className="sidebar-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><div className="brand-icon"><Cloud size={23} /></div><div className="brand-copy"><span className="brand-name">CloudOps</span><span className="brand-caption">INFRASTRUCTURE INTELLIGENCE</span></div><button className="mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={19} /></button></div>
      <div className="workspace-selector"><div className="workspace-avatar">C</div><div className="workspace-copy"><span>{settings.workspaceName || "Personal Workspace"}</span><small>Local environment</small></div><ChevronDown size={16} /></div>
      <nav className="sidebar-navigation">{NAV_GROUPS.map((group) => <div className="nav-group" key={group.title}><p className="nav-heading">{group.title}</p>{group.items.map((item) => { const Icon = item.icon; const active = activePage === item.label; return <button key={item.path} className={`nav-link ${active ? "active" : ""}`} onClick={() => navigateTo(item.path)}><Icon size={18} /><span>{item.label}</span>{item.label === "Incidents" && <span className="nav-count">{loading ? "—" : totalIncidents}</span>}</button>; })}</div>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-status"><div className="status-icon"><ShieldCheck size={18} /></div><div><strong>Monitoring service</strong><span>{backendConnected ? "Connected" : "Connection unavailable"}</span></div><span className={`sidebar-status-dot ${backendConnected ? "online" : "offline"}`} /></div><div className="profile"><div className="profile-avatar">CO</div><div className="profile-copy"><strong>Workspace Admin</strong><span>Administrator</span></div><SettingsIcon size={17} /></div></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={21} /></button><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-divider">/</span><strong>{activePage}</strong></div></div><div className="topbar-actions"><button className="search-button" onClick={() => setSearchOpen((v) => !v)}><Search size={17} /><span>Search</span><kbd>Ctrl K</kbd></button><button className={`icon-button notification-button ${notificationOpen ? "notification-active" : ""}`} aria-label={`Notifications, ${unreadCount} unread`} aria-expanded={notificationOpen} onClick={() => { setNotificationOpen((v) => !v); if (!notificationOpen) refreshNotifications(); }}><Bell size={19} />{unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}</button><div className="topbar-divider" /><button className="help-button" onClick={() => navigateTo("/settings")}><CircleHelp size={18} /><span>Help & settings</span></button></div></header>
      {notificationOpen && <NotificationCenter notifications={notifications} unreadCount={unreadCount} loading={notificationLoading} error={notificationError} onClose={() => setNotificationOpen(false)} onRead={handleMarkAsRead} onReadAll={handleMarkAllAsRead} onRefresh={refreshNotifications} />}
      {searchOpen && <div className="search-panel"><Search size={18} /><input autoFocus placeholder="Search pages: Overview, Infrastructure, Incidents, Settings..." aria-label="Search CloudOps" onKeyDown={(e) => { if (e.key === "Enter") { const match = NAV_GROUPS.flatMap((g) => g.items).find((item) => item.label.toLowerCase().includes(e.currentTarget.value.toLowerCase())); if (match) navigateTo(match.path); } }} /><button className="icon-button" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={18} /></button></div>}
      <div className="page-container">
        <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" />CLOUDOPS WORKSPACE</div><h1>{activePage}</h1><p>{PAGE_DESCRIPTIONS[activePage]}</p></div><div className="heading-actions">{activePage !== "Settings" && <><span className="refresh-caption"><Clock3 size={14} />Auto refresh · {settings.refreshInterval}s</span><button className="primary-button" onClick={refreshData} disabled={refreshing}><RefreshCw size={16} className={refreshing ? "spin" : ""} />{refreshing ? "Refreshing..." : "Refresh metrics"}</button></>}</div></section>

        {activePage === "Settings" ? <SettingsPage settings={settings} onChange={changeSettings} onSave={saveSettings} onReset={resetSettings} saved={settingsSaved} apiBaseUrl={apiBaseUrl} backendConnected={backendConnected} onTestConnection={testConnection} />
          : activePage === "Infrastructure" ? <InfrastructurePage />
          : activePage === "Incidents" ? <IncidentManagementPage />
          : activePage === "Process Analysis" ? <ProcessAnalysisPage />
          : activePage === "AWS Monitoring" ? <AwsMonitoringPage />
          : <>
            <section className={`connection-banner ${backendConnected ? "is-connected" : "is-disconnected"}`}><div className="connection-left"><div className="connection-icon"><Monitor size={19} /></div><div><strong>{backendConnected ? "Backend connected successfully" : "Backend connection pending"}</strong><p>{backendConnected ? "Live infrastructure metrics are being received from your local CloudOps API." : "Start the FastAPI backend to display live infrastructure metrics."}</p></div></div><span className="connection-badge"><i />{backendConnected ? "Connected" : "Not connected"}</span></section>
            {error && <div className="inline-error" role="alert">{error}</div>}
            <section className="section-block"><div className="section-heading"><div><h2>System overview</h2><p>Current infrastructure resource utilization</p></div><span className="section-meta">LIVE MONITORING</span></div><div className="metrics-grid">{metricCards.map((metric) => { const Icon = metric.icon; return <article className="metric-card" key={metric.title}><div className="metric-card-top"><div className={`metric-icon tone-${metric.tone}`}><Icon size={20} /></div><span className={`metric-status status-${metric.status.toLowerCase()}`}><i />{metric.status}</span></div><p className="metric-title">{metric.title}</p><div className="metric-value">{metric.value}<span>{metric.unit}</span></div><div className="metric-footer"><span>{metric.detail}</span><ArrowUpRight size={16} /></div></article>; })}</div></section>
            <section className="dashboard-grid"><article className="panel resource-panel"><div className="panel-heading"><div><h2>Current resource utilization</h2><p>Latest snapshot from the local machine</p></div><span className="section-meta">CURRENT SNAPSHOT</span></div><div className="utilization-list">{[{ name: "CPU", item: cpu, color: "bar-green" }, { name: "Memory", item: memory, color: "bar-gold" }, { name: "Disk", item: disk, color: "bar-teal" }].map(({ name, item, color }) => <div className="utilization-row" key={name}><div className="utilization-label"><strong>{name}</strong><span>{formatValue(item?.usage_percent)}%</span></div><div className="utilization-track"><div className={`utilization-fill ${color}`} style={{ width: `${Math.min(100, Math.max(0, Number(item?.usage_percent) || 0))}%` }} /></div><small>{resourceStatus(item)}</small></div>)}</div><div className="chart-legend"><span><i className="legend-green" />CPU</span><span><i className="legend-gold" />Memory</span><span><i className="legend-teal" />Disk</span></div></article>
              <article className="panel health-panel"><div className="panel-heading"><div><h2>System health</h2><p>Local monitoring service status</p></div><ShieldCheck size={21} className="health-heading-icon" /></div><div className="health-summary"><div className="health-empty-icon"><Gauge size={27} /></div><strong>{backendConnected ? "Monitoring service operational" : "Health status unavailable"}</strong><p>{backendConnected ? "CloudOps API and system metrics are responding." : "Waiting for the backend health check."}</p></div><div className="health-services"><div className="service-row"><div className="service-name"><Server size={17} /><span>Monitoring API</span></div><span className={backendConnected ? "service-healthy" : "service-pending"}>{backendConnected ? "Connected" : "Offline"}</span></div><div className="service-row"><div className="service-name"><Database size={17} /><span>Incident service</span></div><span className={incidentData ? "service-healthy" : "service-pending"}>{incidentData ? "Available" : "Waiting"}</span></div><div className="service-row"><div className="service-name"><Cloud size={17} /><span>AWS integration</span></div><span className="service-demo">Demo mode</span></div></div></article></section>
            <section className="panel incidents-panel"><div className="panel-heading"><div><h2>Active incidents</h2><p>Latest infrastructure alerts from the backend</p></div><button className="text-button" onClick={() => navigateTo("/incidents")}>View all <ArrowUpRight size={15} /></button></div>{incidents.length ? <div className="overview-incident-list">{incidents.slice(0, 4).map((incident, index) => { const critical = String(incident.severity || "").toLowerCase() === "critical"; return <div className="overview-incident" key={incident.id ?? `${incident.resource}-${index}`}><div className={`incident-mini-icon ${critical ? "critical" : "warning"}`}><AlertTriangle size={17} /></div><div className="overview-incident-copy"><strong>{incident.resource} usage</strong><p>{incident.message}</p><small>{incident.recommendation}</small></div><div className="overview-incident-value"><strong>{formatValue(incident.usage_percent)}%</strong><span className={critical ? "severity-critical" : "severity-warning"}>{incident.severity || "Warning"}</span></div></div>; })}</div> : <div className="empty-state"><div className="empty-state-icon"><CheckCircle2 size={25} /></div><strong>{loading ? "Loading incident information..." : error ? "Incident information unavailable" : "No active incidents detected"}</strong><p>{loading ? "Retrieving the latest infrastructure alerts." : error ? "Check your backend connection and refresh the dashboard." : "Your infrastructure is currently reporting no active incidents."}</p></div>}</section>
          </>}
        <footer className="page-footer"><span>CloudOps Infrastructure Intelligence</span><span>Local environment{lastUpdated ? ` · Updated ${lastUpdated.toLocaleTimeString()}` : ""}</span></footer>
      </div>
    </main>
  </div>;
}

export default function App() {
  return <BrowserRouter><AppLayout /></BrowserRouter>;
}
