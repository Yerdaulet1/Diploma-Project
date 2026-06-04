import { useLocation, useNavigate } from "react-router-dom";

const CSS = `
  .gs-bnav{
    display:none;position:fixed;bottom:0;left:0;right:0;z-index:50;
    background:#fff;border-top:.5px solid #E5E7EB;
    padding:4px 0 calc(4px + env(safe-area-inset-bottom));
    justify-content:space-around;align-items:center;
    font-family:'Gilroy','Segoe UI',sans-serif;
  }
  .gs-bnav-btn{
    flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;
    border:none;background:none;color:#9CA3AF;font-size:9.5px;
    font-family:inherit;padding:4px 2px;border-radius:8px;cursor:pointer;
    min-height:40px;
  }
  .gs-bnav-btn:hover{color:#374151}
  .gs-bnav-btn.active{color:#2563EB}
  .gs-bnav-btn svg{ flex-shrink:0 }
  @media(max-width:768px){
    .gs-bnav{ display:flex }
    /* Reserve space for the bar so fixed content doesn't get clipped */
    body{ padding-bottom: env(safe-area-inset-bottom) }
  }
`;

const ITEMS = [
  {
    key: "inbox", path: "/inbox", label: "Inbox",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <polyline points="2,4 12,13 22,4"/>
      </svg>
    ),
  },
  {
    key: "projects", path: "/projects", label: "Projects",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    ),
  },
  {
    key: "documents", path: "/documents", label: "Docs",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
  },
  {
    key: "analytics", path: "/analytics", label: "Analytics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
];

const MORE_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeKey = ITEMS.find((i) => pathname.startsWith(i.path))?.key;
  return (
    <>
      <style>{CSS}</style>
      <nav className="gs-bnav" aria-label="Bottom navigation">
        {ITEMS.map((it) => (
          <button
            key={it.key}
            type="button"
            className={`gs-bnav-btn${activeKey === it.key ? " active" : ""}`}
            onClick={() => navigate(it.path)}
            aria-label={it.label}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        ))}
        <button
          type="button"
          className="gs-bnav-btn"
          onClick={() => window.dispatchEvent(new CustomEvent("sidebar:open"))}
          aria-label="More"
        >
          {MORE_ICON}
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
