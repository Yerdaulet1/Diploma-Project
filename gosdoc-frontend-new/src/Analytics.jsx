import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ProfileController, { ProfileMenu } from "./Profile";
import useAuthStore from "./store/authStore";
import { getReports, generateReport, exportReport, downloadBlob } from "./api/reports";
import { getWorkspaces } from "./api/workspaces";
import logoImg from "./assets/Group 2.svg";

/* ══════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════ */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const NAV = [
  { label:"Inbox",          nav:"inbox",      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg> },
  { label:"Projects",       nav:"projects",   icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  { label:"Documents",      nav:"documents",  icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { label:"Analytics",      nav:"analytics",  active:true, icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { label:"Help & Support", nav:"help",       icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
];

/* ══════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════ */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{width:100%;height:100%;overflow:hidden}
  button{font-family:'DM Sans','Segoe UI',sans-serif;cursor:pointer}
  input,select{font-family:'DM Sans','Segoe UI',sans-serif}

  .an-page{display:flex;flex-direction:column;width:100vw;height:100vh;font-family:'DM Sans','Segoe UI',sans-serif;background:#EEEDF0;overflow:hidden}

  /* TOPBAR */
  .an-topbar{display:flex;align-items:center;padding:0 20px;height:52px;gap:10px;flex-shrink:0;background:#fff;border-bottom:.5px solid #E5E7EB;z-index:30}
  .an-body{display:flex;flex:1;overflow:hidden;min-height:0}

  /* SIDEBAR */
  .an-sb{width:60px;flex-shrink:0;background:#fff;border-right:.5px solid #E5E7EB;display:flex;flex-direction:column;align-items:center;padding:0 0 14px;height:100%;z-index:20;transition:width .28s cubic-bezier(.4,0,.2,1);overflow:hidden}
  .an-sb.open{width:268px;align-items:stretch}
  .an-profile{background:#2563EB;width:100%;display:flex;flex-direction:column;align-items:center;padding:10px 0 32px;flex-shrink:0;position:relative}
  .an-toggle{position:absolute;top:8px;left:8px;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.18);border:none;color:#fff;cursor:pointer}
  .an-toggle:hover{background:rgba(255,255,255,0.32)}
  .an-toggle svg{transition:transform .28s}
  .an-sb.open .an-toggle svg{transform:rotate(180deg)}
  .an-avatar{display:none;position:absolute;bottom:-30px;left:50%;transform:translateX(-50%);width:60px;height:60px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.12);z-index:1}
  .an-sb.open .an-avatar{display:block}
  .an-profile-info{display:none;text-align:center;padding:36px 12px 4px;flex-shrink:0}
  .an-sb.open .an-profile-info{display:block}
  .an-org{display:none;align-items:center;gap:6px;margin:4px 10px 6px;border:.5px solid #E5E7EB;border-radius:10px;padding:5px 10px;cursor:pointer;flex-shrink:0}
  .an-sb.open .an-org{display:flex}
  .an-navlist{display:flex;flex-direction:column;flex:1;width:100%;gap:1px;align-items:center;padding:4px 0}
  .an-sb.open .an-navlist{align-items:stretch;padding:4px 8px}
  .an-navitem{width:42px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;border:1.5px solid transparent;background:none;font-family:inherit;flex-shrink:0;transition:background .15s,color .15s;cursor:pointer}
  .an-sb.open .an-navitem{width:100%;height:36px;justify-content:flex-start;gap:10px;padding:0 10px;font-size:13px;border-radius:12px}
  .an-navitem:hover{background:#EFF6FF;color:#2563EB}
  .an-navitem.active{background:#EEF2FF;color:#4F46E5}
  .an-sb.open .an-navitem.active{font-weight:500}
  .an-navlabel{display:none;flex:1;text-align:left}
  .an-sb.open .an-navlabel{display:block}
  .an-navchev{display:none;color:#9CA3AF}
  .an-sb.open .an-navchev{display:block}
  .an-sbbottom{margin-top:auto;width:100%;display:flex;justify-content:center;padding:0 8px}
  .an-addbtn{width:42px;height:42px;background:#2563EB;color:#fff;border:none;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;overflow:hidden;transition:width .28s cubic-bezier(.4,0,.2,1);flex-shrink:0;padding:0}
  .an-sb.open .an-addbtn{width:100%;justify-content:flex-start;padding:0 14px}
  .an-addbtn:hover{background:#1D4ED8}
  .an-addbtn-plus{transition:transform .28s;flex-shrink:0}
  .an-sb.open .an-addbtn-plus{transform:rotate(45deg)}
  .an-addbtn-label{display:none;white-space:nowrap}
  .an-sb.open .an-addbtn-label{display:block}

  /* MAIN */
  .an-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;background:#EEEDF0}
  .an-container{flex:1;margin:12px;background:#fff;border-radius:16px;display:flex;flex-direction:column;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden}
  .an-inner{flex:1;overflow-y:auto;padding:32px 36px;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent}
  .an-inner::-webkit-scrollbar{width:4px}
  .an-inner::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}

  /* GENERATE PANEL */
  .an-gen-panel{background:#F8FAFF;border:1px solid #DBEAFE;border-radius:14px;padding:24px 28px;margin-bottom:28px}
  .an-gen-title{font-size:16px;font-weight:700;color:#111827;margin-bottom:16px}
  .an-gen-row{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap}
  .an-field{display:flex;flex-direction:column;gap:5px}
  .an-label{font-size:12px;font-weight:500;color:#6B7280}
  .an-select{border:1.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:13px;color:#374151;outline:none;background:#fff;min-width:160px}
  .an-select:focus{border-color:#2563EB}
  .an-gen-btn{background:#2563EB;color:#fff;border:none;border-radius:8px;padding:9px 22px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;white-space:nowrap;align-self:flex-end}
  .an-gen-btn:hover{background:#1D4ED8}
  .an-gen-btn:disabled{opacity:0.5;cursor:not-allowed}

  /* REPORT CARDS */
  .an-section-title{font-size:15px;font-weight:700;color:#111827;margin-bottom:14px}
  .an-cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:28px}
  .an-card{border:1.5px solid #F3F4F6;border-radius:12px;padding:20px;cursor:pointer;transition:all .15s;background:#fff}
  .an-card:hover{border-color:#DBEAFE;box-shadow:0 4px 16px rgba(37,99,235,0.1);transform:translateY(-1px)}
  .an-card.selected{border-color:#2563EB;box-shadow:0 4px 16px rgba(37,99,235,0.15)}
  .an-card-period{font-size:16px;font-weight:700;color:#111827;margin-bottom:4px}
  .an-card-ws{font-size:12px;color:#6B7280;margin-bottom:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .an-card-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .an-stat-chip{background:#F9FAFB;border-radius:8px;padding:8px 10px}
  .an-stat-val{font-size:18px;font-weight:700;color:#2563EB}
  .an-stat-lbl{font-size:11px;color:#9CA3AF;margin-top:2px}

  /* DETAIL PANEL */
  .an-detail{border:1.5px solid #E5E7EB;border-radius:14px;padding:28px;margin-top:0}
  .an-detail-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:24px;gap:16px;flex-wrap:wrap}
  .an-detail-title{font-size:20px;font-weight:700;color:#111827}
  .an-detail-sub{font-size:13px;color:#6B7280;margin-top:4px}
  .an-export-row{display:flex;gap:8px}
  .an-export-btn{display:flex;align-items:center;gap:6px;border:1.5px solid #E5E7EB;background:#fff;border-radius:8px;padding:7px 14px;font-size:12.5px;font-weight:500;color:#374151;cursor:pointer;font-family:inherit;transition:all .15s}
  .an-export-btn:hover{border-color:#2563EB;color:#2563EB}
  .an-export-btn:disabled{opacity:0.5;cursor:not-allowed}
  .an-metrics{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:24px}
  .an-metric{background:#F8FAFF;border:1px solid #DBEAFE;border-radius:12px;padding:18px 20px}
  .an-metric-val{font-size:28px;font-weight:700;color:#2563EB}
  .an-metric-lbl{font-size:12px;color:#6B7280;margin-top:6px;line-height:1.4}

  .an-empty{text-align:center;padding:60px 20px;color:#9CA3AF;font-size:14px}
  .an-empty svg{margin-bottom:16px;opacity:0.4}

  @media(max-width:768px){
    .an-sb{display:none}
    .an-cards-grid{grid-template-columns:1fr}
    .an-gen-row{flex-direction:column}
  }
`;

/* ══════════════════════════════════════════════════════════
   REPORT CARD
══════════════════════════════════════════════════════════ */
function ReportCard({ report, selected, onClick }) {
  const { t } = useTranslation();
  const month = MONTHS[(report.period_month - 1)] || report.period_month;
  return (
    <div className={`an-card${selected ? " selected" : ""}`} onClick={onClick}>
      <div className="an-card-period">{month} {report.period_year}</div>
      <div className="an-card-ws">{report.workspace_title || "—"}</div>
      <div className="an-card-stats">
        <div className="an-stat-chip">
          <div className="an-stat-val">{report.docs_total}</div>
          <div className="an-stat-lbl">{t("analytics.documents")}</div>
        </div>
        <div className="an-stat-chip">
          <div className="an-stat-val">{report.docs_signed}</div>
          <div className="an-stat-lbl">{t("analytics.signed")}</div>
        </div>
        <div className="an-stat-chip">
          <div className="an-stat-val">{report.tasks_completed}</div>
          <div className="an-stat-lbl">{t("analytics.tasksDone")}</div>
        </div>
        <div className="an-stat-chip">
          <div className="an-stat-val">{report.avg_completion_days != null ? `${parseFloat(report.avg_completion_days).toFixed(1)}d` : "—"}</div>
          <div className="an-stat-lbl">{t("analytics.avgDays")}</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   REPORT DETAIL
══════════════════════════════════════════════════════════ */
function ReportDetail({ report }) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(null);

  const handleExport = async (fmt) => {
    setExporting(fmt);
    try {
      const blob = await exportReport(report.id, fmt);
      const month = String(report.period_month).padStart(2, "0");
      downloadBlob(blob, `report_${report.period_year}_${month}.${fmt}`);
    } catch {
      toast.error(`Failed to export ${fmt.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  const month = MONTHS[(report.period_month - 1)] || report.period_month;
  const genDate = new Date(report.generated_at).toLocaleDateString("en-US", { day:"numeric", month:"short", year:"numeric" });

  return (
    <div className="an-detail">
      <div className="an-detail-header">
        <div>
          <div className="an-detail-title">{month} {report.period_year}</div>
          <div className="an-detail-sub">{report.workspace_title} · {t("analytics.generated", { date: genDate })}</div>
        </div>
        <div className="an-export-row">
          <button className="an-export-btn" disabled={exporting === "pdf"} onClick={() => handleExport("pdf")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            {exporting === "pdf" ? t("analytics.exporting") : "PDF"}
          </button>
          <button className="an-export-btn" disabled={exporting === "xlsx"} onClick={() => handleExport("xlsx")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
            {exporting === "xlsx" ? t("analytics.exporting") : "XLSX"}
          </button>
        </div>
      </div>

      <div className="an-metrics">
        <div className="an-metric">
          <div className="an-metric-val">{report.docs_total}</div>
          <div className="an-metric-lbl">{t("analytics.totalDocumentsDesc")}</div>
        </div>
        <div className="an-metric">
          <div className="an-metric-val">{report.docs_completed}</div>
          <div className="an-metric-lbl">{t("analytics.completedDocsDesc")}</div>
        </div>
        <div className="an-metric">
          <div className="an-metric-val">{report.docs_signed}</div>
          <div className="an-metric-lbl">{t("analytics.documentsSignedDesc")}</div>
        </div>
        <div className="an-metric">
          <div className="an-metric-val">{report.tasks_completed}</div>
          <div className="an-metric-lbl">{t("analytics.tasksCompletedDesc")}</div>
        </div>
        <div className="an-metric">
          <div className="an-metric-val">{report.avg_completion_days != null ? `${parseFloat(report.avg_completion_days).toFixed(2)}` : "—"}</div>
          <div className="an-metric-lbl">{t("analytics.avgDaysDesc")}</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════ */
export default function Analytics({ onGoToAuth, onNavigate }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [sbOpen, setSbOpen] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileView, setProfileView] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  // Form state
  const now = new Date();
  const [genWorkspace, setGenWorkspace] = useState("");
  const [genYear,  setGenYear]  = useState(now.getFullYear());
  const [genMonth, setGenMonth] = useState(now.getMonth() + 1);
  const [generating, setGenerating] = useState(false);

  // Data
  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: () => getReports(),
    staleTime: 60_000,
  });

  const { data: wsData } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => getWorkspaces(),
    staleTime: 300_000,
  });

  const reports = reportsData?.results ?? (Array.isArray(reportsData) ? reportsData : []);
  const workspaces = wsData?.results ?? (Array.isArray(wsData) ? wsData : []);

  const handleGenerate = async () => {
    if (!genWorkspace) { toast.error("Select a workspace"); return; }
    setGenerating(true);
    try {
      const report = await generateReport({
        period_year: genYear,
        period_month: genMonth,
        organization: genWorkspace,
      });
      toast.success(`Report for ${MONTHS[genMonth - 1]} ${genYear} generated`);
      await qc.invalidateQueries({ queryKey: ["reports"] });
      setSelectedReport(report);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="an-page">
      <style>{css}</style>

      {/* ── TOPBAR ── */}
      <header className="an-topbar">
        <img src={logoImg} alt="Logo" style={{ height:30, flexShrink:0 }}/>
        <span style={{ fontSize:13, fontWeight:500, color:"#2563EB", marginLeft:4 }}>Analytics</span>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
          <div onClick={() => onNavigate?.("notifications")} title="Notifications"
            style={{ position:"relative",width:30,height:30,borderRadius:8,border:".5px solid #E5E7EB",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <svg onClick={() => setProfileMenuOpen(v => !v)} style={{ cursor:"pointer" }}
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          <div style={{ position:"relative" }}>
            <div onClick={() => setProfileMenuOpen(v => !v)} style={{ width:30, height:30, borderRadius:"50%", overflow:"hidden", cursor:"pointer" }}>
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                : <svg viewBox="0 0 30 30" fill="none" width="30" height="30"><rect width="30" height="30" fill="#CBD5E1"/><circle cx="15" cy="11" r="5" fill="#94A3B8"/><ellipse cx="15" cy="26" rx="10" ry="6" fill="#94A3B8"/></svg>
              }
            </div>
            {profileMenuOpen && (
              <ProfileMenu onClose={() => setProfileMenuOpen(false)}
                onProfile={() => setProfileView("profile")}
                onSettings={() => setProfileView("settings")}
                onLogOut={onGoToAuth}/>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="an-body">

        {/* SIDEBAR */}
        <aside className={`an-sb${sbOpen ? " open" : ""}`}>
          <div className="an-profile">
            <button className="an-toggle" onClick={() => setSbOpen(v => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="9 6 15 12 9 18"/></svg>
            </button>
            <div className="an-avatar">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                : <svg viewBox="0 0 60 60" fill="none" width="60" height="60"><rect width="60" height="60" fill="#CBD5E1"/><circle cx="30" cy="22" r="10" fill="#94A3B8"/><ellipse cx="30" cy="52" rx="20" ry="12" fill="#94A3B8"/></svg>
              }
            </div>
          </div>
          <div className="an-profile-info">
            <div style={{ fontSize:13, fontWeight:600, color:"#111827" }}>{user?.full_name || "—"}</div>
            <div style={{ fontSize:10.5, color:"#9CA3AF", marginTop:2 }}>{user?.email || ""}</div>
          </div>
          <div className="an-org">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            <span style={{ fontSize:11.5, color:"#6B7280", flex:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
              {workspaces[0]?.title || "—"}
            </span>
          </div>
          <div className="an-navlist">
            {NAV.map((n, i) => (
              <button key={i} className={`an-navitem${n.active ? " active" : ""}`}
                onClick={() => { if (n.nav && n.nav !== "analytics" && onNavigate) onNavigate(n.nav); }}>
                {n.icon}
                <span className="an-navlabel">{t(`nav.${n.nav}`)}</span>
                <svg className="an-navchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="9 6 15 12 9 18"/></svg>
              </button>
            ))}
          </div>
          <div className="an-sbbottom">
            <button className="an-addbtn" onClick={() => onNavigate?.("projects")}>
              <svg className="an-addbtn-plus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span className="an-addbtn-label">New project</span>
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="an-main">
          <ProfileController show={!!profileView} view={profileView} setView={setProfileView} onLogOut={onGoToAuth}/>
          <div className="an-container">
            <div className="an-inner">

              {/* ── GENERATE PANEL ── */}
              <div className="an-gen-panel">
                <div className="an-gen-title">{t("analytics.generateReport")}</div>
                <div className="an-gen-row">
                  <div className="an-field">
                    <span className="an-label">{t("analytics.workspace")}</span>
                    <select className="an-select" value={genWorkspace} onChange={e => setGenWorkspace(e.target.value)}>
                      <option value="">{t("analytics.selectWorkspace")}</option>
                      {workspaces.map(ws => (
                        <option key={ws.id} value={ws.id}>{ws.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="an-field">
                    <span className="an-label">{t("analytics.month")}</span>
                    <select className="an-select" value={genMonth} onChange={e => setGenMonth(Number(e.target.value))}>
                      {MONTHS.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="an-field">
                    <span className="an-label">{t("analytics.year")}</span>
                    <select className="an-select" value={genYear} onChange={e => setGenYear(Number(e.target.value))}>
                      {yearOptions.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <button className="an-gen-btn" onClick={handleGenerate} disabled={generating}>
                    {generating ? t("analytics.generating") : t("analytics.generate")}
                  </button>
                </div>
              </div>

              {/* ── REPORT LIST ── */}
              <div className="an-section-title">
                {t("analytics.reports")} {reports.length > 0 && <span style={{ fontWeight:400, color:"#9CA3AF", fontSize:13 }}>({reports.length})</span>}
              </div>

              {reportsLoading ? (
                <div style={{ color:"#9CA3AF", fontSize:13, padding:"20px 0" }}>{t("common.loading")}</div>
              ) : reports.length === 0 ? (
                <div className="an-empty">
                  <svg viewBox="0 0 60 60" fill="none" width="60" height="60" style={{ display:"block", margin:"0 auto 16px" }}>
                    <rect x="8" y="8" width="44" height="44" rx="6" fill="#E5E7EB"/>
                    <line x1="18" y1="24" x2="42" y2="24" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="18" y1="32" x2="36" y2="32" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="18" y1="40" x2="30" y2="40" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  {t("analytics.noReports")}
                </div>
              ) : (
                <div className="an-cards-grid">
                  {reports.map(r => (
                    <ReportCard
                      key={r.id}
                      report={r}
                      selected={selectedReport?.id === r.id}
                      onClick={() => setSelectedReport(r)}
                    />
                  ))}
                </div>
              )}

              {/* ── DETAIL ── */}
              {selectedReport && (
                <>
                  <div className="an-section-title" style={{ marginTop:8 }}>{t("analytics.reportDetails")}</div>
                  <ReportDetail report={selectedReport}/>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
