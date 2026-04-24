import { useState, useRef, useEffect } from "react";
import ProfileController, { ProfileMenu } from "./Profile";
import logoImg from "./assets/Group 2.svg";

/* ══════════════════════════════════════════════════════════
   SAMPLE DATA
══════════════════════════════════════════════════════════ */
const INITIAL_NOTIFICATIONS = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  title: 'Document "Contract Agreement" was completed',
  desc: "Jacob finished the task.",
  time: i < 5 ? "2 min ago" : i < 10 ? "1 h ago" : i < 15 ? "3 h ago" : "Yesterday",
  read: i >= 5, // first 5 are unread
}));

/* ══════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════ */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{width:100%;height:100%;overflow:hidden;margin:0;padding:0}
  button{font-family:'DM Sans','Segoe UI',sans-serif;cursor:pointer}
  button:hover{opacity:unset}
  input,textarea{font-family:'DM Sans','Segoe UI',sans-serif}

  .nt-page{display:flex;flex-direction:column;width:100vw;height:100vh;font-family:'DM Sans','Segoe UI',sans-serif;background:#EEEDF0;overflow:hidden}

  /* ── HEADER ── */
  .nt-topbar{display:flex;align-items:center;padding:0 20px;height:52px;gap:10px;flex-shrink:0;background:#fff;border-bottom:.5px solid #E5E7EB;z-index:30}
  .nt-body{display:flex;flex:1;overflow:hidden;min-height:0}
  .nt-back{display:flex;align-items:center;gap:6px;background:none;border:none;color:#2563EB;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit}

  /* ── SIDEBAR ── */
  .nt-sb{width:60px;flex-shrink:0;background:#fff;border-right:.5px solid #E5E7EB;display:flex;flex-direction:column;align-items:center;padding:0 0 14px;height:100%;z-index:20;transition:width .28s cubic-bezier(.4,0,.2,1);overflow:hidden}
  .nt-sb.open{width:268px;align-items:stretch}
  .nt-profile{background:#2563EB;width:100%;display:flex;flex-direction:column;align-items:center;padding:10px 0 32px;flex-shrink:0;position:relative}
  .nt-toggle{position:absolute;top:8px;left:8px;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.18);border:none;color:#fff;cursor:pointer;flex-shrink:0}
  .nt-toggle:hover{background:rgba(255,255,255,0.32)}
  .nt-toggle svg{transition:transform .28s}
  .nt-sb.open .nt-toggle svg{transform:rotate(180deg)}
  .nt-avatar{display:none;position:absolute;bottom:-30px;left:50%;transform:translateX(-50%);width:60px;height:60px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.12);z-index:1}
  .nt-sb.open .nt-avatar{display:block}
  .nt-profile-info{display:none;text-align:center;padding:36px 12px 4px;flex-shrink:0}
  .nt-sb.open .nt-profile-info{display:block}
  .nt-org{display:none;align-items:center;gap:6px;margin:4px 10px 6px;border:.5px solid #E5E7EB;border-radius:10px;padding:5px 10px;cursor:pointer;flex-shrink:0;transition:border-color .15s}
  .nt-org:hover{border-color:#2563EB}
  .nt-sb.open .nt-org{display:flex}
  .nt-navlist{display:flex;flex-direction:column;flex:1;width:100%;gap:1px;align-items:center;padding:4px 0}
  .nt-sb.open .nt-navlist{align-items:stretch;padding:4px 8px}
  .nt-navitem{width:42px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;border:1.5px solid transparent;background:none;font-family:inherit;flex-shrink:0;transition:background .15s,color .15s,border-color .15s;cursor:pointer}
  .nt-sb.open .nt-navitem{width:100%;height:36px;justify-content:flex-start;gap:10px;padding:0 10px;font-size:13px;border-radius:12px}
  .nt-navitem:hover{background:#EFF6FF;color:#2563EB;border-color:#2563EB}
  .nt-navitem.active{background:#EEF2FF;color:#4F46E5;border-color:transparent}
  .nt-sb.open .nt-navitem.active{font-weight:500}
  .nt-navlabel{display:none;flex:1;text-align:left}
  .nt-sb.open .nt-navlabel{display:block}
  .nt-navchev{display:none;color:#9CA3AF}
  .nt-sb.open .nt-navchev{display:block}
  .nt-sbbottom{margin-top:auto;width:100%;display:flex;justify-content:center;padding:0 8px;flex-shrink:0}
  .nt-addbtn{width:42px;height:42px;background:#2563EB;color:#fff;border:none;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;overflow:hidden;transition:width .28s cubic-bezier(.4,0,.2,1);flex-shrink:0;padding:0}
  .nt-sb.open .nt-addbtn{width:100%;justify-content:flex-start;padding:0 14px}
  .nt-addbtn:hover{background:#1D4ED8}
  .nt-addbtn-plus{transition:transform .28s;flex-shrink:0}
  .nt-sb.open .nt-addbtn-plus{transform:rotate(45deg)}
  .nt-addbtn-label{display:none;white-space:nowrap}
  .nt-sb.open .nt-addbtn-label{display:block}

  /* ── MAIN ── */
  .nt-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;background:#EEEDF0}

  .nt-container{flex:1;margin:12px;background:#fff;border-radius:16px;display:flex;flex-direction:column;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden;min-height:0}

  /* Search bar */
  .nt-search-wrap{display:flex;justify-content:center;padding:20px 20px 14px;flex-shrink:0}
  .nt-search{display:flex;align-items:center;gap:8px;background:#F9FAFB;border:.5px solid #E5E7EB;border-radius:22px;padding:9px 18px;width:100%;max-width:400px}
  .nt-search input{border:none;outline:none;background:transparent;font-size:13px;color:#374151;flex:1;font-family:inherit}
  .nt-search input::placeholder{color:#9CA3AF}

  /* Toolbar */
  .nt-toolbar{display:flex;align-items:center;justify-content:space-between;padding:0 24px 10px;flex-shrink:0}
  .nt-tools{display:flex;align-items:center;gap:8px}

  /* Checkbox */
  .nt-check-wrap{position:relative;display:inline-block}
  .nt-checkbox{width:22px;height:22px;border:1.5px solid #D1D5DB;border-radius:5px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s}
  .nt-checkbox.checked{background:#2563EB;border-color:#2563EB}
  .nt-checkbox.partial{background:#2563EB;border-color:#2563EB}
  .nt-check-dropdown-btn{display:flex;align-items:center;gap:4px;border:1.5px solid #D1D5DB;border-radius:6px;padding:4px 8px;background:#fff;cursor:pointer}
  .nt-check-dropdown-btn.active{background:#2563EB;border-color:#2563EB}

  .nt-tool-btn{width:32px;height:32px;border:1.5px solid #D1D5DB;border-radius:6px;background:#fff;color:#6B7280;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s}
  .nt-tool-btn:hover:not(:disabled){border-color:#9CA3AF;color:#374151}
  .nt-tool-btn:disabled{cursor:not-allowed;opacity:.4}

  .nt-pager{display:flex;align-items:center;gap:10px;font-size:12.5px;color:#6B7280}
  .nt-pager-btn{width:28px;height:28px;border:.5px solid #E5E7EB;border-radius:6px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6B7280}
  .nt-pager-btn:hover{background:#F3F4F6}
  .nt-pager-btn:disabled{cursor:not-allowed;opacity:.4}

  /* Dropdown */
  .nt-dropdown{position:absolute;top:calc(100% + 4px);left:0;background:#fff;border:.5px solid #E5E7EB;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.1);z-index:100;min-width:120px;padding:6px 0;overflow:hidden}
  .nt-dropdown-item{padding:8px 16px;font-size:13px;cursor:pointer;color:#374151;white-space:nowrap}
  .nt-dropdown-item:hover{background:#F3F4F6}
  .nt-dropdown-item.active{color:#2563EB;background:#EEF2FF}

  /* Notification list */
  .nt-list{flex:1;overflow-y:auto;padding:0 24px 20px;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent}
  .nt-list::-webkit-scrollbar{width:4px}
  .nt-list::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}

  .nt-card{
    display:flex;align-items:flex-start;gap:14px;
    border:.5px solid #F3F4F6;border-radius:10px;
    padding:14px 18px;margin-bottom:8px;cursor:pointer;
    transition:all .15s;position:relative;background:#fff;
  }
  .nt-card:hover{background:#FAFAFA}
  .nt-card.unread{background:#EFF6FF;border-color:#DBEAFE}
  .nt-card.unread:hover{background:#DBEAFE}
  .nt-card.selected{background:#BFDBFE;border-color:#93C5FD}
  .nt-card.selected:hover{background:#93C5FD}

  .nt-card-content{flex:1;min-width:0}
  .nt-card-title{font-size:13.5px;font-weight:500;color:#111827;margin-bottom:2px}
  .nt-card-desc{font-size:12px;color:#6B7280}
  .nt-card-right{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0}
  .nt-card-time{font-size:11.5px;color:#9CA3AF;display:flex;align-items:center;gap:4px;white-space:nowrap}
  .nt-card-more{background:none;border:none;color:#D1D5DB;cursor:pointer;font-size:16px;letter-spacing:2px;line-height:1;padding:0 4px}
  .nt-card-more:hover{color:#6B7280}

  /* Context menu */
  .nt-ctx{position:absolute;right:8px;top:calc(100% - 8px);background:#fff;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.13);z-index:150;padding:6px 0;min-width:140px;border:.5px solid #F3F4F6}
  .nt-ctx-item{display:flex;align-items:center;gap:8px;padding:9px 16px;font-size:13px;cursor:pointer;color:#374151;white-space:nowrap}
  .nt-ctx-item:hover{background:#F3F4F6}

  @media(max-width:768px){
    .nt-sb{display:none}
    .nt-sb.open{display:flex;position:fixed;top:0;left:0;bottom:0;height:100%;width:242px!important;box-shadow:4px 0 24px rgba(0,0,0,.13)}
    .nt-container{margin:8px;border-radius:12px}
  }
`;

/* ══════════════════════════════════════════════════════════
   SIDEBAR NAV
══════════════════════════════════════════════════════════ */
const NT_NAV = [
  { label:"Inbox",        nav:"inbox",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg> },
  { label:"Projects",     nav:"projects", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  { label:"Documents",    nav:"documents", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { label:"Notifications",nav:"notifications", active:true, icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
  { label:"Help & Support",nav:"help",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
];

function Sidebar({ onNavigate }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className={`nt-sb${open ? " open" : ""}`}>
      <div className="nt-profile">
        <button className="nt-toggle" onClick={() => setOpen(v => !v)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
        <div className="nt-avatar">
          <svg viewBox="0 0 60 60" fill="none" width="60" height="60"><rect width="60" height="60" fill="#CBD5E1"/><circle cx="30" cy="22" r="10" fill="#94A3B8"/><ellipse cx="30" cy="52" rx="20" ry="12" fill="#94A3B8"/></svg>
        </div>
      </div>
      <div className="nt-profile-info">
        <div style={{ fontSize:13,fontWeight:600,color:"#111827" }}>Erik Serikov</div>
        <div style={{ fontSize:10.5,color:"#9CA3AF",marginTop:2 }}>220103351@stu.sdu.edu.kz</div>
      </div>
      <div className="nt-org">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        <span style={{ fontSize:11.5,color:"#6B7280",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>SDU University</span>
        <div style={{ width:7,height:7,borderRadius:"50%",background:"#22c55e",flexShrink:0 }}/>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div className="nt-navlist">
        {NT_NAV.map((n,i) => (
          <button key={i} className={`nt-navitem${n.active?" active":""}`}
            onClick={() => n.nav && onNavigate?.(n.nav)}>
            {n.icon}
            <span className="nt-navlabel">{n.label}</span>
            <svg className="nt-navchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="9 6 15 12 9 18"/></svg>
          </button>
        ))}
      </div>
      <div className="nt-sbbottom">
        <button className="nt-addbtn" onClick={() => onNavigate?.("projects")}>
          <svg className="nt-addbtn-plus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span className="nt-addbtn-label">New project</span>
        </button>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════════
   CONTEXT MENU
══════════════════════════════════════════════════════════ */
function ContextMenu({ onClear, onOpen, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(()=>document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="nt-ctx">
      <div className="nt-ctx-item" onClick={()=>{ onClear(); onClose(); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
        Clear
      </div>
      <div className="nt-ctx-item" onClick={()=>{ onOpen(); onClose(); }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        Open task
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   NOTIFICATION CARD
══════════════════════════════════════════════════════════ */
function NotificationCard({ notif, selected, onSelect, onMarkRead, onDelete }) {
  const [menu, setMenu] = useState(false);

  const cls = selected ? "nt-card selected" : !notif.read ? "nt-card unread" : "nt-card";

  return (
    <div className={cls}>
      <div
        className={`nt-checkbox${selected ? " checked" : ""}`}
        onClick={e => { e.stopPropagation(); onSelect(); }}>
        {selected && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" width="13" height="13">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>
      <div className="nt-card-content" onClick={onMarkRead}>
        <div className="nt-card-title">{notif.title}</div>
        <div className="nt-card-desc">{notif.desc}</div>
      </div>
      <div className="nt-card-right">
        <div className="nt-card-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {notif.time}
        </div>
        <div style={{ position:"relative" }}>
          <button className="nt-card-more" onClick={(e)=>{ e.stopPropagation(); setMenu(v=>!v); }}>···</button>
          {menu && <ContextMenu onClose={()=>setMenu(false)} onClear={onDelete} onOpen={()=>alert("Open task (demo)")}/>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════ */
export default function Notifications({ onGoBack, onGoToAuth, onNavigate }) {
  const [notifs, setNotifs] = useState(INITIAL_NOTIFICATIONS);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileView, setProfileView] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filter, setFilter] = useState("All"); // All, Read, Unread
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const filterRef = useRef(null);

  // close filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const h = (e) => { if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [filterOpen]);

  // Filter + search
  const filtered = notifs.filter(n => {
    if (filter === "Read"   && !n.read) return false;
    if (filter === "Unread" &&  n.read) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Pagination
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  // Select logic
  const allSelected     = pageItems.length > 0 && pageItems.every(n => selectedIds.has(n.id));
  const partialSelected = !allSelected && pageItems.some(n => selectedIds.has(n.id));

  const toggleOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(pageItems.map(n => n.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const markRead = (id) => {
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const deleteOne = (id) => {
    setNotifs(ns => ns.filter(n => n.id !== id));
    setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
  };
  const markSelectedRead = () => {
    setNotifs(ns => ns.map(n => selectedIds.has(n.id) ? { ...n, read: true } : n));
  };
  const deleteSelected = () => {
    setNotifs(ns => ns.filter(n => !selectedIds.has(n.id)));
    clearSelection();
  };

  const onFilterSelect = (f) => {
    if (f === "All") { selectAll(); }
    else if (f === "Read")   { setFilter("Read"); clearSelection(); }
    else if (f === "Unread") { setFilter("Unread"); clearSelection(); }
    setFilterOpen(false);
  };

  const hasSelection = selectedIds.size > 0;

  return (
    <div className="nt-page">
      <style>{css}</style>

      {/* ── HEADER ── */}
      <header className="nt-topbar">
        <img src={logoImg} alt="Logo" style={{ height:30,flexShrink:0 }}/>
        <button className="nt-back" onClick={onGoBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
          Notification
        </button>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
          <button style={{ position:"relative",width:30,height:30,border:".5px solid #E5E7EB",borderRadius:8,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" width="14" height="14"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </button>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor:"pointer" }} onClick={()=>setProfileMenuOpen(v=>!v)}><polyline points="6 9 12 15 18 9"/></svg>
          <div style={{ position:"relative" }}>
            <div onClick={()=>setProfileMenuOpen(v=>!v)} title="Menu" style={{ position:"relative",width:30,height:30,cursor:"pointer" }}>
              <div style={{ width:30,height:30,borderRadius:"50%",overflow:"hidden" }}>
                <svg viewBox="0 0 30 30" fill="none" width="30" height="30"><rect width="30" height="30" fill="#CBD5E1"/><circle cx="15" cy="11" r="5" fill="#94A3B8"/><ellipse cx="15" cy="26" rx="10" ry="6" fill="#94A3B8"/></svg>
              </div>
              <div style={{ position:"absolute",top:-2,right:-2,width:8,height:8,background:"#22c55e",borderRadius:"50%",border:"1.5px solid #fff" }}/>
            </div>
            {profileMenuOpen && (
              <ProfileMenu onClose={()=>setProfileMenuOpen(false)}
                onProfile={()=>setProfileView("profile")}
                onSettings={()=>setProfileView("settings")}
                onLogOut={onGoToAuth}/>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="nt-body">
        <Sidebar onNavigate={onNavigate}/>

        <div className="nt-main">
          <ProfileController show={!!profileView} view={profileView} setView={setProfileView} onLogOut={onGoToAuth}/>

          <div className="nt-container">
          {/* Search */}
          <div className="nt-search-wrap">
            <div className="nt-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="15" height="15"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input placeholder="Search in notifications..." value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
          </div>

          {/* Toolbar */}
          <div className="nt-toolbar">
            <div className="nt-tools">
              {/* Select dropdown */}
              <div ref={filterRef} style={{ position:"relative" }}>
                <button
                  className={`nt-check-dropdown-btn${(allSelected || partialSelected) ? " active" : ""}`}
                  onClick={() => {
                    if (allSelected) clearSelection();
                    else if (partialSelected) clearSelection();
                    else setFilterOpen(v => !v);
                  }}>
                  <div style={{ width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",
                    background: (allSelected || partialSelected) ? "#fff" : "#fff",
                    color: (allSelected || partialSelected) ? "#2563EB" : "#D1D5DB",
                    borderRadius:3,
                    border: (allSelected || partialSelected) ? "none" : "1.5px solid #D1D5DB" }}>
                    {allSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="3" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                    {partialSelected && !allSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="3" width="11" height="11"><line x1="6" y1="12" x2="18" y2="12"/></svg>
                    )}
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke={(allSelected||partialSelected)?"#fff":"#6B7280"} strokeWidth="2" width="10" height="10" onClick={(e)=>{ e.stopPropagation(); setFilterOpen(v=>!v); }}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {filterOpen && (
                  <div className="nt-dropdown">
                    <div className="nt-dropdown-item" onClick={()=>{ selectAll(); setFilter("All"); setFilterOpen(false); }}>All</div>
                    <div className={`nt-dropdown-item${filter==="Read"?" active":""}`} onClick={()=>{ setFilter("Read"); clearSelection(); setFilterOpen(false); }}>Read</div>
                    <div className={`nt-dropdown-item${filter==="Unread"?" active":""}`} onClick={()=>{ setFilter("Unread"); clearSelection(); setFilterOpen(false); }}>Unread</div>
                  </div>
                )}
              </div>

              {/* Mark as read */}
              <button className="nt-tool-btn" disabled={!hasSelection} onClick={markSelectedRead} title="Mark as read">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
              </button>

              {/* Delete */}
              <button className="nt-tool-btn" disabled={!hasSelection} onClick={deleteSelected} title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>
            </div>

            {/* Pager */}
            <div className="nt-pager">
              Showing {pageStart + 1}-{Math.min(pageStart + pageSize, filtered.length)} from {filtered.length}
              <div style={{ display:"flex", gap:4 }}>
                <button className="nt-pager-btn" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button className="nt-pager-btn" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="9 6 15 12 9 18"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="nt-list">
            {pageItems.length === 0
              ? <div style={{ padding:60, textAlign:"center", color:"#9CA3AF", fontSize:13 }}>No notifications.</div>
              : pageItems.map(n => (
                  <NotificationCard key={n.id} notif={n}
                    selected={selectedIds.has(n.id)}
                    onSelect={()=>toggleOne(n.id)}
                    onMarkRead={()=>markRead(n.id)}
                    onDelete={()=>deleteOne(n.id)}/>
                ))
            }
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}