import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  getWorkspace, getMembers, addMember, removeMember, updateMember, getWorkspaces,
} from "./api/workspaces";
import useAuthStore from "./store/authStore";
import logoImg from "./assets/Group 2.svg";
import ProfileController, { ProfileMenu } from "./Profile";
import CreateWorkspaceModal from "./CreateWorkspaceModal";

/* ── CSS ───────────────────────────────────────────────────── */
const orgCss = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{width:100%;height:100%;overflow:hidden;margin:0;padding:0}
  button{font-family:'DM Sans','Segoe UI',sans-serif;cursor:pointer}
  button:hover{opacity:unset}
  input,select{font-family:'DM Sans','Segoe UI',sans-serif}

  .org-page{display:flex;flex-direction:column;width:100vw;height:100vh;font-family:'DM Sans','Segoe UI',sans-serif;background:#EEEDF0;overflow:hidden}

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
  .org-sb:not(.closed) .org-addbtn-plus{transform:rotate(45deg)}
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
function InviteModal({ workspaceId, onClose }) {
  const qc = useQueryClient();
  const [rows, setRows]     = useState([{ email: "", role: "editor" }]);
  const [loading, setLoading] = useState(false);

  const addRow    = () => setRows(r => [...r, { email: "", role: "editor" }]);
  const updateRow = (i, f, v) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [f]: v } : row));
  const removeRow = (i) => setRows(r => r.filter((_, idx) => idx !== i));

  const submit = async () => {
    const valid = rows.filter(r => r.email.trim() && /\S+@\S+\.\S+/.test(r.email));
    if (!valid.length) { toast.error("Enter at least one valid email"); return; }
    setLoading(true);
    const results = await Promise.allSettled(
      valid.map(r => addMember(workspaceId, { email: r.email.trim(), role: r.role }))
    );
    const failed = results.filter(r => r.status === "rejected").length;
    if (failed) toast.error(`${failed} invite(s) failed`);
    else toast.success("Members invited!");
    qc.invalidateQueries({ queryKey: ["members", workspaceId] });
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
              <div style={{ display:"flex",alignItems:"center",border:"1.5px solid #E2E5EF",borderRadius:8,height:40,padding:"0 12px",gap:8 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="14" height="14"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
                <input style={{ flex:1,border:"none",outline:"none",fontSize:13,color:"#374151",fontFamily:"inherit" }}
                  placeholder="ex: name@workplace.com" type="email"
                  value={row.email} onChange={e => updateRow(i, "email", e.target.value)} />
              </div>
            </div>
            <div style={{ width:140 }}>
              <label style={{ fontSize:12,fontWeight:500,color:"#374151",display:"block",marginBottom:4 }}>Role*</label>
              <div style={{ display:"flex",alignItems:"center",border:"1.5px solid #E2E5EF",borderRadius:8,height:40,padding:"0 12px",gap:8 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <select value={row.role} onChange={e => updateRow(i, "role", e.target.value)}
                  style={{ flex:1,border:"none",outline:"none",fontSize:13,color:"#374151",fontFamily:"inherit",background:"transparent",cursor:"pointer" }}>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                </select>
              </div>
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
  const { t } = useTranslation();
  const { id: workspaceId } = useParams();
  const user = useAuthStore(s => s.user);
  const qc   = useQueryClient();

  const [sbOpen,         setSbOpen]         = useState(true);
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

  /* data */
  const { data: ws, isLoading: wsLoading } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn:  () => getWorkspace(workspaceId),
    enabled:  !!workspaceId,
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn:  () => getMembers(workspaceId),
    enabled:  !!workspaceId,
  });

  const { data: wsListData } = useQuery({
    queryKey: ["workspaces"],
    queryFn:  getWorkspaces,
  });

  const members   = membersData?.results ?? (Array.isArray(membersData) ? membersData : []);
  const workspaces = wsListData?.results ?? (Array.isArray(wsListData) ? wsListData : []);

  const deleteMember = async (memberId) => {
    try {
      await removeMember(workspaceId, memberId);
      qc.invalidateQueries({ queryKey: ["members", workspaceId] });
      toast.success("Member removed");
    } catch { toast.error("Failed to remove member"); }
  };

  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`;
  };

  const wsName  = ws?.title || "Workspace";
  const wsType  = WS_TYPE_LABEL[ws?.type] || ws?.type || "—";
  const owner   = ws?.created_by_name || ws?.owner_name || user?.full_name || "—";
  const created = fmtDate(ws?.created_at);
  const orgName = workspaces[0]?.title || wsName;

  return (
    <div className="org-page">
      <style>{orgCss}</style>

      {showInvite  && <InviteModal workspaceId={workspaceId} onClose={() => setShowInvite(false)} />}
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
          <span style={{ color:"#111827",fontWeight:500 }}>{wsName}'s Workspace</span>
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

        {/* ── SIDEBAR ── */}
        <aside className={`org-sb${!sbOpen ? " closed" : ""}`}>
          <div className="org-profile">
            <button className="org-toggle" onClick={() => setSbOpen(v=>!v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="9 6 15 12 9 18"/></svg>
            </button>
            <div className="org-av">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                : <svg viewBox="0 0 60 60" fill="none" width="60" height="60"><rect width="60" height="60" fill="#CBD5E1"/><circle cx="30" cy="22" r="10" fill="#94A3B8"/><ellipse cx="30" cy="52" rx="20" ry="12" fill="#94A3B8"/></svg>
              }
            </div>
          </div>
          <div className="org-pinfo">
            <div style={{ fontSize:13,fontWeight:600,color:"#111827" }}>{user?.full_name || "—"}</div>
            <div style={{ fontSize:10.5,color:"#9CA3AF",marginTop:2 }}>{user?.email || ""}</div>
          </div>

          {/* workspace switcher */}
          <div ref={wsDropRef} style={{ position:"relative",margin:"0 10px 4px" }}>
            <div className="org-wsdrop" onClick={() => setWsDropOpen(v=>!v)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              <span style={{ fontSize:11.5,color:"#6B7280",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{wsName}</span>
              <div style={{ width:7,height:7,borderRadius:"50%",background:"#22c55e",flexShrink:0 }}/>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                style={{ transform:wsDropOpen?"rotate(180deg)":"none",transition:"transform .2s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {wsDropOpen && (
              <div style={{ position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#fff",borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",zIndex:200,overflow:"hidden",border:"1px solid #F3F4F6" }}>
                <div style={{ padding:"6px 12px 4px",fontSize:10.5,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em" }}>
                  Switch Workplaces
                </div>
                {workspaces.map((wsp) => (
                  <div key={wsp.id}
                    onClick={() => { setWsDropOpen(false); onNavigate?.(`organization/${wsp.id}`); }}
                    style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 14px",fontSize:13,cursor:"pointer",color: wsp.id===workspaceId?"#2563EB":"#374151",fontWeight:wsp.id===workspaceId?600:400,background:wsp.id===workspaceId?"#EFF6FF":"transparent",borderTop:".5px solid #F9FAFB" }}
                    onMouseEnter={e=>{ if(wsp.id!==workspaceId) e.currentTarget.style.background="#F9FAFB"; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background=wsp.id===workspaceId?"#EFF6FF":"transparent"; }}>
                    <div style={{ width:22,height:22,borderRadius:6,background:"#DBEAFE",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                    </div>
                    <span style={{ flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{wsp.title}</span>
                  </div>
                ))}
                <div style={{ borderTop:"1px solid #F3F4F6" }}>
                  <div onClick={() => { setWsDropOpen(false); setShowCreateWs(true); }}
                    style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 14px",fontSize:13,cursor:"pointer",color:"#2563EB",fontWeight:500 }}
                    onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Create Workplace
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* nav */}
          <div className="org-navlist">
            {NAV_ITEMS.map((n, i) => (
              <button key={i} className="org-navitem"
                onClick={() => onNavigate?.(n.navKey)}>
                {n.icon}
                <span className="org-navlabel">{t(`nav.${n.key}`)}</span>
                <svg className="org-navchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="9 6 15 12 9 18"/></svg>
              </button>
            ))}
          </div>

          <div className="org-sbbottom">
            <button className="org-addbtn" onClick={() => onNavigate?.("projects")}>
              <svg className="org-addbtn-plus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span className="org-addbtn-label">{t("inbox.newProject")}</span>
            </button>
          </div>
        </aside>

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
                  {/* Info grid */}
                  <div className="org-info-grid">
                    {[
                      { label:"Workspace name", value: wsName },
                      { label:"Owner",          value: owner  },
                      { label:"Workspace type", value: wsType },
                      { label:"Creation date",  value: created },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div className="org-info-label">{label}</div>
                        <div className="org-info-value">{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Members */}
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
                    <h3 style={{ fontSize:15,fontWeight:700,color:"#111827",margin:0 }}>Members</h3>
                    <button onClick={() => setShowInvite(true)}
                      style={{ display:"flex",alignItems:"center",gap:6,background:"#2563EB",color:"#fff",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Invite Member
                    </button>
                  </div>

                  {membersLoading ? (
                    <div style={{ color:"#9CA3AF",fontSize:13,padding:"12px 0" }}>Loading members…</div>
                  ) : (
                    <table className="org-tbl">
                      <thead>
                        <tr>
                          {["#","Member name","Email address","Role",""].map(h => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {members.length === 0 && (
                          <tr><td colSpan={5} style={{ textAlign:"center",color:"#9CA3AF",padding:24 }}>No members yet</td></tr>
                        )}
                        {members.map((m, i) => {
                          const memberId = m.id;
                          const name  = m.user?.full_name || m.user?.email || "—";
                          const email = m.user?.email || "—";
                          const role  = m.role || "viewer";
                          const isMe  = m.user?.id === user?.id;
                          return (
                            <tr key={memberId || i}>
                              <td style={{ color:"#9CA3AF" }}>{i+1}</td>
                              <td>
                                <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                                  <div style={{ width:30,height:30,borderRadius:"50%",background:"#DBEAFE",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600,color:"#2563EB",flexShrink:0 }}>
                                    {name.charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ fontWeight:500,color:"#111827" }}>{name}</span>
                                </div>
                              </td>
                              <td style={{ color:"#6B7280" }}>{email}</td>
                              <td>
                                <RoleBadge role={role} memberId={memberId} workspaceId={workspaceId}/>
                              </td>
                              <td style={{ textAlign:"right" }}>
                                {!isMe && (
                                  <button onClick={() => deleteMember(memberId)}
                                    style={{ border:"none",background:"none",cursor:"pointer",color:"#EF4444",display:"inline-flex",alignItems:"center",padding:4 }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
