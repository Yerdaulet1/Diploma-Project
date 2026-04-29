import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ProfileController, { ProfileMenu } from "./Profile";
import logoImg from "./assets/Group 2.svg";
import {
  getDocuments, deleteDocument,
  requestUpload, uploadFileToS3, confirmUpload, getDownloadUrl,
  getDocumentContent, saveDocumentContent, extractDocumentContent,
  serverUploadDocument, signDocument,
} from "./api/documents";
import { getWorkspaces } from "./api/workspaces";
import { getMe, updateProfile } from "./api/users";
import useAuthStore from "./store/authStore";

/* ══════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════ */
const docCss = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{width:100%;height:100%;overflow:hidden;margin:0;padding:0}
  button{font-family:'DM Sans','Segoe UI',sans-serif;cursor:pointer}
  button:hover{opacity:unset}
  input,textarea,select{font-family:'DM Sans','Segoe UI',sans-serif}

  .dc-page{display:flex;flex-direction:column;width:100vw;height:100vh;font-family:'DM Sans','Segoe UI',sans-serif;background:#EEEDF0;overflow:hidden}

  /* HEADER */
  .dc-topbar{display:flex;align-items:center;padding:0 20px;height:52px;gap:10px;flex-shrink:0;background:#fff;border-bottom:.5px solid #E5E7EB;z-index:30}

  /* BODY */
  .dc-body{display:flex;flex:1;overflow:hidden;min-height:0}

  /* SIDEBAR */
  .dc-sb{width:268px;flex-shrink:0;background:#fff;border-right:.5px solid #E5E7EB;display:flex;flex-direction:column;align-items:stretch;padding:0 0 14px;height:100%;transition:width .28s cubic-bezier(.4,0,.2,1);overflow:hidden;z-index:20}
  .dc-sb.closed{width:60px;align-items:center}
  .dc-profile{background:#2563EB;width:100%;display:flex;flex-direction:column;align-items:center;padding:10px 0 32px;flex-shrink:0;position:relative}
  .dc-toggle{position:absolute;top:8px;left:8px;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.18);border:none;color:#fff;cursor:pointer;flex-shrink:0}
  .dc-toggle:hover{background:rgba(255,255,255,0.32)}
  .dc-toggle svg{transition:transform .28s}
  .dc-sb:not(.closed) .dc-toggle svg{transform:rotate(180deg)}
  .dc-av{display:block;position:absolute;bottom:-30px;left:50%;transform:translateX(-50%);width:60px;height:60px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.12);z-index:1}
  .dc-sb.closed .dc-av{display:none}
  .dc-pinfo{display:block;text-align:center;padding:36px 12px 4px;flex-shrink:0}
  .dc-sb.closed .dc-pinfo{display:none}
  .dc-org{display:flex;align-items:center;gap:6px;margin:4px 10px 6px;border:.5px solid #E5E7EB;border-radius:10px;padding:5px 10px;cursor:pointer;flex-shrink:0;transition:border-color .15s}
  .dc-org:hover{border-color:#2563EB}
  .dc-sb.closed .dc-org{display:none}
  .dc-navlist{display:flex;flex-direction:column;flex:1;width:100%;gap:1px;padding:4px 8px}
  .dc-sb.closed .dc-navlist{align-items:center;padding:4px 0}
  .dc-navitem{width:100%;height:36px;border-radius:12px;display:flex;align-items:center;gap:10px;padding:0 10px;font-size:13px;color:#6B7280;border:1.5px solid transparent;background:none;font-family:inherit;transition:background .15s,color .15s,border-color .15s;cursor:pointer;text-align:left}
  .dc-sb.closed .dc-navitem{width:42px;height:38px;border-radius:10px;justify-content:center;padding:0;gap:0}
  .dc-navitem:hover{background:#EFF6FF;color:#2563EB;border-color:#2563EB}
  .dc-navitem.active{background:#EEF2FF;color:#4F46E5;font-weight:500;border-color:transparent}
  .dc-navlabel{flex:1;text-align:left;white-space:nowrap}
  .dc-sb.closed .dc-navlabel{display:none}
  .dc-navchev{flex-shrink:0}
  .dc-sb.closed .dc-navchev{display:none}
  .dc-sbbottom{margin-top:auto;padding:0 8px;flex-shrink:0;display:flex;justify-content:center}
  .dc-addbtn{width:42px;height:42px;background:#2563EB;color:#fff;border:none;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;overflow:hidden;transition:width .28s cubic-bezier(.4,0,.2,1);flex-shrink:0;padding:0}
  .dc-sb:not(.closed) .dc-addbtn{width:100%;justify-content:flex-start;padding:0 14px}
  .dc-addbtn:hover{background:#1D4ED8}
  .dc-addbtn-plus{transition:transform .28s;flex-shrink:0}
  .dc-sb:not(.closed) .dc-addbtn-plus{transform:rotate(45deg)}
  .dc-addbtn-label{display:none;white-space:nowrap}
  .dc-sb:not(.closed) .dc-addbtn-label{display:block}

  /* MAIN */
  .dc-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
  .dc-container{flex:1;margin:0 12px 12px 6px;background:#fff;border-radius:16px;display:flex;flex-direction:column;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden;min-height:0}

  /* DOCUMENT LIST */
  .dc-list-scroll{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent}
  .dc-list-scroll::-webkit-scrollbar{width:4px}
  .dc-list-scroll::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}
  .dc-action-cards{display:flex;gap:14px;padding:20px 24px 0;flex-shrink:0}
  .dc-action-card{flex:0 0 180px;border:1.5px solid #2563EB;border-radius:12px;padding:22px 16px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;transition:all .15s;text-align:center}
  .dc-action-card:hover{background:#EFF6FF;transform:translateY(-1px)}
  .dc-action-card.sig{border-color:#BFDBFE;background:#EFF6FF}
  .dc-action-card.sig:hover{background:#DBEAFE}

  /* TABLE */
  .dc-table{width:100%;border-collapse:collapse}
  .dc-table th{font-size:12px;color:#9CA3AF;font-weight:500;padding:10px 16px;text-align:left;border-bottom:.5px solid #F3F4F6;white-space:nowrap}
  .dc-table td{font-size:13px;color:#374151;padding:11px 16px;border-bottom:.5px solid #F9FAFB;vertical-align:middle}
  .dc-table tr:last-child td{border-bottom:none}
  .dc-table tbody tr:hover td{background:#FAFAFA}
  .dc-file-icon{width:34px;height:38px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}
  .dc-sort-btn{display:flex;align-items:center;gap:4px;background:none;border:.5px solid #E5E7EB;border-radius:6px;padding:3px 8px;font-size:11.5px;color:#6B7280;cursor:pointer}
  .dc-sort-btn:hover{border-color:#2563EB;color:#2563EB}
  .dc-icon-action{width:28px;height:28px;border:none;background:none;cursor:pointer;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;transition:all .15s}
  .dc-icon-action:hover{background:#F3F4F6;color:#374151}
  .dc-pagination{display:flex;align-items:center;justify-content:space-between;padding:10px 20px;border-top:.5px solid #F3F4F6;flex-shrink:0}
  .dc-pgbtn{width:28px;height:28px;border-radius:6px;border:.5px solid #E5E7EB;background:#fff;font-size:12.5px;color:#6B7280;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
  .dc-pgbtn.active{background:#2563EB;color:#fff;border-color:#2563EB;font-weight:600}
  .dc-pgbtn:hover:not(.active){background:#F3F4F6}

  /* OVERLAY / MODALS */
  .dc-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px}
  .dc-modal{background:#fff;border-radius:16px;padding:32px;box-shadow:0 16px 60px rgba(0,0,0,0.18);position:relative;width:100%;max-width:420px}
  .dc-modal-close{position:absolute;top:14px;right:14px;background:none;border:none;cursor:pointer;color:#9CA3AF;padding:4px;border-radius:6px;display:flex;align-items:center}
  .dc-modal-close:hover{background:#F3F4F6}
  .dc-type-cards{display:flex;gap:14px;margin-top:20px}
  .dc-type-card{flex:1;border:2px solid #E5E7EB;border-radius:14px;padding:24px 16px;display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;transition:all .2s;text-align:center}
  .dc-type-card:hover,.dc-type-card.sel{border-color:#2563EB;background:#EFF6FF;transform:translateY(-2px)}
  .dc-type-card.xls:hover,.dc-type-card.xls.sel{border-color:#16A34A;background:#F0FDF4}
  .dc-save-input{width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:10px 14px;font-size:14px;color:#374151;outline:none;font-family:inherit;margin:12px 0 20px}
  .dc-save-input:focus{border-color:#2563EB}
  .dc-btn-row{display:flex;gap:10px}
  .dc-btn-cancel{flex:1;border:.5px solid #E5E7EB;background:#fff;border-radius:8px;padding:10px;font-size:13px;color:#6B7280;cursor:pointer;font-family:inherit}
  .dc-btn-cancel:hover{background:#F3F4F6}
  .dc-btn-save{flex:2;background:#2563EB;color:#fff;border:none;border-radius:8px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
  .dc-btn-save:hover{background:#1D4ED8}
  .dc-btn-save.green{background:#16A34A}
  .dc-btn-save.green:hover{background:#15803D}

  /* DOCS EDITOR */
  .dc-editor-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;background:#EEEDF0}
  .dc-editor-toolbar{display:flex;align-items:center;gap:1px;padding:5px 10px;border-bottom:.5px solid #E5E7EB;background:#fff;flex-wrap:wrap;flex-shrink:0;min-height:44px;z-index:5}
  .dc-tb-btn{width:28px;height:28px;border:none;background:none;cursor:pointer;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#374151;font-size:12px;font-weight:700;font-family:inherit;flex-shrink:0;transition:background .1s;user-select:none}
  .dc-tb-btn:hover{background:#F3F4F6}
  .dc-tb-btn.on{background:#DBEAFE;color:#2563EB}
  .dc-tb-sep{width:1px;height:20px;background:#E5E7EB;margin:0 3px;flex-shrink:0}
  .dc-tb-sel{border:.5px solid #E5E7EB;border-radius:6px;padding:2px 5px;font-size:12px;color:#374151;outline:none;cursor:pointer;background:#fff;height:26px;max-width:110px}
  .dc-tb-sel:focus{border-color:#2563EB}
  .dc-editor-pages{flex:1;overflow-y:auto;padding:28px;display:flex;flex-direction:column;align-items:center;gap:20px;scrollbar-width:thin;scrollbar-color:#D1D5DB transparent}
  .dc-editor-pages::-webkit-scrollbar{width:6px}
  .dc-editor-pages::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:4px}
  .dc-page-sheet{background:#fff;width:780px;min-height:1050px;box-shadow:0 2px 14px rgba(0,0,0,.13);padding:64px 72px;position:relative;flex-shrink:0}
  .dc-page-content{min-height:920px;outline:none;font-size:13px;font-family:'DM Sans',sans-serif;color:#111827;line-height:1.75;word-break:break-word}
  .dc-page-content:empty::before{content:"Start typing...";color:#C9C9C9;pointer-events:none;display:block}
  .dc-page-content table{border-collapse:collapse;width:100%;margin:8px 0}
  .dc-page-content table td,.dc-page-content table th{border:1px solid #D1D5DB;padding:6px 10px;font-size:13px}
  .dc-float-bar{position:sticky;bottom:16px;left:0;right:0;display:flex;justify-content:center;z-index:10;pointer-events:none}
  .dc-float-inner{display:flex;gap:8px;pointer-events:all}
  .dc-float-btn{display:flex;align-items:center;gap:6px;border:.5px solid #D1D5DB;border-radius:20px;padding:7px 16px;font-size:12.5px;color:#374151;cursor:pointer;background:#fff;font-family:inherit;box-shadow:0 2px 10px rgba(0,0,0,.1);transition:all .15s}
  .dc-float-btn:hover{border-color:#2563EB;color:#2563EB;background:#EFF6FF}
  .dc-save-fab{position:fixed;bottom:28px;right:28px;background:#2563EB;color:#fff;border:none;border-radius:12px;padding:11px 22px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;z-index:100;display:flex;align-items:center;gap:7px;box-shadow:0 4px 18px rgba(37,99,235,.45);transition:background .15s}
  .dc-save-fab:hover{background:#1D4ED8}
  .dc-save-fab.green{background:#16A34A;box-shadow:0 4px 18px rgba(22,163,74,.4)}
  .dc-save-fab.green:hover{background:#15803D}
  .dc-top-actions{position:absolute;top:12px;right:12px;display:flex;flex-direction:column;gap:6px;z-index:10}
  .dc-top-act-btn{width:34px;height:34px;border:none;background:#F3F4F6;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#6B7280;transition:all .15s}
  .dc-top-act-btn:hover{background:#E5E7EB;color:#374151}

  /* XLS EDITOR */
  .dc-xls-wrap{flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;background:#fff}
  .dc-xls-tabs{display:flex;border-bottom:.5px solid #D1D5DB;padding:0 6px;background:#fff;flex-shrink:0}
  .dc-xls-tab{padding:7px 13px;font-size:12.5px;color:#6B7280;cursor:pointer;border:none;background:none;font-family:inherit;border-bottom:2.5px solid transparent;margin-bottom:-.5px;font-weight:500;transition:color .15s;white-space:nowrap}
  .dc-xls-tab.active{color:#217346;border-bottom-color:#217346}
  .dc-xls-tab:hover:not(.active){color:#374151}
  .dc-xls-bar{display:flex;align-items:center;gap:2px;padding:4px 8px;border-bottom:.5px solid #D1D5DB;background:#F9FAFB;flex-wrap:wrap;flex-shrink:0;min-height:42px}
  .dc-xl-btn{width:26px;height:26px;border:none;background:none;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#374151;font-size:11.5px;font-weight:700;font-family:inherit;transition:background .1s;flex-shrink:0;user-select:none}
  .dc-xl-btn:hover{background:#E5E7EB}
  .dc-xl-btn.on{background:#C6EFCE;color:#217346}
  .dc-xl-sep{width:1px;height:18px;background:#D1D5DB;margin:0 4px;flex-shrink:0}
  .dc-xl-sel{border:.5px solid #D1D5DB;border-radius:4px;padding:1px 4px;font-size:11px;color:#374151;outline:none;cursor:pointer;background:#fff;height:24px}
  .dc-xl-sel:focus{border-color:#217346}
  .dc-xl-label{font-size:10px;color:#9CA3AF;margin:0 2px;white-space:nowrap;user-select:none}
  .dc-formula-bar{display:flex;align-items:center;border-bottom:.5px solid #D1D5DB;background:#fff;flex-shrink:0;height:28px}
  .dc-formula-ref{width:64px;padding:0 8px;font-size:12px;font-weight:500;color:#374151;border-right:.5px solid #D1D5DB;height:100%;display:flex;align-items:center;flex-shrink:0;font-family:'Courier New',monospace;user-select:none}
  .dc-formula-input{flex:1;padding:0 10px;font-size:12.5px;color:#111827;border:none;outline:none;font-family:'DM Sans',sans-serif;background:transparent}
  .dc-grid-wrap{flex:1;overflow:auto;position:relative;scrollbar-width:thin;scrollbar-color:#D1D5DB transparent}
  .dc-grid-wrap::-webkit-scrollbar{width:10px;height:10px}
  .dc-grid-wrap::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:4px}
  .dc-xls-table{border-collapse:collapse;table-layout:fixed}
  .dc-xls-table th{background:#F2F2F2;border:.5px solid #D1D5DB;font-size:11px;font-weight:600;color:#374151;text-align:center;white-space:nowrap;user-select:none;position:sticky;top:0;z-index:3}
  .dc-xls-table th.corner{position:sticky;left:0;top:0;z-index:5;background:#F2F2F2;width:46px;min-width:46px}
  .dc-xls-table th.col-h{min-width:80px;width:80px;height:22px}
  .dc-xls-table th.col-h.sel-col{background:#C6EFCE;color:#217346}
  .dc-xls-table td.rn{background:#F2F2F2;border:.5px solid #D1D5DB;font-size:11px;color:#374151;text-align:center;width:46px;min-width:46px;height:22px;position:sticky;left:0;z-index:2;user-select:none}
  .dc-xls-table td.rn.sel-row{background:#C6EFCE;color:#217346}
  .dc-xls-table td.cell{border:.5px solid #E5E7EB;min-width:80px;width:80px;height:22px;padding:0 3px;font-size:12px;color:#111827;font-family:'DM Sans',sans-serif;white-space:nowrap;overflow:hidden;cursor:cell;position:relative}
  .dc-xls-table td.cell.sel{outline:2px solid #217346;outline-offset:-1px;z-index:1}
  .dc-xls-table td.cell input{width:100%;height:100%;border:none;outline:none;background:transparent;font-family:inherit;font-size:inherit;color:inherit;padding:0 2px}
`;

/* ══════════════════════════════════════════════════════════
   CONSTANTS / DATA
══════════════════════════════════════════════════════════ */
const FONTS   = ["DM Sans","Arial","Times New Roman","Georgia","Courier New","Verdana","Trebuchet MS"];
const FSIZES  = ["8","9","10","11","12","14","16","18","20","24","28","32","36","48","72"];
const COLS_N  = 26;
const ROWS_N  = 50;
const COLS    = Array.from({length:COLS_N},(_,i)=>String.fromCharCode(65+i));
const XLS_TABS= ["Home","Insert","Page Layout","Formulas","Data","Review","View"];


function apiDocToUi(doc) {
  const ft = (doc.file_type || "doc").toLowerCase();
  const isXls = ft === "xlsx" || ft === "xls" || ft === "ods";
  const isPdf = ft === "pdf";
  // Strip file extension from title if it already ends with one
  const rawTitle = doc.title || "Untitled";
  const name = rawTitle.replace(/\.[a-zA-Z0-9]{2,5}$/, "");
  return {
    id: doc.id,
    name,
    ext: ft,
    color: isXls ? "#16A34A" : isPdf ? "#EF4444" : "#2563EB",
    bg:    isXls ? "#DCFCE7" : isPdf ? "#FEE2E2" : "#DBEAFE",
    owner: doc.uploaded_by_name || "Me",
    lastOpened: doc.updated_at
      ? new Date(doc.updated_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" })
      : "—",
    size: "—",
    date: doc.created_at
      ? new Date(doc.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" })
      : "—",
    docType: isXls ? "xls" : "docs",
    _isEditable: !isPdf,
    _isPdf: isPdf,
    _apiId: doc.id,
  };
}

const NAV = [
  {label:"Inbox",       key:"inbox",     icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>},
  {label:"Projects",    key:"projects",  icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>},
  {label:"Documents",   key:"documents", active:true, icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>},
  {label:"Analytics",       key:"analytics", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>},
  {label:"Help & Support",key:"help",    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>},
];

/* ══════════════════════════════════════════════════════════
   TYPE SELECT MODAL
══════════════════════════════════════════════════════════ */
function TypeSelectModal({ onSelect, onUpload, onClose }) {
  const { t } = useTranslation();
  const [sel, setSel]       = useState(null);
  const [file, setFile]     = useState(null);
  const [title, setTitle]   = useState("");
  const [drag, setDrag]     = useState(false);
  const fileRef = useRef(null);

  const ALLOWED = ["pdf","docx","xlsx"];
  const pickFile = (f) => {
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!ALLOWED.includes(ext)) { toast.error("Only .pdf, .docx, .xlsx allowed"); return; }
    setFile(f);
    setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const btnColor = sel === "xls" ? "#16A34A" : "#2563EB";
  const canGo    = sel === "upload" ? !!(file && title.trim()) : !!sel;

  const handleGo = () => {
    if (sel === "upload") { if (file && title.trim()) onUpload(file, title.trim()); }
    else if (sel)          { onSelect(sel); }
  };

  return (
    <div className="dc-overlay" onClick={onClose}>
      <div className="dc-modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:480 }}>
        <button className="dc-modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div style={{ fontSize:17,fontWeight:700,color:"#111827",marginBottom:4 }}>{t("documents.newDocumentTitle")}</div>
        <div style={{ fontSize:13,color:"#9CA3AF",marginBottom:2 }}>{t("documents.newDocumentSubtitle")}</div>

        {/* Create cards */}
        <div className="dc-type-cards">
          <div className={`dc-type-card${sel==="docs"?" sel":""}`} onClick={()=>{ setSel("docs"); setFile(null); }}>
            <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
              <rect x="6" y="2" width="36" height="44" rx="4" fill="#DBEAFE"/>
              <rect x="6" y="2" width="36" height="44" rx="4" stroke="#2563EB" strokeWidth="1.5"/>
              <rect x="26" y="2" width="16" height="14" fill="#BFDBFE"/>
              <path d="M26 2 L42 16 L26 16 Z" fill="#2563EB" opacity=".3"/>
              <line x1="13" y1="22" x2="35" y2="22" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="13" y1="28" x2="35" y2="28" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round"/>
              <line x1="13" y1="34" x2="27" y2="34" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div style={{ fontWeight:600,fontSize:13,color:"#111827" }}>{t("documents.wordDocument")}</div>
            <div style={{ fontSize:11,color:"#9CA3AF" }}>{t("documents.wordDocumentDesc")}</div>
          </div>
          <div className={`dc-type-card xls${sel==="xls"?" sel":""}`} onClick={()=>{ setSel("xls"); setFile(null); }}>
            <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
              <rect x="6" y="2" width="36" height="44" rx="4" fill="#DCFCE7"/>
              <rect x="6" y="2" width="36" height="44" rx="4" stroke="#16A34A" strokeWidth="1.5"/>
              <rect x="26" y="2" width="16" height="14" fill="#BBF7D0"/>
              <path d="M26 2 L42 16 L26 16 Z" fill="#16A34A" opacity=".3"/>
              <line x1="13" y1="20" x2="35" y2="20" stroke="#16A34A" strokeWidth="1" opacity=".5"/>
              <line x1="13" y1="27" x2="35" y2="27" stroke="#16A34A" strokeWidth="1" opacity=".5"/>
              <line x1="13" y1="34" x2="35" y2="34" stroke="#16A34A" strokeWidth="1" opacity=".5"/>
              <line x1="22" y1="20" x2="22" y2="41" stroke="#16A34A" strokeWidth="1" opacity=".5"/>
              <line x1="30" y1="20" x2="30" y2="41" stroke="#16A34A" strokeWidth="1" opacity=".5"/>
            </svg>
            <div style={{ fontWeight:600,fontSize:13,color:"#111827" }}>{t("documents.excelSpreadsheet")}</div>
            <div style={{ fontSize:11,color:"#9CA3AF" }}>{t("documents.excelSpreadsheetDesc")}</div>
          </div>
        </div>

        {/* Upload strip */}
        <div
          style={{ marginTop:12,border:`2px solid ${sel==="upload"?"#6B7280":"#E5E7EB"}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",background:sel==="upload"?"#F9FAFB":"#fff",transition:"all .15s" }}
          onClick={()=>{ setSel("upload"); if(!file) fileRef.current?.click(); }}>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx" style={{ display:"none" }}
            onChange={e=>{ const f=e.target.files?.[0]; if(f) pickFile(f); e.target.value=""; }}/>
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:8,background:"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" width="18" height="18"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:500,color:"#374151" }}>{t("documents.uploadFromComputer")}</div>
              <div style={{ fontSize:11,color:"#9CA3AF",marginTop:1 }}>pdf · docx · xlsx</div>
            </div>
            {sel==="upload" && !file && (
              <span style={{ fontSize:11.5,color:"#2563EB",fontWeight:500 }}>{t("documents.clickToBrowse")}</span>
            )}
          </div>

          {/* Drop zone — only when upload selected */}
          {sel==="upload" && (
            <div
              style={{ marginTop:12,border:`2px dashed ${drag?"#2563EB":"#D1D5DB"}`,borderRadius:9,padding:"14px",textAlign:"center",background:drag?"#EFF6FF":"transparent",transition:"all .15s" }}
              onDragOver={e=>{ e.preventDefault(); e.stopPropagation(); setDrag(true); }}
              onDragLeave={e=>{ e.stopPropagation(); setDrag(false); }}
              onDrop={e=>{ e.preventDefault(); e.stopPropagation(); setDrag(false); pickFile(e.dataTransfer.files[0]); }}
              onClick={e=>{ e.stopPropagation(); fileRef.current?.click(); }}>
              {file ? (
                <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span style={{ fontSize:13,fontWeight:500,color:"#374151" }}>{file.name}</span>
                  <button onClick={e=>{ e.stopPropagation(); setFile(null); setTitle(""); }}
                    style={{ border:"none",background:"none",cursor:"pointer",color:"#9CA3AF",padding:2,borderRadius:4,display:"flex",alignItems:"center" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <div style={{ fontSize:12.5,color:"#9CA3AF" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" width="24" height="24" style={{ display:"block",margin:"0 auto 6px" }}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                  {t("documents.dropFileHere")}
                </div>
              )}
            </div>
          )}

          {/* Title input after file picked */}
          {sel==="upload" && file && (
            <input
              value={title}
              onChange={e=>setTitle(e.target.value)}
              onClick={e=>e.stopPropagation()}
              placeholder="Document title..."
              style={{ display:"block",width:"100%",marginTop:10,border:"1.5px solid #E5E7EB",borderRadius:7,padding:"8px 12px",fontSize:13,color:"#374151",outline:"none",fontFamily:"inherit",boxSizing:"border-box" }}
              onFocus={e=>e.currentTarget.style.borderColor="#2563EB"}
              onBlur={e=>e.currentTarget.style.borderColor="#E5E7EB"}/>
          )}
        </div>

        <button
          onClick={handleGo}
          disabled={!canGo}
          style={{ width:"100%",marginTop:16,background:canGo?btnColor:"#E5E7EB",color:canGo?"#fff":"#9CA3AF",border:"none",borderRadius:9,padding:"11px",fontSize:13,fontWeight:600,cursor:canGo?"pointer":"not-allowed",fontFamily:"inherit",transition:"all .15s" }}>
          {sel==="upload" ? t("documents.upload") : sel==="docs" ? t("documents.createDocument") : sel==="xls" ? t("documents.createSpreadsheet") : t("documents.selectOption")}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SAVE MODAL
══════════════════════════════════════════════════════════ */
function SaveModal({ defaultName, docType, onSave, onClose }) {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultName || "");
  const ref = useRef(null);
  useEffect(()=>{ ref.current?.focus(); ref.current?.select(); },[]);
  return (
    <div className="dc-overlay" onClick={onClose}>
      <div className="dc-modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:380 }}>
        <button className="dc-modal-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div style={{ fontSize:16,fontWeight:700,color:"#111827",marginBottom:4 }}>{t("documents.saveDocumentTitle")}</div>
        <div style={{ fontSize:13,color:"#9CA3AF",marginBottom:2 }}>{t("documents.enterDocName")}</div>
        <input ref={ref} className="dc-save-input" value={name} onChange={e=>setName(e.target.value)}
          placeholder={t("documents.documentNamePlaceholder")} onKeyDown={e=>{ if(e.key==="Enter"&&name.trim()) onSave(name.trim()); }}/>
        <div className="dc-btn-row">
          <button className="dc-btn-cancel" onClick={onClose}>{t("common.cancel")}</button>
          <button className={`dc-btn-save${docType==="xls"?" green":""}`} onClick={()=>name.trim()&&onSave(name.trim())} disabled={!name.trim()}>
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   INSERT TABLE MODAL
══════════════════════════════════════════════════════════ */
function InsertTableModal({ onInsert, onClose }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  return (
    <div className="dc-overlay" onClick={onClose}>
      <div className="dc-modal" onClick={e=>e.stopPropagation()} style={{ maxWidth:300 }}>
        <button className="dc-modal-close" onClick={onClose}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <div style={{ fontSize:15,fontWeight:700,color:"#111827",marginBottom:16 }}>{t("documents.insertTable")}</div>
        <div style={{ display:"flex",gap:14,marginBottom:16 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12,color:"#6B7280",display:"block",marginBottom:4 }}>{t("documents.rows")}</label>
            <input type="number" min={1} max={20} value={rows} onChange={e=>setRows(+e.target.value)}
              style={{ width:"100%",border:"1.5px solid #E5E7EB",borderRadius:7,padding:"7px 10px",fontSize:13,outline:"none",fontFamily:"inherit" }}/>
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:12,color:"#6B7280",display:"block",marginBottom:4 }}>{t("documents.columns")}</label>
            <input type="number" min={1} max={20} value={cols} onChange={e=>setCols(+e.target.value)}
              style={{ width:"100%",border:"1.5px solid #E5E7EB",borderRadius:7,padding:"7px 10px",fontSize:13,outline:"none",fontFamily:"inherit" }}/>
          </div>
        </div>
        <div className="dc-btn-row">
          <button className="dc-btn-cancel" onClick={onClose}>{t("common.cancel")}</button>
          <button className="dc-btn-save" onClick={()=>onInsert(rows,cols)}>{t("documents.insert")}</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PDF VIEWER
══════════════════════════════════════════════════════════ */
function PdfViewer({ doc, onClose, onDownload }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",width:"100%",height:"100%",background:"#374151" }}>
      {/* Header bar */}
      <div style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:"#1F2937",flexShrink:0 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span style={{ fontSize:13,fontWeight:600,color:"#F9FAFB",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{doc?.name || "Document"}</span>
        <button onClick={onDownload} title="Download"
          style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 12px",background:"#374151",border:"1px solid #4B5563",borderRadius:6,color:"#D1D5DB",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download
        </button>
        <button onClick={onClose} title="Close"
          style={{ display:"flex",alignItems:"center",justifyContent:"center",width:28,height:28,background:"none",border:"none",color:"#9CA3AF",cursor:"pointer",borderRadius:6 }}
          onMouseEnter={e=>e.currentTarget.style.background="#374151"}
          onMouseLeave={e=>e.currentTarget.style.background="none"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      {/* PDF iframe */}
      <iframe
        src={doc?._pdfUrl}
        title={doc?.name || "PDF"}
        style={{ flex:1,border:"none",width:"100%",height:"100%" }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DOCS EDITOR
══════════════════════════════════════════════════════════ */
function DocsEditor({ doc, initialContent, onClose, onSave, onDownload, signature }) {
  const [font,    setFont]    = useState("DM Sans");
  const [fsize,   setFsize]   = useState("13");
  const [bold,    setBold]    = useState(false);
  const [italic,  setItalic]  = useState(false);
  const [under,   setUnder]   = useState(false);
  const [strike,  setStrike]  = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [pages,   setPages]   = useState(1);
  const editorRef = useRef(null);
  const colorRef  = useRef(null);
  const bgRef     = useRef(null);

  useEffect(() => {
    if (initialContent && editorRef.current) {
      editorRef.current.innerHTML = initialContent;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd, val=null) => { editorRef.current?.focus(); document.execCommand(cmd, false, val); };

  const applyFont = (f) => { setFont(f); exec("fontName", f); };
  const applySize = (s) => {
    setFsize(s);
    exec("fontSize", 3);
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      document.querySelectorAll("font[size='3']").forEach(el => { el.removeAttribute("size"); el.style.fontSize = s+"px"; });
    }
  };

  const insertTable = (rows, cols) => {
    setShowTable(false);
    editorRef.current?.focus();
    const thead = `<tr>${Array(cols).fill("<th style='border:1px solid #D1D5DB;padding:6px 10px;background:#F9FAFB'>Header</th>").join("")}</tr>`;
    const tbody = Array(rows-1).fill(`<tr>${Array(cols).fill("<td style='border:1px solid #D1D5DB;padding:6px 10px'>&nbsp;</td>").join("")}</tr>`).join("");
    const html = `<table style='border-collapse:collapse;width:100%;margin:8px 0'><thead>${thead}</thead><tbody>${tbody}</tbody></table><p></p>`;
    exec("insertHTML", html);
  };

  const insertImage = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { exec("insertHTML", `<img src="${ev.target.result}" style="max-width:100%;border-radius:6px;margin:4px 0" />`); };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const insertSignature = () => {
    if (!signature) return;
    editorRef.current?.focus();
    exec("insertHTML", `<img src="${signature}" style="max-width:220px;height:auto;display:inline-block;vertical-align:middle;margin:2px 0;" />`);
  };

  return (
    <div className="dc-editor-wrap">
      {showSave && <SaveModal defaultName={doc?.name||"Untitled Document"} docType="docs" onSave={(name) => { onSave(name, editorRef.current?.innerHTML || "<p></p>"); setShowSave(false); }} onClose={()=>setShowSave(false)}/>}
      {showTable && <InsertTableModal onInsert={insertTable} onClose={()=>setShowTable(false)}/>}

      {/* ── TOOLBAR ── */}
      <div className="dc-editor-toolbar">
        {/* Undo / Redo */}
        <button className="dc-tb-btn" onClick={()=>exec("undo")} title="Undo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
        </button>
        <button className="dc-tb-btn" onClick={()=>exec("redo")} title="Redo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>
        </button>
        <div className="dc-tb-sep"/>

        {/* Font & Size */}
        <select className="dc-tb-sel" value={font} onChange={e=>applyFont(e.target.value)} style={{ maxWidth:120 }}>
          {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
        </select>
        <select className="dc-tb-sel" value={fsize} onChange={e=>applySize(e.target.value)} style={{ maxWidth:52,marginLeft:3 }}>
          {FSIZES.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <div className="dc-tb-sep"/>

        {/* Bold / Italic / Underline / Strike */}
        <button className={`dc-tb-btn${bold?" on":""}`} onClick={()=>{ setBold(v=>!v); exec("bold"); }} title="Bold" style={{ fontWeight:700 }}>B</button>
        <button className={`dc-tb-btn${italic?" on":""}`} onClick={()=>{ setItalic(v=>!v); exec("italic"); }} title="Italic" style={{ fontStyle:"italic" }}>I</button>
        <button className={`dc-tb-btn${under?" on":""}`} onClick={()=>{ setUnder(v=>!v); exec("underline"); }} title="Underline" style={{ textDecoration:"underline" }}>U</button>
        <button className={`dc-tb-btn${strike?" on":""}`} onClick={()=>{ setStrike(v=>!v); exec("strikeThrough"); }} title="Strikethrough" style={{ textDecoration:"line-through" }}>S</button>
        <div className="dc-tb-sep"/>

        {/* Text color */}
        <div style={{ position:"relative" }}>
          <button className="dc-tb-btn" title="Text color" onClick={()=>colorRef.current?.click()}
            style={{ flexDirection:"column",gap:1 }}>
            <span style={{ fontWeight:700,fontSize:12 }}>A</span>
            <span style={{ width:14,height:3,background:"#EF4444",borderRadius:1 }}/>
          </button>
          <input ref={colorRef} type="color" defaultValue="#EF4444" style={{ position:"absolute",opacity:0,width:0,height:0 }}
            onChange={e=>exec("foreColor",e.target.value)}/>
        </div>
        {/* Highlight */}
        <div style={{ position:"relative" }}>
          <button className="dc-tb-btn" title="Highlight color" onClick={()=>bgRef.current?.click()}
            style={{ flexDirection:"column",gap:1 }}>
            <svg viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1" width="13" height="13"><path d="M9 11l-4 4 2 2 4-4m3-3l2-2a2 2 0 0 0-3-3l-2 2M14 8l-5 5"/></svg>
            <span style={{ width:14,height:3,background:"#FBBF24",borderRadius:1 }}/>
          </button>
          <input ref={bgRef} type="color" defaultValue="#FBBF24" style={{ position:"absolute",opacity:0,width:0,height:0 }}
            onChange={e=>exec("hiliteColor",e.target.value)}/>
        </div>
        <div className="dc-tb-sep"/>

        {/* Alignment */}
        <button className="dc-tb-btn" onClick={()=>exec("justifyLeft")} title="Align left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
        </button>
        <button className="dc-tb-btn" onClick={()=>exec("justifyCenter")} title="Center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
        </button>
        <button className="dc-tb-btn" onClick={()=>exec("justifyRight")} title="Align right">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
        </button>
        <button className="dc-tb-btn" onClick={()=>exec("justifyFull")} title="Justify">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div className="dc-tb-sep"/>

        {/* Lists */}
        <button className="dc-tb-btn" onClick={()=>exec("insertUnorderedList")} title="Bullet list">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/></svg>
        </button>
        <button className="dc-tb-btn" onClick={()=>exec("insertOrderedList")} title="Numbered list">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
        </button>
        <div className="dc-tb-sep"/>

        {/* Indent */}
        <button className="dc-tb-btn" onClick={()=>exec("outdent")} title="Outdent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/><polyline points="11 4 7 8 11 12"/></svg>
        </button>
        <button className="dc-tb-btn" onClick={()=>exec("indent")} title="Indent">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/><polyline points="13 4 17 8 13 12"/></svg>
        </button>
        <div className="dc-tb-sep"/>

        {/* Insert image */}
        <button className="dc-tb-btn" onClick={insertImage} title="Insert image">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        </button>
      </div>

      {/* ── PAGES ── */}
      <div className="dc-editor-pages">
        {Array.from({length:pages},(_,pi)=>(
          <div key={pi} className="dc-page-sheet">
            <div className="dc-top-actions">
              {signature && (
                <button className="dc-top-act-btn" title="Insert Signature" onClick={insertSignature}
                  style={{ background:"#EFF6FF",color:"#2563EB",border:"1px solid #BFDBFE" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              )}
              {onDownload && (
                <button className="dc-top-act-btn" title="Download" onClick={onDownload}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
              )}
              <button className="dc-top-act-btn" title="Close" onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div
              ref={pi===0?editorRef:undefined}
              className="dc-page-content"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start typing..."
              spellCheck={false}
              style={{ fontFamily:font, fontSize:fsize+"px" }}
            />
          </div>
        ))}

        {/* Floating action bar */}
        <div className="dc-float-bar">
          <div className="dc-float-inner">
            <button className="dc-float-btn" onClick={()=>{}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 2 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              Template
            </button>
            <button className="dc-float-btn" onClick={()=>setShowTable(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
              Table
            </button>
            <button className="dc-float-btn" onClick={()=>setPages(p=>p+1)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              Add page
            </button>
          </div>
        </div>
      </div>

      {/* ── SAVE FAB ── */}
      <button className="dc-save-fab" onClick={()=>setShowSave(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Save
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   XLS EDITOR
══════════════════════════════════════════════════════════ */
const initCells = () => Array.from({length:ROWS_N},()=>Array(COLS_N).fill(""));

function XlsEditor({ doc, initialContent, onClose, onSave, onDownload }) {
  const [xlsTab, setXlsTab] = useState("Home");
  const [cells,  setCells]  = useState(() => {
    if (initialContent && Array.isArray(initialContent)) {
      return Array.from({length:ROWS_N}, (_,r) =>
        Array.from({length:COLS_N}, (_,c) => initialContent[r]?.[c] ?? "")
      );
    }
    return initCells();
  });
  const [sel,    setSel]    = useState({r:0,c:0});
  const [edit,   setEdit]   = useState(null);
  const [formulaVal, setFormulaVal] = useState("");
  const [bold,   setBold]   = useState(false);
  const [italic, setItalic] = useState(false);
  const [under,  setUnder]  = useState(false);
  const [align,  setAlign]  = useState("left");
  const [showSave, setShowSave] = useState(false);
  const editRef = useRef(null);

  useEffect(()=>{ setFormulaVal(cells[sel.r][sel.c]); },[sel,cells]);
  useEffect(()=>{ if(edit) editRef.current?.focus(); },[edit]);

  const cellRef = (r,c) => `${COLS[c]}${r+1}`;
  const updateCell = (r,c,val) => {
    setCells(prev=>prev.map((row,ri)=>ri===r?row.map((v,ci)=>ci===c?val:v):row));
  };
  const handleCellKey = (e,r,c) => {
    if(e.key==="Enter"){    setEdit(null); if(r<ROWS_N-1) setSel({r:r+1,c}); }
    if(e.key==="Tab"){      e.preventDefault(); setEdit(null); if(c<COLS_N-1) setSel({r,c:c+1}); }
    if(e.key==="Escape"){   setEdit(null); }
    if(e.key==="ArrowDown"&&!edit){  e.preventDefault(); if(r<ROWS_N-1) setSel({r:r+1,c}); }
    if(e.key==="ArrowUp"&&!edit){    e.preventDefault(); if(r>0) setSel({r:r-1,c}); }
    if(e.key==="ArrowRight"&&!edit){ e.preventDefault(); if(c<COLS_N-1) setSel({r,c:c+1}); }
    if(e.key==="ArrowLeft"&&!edit){  e.preventDefault(); if(c>0) setSel({r,c:c-1}); }
  };

  const HomeBar = () => (
    <div className="dc-xls-bar">
      {/* Clipboard */}
      <span className="dc-xl-label">Clipboard</span>
      <button className="dc-xl-btn" title="Cut"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg></button>
      <button className="dc-xl-btn" title="Copy"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button>
      <button className="dc-xl-btn" title="Paste"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg></button>
      <div className="dc-xl-sep"/>
      {/* Font */}
      <span className="dc-xl-label">Font</span>
      <select className="dc-xl-sel" style={{ maxWidth:90 }}>{FONTS.map(f=><option key={f}>{f}</option>)}</select>
      <select className="dc-xl-sel" style={{ maxWidth:44,marginLeft:2 }}>{FSIZES.map(s=><option key={s}>{s}</option>)}</select>
      <button className={`dc-xl-btn${bold?" on":""}`} style={{ fontWeight:700 }} onClick={()=>setBold(v=>!v)}>B</button>
      <button className={`dc-xl-btn${italic?" on":""}`} style={{ fontStyle:"italic" }} onClick={()=>setItalic(v=>!v)}>I</button>
      <button className={`dc-xl-btn${under?" on":""}`} style={{ textDecoration:"underline" }} onClick={()=>setUnder(v=>!v)}>U</button>
      <div className="dc-xl-sep"/>
      {/* Alignment */}
      <span className="dc-xl-label">Align</span>
      <button className={`dc-xl-btn${align==="left"?" on":""}`} onClick={()=>setAlign("left")} title="Left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
      </button>
      <button className={`dc-xl-btn${align==="center"?" on":""}`} onClick={()=>setAlign("center")} title="Center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
      </button>
      <button className={`dc-xl-btn${align==="right"?" on":""}`} onClick={()=>setAlign("right")} title="Right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div className="dc-xl-sep"/>
      {/* Number format */}
      <span className="dc-xl-label">Number</span>
      <select className="dc-xl-sel" style={{ maxWidth:80 }}>
        {["General","Number","Currency","Accounting","Date","Percentage","Fraction","Text"].map(n=><option key={n}>{n}</option>)}
      </select>
      <div className="dc-xl-sep"/>
      {/* Cells */}
      <span className="dc-xl-label">Cells</span>
      <button className="dc-xl-btn" title="Insert row" onClick={()=>{}}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button className="dc-xl-btn" title="Delete row" onClick={()=>{}}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>
  );

  const InsertBar = () => (
    <div className="dc-xls-bar">
      <span className="dc-xl-label">Tables</span>
      <button className="dc-xl-btn" style={{ width:"auto",padding:"0 8px",gap:4,fontSize:11.5 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
        Table
      </button>
      <div className="dc-xl-sep"/>
      <span className="dc-xl-label">Charts</span>
      <button className="dc-xl-btn" title="Bar chart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></button>
      <button className="dc-xl-btn" title="Line chart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></button>
      <button className="dc-xl-btn" title="Pie chart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg></button>
      <div className="dc-xl-sep"/>
      <span className="dc-xl-label">Illustrations</span>
      <button className="dc-xl-btn" title="Picture"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></button>
      <div className="dc-xl-sep"/>
      <span className="dc-xl-label">Links</span>
      <button className="dc-xl-btn" title="Hyperlink"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></button>
    </div>
  );

  const PlaceholderBar = ({tab}) => (
    <div className="dc-xls-bar">
      <span style={{ fontSize:12,color:"#9CA3AF",padding:"0 8px" }}>{tab} tools coming soon</span>
    </div>
  );

  const renderBar = () => {
    if(xlsTab==="Home")   return <HomeBar/>;
    if(xlsTab==="Insert") return <InsertBar/>;
    return <PlaceholderBar tab={xlsTab}/>;
  };

  return (
    <div className="dc-xls-wrap">
      {showSave && <SaveModal defaultName={doc?.name||"Untitled Spreadsheet"} docType="xls" onSave={(name) => { onSave(name, cells); setShowSave(false); }} onClose={()=>setShowSave(false)}/>}

      {/* Ribbon tabs */}
      <div className="dc-xls-tabs">
        {XLS_TABS.map(t=>(
          <button key={t} className={`dc-xls-tab${xlsTab===t?" active":""}`} onClick={()=>setXlsTab(t)}>{t}</button>
        ))}
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:6,paddingRight:6 }}>
          {onDownload && (
            <button className="dc-xl-btn" style={{ width:26,height:26 }} title="Download" onClick={onDownload}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
          )}
          <button className="dc-xl-btn" style={{ width:26,height:26 }} title="Close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {renderBar()}

      {/* Formula bar */}
      <div className="dc-formula-bar">
        <div className="dc-formula-ref">{cellRef(sel.r,sel.c)}</div>
        <input className="dc-formula-input" value={formulaVal}
          onChange={e=>{ setFormulaVal(e.target.value); updateCell(sel.r,sel.c,e.target.value); }}
          onFocus={()=>setEdit(sel)}
          placeholder="Enter value or formula..."/>
      </div>

      {/* Grid */}
      <div className="dc-grid-wrap" tabIndex={0}
        onKeyDown={e=>{
          if(!edit) handleCellKey(e,sel.r,sel.c);
          if(!edit && e.key.length===1 && !e.ctrlKey && !e.metaKey){
            setEdit(sel);
          }
          if(!edit && e.key==="Delete"){
            updateCell(sel.r,sel.c,""); setFormulaVal("");
          }
        }}>
        <table className="dc-xls-table">
          <thead>
            <tr>
              <th className="corner"/>
              {COLS.map(c=>(
                <th key={c} className={`col-h${sel.c===COLS.indexOf(c)?" sel-col":""}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row,ri)=>(
              <tr key={ri}>
                <td className={`rn${sel.r===ri?" sel-row":""}`}>{ri+1}</td>
                {row.map((val,ci)=>{
                  const isSel = sel.r===ri && sel.c===ci;
                  const isEdit = edit?.r===ri && edit?.c===ci;
                  return (
                    <td key={ci} className={`cell${isSel?" sel":""}`}
                      style={{ fontWeight:bold?"700":"400", fontStyle:italic?"italic":"normal", textDecoration:under?"underline":"none", textAlign:align }}
                      onClick={()=>{ setSel({r:ri,c:ci}); setEdit(null); }}
                      onDoubleClick={()=>{ setSel({r:ri,c:ci}); setEdit({r:ri,c:ci}); }}>
                      {isEdit
                        ? <input ref={editRef} value={val}
                            onChange={e=>{ updateCell(ri,ci,e.target.value); setFormulaVal(e.target.value); }}
                            onBlur={()=>setEdit(null)}
                            onKeyDown={e=>handleCellKey(e,ri,ci)}
                            style={{ width:"100%",height:"100%",border:"none",outline:"none",background:"transparent",fontFamily:"inherit",fontSize:"inherit",fontWeight:"inherit",fontStyle:"inherit",textDecoration:"inherit",textAlign:"inherit",padding:"0 2px" }}/>
                        : val
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save FAB */}
      <button className="dc-save-fab green" onClick={()=>setShowSave(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Save
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SIGNATURE PAD MODAL
   existingSignature — base64 PNG или null (новая подпись)
   onSave(base64)    — колбэк сохранения
══════════════════════════════════════════════════════════ */
function SignaturePadModal({ existingSignature, onSave, onClose }) {
  const { t } = useTranslation();
  const canvasRef   = useRef(null);
  const drawing     = useRef(false);
  const snapshots   = useRef([]);   // массив ImageData (история)
  const cursor      = useRef(-1);   // текущая позиция в истории

  const [canUndo,   setCanUndo]   = useState(false);
  const [canRedo,   setCanRedo]   = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [saving,    setSaving]    = useState(false);

  const W = 456, H = 200;

  const pushSnapshot = () => {
    const ctx = canvasRef.current.getContext("2d");
    const snap = ctx.getImageData(0, 0, W, H);
    snapshots.current = snapshots.current.slice(0, cursor.current + 1);
    snapshots.current.push(snap);
    cursor.current = snapshots.current.length - 1;
    setCanUndo(cursor.current > 0);
    setCanRedo(false);
  };

  const restoreAt = (idx) => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    ctx.putImageData(snapshots.current[idx], 0, 0);
    cursor.current = idx;
    setCanUndo(idx > 0);
    setCanRedo(idx < snapshots.current.length - 1);
    // проверяем есть ли непрозрачные пиксели
    const data = snapshots.current[idx].data;
    setHasStroke(data.some((v, i) => i % 4 === 3 && v > 0));
  };

  // Инициализация: загружаем существующую подпись или сохраняем пустой снимок
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        const snap = ctx.getImageData(0, 0, W, H);
        snapshots.current = [snap];
        cursor.current = 0;
        setCanUndo(false);
        setCanRedo(false);
        setHasStroke(true);
      };
      img.src = existingSignature;
    } else {
      const ctx = canvas.getContext("2d");
      const snap = ctx.getImageData(0, 0, W, H);
      snapshots.current = [snap];
      cursor.current = 0;
      setCanUndo(false);
      setCanRedo(false);
    }
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY };
  };

  const startDraw = (e) => {
    const ctx = canvasRef.current.getContext("2d");
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  };

  const doDraw = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStroke(true);
  };

  const endDraw = () => {
    if (!drawing.current) return;
    drawing.current = false;
    pushSnapshot();
  };

  const undo = () => { if (cursor.current > 0) restoreAt(cursor.current - 1); };
  const redo = () => { if (cursor.current < snapshots.current.length - 1) restoreAt(cursor.current + 1); };

  const clearAll = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, W, H);
    pushSnapshot();
    setHasStroke(false);
  };

  const handleSave = async () => {
    if (!hasStroke) { toast.error("Draw your signature first"); return; }
    const base64 = canvasRef.current.toDataURL("image/png");
    setSaving(true);
    try {
      await onSave(base64);
      onClose();
    } catch {
      toast.error("Failed to save signature");
    } finally {
      setSaving(false);
    }
  };

  const iconBtn = (disabled, onClick, title, children) => (
    <button onClick={onClick} disabled={disabled} title={title}
      style={{ display:"flex",alignItems:"center",gap:5,border:".5px solid #E5E7EB",borderRadius:7,padding:"5px 12px",fontSize:12,color:disabled?"#D1D5DB":"#374151",background:disabled?"#F9FAFB":"#fff",cursor:disabled?"not-allowed":"pointer",fontFamily:"inherit",transition:"all .15s" }}>
      {children}
    </button>
  );

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:"#fff",borderRadius:16,width:520,maxWidth:"95vw",boxShadow:"0 16px 60px rgba(0,0,0,0.2)",overflow:"hidden" }}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 22px 14px",borderBottom:".5px solid #F3F4F6" }}>
          <div style={{ display:"flex",alignItems:"center",gap:8 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" width="18" height="18"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            <span style={{ fontSize:15,fontWeight:700,color:"#111827" }}>{existingSignature ? t("documents.editSignatureTitle") : t("documents.drawSignatureTitle")}</span>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"#6B7280",padding:4,borderRadius:6,display:"flex",alignItems:"center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div style={{ padding:"20px 22px" }}>
          {/* Toolbar: Undo / Redo / Clear */}
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
            {iconBtn(!canUndo, undo, "Undo",
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>{t("common.back")}</>
            )}
            {iconBtn(!canRedo, redo, "Redo",
              <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>{t("common.forward")}</>
            )}
            <button onClick={clearAll}
              style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:5,border:".5px solid #FECACA",borderRadius:7,padding:"5px 12px",fontSize:12,color:"#EF4444",background:"#FFF5F5",cursor:"pointer",fontFamily:"inherit" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              {t("documents.clearAll")}
            </button>
          </div>

          {/* Canvas */}
          <div style={{ position:"relative",marginBottom:8 }}>
            <canvas ref={canvasRef} width={W} height={H}
              style={{ width:"100%",height:H,border:"1.5px dashed #D1D5DB",borderRadius:10,cursor:"crosshair",touchAction:"none",display:"block",background:"transparent" }}
              onMouseDown={startDraw} onMouseMove={doDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
              onTouchStart={startDraw} onTouchMove={doDraw} onTouchEnd={endDraw}/>
            {!hasStroke && (
              <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none" }}>
                <span style={{ fontSize:13,color:"#D1D5DB" }}>{t("documents.drawHere")}</span>
              </div>
            )}
          </div>
          <p style={{ fontSize:11,color:"#9CA3AF",marginBottom:18 }}>{t("documents.signatureTransparent")}</p>

          {/* Actions */}
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
            <button onClick={onClose}
              style={{ border:".5px solid #E5E7EB",borderRadius:8,padding:"9px 20px",fontSize:13,background:"#fff",color:"#6B7280",cursor:"pointer",fontFamily:"inherit" }}>
              {t("common.cancel")}
            </button>
            <button onClick={handleSave} disabled={!hasStroke || saving}
              style={{ background:(!hasStroke||saving)?"#93C5FD":"#2563EB",color:"#fff",border:"none",borderRadius:8,padding:"9px 24px",fontSize:13,fontWeight:500,cursor:(!hasStroke||saving)?"not-allowed":"pointer",fontFamily:"inherit" }}>
              {saving ? t("common.saving") : t("documents.saveSignature")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════ */
export default function Documents({ onGoToAuth, onNavigate }) {
  const { t } = useTranslation();
  const [sbOpen,          setSbOpen]         = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileView,     setProfileView]     = useState(null);
  const [view,            setView]            = useState("list");
  const [activeDoc,       setActiveDoc]       = useState(null);
  const [showTypeModal,   setShowTypeModal]   = useState(false);
  const [showSignModal,   setShowSignModal]   = useState(false); // false | "new" | "edit"
  const [showSigMenu,     setShowSigMenu]     = useState(false);
  const [page,            setPage]            = useState(1);
  const [saving,          setSaving]          = useState(false);
  const [wsDropOpen,      setWsDropOpen]      = useState(false);
  const wsDropRef = useRef(null);

  const user    = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!wsDropOpen) return;
    const h = (e) => { if (wsDropRef.current && !wsDropRef.current.contains(e.target)) setWsDropOpen(false); };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, [wsDropOpen]);

  const savedSig = user?.signature_data || null;

  const handleSaveSignature = async (base64) => {
    await updateProfile({ signature_data: base64 });
    const freshUser = await getMe();
    setUser(freshUser);
    toast.success("Signature saved");
  };

  const handleResetSignature = async () => {
    try {
      await updateProfile({ signature_data: null });
      const freshUser = await getMe();
      setUser(freshUser);
      toast.success("Signature removed");
    } catch {
      toast.error("Failed to remove signature");
    }
    setShowSigMenu(false);
  };

  const { data: docsData } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });
  const { data: workspacesData } = useQuery({
    queryKey: ["workspaces"],
    queryFn: getWorkspaces,
  });

  const docs = (docsData?.results ?? []).map(apiDocToUi);
  const PER_PAGE = 5;
  const totalPages = Math.max(1, Math.ceil(docs.length / PER_PAGE));
  const pagedDocs  = docs.slice((page-1)*PER_PAGE, page*PER_PAGE);

  const openDoc = async (d) => {
    if (d._apiId) {
      if (d._isPdf) {
        try {
          const { download_url } = await getDownloadUrl(d._apiId);
          setActiveDoc({ ...d, _pdfUrl: download_url });
          setView("pdf");
        } catch {
          toast.error("Failed to open PDF");
        }
        return;
      }
      // All other types open in editor
      try {
        const contentData = await getDocumentContent(d._apiId);
        const hasContent = contentData.content?.html || (Array.isArray(contentData.sheet_data) && contentData.sheet_data.length);
        if (hasContent) {
          setActiveDoc({ ...d, _content: contentData.content, _sheetData: contentData.sheet_data });
        } else {
          // No saved content yet — extract from S3 binary file
          try {
            const extracted = await extractDocumentContent(d._apiId);
            setActiveDoc({ ...d, _content: extracted.content ?? null, _sheetData: extracted.sheet_data ?? null });
          } catch {
            setActiveDoc({ ...d, _content: null, _sheetData: null });
          }
        }
      } catch {
        // Fallback: try extraction, else empty editor
        try {
          const extracted = await extractDocumentContent(d._apiId);
          setActiveDoc({ ...d, _content: extracted.content ?? null, _sheetData: extracted.sheet_data ?? null });
        } catch {
          setActiveDoc({ ...d, _content: null, _sheetData: null });
        }
      }
      setView(d.docType === "xls" ? "xls" : "docs");
      return;
    }
    setActiveDoc(d);
    setView(d.docType === "xls" ? "xls" : "docs");
  };

  const handleTypeSelect = (type) => {
    setShowTypeModal(false);
    const newDoc = {
      id: Date.now(), name:"Untitled", ext: type==="xls"?"xlsx":"docx",
      color: type==="xls"?"#16A34A":"#2563EB",
      bg:    type==="xls"?"#DCFCE7":"#DBEAFE",
      owner:"me", lastOpened:"Just now", size:"0 KB", date:"Today", docType:type,
    };
    setActiveDoc(newDoc);
    setView(type);
  };

  const handleUpload = async (file, title) => {
    setShowTypeModal(false);
    const workspaces = workspacesData?.results ?? [];
    const workspace = workspaces[0];
    if (!workspace) {
      toast.error("No workspace found — create a project first.");
      return;
    }
    setSaving(true);
    try {
      await serverUploadDocument(workspace.id, title, file);
      toast.success("Document uploaded");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (name, content) => {
    const isXls = activeDoc?.docType === "xls";

    // Existing API doc — save content in place
    if (activeDoc?._apiId) {
      setSaving(true);
      try {
        const payload = isXls
          ? { sheet_data: Array.isArray(content) ? content : null }
          : { content: { html: content } };
        await saveDocumentContent(activeDoc._apiId, payload);
        toast.success("Document saved");
        queryClient.invalidateQueries({ queryKey: ["documents"] });
        setView("list");
        setActiveDoc(null);
      } catch (e) {
        toast.error(e?.response?.data?.detail || "Failed to save document");
      } finally {
        setSaving(false);
      }
      return;
    }

    // New doc — upload via server-side endpoint (no S3 required)
    const workspaces = workspacesData?.results ?? [];
    const workspace = workspaces[0];
    if (!workspace) {
      toast.error("No workspace found — create a project first.");
      return;
    }
    setSaving(true);
    try {
      const ext = isXls ? "xlsx" : "docx";
      const fileName = `${name}.${ext}`;
      const rawText = isXls
        ? (Array.isArray(content) ? content.map(row => row.map(c => `"${(c||"").replace(/"/g,'""')}"`).join(",")).join("\n") : (content || " "))
        : (content || " ");
      const blob = new Blob([rawText], { type: "text/plain" });
      const file = new File([blob], fileName);

      const created = await serverUploadDocument(workspace.id, name, file);

      // Save editor content so it can be re-opened in-editor
      if (created?.id) {
        try {
          const payload = isXls
            ? { sheet_data: Array.isArray(content) ? content : null }
            : { content: { html: content } };
          await saveDocumentContent(created.id, payload);
        } catch (_) { /* non-critical */ }
      }

      toast.success("Document saved");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setView("list");
      setActiveDoc(null);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!activeDoc?._apiId) return;
    try {
      const { download_url } = await getDownloadUrl(activeDoc._apiId);
      const a = document.createElement("a");
      a.href = download_url;
      a.download = activeDoc.name || "document";
      a.click();
    } catch {
      toast.error("Failed to download document");
    }
  };

  const handleDelete = async (d) => {
    if (!d._apiId) return;
    try {
      await deleteDocument(d._apiId);
      queryClient.setQueryData(["documents"], (old) => {
        if (!old) return old;
        const results = Array.isArray(old) ? old : (old.results ?? []);
        const filtered = results.filter(doc => doc.id !== d._apiId);
        return Array.isArray(old) ? filtered : { ...old, results: filtered };
      });
      setPage(1);
      toast.success("Document deleted");
    } catch {
      toast.error("Failed to delete document");
    }
  };

  const breadcrumb = view==="list"
    ? ["Documents"]
    : ["Documents", activeDoc?.name||"New document"];

  return (
    <div className="dc-page">
      <style>{docCss}</style>
      {showTypeModal && <TypeSelectModal onSelect={handleTypeSelect} onUpload={handleUpload} onClose={()=>setShowTypeModal(false)}/>}
      {showSignModal && (
        <SignaturePadModal
          existingSignature={showSignModal === "edit" ? savedSig : null}
          onSave={handleSaveSignature}
          onClose={() => setShowSignModal(false)}
        />
      )}
      <ProfileController show={!!profileView} view={profileView} setView={setProfileView} onLogOut={onGoToAuth}/>

      {/* ── HEADER ── */}
      <header className="dc-topbar">
        <img src={logoImg} alt="Logo" style={{ height:30,flexShrink:0 }}/>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:13 }}>
          {breadcrumb.map((b,i)=>(
            <span key={i} style={{ display:"flex",alignItems:"center",gap:5 }}>
              {i>0&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="9 6 15 12 9 18"/></svg>}
              <span
                style={{ color:i===breadcrumb.length-1?"#111827":"#9CA3AF", fontWeight:i===breadcrumb.length-1?500:400, cursor:i<breadcrumb.length-1?"pointer":"default" }}
                onClick={()=>{ if(i<breadcrumb.length-1) setView("list"); }}>
                {b}
              </span>
            </span>
          ))}
        </div>
        <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:10 }}>
          <div onClick={()=>onNavigate&&onNavigate("notifications")} title="Notifications"
            style={{ position:"relative",width:30,height:30,borderRadius:8,border:"0.5px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"#fff" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <div style={{ position:"absolute",top:-2,right:-2,width:8,height:8,background:"#EF4444",borderRadius:"50%",border:"1.5px solid #fff" }}/>
          </div>
          <div style={{ position:"relative",display:"flex",alignItems:"center",gap:6 }}>
            <svg onClick={()=>setProfileMenuOpen(v=>!v)} style={{ cursor:"pointer" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            <div onClick={()=>setProfileMenuOpen(v=>!v)} title="Menu" style={{ position:"relative",width:30,height:30,cursor:"pointer",flexShrink:0 }}>
              <div style={{ width:30,height:30,borderRadius:"50%",overflow:"hidden" }}>
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                  : <svg viewBox="0 0 30 30" fill="none" width="30" height="30"><rect width="30" height="30" fill="#CBD5E1"/><circle cx="15" cy="11" r="5" fill="#94A3B8"/><ellipse cx="15" cy="26" rx="10" ry="6" fill="#94A3B8"/></svg>
                }
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
      <div className="dc-body">

        {/* ── SIDEBAR ── */}
        <aside className={`dc-sb${!sbOpen?" closed":""}`}>
          <div className="dc-profile">
            <button className="dc-toggle" onClick={()=>setSbOpen(v=>!v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="9 6 15 12 9 18"/></svg>
            </button>
            <div className="dc-av">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                : <svg viewBox="0 0 60 60" fill="none" width="60" height="60"><rect width="60" height="60" fill="#CBD5E1"/><circle cx="30" cy="22" r="10" fill="#94A3B8"/><ellipse cx="30" cy="52" rx="20" ry="12" fill="#94A3B8"/></svg>
              }
            </div>
          </div>
          <div className="dc-pinfo">
            <div style={{ fontSize:13,fontWeight:600,color:"#111827" }}>{user?.full_name || "User"}</div>
            <div style={{ fontSize:10.5,color:"#9CA3AF",marginTop:2 }}>{user?.email || ""}</div>
          </div>
          <div ref={wsDropRef} style={{ position:"relative" }}>
            <div className="dc-org" onClick={() => setWsDropOpen(v=>!v)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              <span style={{ fontSize:11.5,color:"#6B7280",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{workspacesData?.results?.[0]?.title || workspacesData?.[0]?.title || "Organization"}</span>
              <div style={{ width:7,height:7,borderRadius:"50%",background:"#22c55e",flexShrink:0 }}/>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                style={{ transform:wsDropOpen?"rotate(180deg)":"none",transition:"transform .2s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {wsDropOpen && (() => {
              const wsList = workspacesData?.results ?? (Array.isArray(workspacesData) ? workspacesData : []);
              return (
                <div style={{ position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#fff",borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",zIndex:200,overflow:"hidden",border:"1px solid #F3F4F6" }}>
                  <div style={{ padding:"6px 12px 4px",fontSize:10.5,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em" }}>
                    Switch Workplaces
                  </div>
                  {wsList.map((ws) => (
                    <div key={ws.id}
                      onClick={() => { setWsDropOpen(false); onNavigate?.(`organization/${ws.id}`); }}
                      style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 14px",fontSize:13,cursor:"pointer",color:"#374151",borderTop:".5px solid #F9FAFB" }}
                      onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{ width:22,height:22,borderRadius:6,background:"#DBEAFE",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                      </div>
                      <span style={{ flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{ws.title}</span>
                    </div>
                  ))}
                  <div style={{ borderTop:"1px solid #F3F4F6" }}>
                    <div onClick={() => { setWsDropOpen(false); onNavigate?.("projects"); }}
                      style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 14px",fontSize:13,cursor:"pointer",color:"#2563EB",fontWeight:500 }}
                      onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      Create Workplace
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className="dc-navlist">
            {NAV.map((n,i)=>(
              <button key={i} className={`dc-navitem${n.active?" active":""}`}
                onClick={()=>{
                  if(n.key==="inbox"     && onNavigate) onNavigate("inbox");
                  if(n.key==="projects"  && onNavigate) onNavigate("projects");
                  if(n.key==="analytics" && onNavigate) onNavigate("analytics");
                  if(n.key==="help"      && onNavigate) onNavigate("help");
                }}>
                {n.icon}
                <span className="dc-navlabel">{t(`nav.${n.key}`)}</span>
                <svg className="dc-navchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="9 6 15 12 9 18"/></svg>
              </button>
            ))}
          </div>
          <div className="dc-sbbottom">
            <button className="dc-addbtn" onClick={()=>setShowTypeModal(true)}>
              <svg className="dc-addbtn-plus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span className="dc-addbtn-label">{t("documents.newDocument")}</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="dc-main">
          <div className="dc-container">

            {/* LIST VIEW */}
            {view==="list" && (
              <>
                <div style={{ padding:"22px 24px 0",flexShrink:0 }}>
                  <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:16 }}>
                    <div>
                      <h1 style={{ fontSize:21,fontWeight:700,color:"#111827",marginBottom:3 }}>{t("documents.myDocuments")}</h1>
                      <p style={{ fontSize:13,color:"#9CA3AF" }}>{t("documents.manageFilesDesc")}</p>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:8,border:".5px solid #E5E7EB",borderRadius:8,padding:"7px 14px",background:"#F9FAFB",minWidth:240 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <input placeholder={t("documents.searchFiles")} style={{ border:"none",outline:"none",background:"transparent",fontSize:12.5,color:"#374151",fontFamily:"inherit",flex:1 }}/>
                    </div>
                  </div>
                  {/* Action cards */}
                  <div className="dc-action-cards">
                    <div className="dc-action-card" onClick={()=>setShowTypeModal(true)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" width="22" height="22"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      <span style={{ fontSize:13,fontWeight:500,color:"#2563EB" }}>{t("documents.newDocument")}</span>
                    </div>
                    <div className="dc-action-card sig" onClick={() => setShowSignModal("new")}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" width="22" height="22"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      <span style={{ fontSize:13,fontWeight:500,color:"#2563EB" }}>{t("documents.addSignature")}</span>
                    </div>

                    {savedSig && (
                      <div style={{ position:"relative" }}>
                        <div className="dc-action-card" style={{ borderColor:"#DBEAFE",background:"#EFF6FF" }}
                          onClick={() => setShowSigMenu(v => !v)}>
                          <img src={savedSig} alt="signature"
                            style={{ height:22,maxWidth:80,objectFit:"contain",filter:"invert(1) sepia(1) saturate(5) hue-rotate(190deg)" }}/>
                          <span style={{ fontSize:13,fontWeight:500,color:"#2563EB" }}>{t("documents.yourSignature")}</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>
                        </div>
                        {showSigMenu && (
                          <>
                            <div style={{ position:"fixed",inset:0,zIndex:900 }} onClick={() => setShowSigMenu(false)}/>
                            <div style={{ position:"absolute",top:"calc(100% + 6px)",left:0,background:"#fff",border:".5px solid #E5E7EB",borderRadius:10,boxShadow:"0 4px 18px rgba(0,0,0,.12)",zIndex:950,minWidth:160,padding:"6px 0",fontFamily:"inherit" }}>
                              <button onClick={() => { setShowSigMenu(false); setShowSignModal("edit"); }}
                                style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 14px",border:"none",background:"none",fontSize:13,color:"#374151",cursor:"pointer",fontFamily:"inherit",textAlign:"left" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                {t("common.edit")}
                              </button>
                              <button onClick={handleResetSignature}
                                style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 14px",border:"none",background:"none",fontSize:13,color:"#EF4444",cursor:"pointer",fontFamily:"inherit",textAlign:"left" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                {t("common.reset")}
                              </button>
                              <div style={{ height:".5px",background:"#F3F4F6",margin:"4px 0" }}/>
                              <button onClick={() => setShowSigMenu(false)}
                                style={{ width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 14px",border:"none",background:"none",fontSize:13,color:"#9CA3AF",cursor:"pointer",fontFamily:"inherit",textAlign:"left" }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                {t("common.cancel")}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Table or empty state */}
                {docs.length === 0 ? (
                  <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:40 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" width="56" height="56"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <div style={{ fontSize:15,fontWeight:600,color:"#374151" }}>{t("documents.noDocuments")}</div>
                    <div style={{ fontSize:13,color:"#9CA3AF" }}>{t("documents.noDocumentsDesc")}</div>
                    <button onClick={()=>setShowTypeModal(true)} style={{ marginTop:4,background:"#2563EB",color:"#fff",border:"none",borderRadius:8,padding:"9px 20px",fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit" }}>
                      + {t("documents.newDocument")}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="dc-list-scroll" style={{ marginTop:20 }}>
                      <table className="dc-table">
                        <thead>
                          <tr>
                            <th>{t("documents.colName")}</th>
                            <th>
                              <button className="dc-sort-btn">
                                {t("documents.colOwner")}
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>
                              </button>
                            </th>
                            <th>{t("documents.colLastOpened")}</th>
                            <th>{t("documents.colSize")}</th>
                            <th>{t("documents.colAction")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagedDocs.map(d=>(
                            <tr key={d.id} onClick={()=>{openDoc(d);}} style={{ cursor:"pointer" }}>
                              <td>
                                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                                  <div className="dc-file-icon" style={{ background:d.bg,color:d.color }}>{d.ext.toUpperCase()}</div>
                                  <div>
                                    <div style={{ fontWeight:500,fontSize:13,color:"#111827" }}>{d.name}.{d.ext}</div>
                                    <div style={{ fontSize:11,color:"#9CA3AF",marginTop:1 }}>{d.size} · {d.date}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ fontSize:13,color:"#374151" }}>{d.owner==="me"?"Me":d.owner}</td>
                              <td style={{ fontSize:13,color:"#374151" }}>{d.lastOpened}</td>
                              <td style={{ fontSize:13,color:"#374151" }}>{d.size}</td>
                              <td onClick={e=>e.stopPropagation()}>
                                <div style={{ display:"flex",gap:2 }}>
                                  <button className="dc-icon-action" title="Open" onClick={()=>openDoc(d)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </button>
                                  <button className="dc-icon-action" title="Delete" onClick={()=>handleDelete(d)} style={{ color:"#EF4444" }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    <div className="dc-pagination">
                      <span style={{ fontSize:12,color:"#9CA3AF" }}>
                        Showing {(page-1)*PER_PAGE+1}–{Math.min(page*PER_PAGE,docs.length)} of {docs.length}
                      </span>
                      <div style={{ display:"flex",gap:4,alignItems:"center" }}>
                        <button className="dc-pgbtn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ opacity:page===1?0.4:1 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        {Array.from({length:Math.min(totalPages,5)},(_,i)=>i+1).map(p=>(
                          <button key={p} className={`dc-pgbtn${p===page?" active":""}`} onClick={()=>setPage(p)}>{p}</button>
                        ))}
                        {totalPages>5 && <span style={{ fontSize:13,color:"#9CA3AF" }}>…</span>}
                        <button className="dc-pgbtn" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ opacity:page===totalPages?0.4:1 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="9 6 15 12 9 18"/></svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* DOCS EDITOR VIEW */}
            {view==="docs" && (
              <DocsEditor doc={activeDoc} initialContent={activeDoc?._content?.html || ""} onClose={()=>{ setView("list"); setActiveDoc(null); }} onSave={handleSave} onDownload={activeDoc?._apiId ? handleDownload : null} signature={savedSig}/>
            )}

            {/* XLS EDITOR VIEW */}
            {view==="xls" && (
              <XlsEditor doc={activeDoc} initialContent={activeDoc?._sheetData || null} onClose={()=>{ setView("list"); setActiveDoc(null); }} onSave={handleSave} onDownload={activeDoc?._apiId ? handleDownload : null}/>
            )}

            {/* PDF VIEWER */}
            {view==="pdf" && (
              <PdfViewer doc={activeDoc} onClose={()=>{ setView("list"); setActiveDoc(null); }} onDownload={handleDownload}/>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
