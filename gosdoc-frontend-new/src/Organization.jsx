import { useState, useRef, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import MobileBottomNav from "./components/MobileBottomNav";
import EmailAutocomplete from "./components/EmailAutocomplete";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getWorkspaces, createWorkspace, updateMember } from "./api/workspaces";
import {
  getOrganization, getOrgMembers, inviteToOrg, updateOrganization, deleteOrganization,
} from "./api/organizations";
import useAuthStore from "./store/authStore";
import logoImg from "./assets/Group 2.svg";
import ProfileController, { ProfileMenu } from "./Profile";
import CreateWorkspaceModal from "./CreateWorkspaceModal";

/* ── CSS ───────────────────────────────────────────────────── */
const orgCss = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{width:100%;height:100%;overflow:hidden;margin:0;padding:0}
  button{font-family:'Gilroy','Segoe UI',sans-serif;cursor:pointer}
  button:hover{opacity:unset}
  input,select{font-family:'Gilroy','Segoe UI',sans-serif}

  .org-page{display:flex;flex-direction:column;width:100vw;height:100vh;font-family:'Gilroy','Segoe UI',sans-serif;letter-spacing:0.02em;background:#EEEDF0;overflow:hidden}

  /* TOPBAR */
  .org-topbar{display:flex;align-items:center;padding:0 20px;height:52px;gap:10px;flex-shrink:0;background:#fff;border-bottom:.5px solid #E5E7EB;z-index:30}

  /* BODY */
  .org-body{display:flex;flex:1;overflow:hidden;min-height:0}

  /* SIDEBAR */
  .org-sb{width:268px;flex-shrink:0;background:#fff;border-right:.5px solid #E5E7EB;display:flex;flex-direction:column;align-items:stretch;padding:0 0 14px;height:100%;transition:width .28s cubic-bezier(.4,0,.2,1);overflow:hidden;z-index:20}
  .org-sb.closed{width:60px;align-items:center}
  .org-profile{background:#2563EB;width:100%;display:flex;flex-direction:column;align-items:center;padding:10px 0 32px;flex-shrink:0;position:relative}
  .org-toggle{position:absolute;top:8px;left:8px;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.18);border:none;color:#fff;cursor:pointer;flex-shrink:0}
  .org-toggle:hover{background:rgba(255,255,255,0.32)}
  .org-toggle svg{transition:transform .28s}
  .org-sb:not(.closed) .org-toggle svg{transform:rotate(180deg)}
  .org-av{display:block;position:absolute;bottom:-30px;left:50%;transform:translateX(-50%);width:60px;height:60px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.12);z-index:1}
  .org-sb.closed .org-av{display:none}
  .org-pinfo{display:block;text-align:center;padding:36px 12px 4px;flex-shrink:0}
  .org-sb.closed .org-pinfo{display:none}
  .org-wsdrop{display:flex;align-items:center;gap:6px;margin:4px 10px 6px;border:.5px solid #E5E7EB;border-radius:10px;padding:5px 10px;cursor:pointer;flex-shrink:0;transition:border-color .15s}
  .org-wsdrop:hover{border-color:#2563EB}
  .org-sb.closed .org-wsdrop{display:none}
  .org-navlist{display:flex;flex-direction:column;flex:1;width:100%;gap:1px;padding:4px 8px}
  .org-sb.closed .org-navlist{align-items:center;padding:4px 0}
  .org-navitem{width:100%;height:36px;border-radius:12px;display:flex;align-items:center;gap:10px;padding:0 10px;font-size:13px;color:#6B7280;border:1.5px solid transparent;background:none;font-family:inherit;transition:background .15s,color .15s,border-color .15s;cursor:pointer;text-align:left}
  .org-sb.closed .org-navitem{width:42px;height:38px;border-radius:10px;justify-content:center;padding:0;gap:0}
  .org-navitem:hover{background:#EFF6FF;color:#2563EB;border-color:#2563EB}
  .org-navitem.active{background:#EEF2FF;color:#4F46E5;font-weight:500;border-color:transparent}
  .org-navlabel{flex:1;text-align:left;white-space:nowrap}
  .org-sb.closed .org-navlabel{display:none}
  .org-navchev{flex-shrink:0}
  .org-sb.closed .org-navchev{display:none}
  .org-sbbottom{margin-top:auto;padding:0 8px;flex-shrink:0;display:flex;justify-content:center}
  .org-addbtn{width:42px;height:42px;background:#2563EB;color:#fff;border:none;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;overflow:hidden;transition:width .28s cubic-bezier(.4,0,.2,1);flex-shrink:0;padding:0}
  .org-sb:not(.closed) .org-addbtn{width:100%;justify-content:flex-start;padding:0 14px}
  .org-addbtn:hover{background:#1D4ED8}
  .org-addbtn-plus{transition:transform .28s;flex-shrink:0}
  .org-sb:not(.closed) .org-addbtn-plus{transform:rotate(180deg)}
  .org-addbtn-label{display:none;white-space:nowrap}
  .org-sb:not(.closed) .org-addbtn-label{display:block}

  /* MAIN */
  .org-main{flex:1;display:flex;flex-direction:column;overflow:hidden;background:#EEEDF0}
  .org-scroll{flex:1;overflow-y:auto;margin:0 12px 12px 6px;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent}
  .org-scroll::-webkit-scrollbar{width:4px}
  .org-scroll::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}

  /* COVER */
  .org-cover{width:100%;height:220px;border-radius:16px 16px 0 0;background:#2563EB;cursor:pointer;position:relative;overflow:hidden;flex-shrink:0}

  /* CONTENT CARD */
  .org-card{background:#fff;border-radius:0 0 16px 16px;padding:24px 28px 32px;box-shadow:0 1px 4px rgba(0,0,0,.06)}

  /* INFO GRID */
  .org-info-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px 32px;margin-bottom:28px;padding-bottom:24px;border-bottom:.5px solid #F3F4F6}
  .org-info-label{font-size:11px;color:#9CA3AF;font-weight:500;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em}
  .org-info-value{font-size:14px;font-weight:600;color:#111827}

  /* MEMBERS TABLE */
  .org-tbl{width:100%;border-collapse:collapse}
  .org-tbl th{text-align:left;font-size:12px;color:#9CA3AF;font-weight:500;padding:8px 12px;border-bottom:1px solid #F3F4F6}
  .org-tbl td{padding:12px 12px;font-size:13px;border-bottom:.5px solid #F9FAFB}
  .org-tbl tr:last-child td{border-bottom:none}

  @media(max-width:768px){
    .org-page{ width:100%; height:100svh }
    .org-sb{ display:none }
    .org-topbar{ padding:0 12px; gap:6px; font-size:12.5px; height:48px }
    .org-topbar button{ padding:4px 8px!important; font-size:11.5px!important }
    .org-container{ margin-bottom:78px }
    .org-tbl th,.org-tbl td{ padding:8px 8px; font-size:12px }
    .org-info-grid{ grid-template-columns:1fr 1fr; gap:12px 16px; margin-bottom:18px; padding-bottom:16px }
    /* Table → horizontal scroll */
    .org-tbl-wrap{ overflow-x:auto; -webkit-overflow-scrolling:touch }
    .org-tbl{ min-width:560px }
    .org-tbl th,.org-tbl td{ padding:9px 10px; font-size:12.5px }
  }
  @media(max-width:480px){
    .org-info-grid{ grid-template-columns:1fr }
    .org-topbar{ padding:0 10px }
  }
`;

/* ── CONSTANTS ─────────────────────────────────────────────── */
const ROLE_OPTIONS = ["owner", "editor", "signer", "viewer"];

const WS_TYPE_LABEL = {
  personal: "Personal", team: "Team", organization: "Organization",
  individual: "Individual", corporate: "Corporate",
};

const COVER_COLORS = [
  "linear-gradient(135deg,#1E40AF 0%,#2563EB 50%,#60A5FA 100%)",
  "linear-gradient(135deg,#065F46 0%,#059669 50%,#34D399 100%)",
  "linear-gradient(135deg,#7C2D12 0%,#EA580C 50%,#FB923C 100%)",
  "linear-gradient(135deg,#4C1D95 0%,#7C3AED 50%,#A78BFA 100%)",
];

const NAV_ITEMS = [
  { key: "inbox",     navKey: "inbox",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg> },
  { key: "projects",  navKey: "projects",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  { key: "documents", navKey: "documents",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { key: "analytics", navKey: "analytics",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { key: "help",      navKey: "help",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
];

/* ── INVITE MODAL ──────────────────────────────────────────── */
function InviteModal({ orgId, onClose }) {
  const [rows, setRows]     = useState([{ email: "" }]);
  const [loading, setLoading] = useState(false);

  const addRow    = () => setRows(r => [...r, { email: "" }]);
  const updateRow = (i, f, v) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [f]: v } : row));
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));

  const submit = async () => {
    const valid = rows.filter(r => r.email.trim() && /\S+@\S+\.\S+/.test(r.email));
    if (!valid.length) { toast.error("Введите хотя бы один корректный email"); return; }
    setLoading(true);
    // Роль на уровне организации не задаётся — она выбирается при добавлении в проект.
    const results = await Promise.allSettled(
      valid.map(r => inviteToOrg(orgId, r.email.trim(), null, "viewer"))
    );
    const failed  = results.filter(r => r.status === "rejected");
    const success = results.filter(r => r.status === "fulfilled").length;
    if (failed.length) {
      const msg = failed[0]?.reason?.response?.data?.detail || `${failed.length} приглашение(й) не отправлено`;
      toast.error(msg);
    }
    if (success) toast.success("Приглашение отправлено! Пользователь увидит его в Inbox.");
    setLoading(false);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:16,padding:"28px 28px 24px",width:480,maxWidth:"94vw",boxShadow:"0 8px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <h3 style={{ fontSize:17,fontWeight:700,color:"#111827" }}>Invite Members</h3>
          <button onClick={onClose} style={{ border:"none",background:"none",cursor:"pointer",color:"#9CA3AF",padding:4 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {rows.map((row, i) => (
          <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-end",marginBottom:12 }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:12,fontWeight:500,color:"#374151",display:"block",marginBottom:4 }}>Team Member Email*</label>
              <EmailAutocomplete
                value={row.email}
                onChange={(v) => updateRow(i, "email", v)}
                excludeEmails={rows.filter((_, j) => j !== i).map(r => r.email)}
              />
            </div>
            {rows.length > 1 && (
              <button onClick={() => removeRow(i)}
                style={{ width:40,height:40,border:"none",background:"none",cursor:"pointer",color:"#9CA3AF",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            )}
          </div>
        ))}

        <button onClick={addRow}
          style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#2563EB",background:"none",border:"none",cursor:"pointer",padding:"4px 0",marginBottom:24,fontFamily:"inherit",fontWeight:500 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add member
        </button>

        <div style={{ display:"flex",justifyContent:"flex-end",gap:8 }}>
          <button onClick={onClose}
            style={{ border:".5px solid #E5E7EB",borderRadius:8,padding:"9px 20px",fontSize:13,cursor:"pointer",background:"#fff",fontFamily:"inherit",color:"#6B7280" }}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading}
            style={{ background:"#2563EB",color:"#fff",border:"none",borderRadius:8,padding:"9px 24px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:loading?0.7:1 }}>
            {loading ? "Sending…" : "Invite"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── ROLE BADGE ────────────────────────────────────────────── */
function RoleBadge({ role, memberId, workspaceId }) {
  const qc  = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref  = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const change = async (newRole) => {
    setOpen(false);
    try {
      await updateMember(workspaceId, memberId, { role: newRole });
      qc.invalidateQueries({ queryKey: ["members", workspaceId] });
      toast.success("Role updated");
    } catch { toast.error("Failed to update role"); }
  };

  return (
    <div ref={ref} style={{ position:"relative",display:"inline-block" }}>
      <button onClick={() => setOpen(v=>!v)}
        style={{ display:"flex",alignItems:"center",gap:5,background:"#F3F4F6",border:"1px solid #E5E7EB",borderRadius:6,padding:"4px 10px",fontSize:12.5,fontWeight:500,color:"#374151",cursor:"pointer",fontFamily:"inherit" }}>
        {role?.charAt(0).toUpperCase()+role?.slice(1) || "—"}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open && (
        <div style={{ position:"absolute",top:"calc(100% + 4px)",left:0,background:"#fff",border:"1px solid #E5E7EB",borderRadius:8,boxShadow:"0 4px 16px rgba(0,0,0,0.12)",zIndex:100,minWidth:120,overflow:"hidden" }}>
          {ROLE_OPTIONS.map(r => (
            <div key={r} onClick={() => change(r)}
              style={{ padding:"8px 14px",fontSize:13,cursor:"pointer",color:r===role?"#2563EB":"#374151",fontWeight:r===role?600:400,background:r===role?"#EFF6FF":"transparent" }}
              onMouseEnter={e=>{ if(r!==role) e.currentTarget.style.background="#F9FAFB"; }}
              onMouseLeave={e=>{ e.currentTarget.style.background=r===role?"#EFF6FF":"transparent"; }}>
              {r.charAt(0).toUpperCase()+r.slice(1)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── MAIN EXPORT ───────────────────────────────────────────── */
export default function Organization({ onNavigate, onGoToAuth }) {
  const { t: _t } = useTranslation();
  const { id: workspaceId } = useParams();
  const user = useAuthStore(s => s.user);
  const qc   = useQueryClient();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileView,    setProfileView]    = useState(null);
  const [showInvite,     setShowInvite]     = useState(false);
  const [wsDropOpen,     setWsDropOpen]     = useState(false);
  const [showCreateWs,   setShowCreateWs]   = useState(false);
  const wsDropRef = useRef(null);
  const coverRef  = useRef(null);

  /* close ws dropdown on outside click */
  useEffect(() => {
    if (!wsDropOpen) return;
    const h = (e) => { if (wsDropRef.current && !wsDropRef.current.contains(e.target)) setWsDropOpen(false); };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, [wsDropOpen]);

  /* cover image per workspace */
  const coverKey = `org_cover_${workspaceId}`;
  const [coverSrc, setCoverSrc] = useState(() => localStorage.getItem(coverKey) || "");
  const coverColorIdx = parseInt(workspaceId?.slice(-1) || "0", 16) % COVER_COLORS.length;

  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      setCoverSrc(src);
      localStorage.setItem(coverKey, src);
    };
    reader.readAsDataURL(file);
  };

  /* data — организация, её участники и проекты внутри неё */
  const orgId = workspaceId;

  const { data: org, isLoading: wsLoading } = useQuery({
    queryKey: ["organization", orgId],
    queryFn:  () => getOrganization(orgId),
    enabled:  !!orgId,
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn:  () => getOrgMembers(orgId),
    enabled:  !!orgId,
  });

  const { data: wsListData, isLoading: projectsLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn:  getWorkspaces,
  });

  const members = membersData?.results ?? (Array.isArray(membersData) ? membersData : []);
  const allWorkspaces = wsListData?.results ?? (Array.isArray(wsListData) ? wsListData : []);
  const projects = allWorkspaces.filter(w => String(w.organization) === String(orgId));

  const isOwner = String(org?.owner) === String(user?.id);

  const [renaming, setRenaming]   = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [wsBusy, setWsBusy]       = useState(false);
  const [newProjName, setNewProjName]   = useState("");
  const [creatingProj, setCreatingProj] = useState(false);

  const startRename = () => { setNameDraft(org?.name || ""); setRenaming(true); };
  const saveRename = async () => {
    if (!nameDraft.trim() || wsBusy) return;
    setWsBusy(true);
    try {
      await updateOrganization(orgId, { name: nameDraft.trim() });
      qc.invalidateQueries({ queryKey: ["organization", orgId] });
      qc.invalidateQueries({ queryKey: ["organizations"] });
      setRenaming(false);
      toast.success("Название обновлено");
    } catch (e) { toast.error(e?.response?.data?.detail || "Не удалось переименовать"); }
    finally { setWsBusy(false); }
  };
  const handleDeleteOrg = async () => {
    if (wsBusy) return;
    if (!window.confirm(`Удалить организацию «${org?.name || ""}» со всеми проектами? Это необратимо.`)) return;
    setWsBusy(true);
    try {
      await deleteOrganization(orgId);
      qc.invalidateQueries({ queryKey: ["organizations"] });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Организация удалена");
      onNavigate?.("inbox");
    } catch (e) { toast.error(e?.response?.data?.detail || "Не удалось удалить организацию"); }
    finally { setWsBusy(false); }
  };
  const handleCreateProject = async () => {
    if (!newProjName.trim() || creatingProj) return;
    setCreatingProj(true);
    try {
      await createWorkspace({ title: newProjName.trim(), type: "corporate", organization: orgId });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      setNewProjName("");
      toast.success("Проект создан");
    } catch (e) { toast.error(e?.response?.data?.detail || "Не удалось создать проект"); }
    finally { setCreatingProj(false); }
  };

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
  };

  const ORG_TYPE_LABEL = { individual: "Individual", corporate: "Corporate" };
  const wsName  = org?.name || "Organization";
  const wsType  = ORG_TYPE_LABEL[org?.type] || org?.type || "—";
  const owner   = org?.owner_name || user?.full_name || "—";
  const created = fmtDate(org?.created_at);

  return (
    <div className="org-page">
      <style>{orgCss}</style>

      {showInvite  && <InviteModal orgId={orgId} onClose={() => setShowInvite(false)} />}
      {showCreateWs && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWs(false)}
          onCreated={(id) => { setShowCreateWs(false); onNavigate?.(`organization/${id}`); }}
        />
      )}

      {/* ── TOPBAR ── */}
      <header className="org-topbar">
        <img src={logoImg} alt="Logo" style={{ height:30,flexShrink:0 }} />
        <button onClick={() => onNavigate?.("inbox")}
          style={{ border:"none",background:"none",cursor:"pointer",color:"#9CA3AF",display:"flex",alignItems:"center",padding:4 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:13 }}>
          <span style={{ color:"#9CA3AF",cursor:"pointer" }} onClick={() => onNavigate?.("inbox")}>Inbox</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="11" height="11"><polyline points="9 6 15 12 9 18"/></svg>
          <span style={{ color:"#111827",fontWeight:500 }}>{wsName}</span>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:10 }}>
          <div onClick={() => onNavigate?.("notifications")}
            style={{ position:"relative",width:30,height:30,borderRadius:8,border:"0.5px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"#fff" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div style={{ position:"relative",display:"flex",alignItems:"center",gap:6 }}>
            <svg onClick={()=>setProfileMenuOpen(v=>!v)} style={{ cursor:"pointer" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            <div onClick={()=>setProfileMenuOpen(v=>!v)} style={{ position:"relative",width:30,height:30,cursor:"pointer",flexShrink:0 }}>
              <div style={{ width:30,height:30,borderRadius:"50%",overflow:"hidden" }}>
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                  : <svg viewBox="0 0 30 30" fill="none" width="30" height="30"><rect width="30" height="30" fill="#CBD5E1"/><circle cx="15" cy="11" r="5" fill="#94A3B8"/><ellipse cx="15" cy="26" rx="10" ry="6" fill="#94A3B8"/></svg>
                }
              </div>
              <div style={{ position:"absolute",top:-2,right:-2,width:8,height:8,background:"#22c55e",borderRadius:"50%",border:"1.5px solid #fff" }}/>
            </div>
            {profileMenuOpen && (
              <ProfileMenu
                onClose={() => setProfileMenuOpen(false)}
                onProfile={() => setProfileView("profile")}
                onSettings={() => setProfileView("settings")}
                onLogOut={onGoToAuth}/>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="org-body">

        <Sidebar active="projects" onNavigate={onNavigate}/>
        <MobileBottomNav />

        {/* ── MAIN ── */}
        <div className="org-main">
          <ProfileController show={!!profileView} view={profileView} setView={setProfileView} onLogOut={onGoToAuth}/>

          <div className="org-scroll">

            {/* Cover */}
            <div className="org-cover"
              style={{ background: coverSrc ? `url(${coverSrc}) center/cover no-repeat` : COVER_COLORS[coverColorIdx] }}
              onClick={() => coverRef.current?.click()}>
              {!coverSrc && (
                <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"rgba(255,255,255,0.75)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span style={{ fontSize:12,marginTop:6 }}>Click to upload cover photo</span>
                </div>
              )}
              <div style={{ position:"absolute",bottom:10,right:14,background:"rgba(0,0,0,0.4)",borderRadius:6,padding:"4px 10px",fontSize:11,color:"#fff",display:"flex",alignItems:"center",gap:4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Change cover
              </div>
              <input ref={coverRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleCoverUpload}/>
            </div>

            {/* Content card */}
            <div className="org-card">
              {wsLoading ? (
                <div style={{ textAlign:"center",padding:40,color:"#9CA3AF" }}>Loading…</div>
              ) : (
                <>
                  {/* Owner controls */}
                  {isOwner && (
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"flex-end",gap:8,marginBottom:14,flexWrap:"wrap" }}>
                      {renaming ? (
                        <div style={{ display:"flex",alignItems:"center",gap:6,flex:1 }}>
                          <input value={nameDraft} onChange={e=>setNameDraft(e.target.value)} autoFocus
                            onKeyDown={e=>{ if(e.key==="Enter") saveRename(); if(e.key==="Escape") setRenaming(false); }}
                            style={{ flex:1,maxWidth:320,border:"1.5px solid #2563EB",borderRadius:8,padding:"7px 12px",fontSize:13,color:"#374151",outline:"none",fontFamily:"inherit" }}/>
                          <button onClick={saveRename} disabled={wsBusy}
                            style={{ background:"#2563EB",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>Сохранить</button>
                          <button onClick={()=>setRenaming(false)}
                            style={{ background:"#fff",color:"#6B7280",border:"1px solid #E5E7EB",borderRadius:8,padding:"7px 12px",fontSize:12.5,cursor:"pointer",fontFamily:"inherit" }}>Отмена</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={startRename}
                            style={{ display:"flex",alignItems:"center",gap:6,background:"#fff",color:"#374151",border:"1px solid #E5E7EB",borderRadius:8,padding:"7px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Переименовать
                          </button>
                          <button onClick={handleDeleteOrg} disabled={wsBusy}
                            style={{ display:"flex",alignItems:"center",gap:6,background:"#fff",color:"#EF4444",border:"1px solid #FECACA",borderRadius:8,padding:"7px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            Удалить организацию
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Info grid */}
                  <div className="org-info-grid">
                    {[
                      { label:"Organization name", value: wsName },
                      { label:"Owner",             value: owner  },
                      { label:"Type",              value: wsType },
                      { label:"Creation date",     value: created },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="org-info-label">{label}</div>
                        <div className="org-info-value">{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Members (организации) */}
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
                    <h3 style={{ fontSize:15,fontWeight:700,color:"#111827",margin:0 }}>Members</h3>
                    {isOwner && (
                      <button onClick={() => setShowInvite(true)}
                        style={{ display:"flex",alignItems:"center",gap:6,background:"#2563EB",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Invite Member
                      </button>
                    )}
                  </div>

                  {membersLoading ? (
                    <div style={{ color:"#9CA3AF",fontSize:13,padding:"12px 0" }}>Loading members…</div>
                  ) : (
                    <table className="org-tbl">
                      <thead>
                        <tr>
                          {["#","Member name","Email address"].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {members.length === 0 && (
                          <tr><td colSpan={3} style={{ textAlign:"center",color:"#9CA3AF",padding:24 }}>No members yet</td></tr>
                        )}
                        {members.map((m, i) => {
                          const name  = m.full_name || m.email || "—";
                          const email = m.email || "—";
                          const isOwnerMember = String(m.id) === String(org?.owner);
                          return (
                            <tr key={m.id || i}>
                              <td style={{ color:"#9CA3AF" }}>{i+1}</td>
                              <td>
                                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                                  <div style={{ width:30,height:30,borderRadius:"50%",background:"#DBEAFE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:"#2563EB",flexShrink:0 }}>
                                    {name.charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ fontWeight:500,color:"#111827" }}>{name}</span>
                                  {isOwnerMember && <span style={{ fontSize:10,fontWeight:700,color:"#2563EB",background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:5,padding:"1px 7px" }}>OWNER</span>}
                                </div>
                              </td>
                              <td style={{ color:"#6B7280" }}>{email}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Projects (внутри организации) */}
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",margin:"28px 0 16px" }}>
                    <h3 style={{ fontSize:15,fontWeight:700,color:"#111827",margin:0 }}>Projects</h3>
                  </div>

                  {isOwner && (
                    <div style={{ display:"flex",gap:8,marginBottom:14 }}>
                      <input value={newProjName} onChange={e=>setNewProjName(e.target.value)}
                        onKeyDown={e=>{ if(e.key==="Enter") handleCreateProject(); }}
                        placeholder="Название нового проекта"
                        style={{ flex:1,maxWidth:340,border:"1.5px solid #E5E7EB",borderRadius:8,padding:"8px 12px",fontSize:13,color:"#374151",outline:"none",fontFamily:"inherit" }}/>
                      <button onClick={handleCreateProject} disabled={creatingProj || !newProjName.trim()}
                        style={{ display:"flex",alignItems:"center",gap:6,background:"#2563EB",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:(creatingProj||!newProjName.trim())?"default":"pointer",opacity:(creatingProj||!newProjName.trim())?0.6:1,fontFamily:"inherit",whiteSpace:"nowrap" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        New Project
                      </button>
                    </div>
                  )}

                  {projectsLoading ? (
                    <div style={{ color:"#9CA3AF",fontSize:13,padding:"12px 0" }}>Loading projects…</div>
                  ) : projects.length === 0 ? (
                    <div style={{ color:"#9CA3AF",fontSize:13,padding:"12px 0" }}>В этой организации пока нет проектов.</div>
                  ) : (
                    <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                      {projects.map(p => (
                        <div key={p.id} onClick={() => onNavigate?.("projects")}
                          style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:"1px solid #E5E7EB",borderRadius:10,cursor:"pointer",transition:"border-color .15s" }}
                          onMouseEnter={e=>e.currentTarget.style.borderColor="#2563EB"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor="#E5E7EB"}>
                          <div style={{ width:34,height:34,borderRadius:8,background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" width="16" height="16"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:13.5,fontWeight:600,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{p.title}</div>
                            <div style={{ fontSize:11.5,color:"#9CA3AF" }}>
                              {(p.members_count ?? 0)} участн. · {(p.documents_count ?? 0)} док.
                            </div>
                          </div>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="15" height="15"><polyline points="9 18 15 12 9 6"/></svg>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
