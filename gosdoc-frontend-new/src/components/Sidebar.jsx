import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import useSidebarOpen from "../hooks/useSidebarOpen";
import useAuthStore from "../store/authStore";
import { getOrganizations } from "../api/organizations";
import CreateWorkspaceModal from "../CreateWorkspaceModal";
import NewProjectModal from "./NewProjectModal";

const NAV = [
  {
    key: "inbox",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <polyline points="2,4 12,13 22,4"/>
      </svg>
    ),
  },
  {
    key: "projects",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    key: "documents",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
  },
  {
    key: "analytics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
  {
    key: "help",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
];

const ADMIN_NAV = {
  key: "admin",
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
      <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
};

const SIDEBAR_CSS = `
  .gs-sb{
    width:268px;flex-shrink:0;background:#fff;
    border-right:.5px solid #E5E7EB;
    display:flex;flex-direction:column;align-items:stretch;
    padding:0 0 14px;height:100%;
    transition:width .28s cubic-bezier(.4,0,.2,1);
    overflow:hidden;z-index:20;
    font-family:'Gilroy','Segoe UI',sans-serif;
  }
  .gs-sb.closed{width:60px;align-items:center}

  .gs-profile{background:#2563EB;width:100%;display:flex;flex-direction:column;align-items:center;padding:10px 0 32px;flex-shrink:0;position:relative}
  .gs-toggle{position:absolute;top:8px;left:8px;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.18);border:none;color:#fff;cursor:pointer;flex-shrink:0}
  .gs-toggle:hover{background:rgba(255,255,255,0.32)}
  .gs-toggle svg{transition:transform .28s;transform:rotate(180deg)}
  .gs-sb.closed .gs-toggle svg{transform:none}

  .gs-avatar{display:block;position:absolute;bottom:-30px;left:50%;transform:translateX(-50%);width:60px;height:60px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.12);z-index:1}
  .gs-sb.closed .gs-avatar{display:none}

  .gs-pinfo{display:block;text-align:center;padding:36px 12px 4px;flex-shrink:0}
  .gs-sb.closed .gs-pinfo{display:none}
  .gs-pname{font-size:13px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gs-pmail{font-size:10.5px;color:#9CA3AF;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

  .gs-org-wrap{position:relative;margin:0 10px 6px;flex-shrink:0}
  .gs-sb.closed .gs-org-wrap{display:none}
  .gs-org{display:flex;align-items:center;gap:6px;border:.5px solid #E5E7EB;border-radius:10px;padding:5px 10px;cursor:pointer;transition:border-color .15s}
  .gs-org:hover{border-color:#2563EB}
  .gs-org-name{font-size:11.5px;color:#6B7280;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .gs-org-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0}

  .gs-org-dd{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border-radius:10px;z-index:200;overflow:hidden;border:1px solid #F3F4F6}
  .gs-org-dd-title{padding:6px 12px 4px;font-size:10.5px;color:#9CA3AF;font-weight:600;text-transform:uppercase;letter-spacing:0.06em}
  .gs-org-dd-item{display:flex;align-items:center;gap:8px;padding:9px 14px;font-size:13px;cursor:pointer;color:#374151;border-top:.5px solid #F9FAFB;transition:background .15s}
  .gs-org-dd-item:hover{background:#F9FAFB}
  .gs-org-dd-add{display:flex;align-items:center;gap:8px;padding:9px 14px;font-size:13px;cursor:pointer;color:#2563EB;font-weight:500;border-top:1px solid #F3F4F6;transition:background .15s}
  .gs-org-dd-add:hover{background:#EFF6FF}

  .gs-navlist{display:flex;flex-direction:column;flex:1;width:100%;gap:1px;padding:4px 8px}
  .gs-sb.closed .gs-navlist{align-items:center;padding:4px 0}
  .gs-navitem{width:100%;height:36px;border-radius:12px;display:flex;align-items:center;gap:10px;padding:0 10px;font-size:13px;color:#6B7280;border:1.5px solid transparent;background:none;font-family:inherit;transition:background .15s,color .15s,border-color .15s;cursor:pointer;text-align:left}
  .gs-sb.closed .gs-navitem{width:42px;height:38px;border-radius:10px;justify-content:center;padding:0;gap:0}
  .gs-navitem:hover{background:#EFF6FF;color:#2563EB;border-color:#2563EB}
  .gs-navitem.active{background:#EEF2FF;color:#4F46E5;font-weight:500;border-color:transparent}
  .gs-navlabel{flex:1;text-align:left;white-space:nowrap}
  .gs-sb.closed .gs-navlabel{display:none}
  .gs-navchev{flex-shrink:0;color:#9CA3AF}
  .gs-sb.closed .gs-navchev{display:none}

  .gs-sbbottom{margin-top:auto;padding:0 8px;flex-shrink:0;display:flex;justify-content:center}
  .gs-addbtn{width:100%;height:42px;background:#2563EB;color:#fff;border:none;border-radius:10px;display:flex;align-items:center;justify-content:flex-start;gap:6px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;overflow:hidden;transition:width .28s cubic-bezier(.4,0,.2,1),background .15s;flex-shrink:0;padding:0 14px}
  .gs-sb.closed .gs-addbtn{width:42px;justify-content:center;padding:0}
  .gs-addbtn:hover{background:#1D4ED8}
  .gs-addbtn-plus{flex-shrink:0}
  .gs-addbtn-label{white-space:nowrap}
  .gs-sb.closed .gs-addbtn-label{display:none}

  @media(max-width:768px){
    .gs-sb{display:none}
    .gs-sb:not(.closed){display:flex;position:fixed;top:0;left:0;bottom:0;height:100%;width:268px!important;box-shadow:4px 0 24px rgba(0,0,0,.13)}
  }
`;

export default function Sidebar({ active, onNavigate }) {
  const { t } = useTranslation();
  const [open, toggle] = useSidebarOpen();
  const [wsDropOpen, setWsDropOpen] = useState(false);
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const wsDropRef = useRef(null);
  const user = useAuthStore(s => s.user);

  const { data: orgData } = useQuery({
    queryKey: ["organizations"],
    queryFn: getOrganizations,
    staleTime: 30_000,
  });
  const allOrgs = orgData?.results ?? (Array.isArray(orgData) ? orgData : []);
  const orgName = allOrgs[0]?.name || "Organization";

  useEffect(() => {
    if (!wsDropOpen) return;
    const h = (e) => {
      if (wsDropRef.current && !wsDropRef.current.contains(e.target)) {
        setWsDropOpen(false);
      }
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [wsDropOpen]);

  const go = (key) => {
    if (key === active) return;
    onNavigate?.(key);
  };

  return (
    <>
      <style>{SIDEBAR_CSS}</style>
      <aside className={`gs-sb${open ? "" : " closed"}`}>
        <div className="gs-profile">
          <button className="gs-toggle" onClick={toggle} aria-label="Toggle sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <polyline points="9 6 15 12 9 18"/>
            </svg>
          </button>
          <div className="gs-avatar">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : (
                <svg viewBox="0 0 60 60" fill="none" width="60" height="60">
                  <rect width="60" height="60" fill="#CBD5E1"/>
                  <circle cx="30" cy="22" r="10" fill="#94A3B8"/>
                  <ellipse cx="30" cy="52" rx="20" ry="12" fill="#94A3B8"/>
                </svg>
              )}
          </div>
        </div>

        <div className="gs-pinfo">
          <div className="gs-pname">{user?.full_name || "User"}</div>
          <div className="gs-pmail">{user?.email || ""}</div>
        </div>

        <div className="gs-org-wrap" ref={wsDropRef}>
          <div className="gs-org" onClick={() => setWsDropOpen(v => !v)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
            <span className="gs-org-name">{orgName}</span>
            <div className="gs-org-dot"/>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                 style={{ transform: wsDropOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          {wsDropOpen && (
            <div className="gs-org-dd">
              <div className="gs-org-dd-title">Switch Organizations</div>
              {allOrgs.length === 0 && (
                <div style={{ padding:"10px 14px", fontSize:12, color:"#9CA3AF" }}>
                  You are not in any organization yet.
                </div>
              )}
              {allOrgs.map((org) => (
                <div key={org.id} className="gs-org-dd-item"
                     onClick={() => { setWsDropOpen(false); onNavigate?.(`organization/${org.id}`); }}>
                  <div style={{ width:22, height:22, borderRadius:6, background:"#DBEAFE", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" width="12" height="12">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <path d="M3 9h18M9 21V9"/>
                    </svg>
                  </div>
                  <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{org.name}</span>
                </div>
              ))}
              <div className="gs-org-dd-add" onClick={() => { setWsDropOpen(false); setShowCreateWs(true); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {t("inbox.createOrganization")}
              </div>
            </div>
          )}
        </div>

        <div className="gs-navlist">
          {NAV.map((n) => (
            <button key={n.key} className={`gs-navitem${active === n.key ? " active" : ""}`}
                    onClick={() => go(n.key)}>
              {n.icon}
              <span className="gs-navlabel">{t(`nav.${n.key}`)}</span>
              <svg className="gs-navchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <polyline points="9 6 15 12 9 18"/>
              </svg>
            </button>
          ))}
          {user?.is_staff && (
            <button key={ADMIN_NAV.key} className={`gs-navitem${active === ADMIN_NAV.key ? " active" : ""}`}
                    onClick={() => go(ADMIN_NAV.key)}>
              {ADMIN_NAV.icon}
              <span className="gs-navlabel">Admin</span>
              <svg className="gs-navchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                <polyline points="9 6 15 12 9 18"/>
              </svg>
            </button>
          )}
        </div>

        <div className="gs-sbbottom">
          <button className="gs-addbtn" onClick={() => setShowNewProject(true)}>
            <svg className="gs-addbtn-plus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="gs-addbtn-label">{t("inbox.newProject")}</span>
          </button>
        </div>
      </aside>

      {showCreateWs && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWs(false)}
          onCreated={(id) => {
            setShowCreateWs(false);
            if (id) onNavigate?.(`organization/${id}`);
          }}
        />
      )}

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={(p) => {
            setShowNewProject(false);
            if (p?.id) onNavigate?.(`organization/${p.id}`);
          }}
        />
      )}
    </>
  );
}
