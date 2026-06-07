import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import useSidebarOpen from "./hooks/useSidebarOpen";
import Sidebar from "./components/Sidebar";
import MobileBottomNav from "./components/MobileBottomNav";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { getNotifications } from "./api/notifications";
import {
  getDocuments, getDocument, updateDocument,
  getComments, addComment as apiAddComment,
  updateComment as apiUpdateComment,
  deleteComment as apiDeleteComment,
  resolveComment as apiResolveComment,
  getSubtasks, createSubtask,
  updateSubtask as apiUpdateSubtask,
  deleteSubtask as apiDeleteSubtask,
  getAttachments, serverUploadAttachment,
  deleteAttachment as apiDeleteAttachment,
  serverUploadDocument, copyDocument, getSignatures,
  getBlockchain, startWorkflow,
  getVersions, getVersionDiff, verifySignature, approveDocument,
  serverUploadVersion, signDocx,
} from "./api/documents";
import { getWorkspaces, createWorkspace, getMembers, addMember } from "./api/workspaces";
import { getOrgMembers } from "./api/organizations";
import { getTasks } from "./api/tasks";
import { globalSearch } from "./api/search";
import {
  generalChat, chatWithDocument, getChatHistory,
  summarizeDocument, classifyDocument, embedDocument,
} from "./api/ai";
import useAuthStore from "./store/authStore";
import useOrgStore from "./store/orgStore";
import ProfileController, { ProfileMenu } from "./Profile";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import PdfSignModal from "./components/PdfSignModal";
import logoImg from "./assets/Group 2.svg";

/* ══════════════════════════════════════════════════════════
   CALENDAR HELPERS
══════════════════════════════════════════════════════════ */
const CAL_MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAL_MONTHS_S = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CAL_DAYS     = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
function calDays(y,m){ return new Date(y,m+1,0).getDate(); }
function calFirst(y,m){ return new Date(y,m,1).getDay(); }
function calSame(a,b){ return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function isoToDate(iso){ if(!iso)return null; const [y,m,d]=iso.split("-"); return new Date(+y,+m-1,+d); }
function dateToIso(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function fmtDeadline(iso){ if(!iso)return null; const [,m,d]=iso.split("-"); return `${CAL_MONTHS_S[+m-1]} ${+d}`; }
function fmtDateRange(startIso, endIso) {
  if (!startIso && !endIso) return null;
  if (!startIso) return fmtDeadline(endIso);
  if (!endIso)   return fmtDeadline(startIso);
  const [sy, sm, sd] = startIso.split("-");
  const [ey, em, ed] = endIso.split("-");
  if (sm === em && sy === ey) return `${+sd}–${+ed} ${CAL_MONTHS_S[+sm-1]}`;
  return `${+sd} ${CAL_MONTHS_S[+sm-1]}–${+ed} ${CAL_MONTHS_S[+em-1]}`;
}

const DL_NAV_BTN = { background:"none",border:"none",cursor:"pointer",color:"#6B7280",display:"flex",alignItems:"center",padding:4,borderRadius:6 };
const DL_CANCEL  = { flex:1,border:".5px solid #E5E7EB",borderRadius:8,padding:"8px",fontSize:13,cursor:"pointer",background:"#fff",fontFamily:"inherit",color:"#6B7280" };
const DL_SELECT  = { flex:2,background:"#2563EB",color:"#fff",border:"none",borderRadius:8,padding:"8px",fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:500 };

/* ══════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════ */
const css = `
  .dm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);z-index:9000;display:flex;align-items:flex-start;justify-content:center;padding:16px}
  .dm-modal{background:#fff;border-radius:16px;width:100%;max-width:1040px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;box-shadow:0 16px 60px rgba(0,0,0,0.2);overflow:hidden;margin-top:0}
  .dm-header{display:flex;align-items:center;gap:6px;padding:16px 20px;border-bottom:.5px solid #F3F4F6;flex-shrink:0;font-size:12px;color:#9CA3AF}
  .dm-header span.active{color:#2563EB}
  .dm-header-sep{color:#D1D5DB}
  .dm-close{margin-left:auto;background:none;border:none;cursor:pointer;color:#6B7280;display:flex;align-items:center;padding:4px;border-radius:6px}
  .dm-close:hover{background:#F3F4F6}
  .dm-body{display:flex;flex:1;overflow:hidden;min-height:0}
  .dm-left{flex:1;overflow-y:auto;padding:24px 28px;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent}
  .dm-left::-webkit-scrollbar{width:4px}
  .dm-left::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}
  .dm-right{width:280px;flex-shrink:0;border-left:.5px solid #F3F4F6;display:flex;flex-direction:column}
  .dm-title-row{display:flex;align-items:center;gap:8px;margin-bottom:18px}
  .dm-title{font-size:20px;font-weight:700;color:#111827;border:none;outline:none;background:none;font-family:inherit;flex:1;padding:0}
  .dm-title:focus{border-bottom:1.5px solid #2563EB}
  .dm-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-bottom:22px}
  .dm-meta-row{display:flex;align-items:center;gap:10px}
  .dm-meta-label{font-size:12.5px;color:#9CA3AF;width:78px;flex-shrink:0;display:flex;align-items:center;gap:6px}
  .dm-meta-btn{display:flex;align-items:center;gap:6px;border:.5px solid #E5E7EB;border-radius:8px;padding:5px 12px;font-size:12px;color:#374151;cursor:pointer;background:#F3F4F6;font-family:inherit;font-weight:500;transition:background .15s,border-color .15s}
  .dm-meta-btn:hover{background:#E5E7EB;border-color:#D1D5DB}
  .dm-tabs{display:flex;gap:0;border-bottom:.5px solid #E5E7EB;margin-bottom:20px}
  .dm-tab{display:flex;align-items:center;gap:5px;padding:8px 16px;font-size:13px;cursor:pointer;border:none;background:none;font-family:inherit;color:#9CA3AF;border-bottom:2px solid transparent;margin-bottom:-.5px;font-weight:500}
  .dm-tab.active{color:#2563EB;border-bottom-color:#2563EB}
  .dm-tab:hover:not(.active){color:#6B7280}
  .dm-section-title{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#374151;margin-bottom:10px}
  .dm-section{margin-bottom:22px}

  /* Description */
  .dm-desc-toolbar{display:flex;align-items:center;gap:2px;border:.5px solid #E5E7EB;border-bottom:none;border-radius:8px 8px 0 0;padding:6px 8px;background:#F9FAFB;flex-wrap:wrap}
  .dm-tb-btn{width:26px;height:26px;border:none;background:none;cursor:pointer;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#6B7280;font-size:12px;font-weight:700;font-family:inherit}
  .dm-tb-btn:hover{background:#E5E7EB}
  .dm-tb-sep{width:1px;height:18px;background:#E5E7EB;margin:0 3px;flex-shrink:0}
  .dm-desc-area{width:100%;min-height:90px;border:.5px solid #E5E7EB;border-top:none;border-radius:0 0 8px 8px;padding:10px 12px;font-size:13px;color:#374151;font-family:inherit;resize:vertical;outline:none;line-height:1.6}
  .dm-desc-area:focus{border-color:#2563EB}
  .dm-desc-counter{font-size:11px;color:#9CA3AF;text-align:right;margin-top:3px;display:flex;align-items:center;justify-content:flex-end;gap:3px}
  .dm-desc-view{font-size:13px;color:#374151;line-height:1.7;border:.5px solid transparent;border-radius:8px;padding:8px 0;cursor:text;min-height:36px;position:relative}
  .dm-desc-view:hover{border-color:#E5E7EB;padding:8px;background:#FAFAFA}
  .dm-desc-edit-btn{position:absolute;top:6px;right:6px;font-size:11px;color:#2563EB;background:#fff;border:.5px solid #DBEAFE;border-radius:5px;padding:2px 8px;cursor:pointer;font-family:inherit}

  /* Attachments */
  .dm-attach-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border:.5px solid #E5E7EB;border-radius:10px;margin-bottom:8px;background:#fff;transition:border-color .15s,box-shadow .15s;cursor:pointer}
  .dm-attach-item:hover{border-color:#BFDBFE;box-shadow:0 2px 8px rgba(37,99,235,.08)}
  .dm-attach-icon{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}
  .dm-attach-del{margin-left:auto;font-size:12px;color:#6B7280;cursor:pointer;border:none;background:none;font-family:inherit;padding:3px 8px;border-radius:6px;transition:background .15s,color .15s;flex-shrink:0}
  .dm-attach-del:hover{background:#FEE2E2;color:#EF4444}
  .dm-attach-link{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#2563EB;cursor:pointer;background:none;border:none;font-family:inherit;padding:6px 0;margin-top:2px;font-weight:500}
  .dm-attach-link:hover{text-decoration:underline}

  /* Attachment preview overlay */
  .dm-att-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:9800;display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(2px)}
  .dm-att-box{background:#fff;border-radius:14px;max-width:860px;width:100%;max-height:calc(100vh - 48px);display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,0.3)}
  .dm-att-head{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:.5px solid #F3F4F6;flex-shrink:0}
  .dm-att-head-icon{width:34px;height:34px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}
  .dm-att-head-title{flex:1;font-size:14px;font-weight:600;color:#111827;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .dm-att-head-meta{font-size:12px;color:#9CA3AF;white-space:nowrap}
  .dm-att-close{background:none;border:none;cursor:pointer;color:#9CA3AF;display:flex;align-items:center;padding:4px;border-radius:6px;transition:background .15s}
  .dm-att-close:hover{background:#F3F4F6;color:#374151}
  .dm-att-body{flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;min-height:200px;background:#F9FAFB}
  .dm-att-download{display:flex;flex-direction:column;align-items:center;gap:14px;padding:40px;text-align:center}
  .dm-att-dl-btn{background:#2563EB;color:#fff;border:none;border-radius:9px;padding:"10px 24px";font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:8px;transition:background .15s}
  .dm-att-dl-btn:hover{background:#1D4ED8}

  /* Subtasks */
  .dm-subtask-row{display:flex;align-items:center;gap:8px;padding:8px 10px;border:.5px solid #E5E7EB;border-radius:8px;margin-bottom:6px;background:#fff}
  .dm-subtask-num{font-size:12px;color:#9CA3AF;width:16px;flex-shrink:0;text-align:center}
  .dm-subtask-name{flex:1;font-size:13px;color:#374151;border:none;outline:none;background:none;font-family:inherit}
  .dm-subtask-name::placeholder{color:#D1D5DB}
  .dm-action-btn{display:flex;align-items:center;gap:4px;border:.5px solid #E5E7EB;border-radius:6px;padding:3px 8px;font-size:11.5px;color:#374151;cursor:pointer;background:#F9FAFB;font-family:inherit;white-space:nowrap}
  .dm-action-btn:hover{background:#EEF2FF;color:#2563EB;border-color:#DBEAFE}
  .dm-action-btn.edit-mode{background:#EDE9FE;color:#5B21B6;border-color:#C4B5FD}
  .dm-icon-btn{width:26px;height:26px;border:none;background:none;cursor:pointer;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;flex-shrink:0}
  .dm-icon-btn:hover{background:#F3F4F6;color:#374151}
  .dm-add-subtask{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#2563EB;cursor:pointer;background:none;border:none;font-family:inherit;padding:4px 0;margin-top:4px}
  .dm-deadline-btn{display:flex;align-items:center;gap:5px;border:1.5px solid #2563EB;border-radius:30px;padding:4px 10px;font-size:12px;color:#2563EB;cursor:pointer;background:#fff;font-family:inherit;font-weight:500;white-space:nowrap;flex-shrink:0}
  .dm-deadline-btn:hover{background:#EFF6FF}
  .dm-deadline-btn.empty{border-color:#E5E7EB;color:#9CA3AF}
  .dm-deadline-btn.empty:hover{border-color:#2563EB;color:#2563EB;background:#EFF6FF}

  /* Actions dropdown */
  .dm-action-dd{position:absolute;top:calc(100% + 4px);right:0;background:#fff;border:.5px solid #E5E7EB;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.1);z-index:9700;min-width:120px;padding:4px 0}
  .dm-action-dd-item{display:flex;align-items:center;gap:7px;padding:7px 12px;font-size:12.5px;color:#374151;cursor:pointer;font-family:inherit;background:none;border:none;width:100%;text-align:left;white-space:nowrap}
  .dm-action-dd-item:hover{background:#F3F4F6}
  .dm-action-dd-item.complete{color:#16A34A}
  .dm-action-dd-item.complete:hover{background:#F0FDF4}
  .dm-subtask-row.completed{background:#F0FDF4;border-color:#A7F3D0}
  .dm-subtask-done{color:#16A34A;font-size:12px;font-weight:500;display:flex;align-items:center;gap:4px;white-space:nowrap;flex-shrink:0}

  /* Assignee picker */
  .dm-assignee-popup{position:absolute;top:calc(100% + 4px);right:0;background:#fff;border:.5px solid #E5E7EB;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.12);z-index:9500;width:200px;padding:8px 0}
  .dm-assignee-item{display:flex;align-items:center;gap:8px;padding:7px 12px;cursor:pointer;font-size:12.5px;color:#374151}
  .dm-assignee-item:hover{background:#EEF2FF}
  .dm-assignee-item.selected{color:#2563EB;font-weight:500}
  .dm-mini-av{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0}

  /* Workflow */
  .wf-step{display:flex;gap:14px;margin-bottom:16px}
  .wf-line-col{display:flex;flex-direction:column;align-items:center;gap:0;flex-shrink:0}
  .wf-dot{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:2px solid #E5E7EB}
  .wf-dot.done{background:#22c55e;border-color:#22c55e}
  .wf-dot.active{background:#2563EB;border-color:#2563EB}
  .wf-dot.pending{background:#fff;border-color:#D1D5DB}
  .wf-connector{width:2px;flex:1;min-height:24px;background:#E5E7EB;margin:2px 0}
  .wf-connector.done{background:#22c55e}
  .wf-card{flex:1;border:.5px solid #E5E7EB;border-radius:10px;padding:12px 14px;margin-bottom:0}
  .wf-card.active{border-color:#2563EB;border-width:1.5px}
  .wf-card.pending{opacity:.6}
  .wf-progress{height:4px;background:#E5E7EB;border-radius:2px;margin-top:8px;overflow:hidden}
  .wf-progress-fill{height:100%;background:#2563EB;border-radius:2px}

  /* Activity */
  .dm-activity-header{padding:14px 16px 10px;border-bottom:.5px solid #F3F4F6;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
  .dm-activity-body{flex:1;overflow-y:auto;padding:12px 16px;scrollbar-width:thin}
  .dm-activity-date{font-size:11px;color:#9CA3AF;font-weight:500;margin-bottom:6px}
  .dm-activity-item{display:flex;align-items:flex-start;gap:8px;margin-bottom:8px;font-size:12px;color:#374151}
  .dm-activity-dot{width:6px;height:6px;border-radius:50%;background:#D1D5DB;flex-shrink:0;margin-top:4px}
  .dm-activity-time{font-size:11px;color:#9CA3AF;margin-left:auto;white-space:nowrap;flex-shrink:0}
  .dm-show-more{font-size:12px;color:#2563EB;cursor:pointer;background:none;border:none;font-family:inherit;padding:2px 0;margin-bottom:10px}

  /* Comment */
  .dm-comment-box{border-top:.5px solid #F3F4F6;padding:12px 16px;flex-shrink:0}
  .dm-comment-input{width:100%;border:.5px solid #E5E7EB;border-radius:8px;padding:8px 12px;font-size:12.5px;color:#374151;font-family:inherit;outline:none;resize:none;min-height:38px;max-height:80px}
  .dm-comment-input:focus{border-color:#2563EB}
  .dm-comment-actions{display:flex;align-items:center;gap:8px;margin-top:6px}
  .dm-comment-send{margin-left:auto;width:30px;height:30px;border-radius:8px;background:#2563EB;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .dm-comment-send:hover{background:#1D4ED8}
  @keyframes aiDot{0%{opacity:.3;transform:scale(.8)}100%{opacity:1;transform:scale(1.1)}}

  /* Status dropdown */
  .dm-status-popup{position:fixed;background:#fff;border:.5px solid #E5E7EB;border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,.12);z-index:9600;width:160px;padding:6px 0}
  .dm-status-item{padding:8px 14px;font-size:12.5px;cursor:pointer;color:#374151}
  .dm-status-item:hover{background:#EEF2FF;color:#2563EB}

  /* ── AI Tools tab ── */
  .ai-card{border:1px solid #E5E7EB;border-radius:12px;padding:16px;margin-bottom:16px;background:#fff}
  .ai-card-head{display:flex;align-items:center;gap:9px;margin-bottom:4px}
  .ai-card-ic{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ai-card-title{font-size:13.5px;font-weight:600;color:#111827}
  .ai-card-sub{font-size:11.5px;color:#9CA3AF;margin-top:1px}
  .ai-btn{display:inline-flex;align-items:center;gap:6px;border:none;border-radius:8px;padding:7px 14px;font-size:12.5px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;transition:opacity .15s,background .15s}
  .ai-btn:disabled{opacity:.6;cursor:default}
  .ai-btn-violet{background:#7C3AED;color:#fff}
  .ai-btn-violet:hover:not(:disabled){background:#6D28D9}
  .ai-btn-blue{background:#2563EB;color:#fff}
  .ai-btn-blue:hover:not(:disabled){background:#1D4ED8}
  .ai-btn-ghost{background:#F5F3FF;color:#7C3AED;border:1px solid #DDD6FE}
  .ai-btn-ghost:hover:not(:disabled){background:#EDE9FE}
  .ai-summary-box{margin-top:12px;background:#F5F3FF;border:1px solid #E9D5FF;border-radius:10px;padding:13px 15px;font-size:12.5px;color:#374151;line-height:1.65}
  .ai-keypoint{display:flex;align-items:flex-start;gap:8px;margin-top:7px;font-size:12.5px;color:#374151;line-height:1.5}
  .ai-keypoint svg{flex-shrink:0;margin-top:3px}
  .ai-type-badge{display:inline-flex;align-items:center;gap:6px;background:#EFF6FF;border:1px solid #BFDBFE;color:#1D4ED8;border-radius:999px;padding:5px 12px;font-size:12.5px;font-weight:600}
  .ai-conf-bar{height:5px;background:#E5E7EB;border-radius:3px;overflow:hidden;flex:1;min-width:60px}
  .ai-conf-fill{height:100%;background:linear-gradient(90deg,#3B82F6,#8B5CF6);border-radius:3px;transition:width .4s}
  .ai-ver-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid #E5E7EB;border-radius:9px;margin-bottom:7px;background:#fff;transition:border-color .15s}
  .ai-ver-row:hover{border-color:#C4B5FD}
  .ai-ver-num{width:26px;height:26px;border-radius:7px;background:#EEF2FF;color:#4F46E5;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ai-diff-stat{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;padding:2px 7px;border-radius:6px}
  .ai-diff-add{background:#DCFCE7;color:#15803D}
  .ai-diff-del{background:#FEE2E2;color:#B91C1C}
  .ai-spin{width:13px;height:13px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:aiSpin .7s linear infinite;flex-shrink:0}
  .ai-spin.violet{border:2px solid #DDD6FE;border-top-color:#7C3AED}
  @keyframes aiSpin{to{transform:rotate(360deg)}}

  /* ── Signature verification (Workflow tab) ── */
  .sig-row{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid #E5E7EB;border-radius:9px;margin-bottom:7px;background:#fff}
  .sig-av{width:28px;height:28px;border-radius:50%;background:#DBEAFE;color:#2563EB;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .sig-verify-btn{display:inline-flex;align-items:center;gap:5px;border:1px solid #E5E7EB;background:#F9FAFB;color:#374151;border-radius:7px;padding:4px 10px;font-size:11.5px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;flex-shrink:0}
  .sig-verify-btn:hover{background:#EEF2FF;color:#2563EB;border-color:#DBEAFE}
  .sig-verified{display:flex;flex-direction:column;gap:3px;margin-top:6px;background:#F0FDF4;border:1px solid #A7F3D0;border-radius:8px;padding:9px 12px;font-size:11px;color:#166534}
  .sig-verified-row{display:flex;gap:6px}
  .sig-verified-row b{color:#15803D;font-weight:600;min-width:70px}

  button:hover{opacity:unset}
`;

/* ══════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════ */
const STATUSES = ["TO DO", "IN PROGRESS", "COMPLETED", "RETURNED"];
const PRIORITIES = ["Empty", "Low", "Medium", "High", "Critical"];
const AV_COLORS_MEMBERS = ["#60A5FA","#F87171","#34D399","#FBBF24","#A78BFA","#F472B6","#FB923C"];

const priToApi = (p) => (p === "Empty" ? null : p.toLowerCase());
const priFromApi = (p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : "Empty");

const FILE_TYPE_INFO = {
  pdf:  { ext:"PDF", color:"#EF4444", bg:"#FEE2E2" },
  doc:  { ext:"DOC", color:"#2563EB", bg:"#DBEAFE" },
  docx: { ext:"DOC", color:"#2563EB", bg:"#DBEAFE" },
  xls:  { ext:"XLS", color:"#16A34A", bg:"#DCFCE7" },
  xlsx: { ext:"XLS", color:"#16A34A", bg:"#DCFCE7" },
  ppt:  { ext:"PPT", color:"#EA580C", bg:"#FFEDD5" },
  pptx: { ext:"PPT", color:"#EA580C", bg:"#FFEDD5" },
  txt:  { ext:"TXT", color:"#6366F1", bg:"#EEF2FF" },
};
const fileTypeInfo = (ft) =>
  FILE_TYPE_INFO[ft?.toLowerCase()] || { ext:(ft?.toUpperCase()||"FILE").slice(0,4), color:"#6366F1", bg:"#EEF2FF" };

const DOC_STATUS_DISPLAY = { draft:"TO DO", review:"IN PROGRESS", signed:"COMPLETED", archived:"RETURNED" };
const DISPLAY_TO_API_STATUS = { "TO DO":"draft", "IN PROGRESS":"review", "COMPLETED":"signed", "RETURNED":"archived" };
const docStatusDisplay = (s) => DOC_STATUS_DISPLAY[s] || s?.toUpperCase() || "TO DO";
const docStatusClass = (s) => {
  const d = docStatusDisplay(s);
  return d === "IN PROGRESS" ? "ds-prog" : d === "COMPLETED" ? "ds-done" : "ds-todo";
};

/* ══════════════════════════════════════════════════════════
   MINI AVATAR
══════════════════════════════════════════════════════════ */
function MiniAv({ member, size=22 }) {
  return (
    <div className="dm-mini-av" style={{ width:size, height:size, background:member.color, fontSize: size*0.4 }}>
      {member.initials}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ASSIGNEE PICKER POPUP
══════════════════════════════════════════════════════════ */
function AssigneePicker({ selected, onToggle, onClose, members = [], style }) {
  const ref = useRef(null);
  // Закрытие по клику вне поповера
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Рендерим в body через портал — чтобы position:fixed считался от окна,
  // а не от трансформируемого контейнера модалки.
  return createPortal(
    <div className="dm-assignee-popup" ref={ref} style={style} onMouseDown={e=>e.stopPropagation()}>
      <div style={{ padding:"6px 12px 6px", fontSize:11, color:"#9CA3AF", fontWeight:500 }}>Назначить участника проекта</div>
      {members.length === 0 && <div style={{ padding:"8px 12px", fontSize:12, color:"#9CA3AF", lineHeight:1.4 }}>Сначала добавьте участников в проект</div>}
      {members.map(m => (
        <div key={m.id} className={`dm-assignee-item${selected?.id===m.id?" selected":""}`}
          onClick={()=>{ onToggle(m); onClose(); }}>
          <MiniAv member={m}/>
          {m.name}
          {selected?.id===m.id && <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" width="13" height="13" style={{ marginLeft:"auto" }}><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
      ))}
    </div>,
    document.body
  );
}

/* ══════════════════════════════════════════════════════════
   STATUS PICKER
══════════════════════════════════════════════════════════ */
function StatusPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [pos, setPos] = useState({ top:0, left:0 });

  const openPicker = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(v=>!v);
  };

  const colors = { "TO DO":"#6B7280", "IN PROGRESS":"#2563EB", "COMPLETED":"#16A34A", "RETURNED":"#EA580C" };

  return (
    <>
      <button ref={btnRef} className="dm-meta-btn" onClick={openPicker}
        style={{ color: colors[value]||"#374151", fontWeight:600 }}>
        {value}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="9 6 15 12 9 18"/></svg>
      </button>
      {open && (
        <>
          <div style={{ position:"fixed",inset:0,zIndex:9500 }} onClick={()=>setOpen(false)}/>
          <div className="dm-status-popup" style={{ top:pos.top, left:pos.left }}>
            {STATUSES.map(s=>(
              <div key={s} className="dm-status-item" onClick={()=>{ onChange(s); setOpen(false); }}
                style={{ color: s===value ? colors[s]||"#2563EB":"#374151", fontWeight: s===value?600:400 }}>
                {s}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   DESCRIPTION EDITOR
══════════════════════════════════════════════════════════ */
function DescEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const MAX = 512;

  const exec = (cmd, val) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val || null);
    const txt = editorRef.current?.innerText || "";
    setCharCount(txt.length);
    onChange(editorRef.current?.innerHTML || "");
  };

  const onInput = () => {
    const txt = editorRef.current?.innerText || "";
    setCharCount(txt.length);
    onChange(editorRef.current?.innerHTML || "");
  };

  // Set initial content when entering edit mode
  const startEditing = () => {
    setEditing(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = value || "";
        editorRef.current.focus();
        setCharCount(editorRef.current.innerText.length);
      }
    }, 0);
  };

  const toolbarBtns = [
    { label:"H1", cmd:()=>exec("formatBlock","H1") },
    { label:"H2", cmd:()=>exec("formatBlock","H2") },
    "sep",
    { label:"B",  cmd:()=>exec("bold"),          style:{fontWeight:700} },
    { label:"U",  cmd:()=>exec("underline"),      style:{textDecoration:"underline"} },
    { label:"S",  cmd:()=>exec("strikeThrough"),  style:{textDecoration:"line-through"} },
    "sep",
    { label:"≡",  cmd:()=>exec("justifyLeft") },
    { label:"≣",  cmd:()=>exec("insertOrderedList") },
    { label:"☰",  cmd:()=>exec("insertUnorderedList") },
    "sep",
    { label:"@",  cmd:()=>{} },
    { label:"🔗", cmd:()=>{ const url = prompt("Enter URL:"); if(url) exec("createLink", url); } },
    { label:"</>",cmd:()=>exec("formatBlock","PRE"), style:{fontFamily:"monospace",fontSize:11} },
  ];

  if (!editing) {
    const empty = !value || value === "<br>" || value === "";
    return (
      <div className="dm-desc-view" onClick={startEditing} style={{ position:"relative" }}>
        {empty
          ? <span style={{ color:"#D1D5DB", fontSize:13 }}>Add a description…</span>
          : <div dangerouslySetInnerHTML={{ __html: value }}
              style={{ fontSize:13, lineHeight:1.7, color:"#374151" }}/>
        }
        {!empty && (
          <button className="dm-desc-edit-btn"
            onClick={e=>{ e.stopPropagation(); startEditing(); }}>
            Edit
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="dm-desc-toolbar">
        {toolbarBtns.map((b,i) => b==="sep"
          ? <div key={i} className="dm-tb-sep"/>
          : <button key={i} className="dm-tb-btn" title={b.label}
              onMouseDown={e=>{ e.preventDefault(); b.cmd(); }}
              style={b.style || {}}>
              {b.label}
            </button>
        )}
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        style={{
          minHeight:90, outline:"none", padding:"10px 12px",
          border:".5px solid #2563EB", borderTop:"none",
          borderRadius:"0 0 8px 8px", fontSize:13, color:"#374151",
          lineHeight:1.7, fontFamily:"inherit", cursor:"text",
        }}
      />
      <div className="dm-desc-counter">
        <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="11" height="11"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {charCount}/{MAX}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   DEADLINE PICKER (single-date calendar popup)
══════════════════════════════════════════════════════════ */
function DeadlinePicker({ value, onChange, onClose, pos, maxDate }) {
  const today   = new Date();
  const init    = isoToDate(value) || today;
  const [vm, setVm]         = useState(init.getMonth());
  const [vy, setVy]         = useState(init.getFullYear());
  const [sel, setSel]       = useState(isoToDate(value));
  const [picker, setPicker] = useState(null); // "month"|"year"
  const ref = useRef(null);
  const PICKER_H = 320;

  // Flip above the button if not enough space below
  const top = pos.top + PICKER_H > window.innerHeight
    ? pos.top - PICKER_H - (pos.buttonHeight || 32) - 6
    : pos.top;
  const left = Math.min(pos.left, window.innerWidth - 300);

  const maxD = maxDate ? isoToDate(maxDate) : null;
  const isDisabled = (d) => maxD && new Date(vy, vm, d) > maxD;

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const totalDays = calDays(vy, vm);
  const firstDay  = calFirst(vy, vm);
  const cells     = [...Array(firstDay).fill(null), ...Array.from({length:totalDays},(_,i)=>i+1)];

  const prevM = () => vm===0 ? (setVm(11), setVy(y=>y-1)) : setVm(v=>v-1);
  const nextM = () => vm===11 ? (setVm(0), setVy(y=>y+1)) : setVm(v=>v+1);

  const doSelect = () => {
    if (sel) onChange(dateToIso(sel));
    onClose();
  };

  const yrStart = vy - (vy % 12);

  return (
    <div ref={ref} style={{ position:"fixed", top, left, zIndex:99999,
      background:"#fff", borderRadius:14, padding:16, width:292,
      boxShadow:"0 8px 40px rgba(0,0,0,0.22)", fontFamily:"'Gilroy','Segoe UI',sans-serif" }}>

      {/* Month/Year overlay */}
      {picker && (
        <>
          <div onClick={()=>setPicker(null)}
            style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.12)",borderRadius:14,zIndex:1 }}/>
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",
            background:"#fff",borderRadius:14,padding:16,zIndex:2,width:264,boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
              <span style={{ fontSize:13,fontWeight:600,color:"#111827" }}>
                {picker==="month" ? "Select Month" : "Select Year"}
              </span>
              {picker==="year" && (
                <div style={{ display:"flex",gap:4 }}>
                  <button onClick={()=>setVy(y=>y-12)} style={DL_NAV_BTN}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="15 18 9 12 15 6"/></svg></button>
                  <button onClick={()=>setVy(y=>y+12)} style={DL_NAV_BTN}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="9 6 15 12 9 18"/></svg></button>
                </div>
              )}
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6 }}>
              {picker==="month"
                ? CAL_MONTHS_S.map((mn,i) => (
                    <div key={mn} onClick={()=>{setVm(i);setPicker(null);}}
                      style={{ padding:"8px 4px",textAlign:"center",fontSize:12.5,cursor:"pointer",borderRadius:20,
                        border:i===vm?"1.5px solid #2563EB":"1.5px solid transparent",
                        color:i===vm?"#2563EB":"#374151",fontWeight:i===vm?600:400 }}>
                      {mn}
                    </div>))
                : Array.from({length:12},(_,i)=>yrStart+i).map(y => (
                    <div key={y} onClick={()=>{setVy(y);setPicker(null);}}
                      style={{ padding:"8px 4px",textAlign:"center",fontSize:12.5,cursor:"pointer",borderRadius:20,
                        border:y===vy?"1.5px solid #2563EB":"1.5px solid transparent",
                        color:y===vy?"#2563EB":"#374151",fontWeight:y===vy?600:400 }}>
                      {y}
                    </div>))
              }
            </div>
            <div style={{ display:"flex",gap:8,marginTop:12 }}>
              <button onClick={()=>setPicker(null)} style={DL_CANCEL}>Cancel</button>
              <button onClick={()=>setPicker(null)} style={DL_SELECT}>Done</button>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12 }}>
        <button onClick={prevM} style={DL_NAV_BTN}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ display:"flex",gap:6 }}>
          <button onClick={()=>setPicker("month")}
            style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"#111827",display:"flex",alignItems:"center",gap:3 }}>
            {CAL_MONTHS[vm]}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button onClick={()=>setPicker("year")}
            style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"#111827",display:"flex",alignItems:"center",gap:3 }}>
            {vy}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <button onClick={nextM} style={DL_NAV_BTN}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      </div>

      {/* Day grid */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2 }}>
        {CAL_DAYS.map(d => (
          <div key={d} style={{ fontSize:10,color:"#9CA3AF",textAlign:"center",padding:"3px 0",fontWeight:500 }}>{d}</div>
        ))}
        {cells.map((day, i) => day === null ? <div key={`e${i}`}/> : (
          <div key={day}
            onClick={() => { if (!isDisabled(day)) setSel(new Date(vy,vm,day)); }}
            style={{
              width:34,height:34,margin:"1px auto",display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:12.5,userSelect:"none",borderRadius:"50%",
              ...(isDisabled(day)
                ? { color:"#D1D5DB",cursor:"not-allowed" }
                : calSame(new Date(vy,vm,day), sel)
                  ? { background:"#2563EB",color:"#fff",cursor:"pointer" }
                  : calSame(new Date(vy,vm,day), today)
                    ? { boxShadow:"0 0 0 1.5px #2563EB",color:"#2563EB",fontWeight:600,cursor:"pointer" }
                    : { color:"#374151",cursor:"pointer" })
            }}>
            {day}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display:"flex",gap:8,marginTop:14 }}>
        <button onClick={() => { onChange(null); onClose(); }} style={DL_CANCEL}>Clear</button>
        <button onClick={doSelect} style={DL_SELECT}>Select</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   RANGE DEADLINE PICKER (start–end date)
══════════════════════════════════════════════════════════ */
function RangeDeadlinePicker({ startValue, endValue, onChange, onClose, pos, minDate, maxDate }) {
  const today    = new Date();
  const initBase = isoToDate(endValue) || isoToDate(startValue) || today;
  const [vm, setVm]           = useState(initBase.getMonth());
  const [vy, setVy]           = useState(initBase.getFullYear());
  const [rangeStart, setRS]   = useState(isoToDate(startValue));
  const [rangeEnd,   setRE]   = useState(isoToDate(endValue));
  const [phase, setPhase]     = useState(startValue ? "end" : "start");
  const minD = isoToDate(minDate);
  const maxD = isoToDate(maxDate);
  const ref = useRef(null);

  const PICKER_H = 350;
  const top  = pos.top + PICKER_H > window.innerHeight
    ? pos.top - PICKER_H - (pos.buttonHeight || 32) - 6
    : pos.top;
  const left = Math.max(8, Math.min(pos.left, window.innerWidth - 310));

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const prevM = () => vm === 0 ? (setVm(11), setVy(y => y - 1)) : setVm(v => v - 1);
  const nextM = () => vm === 11 ? (setVm(0), setVy(y => y + 1)) : setVm(v => v + 1);

  const totalDays = calDays(vy, vm);
  const firstDay  = calFirst(vy, vm);
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];

  const isDisabled = (day) => {
    const d = new Date(vy, vm, day);
    if (minD && d < minD) return true;
    if (maxD && d > maxD) return true;
    return false;
  };

  const clickDay = (day) => {
    if (isDisabled(day)) return;
    const d = new Date(vy, vm, day);
    if (phase === "start" || !rangeStart) {
      setRS(d); setRE(null); setPhase("end");
    } else {
      if (d < rangeStart) { setRE(rangeStart); setRS(d); }
      else                  setRE(d);
      setPhase("done");
    }
  };

  const isS   = (day) => calSame(new Date(vy, vm, day), rangeStart);
  const isE   = (day) => calSame(new Date(vy, vm, day), rangeEnd);
  const inR   = (day) => rangeStart && rangeEnd && new Date(vy, vm, day) > rangeStart && new Date(vy, vm, day) < rangeEnd;
  const isTod = (day) => calSame(new Date(vy, vm, day), today);

  const doSelect = () => {
    const start = rangeStart ? dateToIso(rangeStart) : null;
    const end   = rangeEnd   ? dateToIso(rangeEnd)   : start;
    onChange({ start, end });
    onClose();
  };

  const doClear = () => { setRS(null); setRE(null); setPhase("start"); onChange({ start: null, end: null }); onClose(); };

  return createPortal(
    <div ref={ref} style={{ position:"fixed", top, left, zIndex:99999,
      background:"#fff", borderRadius:14, padding:16, width:300,
      boxShadow:"0 8px 40px rgba(0,0,0,0.22)", fontFamily:"'Gilroy','Segoe UI',sans-serif" }}>

      {/* Range summary bar */}
      <div style={{ display:"flex", gap:8, marginBottom:12, background:"#F9FAFB", borderRadius:8, padding:"7px 10px" }}>
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontSize:10, color:"#9CA3AF", fontWeight:600, letterSpacing:.4, marginBottom:2 }}>FROM</div>
          <div style={{ fontSize:13, fontWeight:700,
            color: phase==="start" ? "#2563EB" : rangeStart ? "#111827" : "#D1D5DB" }}>
            {rangeStart ? `${rangeStart.getDate()} ${CAL_MONTHS_S[rangeStart.getMonth()]}` : "–"}
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", color:"#D1D5DB", fontSize:16 }}>→</div>
        <div style={{ flex:1, textAlign:"center" }}>
          <div style={{ fontSize:10, color:"#9CA3AF", fontWeight:600, letterSpacing:.4, marginBottom:2 }}>TO</div>
          <div style={{ fontSize:13, fontWeight:700,
            color: phase==="end" ? "#2563EB" : rangeEnd ? "#111827" : "#D1D5DB" }}>
            {rangeEnd ? `${rangeEnd.getDate()} ${CAL_MONTHS_S[rangeEnd.getMonth()]}` : "–"}
          </div>
        </div>
      </div>

      {/* Hint */}
      <div style={{ fontSize:11, color:"#9CA3AF", textAlign:"center", marginBottom:10 }}>
        {phase === "start" ? "Click start date" : phase === "end" ? "Click end date" : ""}
      </div>

      {/* Month nav */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
        <button onClick={prevM} style={DL_NAV_BTN}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize:13, fontWeight:600, color:"#111827" }}>{CAL_MONTHS[vm]} {vy}</span>
        <button onClick={nextM} style={DL_NAV_BTN}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
      </div>

      {/* Day labels */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:2 }}>
        {CAL_DAYS.map(d => (
          <div key={d} style={{ fontSize:10, color:"#9CA3AF", textAlign:"center", fontWeight:500 }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`}/>;
          const s = isS(day), e = isE(day), r = inR(day), t = isTod(day), dis = isDisabled(day);
          return (
            <div key={day} onClick={() => clickDay(day)}
              style={{
                width:36, height:36, margin:"1px auto",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:12.5, userSelect:"none", cursor: dis ? "not-allowed" : "pointer", borderRadius:"50%",
                background: dis ? "transparent" : (s || e) ? "#2563EB" : r ? "#EFF6FF" : "transparent",
                color:      dis ? "#D1D5DB"     : (s || e) ? "#fff"    : r ? "#2563EB" : t ? "#2563EB" : "#374151",
                fontWeight: (s || e) ? 700 : t ? 600 : 400,
                boxShadow:  t && !s && !e && !dis ? "0 0 0 1.5px #2563EB" : "none",
              }}>
              {day}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        <button onClick={doClear} style={DL_CANCEL}>Clear</button>
        <button onClick={doSelect} style={DL_SELECT}>Select</button>
      </div>
    </div>,
    document.body
  );
}

/* ══════════════════════════════════════════════════════════
   SUBTASK ROW
══════════════════════════════════════════════════════════ */
function SubtaskRow({ subtask, index, onChange, onDelete, onAddNext, onSaveAndClose, isFirst, members = [], defaultStart, minDate, maxDate, onComplete }) {
  const [showAssignee, setShowAssignee] = useState(false);
  const [asnPos,       setAsnPos]       = useState({ top:0, right:0, placeAbove:false });
  const [showDl,       setShowDl]       = useState(false);
  const [dlPos,        setDlPos]        = useState({ top:0, left:0 });
  const assigneeRef = useRef(null);
  const asnBtnRef   = useRef(null);
  const dlBtnRef    = useRef(null);

  const openDl = () => {
    if (dlBtnRef.current) {
      const r = dlBtnRef.current.getBoundingClientRect();
      setDlPos({ top: r.bottom + 6, left: r.left, buttonHeight: r.height });
    }
    setShowDl(v => !v);
  };

  const openAsn = () => {
    if (asnBtnRef.current) {
      const r = asnBtnRef.current.getBoundingClientRect();
      const W = 200; // ширина поповера (dm-assignee-popup)
      const popupH = 44 + Math.max(1, members.length) * 36;
      const placeAbove = r.bottom + popupH + 12 > window.innerHeight;
      // Выравниваем правый край поповера по кнопке, но держим в пределах экрана
      const left = Math.min(Math.max(8, r.right - W), window.innerWidth - W - 8);
      setAsnPos({
        top: placeAbove ? Math.max(8, r.top - popupH - 4) : r.bottom + 4,
        left,
      });
    }
    setShowAssignee(v => !v);
  };

  return (
    <div className={`dm-subtask-row${subtask.status==="done"?" completed":""}`}>
      <span className="dm-subtask-num">{index + 1}</span>
      <input className="dm-subtask-name" placeholder="Task Name"
        value={subtask.name}
        onChange={e => onChange({ ...subtask, name: e.target.value })}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onSaveAndClose(); } }}
        readOnly={subtask.status==="done"}
        style={{ textDecoration:subtask.status==="done"?"line-through":"none", color:subtask.status==="done"?"#6B7280":"#374151" }}/>

      {/* Actions dropdown */}
      <div style={{ position:"relative" }}>
        {subtask.status === "done"
          ? <span className="dm-subtask-done">
              <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
              Completed
            </span>
          : <>
              <button className={`dm-action-btn${subtask.mode==="edit"?" edit-mode":""}`}
                onClick={() => onChange({ ...subtask, showActionDd: !subtask.showActionDd })}>
                Actions
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {subtask.showActionDd && (
                <>
                  <div style={{ position:"fixed",inset:0,zIndex:9600 }} onClick={() => onChange({ ...subtask, showActionDd: false })}/>
                  <div className="dm-action-dd">
                    <button className="dm-action-dd-item"
                      onClick={() => onChange({ ...subtask, mode:"edit", showActionDd: false })}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                    <button className="dm-action-dd-item complete"
                      onClick={() => { onChange({ ...subtask, showActionDd: false }); onComplete && onComplete(subtask); }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                      Completed
                    </button>
                  </div>
                </>
              )}
            </>
        }
      </div>

      {/* Calendar / Deadline (range) */}
      <div style={{ position:"relative" }}>
        <button ref={dlBtnRef}
          className={`dm-deadline-btn${subtask.deadline || subtask.start_date ? "" : " empty"}`}
          title="Set deadline"
          onClick={openDl}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
            <rect x="3" y="4" width="18" height="18" rx="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {fmtDateRange(subtask.start_date, subtask.deadline) || "Deadline"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        {showDl && (
          <RangeDeadlinePicker
            startValue={subtask.start_date || defaultStart || null}
            endValue={subtask.deadline}
            pos={dlPos}
            minDate={minDate}
            maxDate={maxDate}
            onChange={({ start, end }) => onChange({ ...subtask, start_date: start, deadline: end })}
            onClose={() => setShowDl(false)}
          />
        )}
      </div>

      {/* Link */}
      <button className="dm-icon-btn" title="Attach link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>

      {/* Assignee */}
      <div style={{ position:"relative" }} ref={assigneeRef}>
        <button ref={asnBtnRef} className="dm-icon-btn" title="Assign member" onClick={openAsn}>
          {subtask.assignee
            ? <MiniAv member={subtask.assignee} size={20}/>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          }
        </button>
        {showAssignee && (
          <>
            <div style={{ position:"fixed",inset:0,zIndex:9400 }} onClick={()=>setShowAssignee(false)}/>
            <AssigneePicker
              selected={subtask.assignee}
              onToggle={m => onChange({ ...subtask, assignee: subtask.assignee?.id===m.id ? null : m })}
              onClose={() => setShowAssignee(false)}
              members={members}
              style={{ position:"fixed", top:asnPos.top, left:asnPos.left, right:"auto", zIndex:9500 }}/>
          </>
        )}
      </div>

      {/* Delete — hidden on first subtask */}
      {!isFirst && (
        <button className="dm-icon-btn" title="Remove subtask" onClick={onDelete}
          style={{ color:"#EF4444" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}

      {/* Enter button — adds next subtask */}
      <button title="Add next subtask" onClick={onAddNext}
        style={{ width:32,height:32,borderRadius:10,background:"#2563EB",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="16" height="16">
          <polyline points="9 10 4 15 9 20"/>
          <path d="M20 4v7a4 4 0 0 1-4 4H4"/>
        </svg>
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   WORKFLOW TAB
══════════════════════════════════════════════════════════ */
function BlockchainBadge({ status, blocks = [] }) {
  // A block is considered compromised only if the chain itself is broken
  // (someone tampered with a stored block) — NOT when the document content
  // legitimately evolves between workflow steps.
  const blockBroken = (b) => b.tampered || b.chain_valid === false;
  const tampered    = blocks.some(blockBroken);
  const color    = tampered ? "#EF4444" : status === "VERIFIED" ? "#10B981" : "#9CA3AF";
  const bg       = tampered ? "#FEF2F2" : status === "VERIFIED" ? "#F0FDF4" : "#F9FAFB";
  const border   = tampered ? "#FECACA" : status === "VERIFIED" ? "#A7F3D0" : "#E5E7EB";
  const label    = tampered ? "TAMPERED" : status === "VERIFIED" ? "VERIFIED" : "PENDING";

  return (
    <div style={{ marginTop:16, border:`1px solid ${border}`, borderRadius:10, background:bg, padding:"12px 14px" }}>
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom: blocks.length ? 10 : 0 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" width="16" height="16">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          {!tampered && status === "VERIFIED" && <polyline points="9 12 11 14 15 10" stroke={color} strokeWidth="2.5"/>}
          {tampered && <><line x1="15" y1="9" x2="9" y2="15" stroke={color} strokeWidth="2"/><line x1="9" y1="9" x2="15" y2="15" stroke={color} strokeWidth="2"/></>}
        </svg>
        <span style={{ fontSize:12.5,fontWeight:700,color,flex:1 }}>Blockchain: {label}</span>
        <span style={{ fontSize:10.5,color:"#9CA3AF" }}>{blocks.length} block{blocks.length !== 1 ? "s" : ""}</span>
      </div>
      {blocks.length > 0 && (
        <div style={{ display:"flex",flexDirection:"column",gap:4 }}>
          {blocks.map((b, i) => {
            const broken = blockBroken(b);
            return (
              <div key={b.id || i} style={{ display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#6B7280" }}>
                <div style={{ width:6,height:6,borderRadius:"50%",background: broken ? "#EF4444" : "#10B981",flexShrink:0 }}/>
                <span style={{ flex:1 }}>Step {b.step_order}: {b.task_title}</span>
                <span style={{ fontFamily:"monospace",fontSize:10 }}>{b.document_hash?.slice(0,10)}…</span>
                {broken
                  ? <span style={{ color:"#EF4444",fontWeight:600,fontSize:10 }}>CHANGED</span>
                  : <span style={{ color:"#10B981",fontWeight:600,fontSize:10 }}>OK</span>}
              </div>
            );
          })}
        </div>
      )}
      {blocks.length === 0 && (
        <div style={{ fontSize:11.5,color:"#9CA3AF" }}>Blockchain записи появятся после завершения задач</div>
      )}
    </div>
  );
}

function WorkflowTab({ members = [], signatures = [], docStatus = "draft", uploaderName = "", uploadDate = "", subtasks = [], attachmentsCount = 0, docId, userRole = null, onStatusChange }) {
  const qc = useQueryClient();
  const [starting, setStarting] = useState(false);
  const rawMembers = Array.isArray(members) ? members : (members?.results ?? []);
  const rawSigs    = Array.isArray(signatures) ? signatures : (signatures?.results ?? []);

  const { data: blockchainData } = useQuery({
    queryKey: ["blockchain", docId],
    queryFn:  () => getBlockchain(docId),
    enabled:  !!docId,
    refetchInterval: 15_000,
  });

  // Members by role
  const editors = rawMembers
    .filter(m => m.role === "editor")
    .sort((a, b) => (a.step_order ?? 999) - (b.step_order ?? 999));

  const signers = rawMembers
    .filter(m => m.role === "owner" || m.role === "signer")
    .sort((a, b) => (a.step_order ?? 999) - (b.step_order ?? 999));

  // Signatures progress — computed before stageIdx so we can use it for accurate stage detection
  const signedUserIds = new Set(rawSigs.filter(s => s.is_valid).map(s => String(s.user)));
  const signedCnt     = signers.filter(s => signedUserIds.has(String(s.user))).length;
  const signersTotal  = signers.length;

  // 3-stage index:
  //   1 = Upload done, Legal Review active    (draft OR review-with-no-sigs)
  //   2 = Review done, Signing active         (review AND at least one sig collected)
  //   3 = All done                            (signed / archived)
  const stageIdx =
    (docStatus === "signed" || docStatus === "archived") ? 3
    : (docStatus === "review" && signedCnt > 0)          ? 2
    : 1;

  const fmtDateTime = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const date = d.toLocaleDateString("en-GB", { day:"2-digit", month:"2-digit", year:"numeric" });
      const time = d.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit", hour12:false });
      return `${date} at ${time}`;
    } catch { return ""; }
  };

  const reviewerName = editors[0]?.user_name || editors[0]?.user_email || "";
  const signerName   = signers[0]?.user_name  || signers[0]?.user_email  || "";

  // Progress for Legal Review based on subtasks
  const stList   = subtasks.filter(st => st.name?.trim());
  const doneCnt  = stList.filter(st => st.status === "done").length;
  const totalCnt = stList.length;
  const reviewPct = totalCnt > 0 ? Math.round((doneCnt / totalCnt) * 100) : (stageIdx > 1 ? 100 : 0);

  // Show the currently-active subtask name as the review stage title.
  // Falls back to "Legal Review" when there are no subtasks or all are done.
  const currentSubtask = stList.find(st => st.status !== "done");
  const reviewLabel    = currentSubtask?.name?.trim() || "Legal Review";

  const stages = [
    {
      key: "upload",
      label: "Document Upload",
      doneSubtitle: uploadDate
        ? `Completed on ${fmtDateTime(uploadDate)}${attachmentsCount > 0 ? ` · ${attachmentsCount} file${attachmentsCount !== 1 ? "s" : ""}` : ""}`
        : (attachmentsCount > 0 ? `${attachmentsCount} file${attachmentsCount !== 1 ? "s" : ""} uploaded` : "Document uploaded"),
      pendingSubtitle: "Waiting for document upload",
      personPrefix: "Document uploaded by",
      personName: uploaderName,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
      ),
    },
    {
      key: "review",
      label: reviewLabel,
      doneSubtitle: totalCnt > 0 ? `All ${totalCnt} subtask${totalCnt !== 1 ? "s" : ""} completed` : "Review completed",
      pendingSubtitle: "Awaiting document upload",
      personPrefix: "This task was assigned to",
      personName: reviewerName,
      showProgress: true,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
        </svg>
      ),
    },
    {
      key: "signing",
      label: "Signing",
      doneSubtitle: signersTotal > 0 ? `Signed by all ${signersTotal} signer${signersTotal !== 1 ? "s" : ""}` : "All signatures collected",
      pendingSubtitle: signersTotal > 0
        ? `${signedCnt}/${signersTotal} signature${signersTotal !== 1 ? "s" : ""} · Waiting for legal review`
        : "Waiting for completion of the examination",
      personPrefix: "This task was assigned to",
      personName: signerName,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
        </svg>
      ),
    },
  ];

  const bcBlocks = blockchainData?.blocks ?? [];
  const bcStatus = blockchainData?.status ?? "PENDING";

  const initials = (name) => (name || "?").split(" ").filter(Boolean).map(p => p[0]).join("").toUpperCase().slice(0,2);

  const handleStartWorkflow = async () => {
    if (!docId || starting) return;
    setStarting(true);
    try {
      await startWorkflow(docId);
      await qc.invalidateQueries({ queryKey: ["document", docId] });
      await qc.invalidateQueries({ queryKey: ["signatures", docId] });
      onStatusChange?.("IN PROGRESS");
      toast.success("Документ отправлен на согласование");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Не удалось отправить на согласование");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div style={{ padding:"20px 4px 8px" }}>
      {/* Start Workflow CTA — shown only to owners when document is still in draft */}
      {docStatus === "draft" && userRole === "owner" && (
        <div style={{
          border:"1.5px dashed #BFDBFE", borderRadius:10, background:"#EFF6FF",
          padding:"12px 14px", marginBottom:16,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
        }}>
          <div>
            <div style={{ fontSize:13,fontWeight:600,color:"#1D4ED8",marginBottom:2 }}>Готово к согласованию?</div>
            <div style={{ fontSize:11.5,color:"#3B82F6" }}>Документ по очереди уйдёт сначала редакторам, затем подписантам.</div>
          </div>
          <button
            onClick={handleStartWorkflow}
            disabled={starting}
            style={{
              background:"#2563EB",color:"#fff",border:"none",borderRadius:8,
              padding:"7px 14px",fontSize:12.5,fontWeight:600,cursor:"pointer",
              fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,
              opacity: starting ? 0.7 : 1,
            }}
          >
            {starting ? "Отправка…" : "Отправить на согласование"}
          </button>
        </div>
      )}
      {stages.map((stage, si) => {
        const isDone    = si < stageIdx;
        const isActive  = si === stageIdx;
        const isPending = si > stageIdx;
        const isLast    = si === stages.length - 1;

        // Status badge
        const badge = isDone
          ? { label: "Completed",   bg: "#DCFCE7", color: "#16A34A" }
          : isActive
          ? { label: "In progress", bg: "#DBEAFE", color: "#2563EB" }
          : { label: "Pending",     bg: "#FEF3C7", color: "#B45309" };

        // Circle icon styling
        const circleBg     = isDone ? "#22C55E" : isActive ? "#2563EB" : "#F3F4F6";
        const circleStroke = isDone ? "#22C55E" : isActive ? "#2563EB" : "#D1D5DB";
        const circleColor  = (isDone || isActive) ? "#fff" : "#9CA3AF";
        const lineColor    = isDone ? "#22C55E" : "#E5E7EB";

        // Card styling
        const cardBorder = isActive ? "1.5px solid #2563EB" : "1px solid #E5E7EB";
        const cardBg     = isPending ? "#FAFAFA" : "#fff";

        // Subtitle text
        const subtitle = isDone ? stage.doneSubtitle : (isPending ? stage.pendingSubtitle : "");

        return (
          <div key={stage.key} style={{ display:"flex", gap:14, alignItems:"stretch" }}>
            {/* Left column: circle + connector line */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:32, flexShrink:0 }}>
              <div style={{
                width:32, height:32, borderRadius:"50%",
                background: circleBg,
                border: `2px solid ${circleStroke}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                color: circleColor, flexShrink:0,
              }}>
                {isDone
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" width="15" height="15"><polyline points="20 6 9 17 4 12"/></svg>
                  : stage.icon
                }
              </div>
              {!isLast && (
                <div style={{ width:2, flex:1, minHeight:24, background: lineColor, marginTop:4, marginBottom:4 }}/>
              )}
            </div>

            {/* Right column: card */}
            <div style={{
              flex:1, marginBottom: isLast ? 0 : 14,
              border: cardBorder, borderRadius:12, padding:"12px 14px",
              background: cardBg,
              boxShadow: isActive ? "0 2px 10px rgba(37,99,235,0.08)" : "none",
            }}>
              {/* Header row: title + badge */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                <div style={{ fontSize:14, fontWeight:600, color: isPending ? "#9CA3AF" : "#111827" }}>
                  {stage.label}
                </div>
                <span style={{
                  fontSize:10.5, fontWeight:600,
                  padding:"3px 9px", borderRadius:999,
                  background: badge.bg, color: badge.color,
                }}>
                  {badge.label}
                </span>
              </div>

              {/* Subtitle */}
              {subtitle && (
                <div style={{ fontSize:12, color:"#9CA3AF", marginTop:3 }}>
                  {subtitle}
                </div>
              )}

              {/* Assignee row */}
              {stage.personName && (
                <div style={{
                  display:"flex", alignItems:"center", gap:8,
                  marginTop:10, padding:"7px 10px",
                  borderRadius:8, background:"#F9FAFB", border:"1px solid #F3F4F6",
                }}>
                  <div style={{
                    width:22, height:22, borderRadius:"50%",
                    background: isPending ? "#E5E7EB" : "#DBEAFE",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:9.5, fontWeight:700,
                    color: isPending ? "#9CA3AF" : "#2563EB", flexShrink:0,
                  }}>
                    {initials(stage.personName)}
                  </div>
                  <div style={{ fontSize:12, color:"#6B7280" }}>
                    {stage.personPrefix} <strong style={{ color:"#374151", fontWeight:600 }}>{stage.personName}</strong>
                  </div>
                </div>
              )}

              {/* Progress bar (only on active Legal Review) */}
              {stage.showProgress && isActive && (
                <div style={{ marginTop:10 }}>
                  {totalCnt > 0 && (
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, marginBottom:5 }}>
                      <span style={{ color:"#6B7280" }}>Subtasks</span>
                      <span style={{ color:"#2563EB", fontWeight:600 }}>{doneCnt}/{totalCnt}</span>
                    </div>
                  )}
                  <div className="wf-progress">
                    <div className="wf-progress-fill" style={{ width:`${reviewPct}%`, transition:"width .3s" }}/>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Signatures + verification */}
      {rawSigs.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
            <span style={{ fontSize:13, fontWeight:600, color:"#374151" }}>Электронные подписи</span>
            <span style={{ fontSize:11, color:"#9CA3AF" }}>{rawSigs.length}</span>
          </div>
          {rawSigs.map(sig => (
            <SignatureVerifyRow key={sig.id} signature={sig} initials={initials}/>
          ))}
        </div>
      )}

      {/* Blockchain verification section */}
      <BlockchainBadge status={bcStatus} blocks={bcBlocks}/>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ACTIVITY PANEL
══════════════════════════════════════════════════════════ */
/* ── AI Chat Panel ──────────────────────────────────────────────── */
function AiChatPanel({ docId, workspaceId }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);

  // Load history specific to this document (or workspace if no doc)
  useEffect(() => {
    const params = docId ? { document_id: docId } : workspaceId ? { workspace_id: workspaceId } : null;
    if (!params) return;
    setMessages([]); // clear on document switch
    getChatHistory(params)
      .then(d => {
        const msgs = (d?.messages || []).map(m => ({
          role:    m.role,
          content: m.content,
          time:    m.created_at ? new Date(m.created_at).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}) : "",
          sources: [],
        }));
        setMessages(msgs);
      })
      .catch(() => {});
  }, [docId, workspaceId]); // re-fetch when document changes

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const time = new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
    setMessages(m => [...m, { role:"user", content:text, time, sources:[] }]);
    setLoading(true);
    try {
      let res;
      if (docId) {
        // Document-specific chat — history and context scoped to this document
        res = await chatWithDocument(docId, text);
        res = { reply: res.reply, sources: (res.context_chunks || []).map(c => ({ title: "Фрагмент", chunk_text: c.chunk_text, score: 1 })) };
      } else {
        // Workspace-level general chat
        res = await generalChat(text, workspaceId);
      }
      setMessages(m => [...m, {
        role:    "assistant",
        content: res.reply || "—",
        time:    new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}),
        sources: res.sources || [],
      }]);
    } catch {
      setMessages(m => [...m, { role:"assistant", content:"Ошибка. Попробуйте снова.", time, sources:[] }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Messages */}
      <div className="dm-activity-body" style={{ flex:1, overflowY:"auto" }}>
        {messages.length === 0 && !loading && (
          <div style={{ textAlign:"center", padding:"24px 12px", color:"#9CA3AF" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#C4B5FD" strokeWidth="1.5" width="36" height="36" style={{ display:"block",margin:"0 auto 10px" }}>
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a1 1 0 0 0-1 1v4a1 1 0 0 0 .29.71l3 3a1 1 0 0 0 1.42-1.42L13 11.59V7a1 1 0 0 0-1-1z"/>
            </svg>
            <div style={{ fontSize:12.5,fontWeight:500,color:"#7C3AED",marginBottom:4 }}>AI Ассистент проекта</div>
            <div style={{ fontSize:11.5 }}>{docId ? "Задайте вопрос по этому документу" : "Задайте вопрос по документам проекта"}</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8,
              flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              {/* Avatar */}
              <div style={{ width:26,height:26,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,
                background: m.role === "user" ? "#2563EB" : "#7C3AED", color:"#fff" }}>
                {m.role === "user" ? "Я" : "AI"}
              </div>
              {/* Bubble */}
              <div style={{ maxWidth:"85%",
                background: m.role === "user" ? "#EFF6FF" : "#F5F3FF",
                border: `0.5px solid ${m.role === "user" ? "#BFDBFE" : "#DDD6FE"}`,
                borderRadius: m.role === "user" ? "12px 2px 12px 12px" : "2px 12px 12px 12px",
                padding:"8px 12px", fontSize:12.5, color:"#111827", lineHeight:1.6 }}>
                {m.content}
                {m.sources?.length > 0 && (
                  <div style={{ marginTop:8, borderTop:"0.5px solid #E9D5FF", paddingTop:6 }}>
                    <div style={{ fontSize:10.5,color:"#7C3AED",fontWeight:600,marginBottom:4 }}>Источники:</div>
                    {m.sources.map((s, si) => (
                      <div key={si} style={{ fontSize:10.5,color:"#6B7280",marginBottom:2,display:"flex",alignItems:"center",gap:4 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" width="10" height="10"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        {s.title} <span style={{ color:"#A78BFA" }}>({Math.round((s.score||0)*100)}%)</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontSize:10,color:"#9CA3AF",marginTop:2,textAlign:m.role==="user"?"right":"left",paddingLeft:m.role==="user"?0:34,paddingRight:m.role==="user"?34:0 }}>
              {m.time}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
            <div style={{ width:26,height:26,borderRadius:"50%",background:"#7C3AED",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0 }}>AI</div>
            <div style={{ background:"#F5F3FF",border:"0.5px solid #DDD6FE",borderRadius:"2px 12px 12px 12px",padding:"8px 12px",display:"flex",gap:4,alignItems:"center" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6,height:6,borderRadius:"50%",background:"#A78BFA",animation:`aiDot 1.2s ${i*0.2}s infinite ease-in-out alternate` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="dm-comment-box">
        <textarea className="dm-comment-input"
          placeholder={docId ? "Спросите AI об этом документе…" : "Спросите AI о проекте…"}
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1}
          disabled={loading}/>
        <div className="dm-comment-actions">
          <span style={{ fontSize:10.5,color:"#A78BFA",flex:1 }}>Enter — отправить</span>
          <button className="dm-comment-send" onClick={send} disabled={loading}
            style={{ background: loading ? "#A78BFA" : "#7C3AED" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </>
  );
}

function ApiCommentItem({ comment, docId, currentUserId }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(comment.content || "");
  const [busy, setBusy]       = useState(false);
  const [hover, setHover]     = useState(false);
  const isAuthor = currentUserId && String(comment.author) === String(currentUserId);

  const refresh = () => qc.invalidateQueries({ queryKey: ["comments", docId] });

  const saveEdit = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try { await apiUpdateComment(comment.id, { content: draft.trim() }); setEditing(false); refresh(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Не удалось изменить"); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try { await apiDeleteComment(comment.id); refresh(); toast.success("Комментарий удалён"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Не удалось удалить"); }
    finally { setBusy(false); }
  };
  const resolve = async () => {
    if (busy) return;
    setBusy(true);
    try { await apiResolveComment(comment.id); refresh(); toast.success("Отмечено как решённое"); }
    catch (e) { toast.error(e?.response?.data?.detail || "Только владелец может закрыть комментарий"); }
    finally { setBusy(false); }
  };

  const time = comment.created_at
    ? new Date(comment.created_at).toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" })
    : "";

  return (
    <div style={{ marginBottom:8, opacity: comment.is_resolved ? 0.6 : 1 }}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}>
      <div className="dm-activity-item" style={{ alignItems:"flex-start" }}>
        <div className="dm-activity-dot" style={{ background: comment.is_resolved ? "#22C55E" : "#A78BFA" }}/>
        <span style={{ fontSize:12, flex:1 }}>
          <strong style={{ color:"#374151" }}>{comment.author_name || "User"}</strong>
          {comment.is_resolved && <span style={{ marginLeft:6,fontSize:9.5,fontWeight:700,color:"#16A34A",background:"#DCFCE7",borderRadius:5,padding:"1px 6px" }}>РЕШЕНО</span>}
          {!editing && <>: {comment.content}</>}
        </span>
        <span className="dm-activity-time">{time}</span>
      </div>

      {editing ? (
        <div style={{ marginLeft:14, marginTop:4 }}>
          <textarea value={draft} onChange={e=>setDraft(e.target.value)} rows={2}
            className="dm-comment-input" style={{ minHeight:34 }}/>
          <div style={{ display:"flex", gap:6, marginTop:4 }}>
            <button onClick={saveEdit} disabled={busy} className="ai-btn ai-btn-blue" style={{ padding:"4px 10px",fontSize:11 }}>Сохранить</button>
            <button onClick={()=>{ setEditing(false); setDraft(comment.content||""); }} style={{ padding:"4px 10px",fontSize:11,border:"1px solid #E5E7EB",borderRadius:7,background:"#fff",color:"#6B7280",fontFamily:"inherit",cursor:"pointer" }}>Отмена</button>
          </div>
        </div>
      ) : (
        hover && (
          <div style={{ display:"flex", gap:10, marginLeft:14, marginTop:2 }}>
            {!comment.is_resolved && (
              <button onClick={resolve} disabled={busy} style={{ background:"none",border:"none",cursor:"pointer",color:"#16A34A",fontSize:10.5,fontWeight:600,fontFamily:"inherit",padding:0 }}>Решить</button>
            )}
            {isAuthor && !comment.is_resolved && (
              <button onClick={()=>setEditing(true)} disabled={busy} style={{ background:"none",border:"none",cursor:"pointer",color:"#2563EB",fontSize:10.5,fontWeight:600,fontFamily:"inherit",padding:0 }}>Изменить</button>
            )}
            <button onClick={remove} disabled={busy} style={{ background:"none",border:"none",cursor:"pointer",color:"#EF4444",fontSize:10.5,fontWeight:600,fontFamily:"inherit",padding:0 }}>Удалить</button>
          </div>
        )
      )}
    </div>
  );
}

function ActivityPanel({ comments, onComment, apiComments, workspaceId, docId }) {
  const currentUserId = useAuthStore(s => s.user?.id);
  const [chatMode, setChatMode] = useState("team"); // "team" | "ai"
  const [text, setText] = useState("");
  const [images, setImages] = useState([]);
  const imgRef = useRef(null);

  const send = () => {
    if (!text.trim() && images.length === 0) return;
    onComment({ text: text.trim(), images });
    setText("");
    setImages([]);
  };

  const handleImg = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setImages(imgs => [...imgs, { name: f.name, src: ev.target.result }]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };

  return (
    <>
      {/* Header with toggle */}
      <div className="dm-activity-header" style={{ flexDirection:"column",gap:8,alignItems:"stretch" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
          <span style={{ fontSize:13,fontWeight:600,color:"#111827" }}>
            {chatMode === "team" ? "Activity" : "AI Ассистент"}
          </span>
        </div>
        {/* Toggle buttons */}
        <div style={{ display:"flex",gap:4,background:"#F3F4F6",borderRadius:8,padding:3 }}>
          <button onClick={() => setChatMode("team")}
            style={{ flex:1,padding:"5px 8px",fontSize:11.5,fontWeight:600,borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",
              background: chatMode==="team" ? "#fff" : "transparent",
              color: chatMode==="team" ? "#2563EB" : "#9CA3AF",
              boxShadow: chatMode==="team" ? "0 1px 3px rgba(0,0,0,.1)" : "none",
              transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Команда
          </button>
          <button onClick={() => setChatMode("ai")}
            style={{ flex:1,padding:"5px 8px",fontSize:11.5,fontWeight:600,borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",
              background: chatMode==="ai" ? "#F5F3FF" : "transparent",
              color: chatMode==="ai" ? "#7C3AED" : "#9CA3AF",
              boxShadow: chatMode==="ai" ? "0 1px 3px rgba(0,0,0,.1)" : "none",
              transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            AI
          </button>
        </div>
      </div>

      {chatMode === "ai" ? (
        <AiChatPanel docId={docId} workspaceId={workspaceId}/>
      ) : (
        <>
          <div className="dm-activity-body">
            {apiComments?.map((c, i) => (
              <ApiCommentItem key={`api-${c.id||i}`} comment={c} docId={docId} currentUserId={currentUserId}/>
            ))}
            {comments.map((c, i) => (
              <div key={i} style={{ marginBottom:10 }}>
                <div className="dm-activity-item">
                  <div className="dm-activity-dot" style={{ background:"#2563EB" }}/>
                  <span style={{ fontSize:12 }}>
                    {c.text && <><strong>You</strong>: {c.text}</>}
                  </span>
                  <span className="dm-activity-time">{c.time}</span>
                </div>
                {c.images?.map((img, j) => (
                  <div key={j} style={{ marginLeft:14, marginTop:4 }}>
                    <img src={img.src} alt={img.name}
                      style={{ maxWidth:"100%", maxHeight:120, borderRadius:8, border:".5px solid #E5E7EB", objectFit:"cover" }}/>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="dm-comment-box">
            {images.length > 0 && (
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position:"relative" }}>
                    <img src={img.src} alt={img.name}
                      style={{ width:56, height:56, borderRadius:8, objectFit:"cover", border:".5px solid #E5E7EB" }}/>
                    <button onClick={() => setImages(imgs => imgs.filter((_,j)=>j!==i))}
                      style={{ position:"absolute",top:-4,right:-4,width:16,height:16,borderRadius:"50%",background:"#EF4444",border:"none",cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10 }}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <textarea className="dm-comment-input" placeholder="Write a comment…"
              value={text} onChange={e=>setText(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); send(); } }}
              rows={1}/>
            <div className="dm-comment-actions">
              <input ref={imgRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleImg}/>
              <button title="Attach photo" onClick={() => imgRef.current?.click()}
                style={{ background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",display:"flex",alignItems:"center" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </button>
              <button style={{ background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",display:"flex",alignItems:"center" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              </button>
              <button style={{ background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",display:"flex",alignItems:"center",fontSize:14,fontWeight:600 }}>@</button>
              <button className="dm-comment-send" onClick={send}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="14" height="14"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   AI TOOLS TAB — резюме, классификация, версии+AI-diff, индексация
══════════════════════════════════════════════════════════ */
function VersionDiffRow({ docId, version, isFirst }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [diff, setDiff]       = useState(null);
  const [error, setError]     = useState(false);

  const loadDiff = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (diff || isFirst) return;
    setLoading(true);
    setError(false);
    try {
      setDiff(await getVersionDiff(docId, version.id));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const created = version.created_at
    ? new Date(version.created_at).toLocaleDateString("ru-RU", { day:"2-digit", month:"short", year:"numeric" })
    : "";
  const summary = diff?.ai_diff_summary;

  return (
    <div style={{ marginBottom:7 }}>
      <div className="ai-ver-row" onClick={loadDiff} style={{ cursor:"pointer", marginBottom:0 }}>
        <div className="ai-ver-num">v{version.version_number}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12.5, fontWeight:500, color:"#374151" }}>
            Версия {version.version_number}
            {isFirst && <span style={{ color:"#9CA3AF", fontWeight:400 }}> · исходная</span>}
          </div>
          <div style={{ fontSize:11, color:"#9CA3AF", marginTop:1 }}>
            {version.created_by_name || "—"}{created ? ` · ${created}` : ""}
          </div>
        </div>
        {!isFirst && (
          version.ai_changes_detected
            ? <span className="ai-diff-stat ai-diff-add">изменения</span>
            : <span style={{ fontSize:11, color:"#9CA3AF" }}>—</span>
        )}
        {!isFirst && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="13" height="13"
            style={{ transform: open ? "rotate(180deg)" : "none", transition:"transform .2s", flexShrink:0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </div>

      {open && !isFirst && (
        <div className="ai-summary-box" style={{ marginTop:6 }}>
          {loading && (
            <div style={{ display:"flex", alignItems:"center", gap:8, color:"#7C3AED" }}>
              <span className="ai-spin violet"/> AI анализирует изменения…
            </div>
          )}
          {error && <span style={{ color:"#9CA3AF" }}>Не удалось загрузить анализ изменений.</span>}
          {!loading && !error && summary && (
            <>
              <div style={{ display:"flex", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                <span className="ai-diff-stat ai-diff-add">+{summary.additions_count ?? 0} добавлено</span>
                <span className="ai-diff-stat ai-diff-del">−{summary.deletions_count ?? 0} удалено</span>
              </div>
              <div style={{ fontWeight:600, color:"#5B21B6", marginBottom:4, fontSize:12 }}>Резюме изменений (AI):</div>
              <div>{summary.summary || "Значимых смысловых изменений не обнаружено."}</div>
            </>
          )}
          {!loading && !error && !summary && (
            <span style={{ color:"#9CA3AF" }}>{diff?.detail || "Анализ для этой версии недоступен."}</span>
          )}
        </div>
      )}
    </div>
  );
}

function SignatureVerifyRow({ signature, initials }) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult]       = useState(null);

  const verify = async () => {
    if (result) { setResult(null); return; }
    setVerifying(true);
    try {
      setResult(await verifySignature(signature.id));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Не удалось проверить подпись");
    } finally { setVerifying(false); }
  };

  const signedAt = signature.signed_at
    ? new Date(signature.signed_at).toLocaleString("ru-RU", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })
    : "—";

  return (
    <div style={{ marginBottom:7 }}>
      <div className="sig-row" style={{ marginBottom:0 }}>
        <div className="sig-av">{initials(signature.user_name)}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:12.5, fontWeight:500, color:"#374151" }}>{signature.user_name || "Подписант"}</div>
          <div style={{ fontSize:11, color:"#9CA3AF", marginTop:1 }}>Подписано: {signedAt}</div>
        </div>
        <button className="sig-verify-btn" onClick={verify} disabled={verifying}>
          {verifying ? <span className="ai-spin violet"/> : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
          )}
          {result ? "Скрыть" : "Проверить"}
        </button>
      </div>
      {result && (
        <div className="sig-verified">
          <div style={{ display:"flex", alignItems:"center", gap:6, fontWeight:700, marginBottom:2 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
            {result.is_valid ? "Подпись действительна" : "Подпись недействительна"}
          </div>
          <div className="sig-verified-row"><b>Подписант:</b><span>{result.signer?.full_name || result.signer?.email || "—"}</span></div>
          <div className="sig-verified-row"><b>Дата:</b><span>{signedAt}</span></div>
          {result.ip_address && <div className="sig-verified-row"><b>IP-адрес:</b><span>{result.ip_address}</span></div>}
          {result.certificate_id && <div className="sig-verified-row"><b>Сертификат:</b><span>{result.certificate_id}</span></div>}
        </div>
      )}
    </div>
  );
}

function AIToolsTab({ docId, apiDoc }) {
  const qc = useQueryClient();
  const [sumLoading, setSumLoading] = useState(false);
  const [summary,    setSummary]    = useState(null);
  const [clsLoading, setClsLoading] = useState(false);
  const [cls,        setCls]        = useState(apiDoc?.metadata?.classification || null);
  const [reindexing, setReindexing] = useState(false);
  const [verUploading, setVerUploading] = useState(false);
  const verFileRef = useRef(null);

  const { data: versionsData } = useQuery({
    queryKey: ["versions", docId],
    queryFn:  () => getVersions(docId),
    enabled:  !!docId,
  });

  const handleVersionUpload = async (e) => {
    const f = e.target.files?.[0];
    if (verFileRef.current) verFileRef.current.value = "";
    if (!f) return;
    setVerUploading(true);
    try {
      await serverUploadVersion(docId, f);
      qc.invalidateQueries({ queryKey: ["versions", docId] });
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["blockchain", docId] });
      toast.success("Новая версия загружена — AI анализирует изменения");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.response?.data?.file || "Не удалось загрузить версию");
    } finally { setVerUploading(false); }
  };
  const versions = (Array.isArray(versionsData) ? versionsData : (versionsData?.results ?? []))
    .slice().sort((a, b) => b.version_number - a.version_number);

  const runSummary = async () => {
    setSumLoading(true);
    try {
      setSummary(await summarizeDocument(docId));
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Не удалось создать резюме");
    } finally { setSumLoading(false); }
  };

  const runClassify = async () => {
    setClsLoading(true);
    try {
      setCls(await classifyDocument(docId));
      toast.success("Тип документа определён");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Не удалось классифицировать");
    } finally { setClsLoading(false); }
  };

  const runReindex = async () => {
    setReindexing(true);
    try {
      await embedDocument(docId);
      toast.success("Индексация для AI-поиска запущена");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Не удалось запустить индексацию");
    } finally { setReindexing(false); }
  };

  return (
    <div style={{ padding:"4px 4px 8px" }}>
      {/* Classification */}
      <div className="ai-card">
        <div className="ai-card-head">
          <div className="ai-card-ic" style={{ background:"#EFF6FF" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" width="16" height="16"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div className="ai-card-title">Тип документа</div>
            <div className="ai-card-sub">ML-классификация: договор / приказ / акт / счёт-фактура</div>
          </div>
          <button className="ai-btn ai-btn-ghost" onClick={runClassify} disabled={clsLoading}>
            {clsLoading ? <span className="ai-spin violet"/> : null}
            {cls ? "Определить заново" : "Определить тип"}
          </button>
        </div>
        {cls && (
          <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:12 }}>
            <span className="ai-type-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {cls.label || cls.type}
            </span>
            <div className="ai-conf-bar"><div className="ai-conf-fill" style={{ width:`${Math.round((cls.confidence || 0) * 100)}%` }}/></div>
            <span style={{ fontSize:11.5, color:"#6B7280", fontWeight:600, flexShrink:0 }}>
              {Math.round((cls.confidence || 0) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* AI Summary */}
      <div className="ai-card">
        <div className="ai-card-head">
          <div className="ai-card-ic" style={{ background:"#F5F3FF" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" width="16" height="16"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="18" y2="18"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div className="ai-card-title">AI-резюме документа</div>
            <div className="ai-card-sub">Краткое содержание и ключевые тезисы (Claude)</div>
          </div>
          <button className="ai-btn ai-btn-violet" onClick={runSummary} disabled={sumLoading}>
            {sumLoading ? <span className="ai-spin"/> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="13" height="13"><path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 16.6 5.7 21l2.3-7.2-6-4.6h7.6z"/></svg>
            )}
            {summary ? "Обновить" : "Создать резюме"}
          </button>
        </div>
        {summary && (
          <div className="ai-summary-box">
            <div>{summary.summary || "—"}</div>
            {summary.key_points?.length > 0 && (
              <div style={{ marginTop:10 }}>
                <div style={{ fontWeight:600, color:"#5B21B6", fontSize:12, marginBottom:2 }}>Ключевые тезисы:</div>
                {summary.key_points.map((kp, i) => (
                  <div key={i} className="ai-keypoint">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>{kp}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Versions + AI-diff */}
      <div className="ai-card">
        <div className="ai-card-head" style={{ marginBottom:12 }}>
          <div className="ai-card-ic" style={{ background:"#ECFDF5" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" width="16" height="16"><polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 1 .5 4"/><polyline points="3 16 3 11 8 11"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div className="ai-card-title">История версий и AI-сравнение</div>
            <div className="ai-card-sub">Нажмите на версию, чтобы увидеть AI-анализ изменений</div>
          </div>
          <input ref={verFileRef} type="file" accept=".pdf,.docx,.xlsx,.odt,.ods" style={{ display:"none" }} onChange={handleVersionUpload}/>
          <button className="ai-btn ai-btn-ghost" onClick={() => !verUploading && verFileRef.current?.click()} disabled={verUploading}>
            {verUploading ? <span className="ai-spin violet"/> : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
            )}
            Новая версия
          </button>
        </div>
        {versions.length === 0
          ? <div style={{ fontSize:12, color:"#9CA3AF", padding:"4px 2px" }}>Версий пока нет. Загрузите новую версию документа, чтобы сравнить их.</div>
          : versions.map(v => (
              <VersionDiffRow key={v.id} docId={docId} version={v} isFirst={v.version_number === 1}/>
            ))
        }
      </div>

      {/* Re-index for AI search */}
      <div className="ai-card" style={{ marginBottom:0 }}>
        <div className="ai-card-head" style={{ marginBottom:0 }}>
          <div className="ai-card-ic" style={{ background:"#FEF3C7" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <div style={{ flex:1 }}>
            <div className="ai-card-title">Индексация для AI-поиска</div>
            <div className="ai-card-sub">Пересобрать векторные эмбеддинги (RAG-чат и семантический поиск)</div>
          </div>
          <button className="ai-btn ai-btn-blue" onClick={runReindex} disabled={reindexing}>
            {reindexing ? <span className="ai-spin"/> : null}
            Переиндексировать
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════ */
function DocumentModal({ doc, projectName, onClose, readOnly = false, userRole = null }) {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const docId = doc?.id;
  const workspaceId = doc?.workspace?.id || doc?.workspace;
  const isEditor = userRole === "editor";

  // API queries — only when we have a real document id
  const { data: apiDoc } = useQuery({
    queryKey: ["document", docId],
    queryFn: () => getDocument(docId),
    enabled: !!docId,
  });
  const { data: apiSubtasks } = useQuery({
    queryKey: ["subtasks", docId],
    queryFn: () => getSubtasks(docId),
    enabled: !!docId,
  });
  const { data: apiAttachments } = useQuery({
    queryKey: ["attachments", docId],
    queryFn: () => getAttachments(docId),
    enabled: !!docId,
  });
  const { data: apiComments } = useQuery({
    queryKey: ["comments", docId],
    queryFn: () => getComments(docId),
    enabled: !!docId,
  });
  const { data: membersData } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => getMembers(workspaceId),
    enabled: !!workspaceId,
  });
  const { data: signaturesData } = useQuery({
    queryKey: ["signatures", docId],
    queryFn: () => getSignatures(docId),
    enabled: !!docId,
  });
  const membersList = (membersData?.results ?? (Array.isArray(membersData) ? membersData : [])).map((m, i) => ({
    id: m.user || m.id,
    name: m.user_name || m.user_email || "Member",
    initials: (m.user_name || m.user_email || "M").split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2),
    color: AV_COLORS_MEMBERS[i % AV_COLORS_MEMBERS.length],
  }));

  const [status,       setStatus]       = useState("TO DO");
  const [priority,     setPriority]     = useState("Empty");
  const [assignees,    setAssignees]    = useState([]);
  const [dueDate,      setDueDate]      = useState(null);
  const [dueStartDate, setDueStartDate] = useState(null);
  const [showDueDl,    setShowDueDl]    = useState(false);
  const [dueDlPos,     setDueDlPos]     = useState({ top:0, left:0 });
  const apiDocRef = useRef(null);
  const [showPriDd,  setShowPriDd]  = useState(false);
  const [showAsnDd,  setShowAsnDd]  = useState(false);
  const _priRef   = useRef(null);
  const _asnRef   = useRef(null);
  const dueBtnRef = useRef(null);
  const [desc,       setDesc]       = useState("");
  const [attachments,setAttachments]= useState([]);
  const [previewAtt, setPreviewAtt] = useState(null);
  const [subtasks,   setSubtasks]   = useState([{ id:1, name:"", mode:"action", assignee:null, start_date:null, deadline:null, status:"pending" }]);
  const [activeTab,  setActiveTab]  = useState("task");
  const [comments,   setComments]   = useState([]);
  const [title,      setTitle]      = useState(doc?.title || doc?.name || "");
  const [saved,      setSaved]      = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [approving,  setApproving]  = useState(false);
  const [showPdfSign, setShowPdfSign] = useState(false);
  const [deletedSubtaskIds, setDeletedSubtaskIds] = useState([]);
  const fileRef = useRef(null);

  const handleApprove = async () => {
    if (!docId || approving) return;
    setApproving(true);
    try {
      await approveDocument(docId);
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Шаг согласования выполнен");
      setTimeout(onClose, 500);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Не удалось согласовать документ");
    } finally { setApproving(false); }
  };

  // Подписант подписывает документ своей сохранённой подписью из профиля
  const handleSign = async () => {
    if (!docId || approving) return;
    const sig = user?.signature_data;
    if (!sig) { toast.error("Сначала создайте свою подпись в разделе «Документы»"); return; }
    // PDF — открываем экран с перетаскиванием подписи на нужное место
    const isPdf = (apiDoc?.file_type || doc?.file_type || "").toLowerCase() === "pdf";
    if (isPdf) { setShowPdfSign(true); return; }
    // Word (.docx) — впечатываем подпись прямо в файл (документ остаётся .docx)
    setApproving(true);
    try {
      const res = await signDocx(docId, { signature_data: sig });
      qc.invalidateQueries({ queryKey: ["document", docId] });
      qc.invalidateQueries({ queryKey: ["signatures", docId] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast.success(res?.document_fully_signed ? "Документ полностью подписан" : "Документ подписан");
      setTimeout(onClose, 500);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Не удалось подписать документ");
    } finally { setApproving(false); }
  };

  // Sync doc metadata from API
  useEffect(() => {
    if (!apiDoc) return;
    apiDocRef.current = apiDoc;
    setTitle(apiDoc.title || "");
    setStatus(docStatusDisplay(apiDoc.status));
    setPriority(priFromApi(apiDoc.priority));
    setDueDate(apiDoc.due_date || null);
    setDueStartDate(apiDoc.metadata?.start_date || null);
    setDesc(apiDoc.metadata?.description || "");
  }, [apiDoc]);

  // Restore assignees — supports new multi-select (assignee_ids) and legacy single (assignee_id)
  useEffect(() => {
    if (!apiDoc || !membersData) return;
    const meta = apiDoc.metadata || {};
    const savedIds = Array.isArray(meta.assignee_ids)
      ? meta.assignee_ids
      : (meta.assignee_id ? [meta.assignee_id] : []);
    if (savedIds.length === 0) { setAssignees([]); return; }
    const rawList = membersData?.results ?? (Array.isArray(membersData) ? membersData : []);
    const restored = savedIds
      .map(id => rawList.find(m => String(m.user || m.id) === String(id)))
      .filter(Boolean)
      .map((m, i) => ({
        id:       m.user || m.id,
        name:     m.user_name || m.user_email || "Member",
        initials: (m.user_name || m.user_email || "M").split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0]).join("").toUpperCase().slice(0,2) || "M",
        color:    AV_COLORS_MEMBERS[i % AV_COLORS_MEMBERS.length],
      }));
    setAssignees(restored);
  }, [apiDoc, membersData]);

  // Sync subtasks from API (only on first load)
  useEffect(() => {
    if (apiSubtasks) {
      setSubtasks(
        apiSubtasks.length > 0
          ? apiSubtasks.map(st => {
              const aname = st.assignee_name || "";
              const initials = aname.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join("").toUpperCase().slice(0,2) || "?";
              return {
                id: st.id, _apiId: st.id,
                name: st.title, mode: "action",
                status: st.status || "pending",
                assignee: st.assignee ? { id: st.assignee, name: aname, initials } : null,
                start_date: st.start_date || null,
                deadline:   st.deadline   || null,
              };
            })
          : [{ id: 1, _apiId: null, name: "", mode: "action", assignee: null, start_date: null, deadline: null, status: "pending" }]
      );
    }
  }, [apiSubtasks]);

  // Sync attachments from API
  useEffect(() => {
    if (apiAttachments?.length > 0) {
      setAttachments(apiAttachments.map(a => ({
        _apiId: a.id,
        name: a.title,
        size: `${(a.file_size / 1024 / 1024).toFixed(1)} MB`,
        date: new Date(a.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" }),
        downloadUrl: a.download_url,
      })));
    }
  }, [apiAttachments]);

  // Snapshot for cancel
  const snapshot = useRef({ status:"TO DO", priority:"Empty", assignees:[], dueDate:null, desc:"", title:doc?.title||doc?.name||"", subtasks:[{id:1,name:"",mode:"action",assignee:null,deadline:null,status:"pending"}], attachments:[] });

  const handleSave = async () => {
    if (saving || isEditor) return;
    setSaving(true);
    try {
      if (!readOnly && docId) {
        // Drop the legacy single-assignee key so it doesn't override the new list
        const { assignee_id: _legacy, ...restMeta } = apiDocRef.current?.metadata || {};
        await updateDocument(docId, {
          title,
          status: DISPLAY_TO_API_STATUS[status] || "draft",
          ...(priority !== "Empty" && { priority: priToApi(priority) }),
          due_date: dueDate || null,
          metadata: {
            ...restMeta,
            assignee_ids: assignees.map(a => a.id),
            start_date:  dueStartDate || null,
            description: desc || null,
          },
        });
        // Delete removed subtasks
        for (const id of deletedSubtaskIds) {
          try { await apiDeleteSubtask(docId, id); } catch {}
        }
        setDeletedSubtaskIds([]);
        // Create new / update existing subtasks
        for (const st of subtasks) {
          const payload = {
            title:      st.name || "Untitled",
            assignee:   st.assignee?.id || null,
            start_date: st.start_date || null,
            deadline:   st.deadline || null,
          };
          if (st._apiId) {
            try { await apiUpdateSubtask(docId, st._apiId, payload); } catch {}
          } else if (st.name?.trim()) {
            try {
              const newSt = await createSubtask(docId, payload);
              st._apiId = newSt.id;
              st.id = newSt.id;
            } catch {}
          }
        }
        qc.invalidateQueries({ queryKey: ["document", docId] });
        qc.invalidateQueries({ queryKey: ["subtasks", docId] });
        qc.invalidateQueries({ queryKey: ["documents"] });
        toast.success("Saved");
      }
      snapshot.current = { status, priority, assignees, dueDate, desc, title, subtasks, attachments };
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const _handleCancel = () => {
    const s = snapshot.current;
    setStatus(s.status);
    setPriority(s.priority);
    setAssignees(s.assignees || []);
    setDueDate(s.dueDate);
    setDesc(s.desc);
    setTitle(s.title);
    setSubtasks(s.subtasks);
    setAttachments(s.attachments);
  };

  const addSubtask = () => {
    setSubtasks(s => [...s, { id: Date.now(), _apiId: null, name:"", mode:"action", assignee:null, start_date:null, deadline:null, status:"pending" }]);
  };
  const updateSubtask = (id, data) => setSubtasks(s => s.map(x => x.id===id ? {...x,...data} : x));
  const deleteSubtask = (id) => {
    const st = subtasks.find(s => s.id === id);
    if (st?._apiId) setDeletedSubtaskIds(ids => [...ids, st._apiId]);
    setSubtasks(s => s.filter(x => x.id !== id));
  };

  const handleCompleteSubtask = async (subtask) => {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
    const userName = user?.full_name || "You";
    const msg = `${userName} completed subtask: "${subtask.name}"`;

    updateSubtask(subtask.id, { status: "done" });

    if (subtask._apiId && docId) {
      try {
        await apiUpdateSubtask(docId, subtask._apiId, { status: "done" });
        // Системное сообщение сохраняем на бэк — оно подтянется из apiComments,
        // локально не дублируем (иначе сообщения двоятся).
        try { await apiAddComment(docId, { content: msg }); } catch {}
        qc.invalidateQueries({ queryKey: ["subtasks", docId] });
        qc.invalidateQueries({ queryKey: ["comments", docId] });
        toast.success("Subtask completed");
      } catch {
        updateSubtask(subtask.id, { status: "pending" });
        toast.error("Failed to update subtask");
      }
    } else {
      // Подзадача ещё не сохранена на бэке — показываем сообщение локально
      setComments(c => [...c, { text: msg, time, isSystem: true }]);
    }
  };

  const handleFileUpload = async (e) => {
    const f = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!f) return;
    if (!docId) {
      setAttachments(a => [...a, { name:f.name, size:`${(f.size/1024/1024).toFixed(1)} MB`, date:"Just now" }]);
      return;
    }
    setUploading(true);
    try {
      const att = await serverUploadAttachment(docId, f);
      setAttachments(a => [...a, {
        _apiId: att.id,
        name: att.title,
        size: `${(att.file_size / 1024 / 1024).toFixed(1)} MB`,
        date: "Just now",
        downloadUrl: att.download_url,
      }]);
      qc.invalidateQueries({ queryKey: ["attachments", docId] });
      toast.success("File uploaded");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addComment = async (data) => {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
    // Картинки на бэке не хранятся — показываем их только локально
    if (data.images?.length) {
      setComments(c => [...c, { images: data.images, time }]);
    }
    if (docId && data.text?.trim()) {
      // Текст сохраняется на бэк и подтянется из apiComments — локально НЕ дублируем
      try {
        await apiAddComment(docId, { content: data.text, document: docId });
        qc.invalidateQueries({ queryKey: ["comments", docId] });
      } catch {}
    } else if (data.text?.trim()) {
      // Нет документа (черновик) — показываем локально
      setComments(c => [...c, { text: data.text, time }]);
    }
  };

  const docTypeColors = {
    ".doc": { color:"#2563EB", bg:"#DBEAFE", ext:"DOC" },
    ".pdf": { color:"#EF4444", bg:"#FEE2E2", ext:"PDF" },
    ".xls": { color:"#16A34A", bg:"#DCFCE7", ext:"XLS" },
    ".ppt": { color:"#EA580C", bg:"#FFEDD5", ext:"PPT" },
  };
  const getDocType = (name) => {
    const ext = Object.keys(docTypeColors).find(e => name?.toLowerCase().endsWith(e));
    return docTypeColors[ext] || { color:"#6366F1", bg:"#EEF2FF", ext:"FILE" };
  };

  return (
    <>
      {showPdfSign && (
        <PdfSignModal
          docId={docId}
          title={title}
          signatureData={user?.signature_data}
          onClose={() => setShowPdfSign(false)}
          onSigned={() => {
            setShowPdfSign(false);
            qc.invalidateQueries({ queryKey: ["document", docId] });
            qc.invalidateQueries({ queryKey: ["signatures", docId] });
            qc.invalidateQueries({ queryKey: ["versions", docId] });
            qc.invalidateQueries({ queryKey: ["tasks"] });
            qc.invalidateQueries({ queryKey: ["documents"] });
            setTimeout(onClose, 400);
          }}
        />
      )}
    <div className="dm-overlay" onClick={onClose}>
      <style>{css}</style>

      {/* ── Attachment preview lightbox ───────────────────────────── */}
      {previewAtt && (() => {
        const name  = previewAtt.name || "";
        const ext   = name.split(".").pop()?.toLowerCase() || "";
        const isImg = ["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext);
        const isPdf = ext === "pdf";
        const dt    = getDocType(name);

        return (
          <div className="dm-att-overlay" onClick={() => setPreviewAtt(null)}>
            <div className="dm-att-box" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="dm-att-head">
                <div className="dm-att-head-icon" style={{ background:dt.bg }}>
                  <span style={{ fontSize:8,fontWeight:800,color:dt.color }}>{dt.ext}</span>
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div className="dm-att-head-title">{name}</div>
                  {previewAtt.size && (
                    <div style={{ fontSize:11,color:"#9CA3AF",marginTop:1 }}>{previewAtt.size}{previewAtt.date ? ` · ${previewAtt.date}` : ""}</div>
                  )}
                </div>
                {previewAtt.downloadUrl && (
                  <a href={previewAtt.downloadUrl} target="_blank" rel="noreferrer"
                    style={{ display:"flex",alignItems:"center",gap:5,background:"#EFF6FF",color:"#2563EB",border:"1px solid #BFDBFE",borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:600,textDecoration:"none",flexShrink:0 }}
                    onClick={e => e.stopPropagation()}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="13" height="13"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download
                  </a>
                )}
                <button className="dm-att-close" onClick={() => setPreviewAtt(null)} style={{ marginLeft:8 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Body */}
              <div className="dm-att-body">
                {isImg && previewAtt.downloadUrl ? (
                  <img src={previewAtt.downloadUrl} alt={name}
                    style={{ maxWidth:"100%",maxHeight:"calc(100vh - 160px)",objectFit:"contain",borderRadius:4 }}/>
                ) : isPdf && previewAtt.downloadUrl ? (
                  <iframe src={previewAtt.downloadUrl} title={name}
                    style={{ width:"100%",height:"calc(100vh - 160px)",border:"none" }}/>
                ) : (
                  <div className="dm-att-download">
                    <div style={{
                      width:64,height:64,borderRadius:14,background:dt.bg,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:14,fontWeight:800,color:dt.color,
                    }}>
                      {dt.ext}
                    </div>
                    <div style={{ fontSize:15,fontWeight:600,color:"#111827" }}>{name}</div>
                    <div style={{ fontSize:12,color:"#9CA3AF" }}>
                      Preview is not available for this file type.<br/>Click Download to open it.
                    </div>
                    {previewAtt.downloadUrl && (
                      <a href={previewAtt.downloadUrl} target="_blank" rel="noreferrer"
                        style={{ display:"inline-flex",alignItems:"center",gap:8,background:"#2563EB",color:"#fff",borderRadius:9,padding:"10px 24px",fontSize:14,fontWeight:600,textDecoration:"none" }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        Download file
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="dm-modal" onClick={e=>e.stopPropagation()}>

        {/* Header breadcrumb */}
        <div className="dm-header">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
          <span>Project Workspace</span>
          <span className="dm-header-sep">/</span>
          <span>Managed Projects</span>
          <span className="dm-header-sep">/</span>
          <span className="active">{projectName || "Contract Approval Workflow"} Projects</span>
          {!readOnly && !isEditor && (
            <button onClick={handleSave} disabled={saving}
              style={{ display:"flex",alignItems:"center",gap:4,padding:"4px 12px",background:saved?"#16A34A":"#2563EB",color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:600,cursor:saving?"not-allowed":"pointer",marginRight:8,transition:"background .2s" }}>
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </button>
          )}
          <button className="dm-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="dm-body">
          {/* LEFT */}
          <div className="dm-left">
            {/* Title */}
            <div className="dm-title-row">
              {(readOnly || isEditor)
                ? <div className="dm-title" style={{ cursor:"default",border:"none" }}>{title}</div>
                : <input className="dm-title" value={title} onChange={e=>setTitle(e.target.value)}/>
              }
              {!readOnly && !isEditor && <svg viewBox="0 0 24 24" fill="none" stroke="#FBBF24" strokeWidth="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
            </div>

            {/* Meta */}
            <div className="dm-meta-grid">
              <div className="dm-meta-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
                <span className="dm-meta-label">Status</span>
                {(readOnly || isEditor)
                  ? <span className={status==="COMPLETED"||status==="Completed"?"ad-badge-done":"ad-badge-ip"}>{status||doc?.status||"IN PROGRESS"}</span>
                  : <StatusPicker value={status} onChange={setStatus}/>
                }
              </div>
              <div className="dm-meta-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="14" height="14"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
                <span className="dm-meta-label">Priority</span>
                {(readOnly || isEditor)
                  ? <span className="dm-meta-btn" style={{ cursor:"default" }}>{priority || "Empty"}</span>
                  : <div style={{ position:"relative" }}>
                      <button className="dm-meta-btn" onClick={()=>setShowPriDd(v=>!v)}>
                        {priority}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="9 6 15 12 9 18"/></svg>
                      </button>
                      {showPriDd && (
                        <>
                          <div style={{ position:"fixed",inset:0,zIndex:9500 }} onClick={()=>setShowPriDd(false)}/>
                          <div className="dm-status-popup" style={{ position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:9600,width:130 }}>
                            {PRIORITIES.map(p=>(
                              <div key={p} className="dm-status-item" onClick={()=>{ setPriority(p); setShowPriDd(false); }}
                                style={{ color:p===priority?"#2563EB":"#374151", fontWeight:p===priority?600:400 }}>
                                {p}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                }
              </div>
              <div className="dm-meta-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span className="dm-meta-label">Due date</span>
                {(readOnly || isEditor)
                  ? <span className="dm-deadline-btn" style={{ cursor:"default" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      {(dueDate || dueStartDate) ? fmtDateRange(dueStartDate, dueDate) : (doc?.deadline || "—")}
                    </span>
                  : <div style={{ position:"relative" }}>
                      <button ref={dueBtnRef}
                        className={`dm-deadline-btn${(dueDate || dueStartDate) ? "" : " empty"}`}
                        onClick={() => {
                          if (dueBtnRef.current) {
                            const r = dueBtnRef.current.getBoundingClientRect();
                            setDueDlPos({ top: r.bottom + 6, left: r.left, buttonHeight: r.height });
                          }
                          setShowDueDl(v => !v);
                        }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        {(dueDate || dueStartDate) ? fmtDateRange(dueStartDate, dueDate) : "Empty"}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      {showDueDl && (
                        <RangeDeadlinePicker
                          startValue={dueStartDate}
                          endValue={dueDate}
                          pos={dueDlPos}
                          onChange={({ start, end }) => { setDueStartDate(start); setDueDate(end); }}
                          onClose={() => setShowDueDl(false)}
                        />
                      )}
                    </div>
                }
              </div>
              <div className="dm-meta-row">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span className="dm-meta-label">Assignees</span>
                {(readOnly || isEditor)
                  ? <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      {assignees.length === 0 ? (
                        <span style={{ fontSize:12.5, color:"#9CA3AF" }}>—</span>
                      ) : (
                        <>
                          <div style={{ display:"flex", alignItems:"center" }}>
                            {assignees.slice(0,4).map((a, i) => (
                              <div key={a.id} style={{ marginLeft: i===0 ? 0 : -6, border:"2px solid #fff", borderRadius:"50%" }}>
                                <MiniAv member={a} size={22}/>
                              </div>
                            ))}
                            {assignees.length > 4 && (
                              <div style={{ marginLeft:-6, width:22, height:22, borderRadius:"50%", background:"#E5E7EB", color:"#6B7280", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:600, border:"2px solid #fff" }}>
                                +{assignees.length - 4}
                              </div>
                            )}
                          </div>
                          <span style={{ fontSize:12.5, color:"#374151" }}>
                            {assignees.length === 1 ? assignees[0].name : `${assignees.length} people`}
                          </span>
                        </>
                      )}
                    </div>
                  : <div style={{ position:"relative" }}>
                      <button className="dm-meta-btn" onClick={()=>setShowAsnDd(v=>!v)} style={{ display:"flex",alignItems:"center",gap:5 }}>
                        {assignees.length === 0 ? (
                          "Empty"
                        ) : (
                          <>
                            <div style={{ display:"flex", alignItems:"center" }}>
                              {assignees.slice(0,3).map((a, i) => (
                                <div key={a.id} style={{ marginLeft: i===0 ? 0 : -5, border:"1.5px solid #fff", borderRadius:"50%" }}>
                                  <MiniAv member={a} size={18}/>
                                </div>
                              ))}
                            </div>
                            <span>{assignees.length === 1 ? assignees[0].name.split(" ")[0] : `${assignees.length} selected`}</span>
                          </>
                        )}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="9 6 15 12 9 18"/></svg>
                      </button>
                      {showAsnDd && (
                        <>
                          <div style={{ position:"fixed",inset:0,zIndex:9500 }} onClick={()=>setShowAsnDd(false)}/>
                          <div className="dm-assignee-popup" style={{ position:"absolute",top:"calc(100% + 4px)",left:0,zIndex:9600 }}>
                            <div style={{ padding:"6px 12px 4px",fontSize:11,color:"#9CA3AF",fontWeight:500,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                              <span>Select assignees</span>
                              {assignees.length > 0 && (
                                <button onClick={()=>setAssignees([])} style={{ background:"none",border:"none",color:"#6B7280",fontSize:11,cursor:"pointer",fontFamily:"inherit",padding:0 }}>Clear</button>
                              )}
                            </div>
                            {membersList.length === 0 && <div style={{ padding:"6px 12px",fontSize:12,color:"#9CA3AF" }}>No members</div>}
                            {membersList.map(m => {
                              const isSel = assignees.some(a => String(a.id) === String(m.id));
                              return (
                                <div key={m.id} className={`dm-assignee-item${isSel?" selected":""}`}
                                  onClick={() => {
                                    setAssignees(prev => isSel
                                      ? prev.filter(a => String(a.id) !== String(m.id))
                                      : [...prev, m]
                                    );
                                  }}>
                                  <input type="checkbox" readOnly checked={isSel}
                                    style={{ width:14, height:14, accentColor:"#2563EB", cursor:"pointer", flexShrink:0 }}/>
                                  <MiniAv member={m}/>
                                  <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{m.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                }
              </div>
            </div>

            {/* Tabs */}
            <div className="dm-tabs">
              <button className={`dm-tab${activeTab==="task"?" active":""}`} onClick={()=>setActiveTab("task")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {readOnly ? "My Task" : "Task Details"}
              </button>
              <button className={`dm-tab${activeTab==="workflow"?" active":""}`} onClick={()=>setActiveTab("workflow")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Workflow Process
              </button>
            </div>

            <div key={activeTab} className="app-fade-in">
            {activeTab==="task" && (
              <>
                {/* Description */}
                <div className="dm-section">
                  <div className="dm-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" width="14" height="14"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/></svg>
                    Description
                  </div>
                  {(readOnly || isEditor)
                    ? <div className="dm-desc-view" style={{ cursor:"default", padding:"8px 0", minHeight:50 }}>
                        {desc
                          ? <div dangerouslySetInnerHTML={{ __html: desc }} style={{ fontSize:13, color:"#374151", lineHeight:1.7 }}/>
                          : <span style={{ color:"#9CA3AF", fontSize:13 }}>No description.</span>
                        }
                      </div>
                    : <DescEditor value={desc} onChange={setDesc}/>
                  }
                </div>

                {/* Main Document (read-only view of the assigned file) */}
                {readOnly && (() => {
                  const dt = fileTypeInfo(doc?.file_type);
                  return (
                    <div className="dm-section">
                      <div className="dm-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Main Document
                      </div>
                      <div className="dm-attach-item" onClick={() => doc?.downloadUrl && setPreviewAtt({ name: doc.title||doc.name, downloadUrl: doc.downloadUrl, size: doc.size, date: doc.date })}>
                        <div className="dm-attach-icon" style={{ background:dt.bg }}>
                          <span style={{ fontSize:9,fontWeight:700,color:dt.color }}>{dt.ext}</span>
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,fontWeight:500,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{doc?.title || doc?.name}</div>
                          <div style={{ fontSize:11,color:"#9CA3AF",marginTop:1 }}>{doc?.size}{doc?.date ? ` · ${doc.date}` : ""}</div>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.8" width="15" height="15" style={{ flexShrink:0 }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </div>
                    </div>
                  );
                })()}

                {/* Attachments */}
                {!readOnly && <div className="dm-section">
                  <div className="dm-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" width="14" height="14"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    Attachments
                  </div>
                  {attachments.map((a,i)=>{
                    const dt = getDocType(a.name);
                    return (
                      <div key={i} className="dm-attach-item" onClick={() => setPreviewAtt(a)}>
                        {/* Square file-type icon */}
                        <div className="dm-attach-icon" style={{ background:dt.bg }}>
                          <span style={{ fontSize:9,fontWeight:700,color:dt.color }}>{dt.ext}</span>
                        </div>
                        {/* File info */}
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:13,fontWeight:500,color:"#374151",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.name}</div>
                          <div style={{ fontSize:11,color:"#9CA3AF",marginTop:1 }}>{a.size}{a.date ? ` · ${a.date}` : ""}</div>
                        </div>
                        {/* Eye icon hint */}
                        <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.8" width="15" height="15" style={{ flexShrink:0,marginRight:4 }}>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        {isEditor
                          ? <span style={{ fontSize:11.5,color:"#2563EB",fontWeight:500,flexShrink:0 }} onClick={e=>e.stopPropagation()}>
                              <a href={a.downloadUrl} target="_blank" rel="noreferrer"
                                style={{ color:"#2563EB",textDecoration:"none" }}>
                                Download
                              </a>
                            </span>
                          : <button className="dm-attach-del"
                              onClick={async(e)=>{
                                e.stopPropagation();
                                const att=attachments[i];
                                if(att?._apiId&&docId){try{await apiDeleteAttachment(docId,att._apiId);qc.invalidateQueries({queryKey:["attachments",docId]});}catch{}}
                                setAttachments(at=>at.filter((_,j)=>j!==i));
                              }}>Delete</button>
                        }
                      </div>
                    );
                  })}
                  {!isEditor && <>
                    <input ref={fileRef} type="file" style={{ display:"none" }} onChange={handleFileUpload}/>
                    <button className="dm-attach-link" disabled={uploading} onClick={()=>!uploading&&fileRef.current?.click()}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" width="14" height="14"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                      {uploading ? "Uploading…" : "Select or drag your file here"}
                    </button>
                  </>}
                </div>}

                {/* Signing card — only in readOnly (Assigned Documents view) */}
                {readOnly && (() => {
                  const myTask = doc?._task;
                  const isMyTurn = myTask?.status === "in_progress";
                  const kind = myTask?.request_type === "signature" ? "Signing"
                             : myTask?.request_type === "approval"  ? "Approval"
                             : myTask?.request_type === "review"    ? "Review"
                             : "Task";
                  return (
                    <div className="dm-section">
                      <style>{`
                        .adm-mytask{display:flex;align-items:flex-start;gap:14px;margin-top:6px}
                        .adm-mytask-icon{width:36px;height:36px;border-radius:50%;background:#FEF3C7;border:1.5px solid #FCD34D;display:flex;align-items:center;justify-content:center;color:#D97706;flex-shrink:0}
                        .adm-mytask-card{flex:1;display:flex;align-items:center;justify-content:space-between;border:1px solid #E5E7EB;border-radius:12px;padding:16px 18px;background:#fff;transition:all .15s}
                        .adm-mytask-card.active{cursor:pointer}
                        .adm-mytask-card.active:hover{border-color:#2563EB;box-shadow:0 2px 12px rgba(37,99,235,0.08)}
                        .adm-mytask-title{font-size:14.5px;font-weight:600;color:#111827;margin-bottom:3px}
                        .adm-mytask-title.muted{color:#9CA3AF;font-weight:500}
                        .adm-mytask-sub{font-size:12.5px;color:#9CA3AF}
                      `}</style>
                      <div className="adm-mytask">
                        <div className="adm-mytask-icon">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="17" height="17"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        </div>
                        <div className={`adm-mytask-card${isMyTurn ? " active" : ""}`}>
                          <div>
                            <div className={`adm-mytask-title${isMyTurn ? "" : " muted"}`}>{kind}</div>
                            <div className="adm-mytask-sub">
                              {isMyTurn ? "Ваша очередь — выполните согласование" : "Waiting for completion of the examination"}
                            </div>
                          </div>
                          {isMyTurn && (kind === "Signing"
                            ? <button className="ai-btn ai-btn-blue" onClick={handleSign} disabled={approving} style={{ flexShrink:0 }}>
                                {approving ? <span className="ai-spin"/> : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="14" height="14"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                                )}
                                Подписать
                              </button>
                            : <button className="ai-btn ai-btn-blue" onClick={handleApprove} disabled={approving} style={{ flexShrink:0 }}>
                                {approving ? <span className="ai-spin"/> : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
                                )}
                                Согласовать
                              </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Subtasks: показываем редактору всегда (в т.ч. в назначенном
                   документе, чтобы он мог их выполнять). Скрыты только у подписанта. */}
                {(!readOnly || isEditor) && <div className="dm-section">
                  <div className="dm-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                    Subtasks
                  </div>
                  {isEditor
                    ? subtasks.filter(st => st.name?.trim()).map((st, i) => (
                        <div key={st.id} className={`dm-subtask-row${st.status==="done"?" completed":""}`}>
                          <span className="dm-subtask-num">{i + 1}</span>
                          {st.mode === "edit"
                            ? <input className="dm-subtask-name" value={st.name}
                                autoFocus
                                onChange={e => updateSubtask(st.id, { name: e.target.value })}
                                onKeyDown={e => { if (e.key==="Enter") updateSubtask(st.id, { mode:"action" }); }}/>
                            : <span style={{ flex:1,fontSize:13,fontWeight:500,
                                color:st.status==="done"?"#6B7280":"#374151",
                                textDecoration:st.status==="done"?"line-through":"none" }}>
                                {st.name}
                              </span>
                          }
                          {(st.start_date || st.deadline) && (
                            <span style={{ fontSize:11,color:"#6B7280",display:"flex",alignItems:"center",gap:4,flexShrink:0 }}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                              {fmtDateRange(st.start_date, st.deadline)}
                            </span>
                          )}
                          {st.assignee && <MiniAv member={st.assignee} size={22}/>}
                          {st.status === "done"
                            ? <span className="dm-subtask-done">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" width="12" height="12"><polyline points="20 6 9 17 4 12"/></svg>
                                Completed
                              </span>
                            : <div style={{ position:"relative" }}>
                                <button className="dm-action-btn"
                                  onClick={() => updateSubtask(st.id, { showActionDd: !st.showActionDd })}>
                                  Actions
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="10" height="10"><polyline points="6 9 12 15 18 9"/></svg>
                                </button>
                                {st.showActionDd && (
                                  <>
                                    <div style={{ position:"fixed",inset:0,zIndex:9600 }} onClick={() => updateSubtask(st.id, { showActionDd: false })}/>
                                    <div className="dm-action-dd">
                                      <button className="dm-action-dd-item"
                                        onClick={() => updateSubtask(st.id, { mode:"edit", showActionDd: false })}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        Edit
                                      </button>
                                      <button className="dm-action-dd-item complete"
                                        onClick={() => { updateSubtask(st.id, { showActionDd: false }); handleCompleteSubtask(st); }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" width="13" height="13"><polyline points="20 6 9 17 4 12"/></svg>
                                        Completed
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                          }
                        </div>
                      ))
                    : subtasks.map((st, i) => {
                        const prevDeadline = i > 0 ? subtasks[i-1].deadline : null;
                        return (
                          <SubtaskRow key={st.id} subtask={st} index={i}
                            isFirst={i === 0}
                            onChange={data => updateSubtask(st.id, data)}
                            onDelete={() => deleteSubtask(st.id)}
                            onAddNext={addSubtask}
                            onSaveAndClose={() => { handleSave(); setTimeout(onClose, 300); }}
                            onComplete={handleCompleteSubtask}
                            members={membersList}
                            defaultStart={prevDeadline || dueStartDate || null}
                            minDate={null}
                            maxDate={null}/>
                        );
                      })
                  }
                </div>}
              </>
            )}

            {activeTab==="workflow" && (
              <WorkflowTab
                members={membersData}
                signatures={signaturesData}
                docStatus={DISPLAY_TO_API_STATUS[status] || apiDoc?.status || doc?.status || "draft"}
                uploaderName={apiDoc?.uploaded_by_name || ""}
                uploadDate={apiDoc?.created_at || doc?.created_at || ""}
                subtasks={subtasks}
                attachmentsCount={attachments.length}
                docId={docId}
                userRole={userRole}
                onStatusChange={(newStatus) => setStatus(newStatus)}
              />
            )}
            </div>

          </div>

          {/* RIGHT — Activity */}
          <div className="dm-right">
            <ActivityPanel comments={comments} onComment={addComment} apiComments={apiComments} workspaceId={workspaceId} docId={docId}/>
          </div>
        </div>

      </div>
    </div>
    </>
  );
}


/* ══════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════ */
const AV_COLORS = ["#60A5FA","#F87171","#34D399","#FBBF24","#A78BFA","#F472B6","#FB923C"];

/* ══════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════ */
const prCss = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{width:100%;height:100%;overflow:hidden;margin:0;padding:0}
  button{font-family:'Gilroy','Segoe UI',sans-serif;cursor:pointer}
  button:hover{opacity:unset}
  input,textarea{font-family:'Gilroy','Segoe UI',sans-serif}

  .pr-page{display:flex;flex-direction:column;width:100vw;height:100vh;font-family:'Gilroy','Segoe UI',sans-serif;letter-spacing:0.02em;background:#EEEDF0;overflow:hidden}

  /* ── HEADER ── */
  .pr-topbar{display:flex;align-items:center;padding:0 20px;height:52px;gap:10px;flex-shrink:0;background:#fff;border-bottom:.5px solid #E5E7EB;z-index:30}
  .pr-body{display:flex;flex:1;overflow:hidden;min-height:0}

  /* ── SIDEBAR ── */
  .pr-sb{
    width:268px;flex-shrink:0;background:#fff;
    border-right:.5px solid #E5E7EB;
    display:flex;flex-direction:column;align-items:stretch;
    padding:0 0 14px;height:100%;
    transition:width .28s cubic-bezier(.4,0,.2,1);
    overflow:hidden;z-index:20;
  }
  .pr-sb.closed{width:60px;align-items:center}

  /* profile banner */
  .pr-profile{background:#2563EB;width:100%;display:flex;flex-direction:column;align-items:center;padding:10px 0 32px;flex-shrink:0;position:relative}
  .pr-toggle{position:absolute;top:8px;left:8px;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.18);border:none;color:#fff;cursor:pointer;flex-shrink:0}
  .pr-toggle:hover{background:rgba(255,255,255,0.32)}
  .pr-toggle svg{transition:transform .28s}
  .pr-sb.closed .pr-toggle svg{transform:rotate(180deg)}
  .pr-avatar{display:block;position:absolute;bottom:-30px;left:50%;transform:translateX(-50%);width:60px;height:60px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.12);z-index:1}
  .pr-sb.closed .pr-avatar{display:none}
  .pr-profile-info{display:block;text-align:center;padding:36px 12px 4px;flex-shrink:0}
  .pr-sb.closed .pr-profile-info{display:none}
  .pr-org{display:flex;align-items:center;gap:6px;margin:4px 10px 6px;border:.5px solid #E5E7EB;border-radius:10px;padding:5px 10px;cursor:pointer;flex-shrink:0;transition:border-color .15s}
  .pr-org:hover{border-color:#2563EB}
  .pr-sb.closed .pr-org{display:none}

  /* nav */
  .pr-navlist{display:flex;flex-direction:column;flex:1;width:100%;gap:1px;padding:4px 8px}
  .pr-sb.closed .pr-navlist{align-items:center;padding:4px 0}
  .pr-navitem{width:100%;height:36px;border-radius:12px;display:flex;align-items:center;gap:10px;padding:0 10px;font-size:13px;color:#6B7280;border:1.5px solid transparent;background:none;font-family:inherit;transition:background .15s,color .15s,border-color .15s;cursor:pointer;text-align:left}
  .pr-sb.closed .pr-navitem{width:42px;height:38px;border-radius:10px;justify-content:center;padding:0;gap:0}
  .pr-navitem:hover{background:#EFF6FF;color:#2563EB;border-color:#2563EB}
  .pr-navitem.active{background:#EEF2FF;color:#4F46E5;font-weight:500;border-color:transparent}
  .pr-navlabel{flex:1;text-align:left;white-space:nowrap}
  .pr-sb.closed .pr-navlabel{display:none}
  .pr-navchev{flex-shrink:0}
  .pr-sb.closed .pr-navchev{display:none}

  /* bottom */
  .pr-sbbottom{margin-top:auto;padding:0 8px;flex-shrink:0;display:flex;justify-content:center}
  .pr-addbtn{width:42px;height:42px;background:#2563EB;color:#fff;border:none;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;overflow:hidden;transition:width .28s cubic-bezier(.4,0,.2,1);flex-shrink:0;padding:0}
  .pr-sb:not(.closed) .pr-addbtn{width:100%;justify-content:flex-start;padding:0 14px}
  .pr-addbtn:hover{background:#1D4ED8}
  .pr-addbtn-plus{transition:transform .28s;flex-shrink:0}
  .pr-sb:not(.closed) .pr-addbtn-plus{transform:rotate(180deg)}
  .pr-addbtn-label{display:none;white-space:nowrap}
  .pr-sb:not(.closed) .pr-addbtn-label{display:block}

  /* ── MAIN ── */
  .pr-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;background:#EEEDF0}
  .pr-container{flex:1;margin:0 12px 12px 6px;background:#fff;border-radius:16px;display:flex;flex-direction:column;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden;min-height:0}
  .pr-inner{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent}
  .pr-inner::-webkit-scrollbar{width:4px}
  .pr-inner::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}

  /* tabs */
  .pr-tabs{display:flex;border-bottom:.5px solid #E5E7EB;flex-shrink:0;padding:0 20px}
  .pr-tab{padding:12px 16px;font-size:13px;color:#9CA3AF;border:none;background:none;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-.5px;font-weight:500;white-space:nowrap}
  .pr-tab.active{color:#2563EB;border-bottom-color:#2563EB}
  .pr-tab:hover:not(.active){color:#6B7280}

  /* table */
  .pr-table{width:100%;border-collapse:collapse}
  .pr-table th{font-size:12px;color:#9CA3AF;font-weight:500;padding:10px 14px;text-align:left;border-bottom:.5px solid #F3F4F6}
  .pr-table td{font-size:13px;color:#374151;padding:12px 14px;border-bottom:.5px solid #F9FAFB;vertical-align:middle}
  .pr-table tr:last-child td{border-bottom:none}
  .pr-table tbody tr:hover td{background:#FAFAFA}

  /* status badges */
  .s-active{background:#DCFCE7;color:#166534;border:.5px solid #86EFAC;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
  .s-inactive{background:#FEE2E2;color:#991B1B;border:.5px solid #FCA5A5;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
  .s-completed{background:#DBEAFE;color:#1D4ED8;border:.5px solid #93C5FD;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-flex;align-items:center;gap:4px}
  .ds-prog{background:#DBEAFE;color:#1D4ED8;border:.5px solid #93C5FD;padding:3px 9px;border-radius:6px;font-size:10.5px;font-weight:600}
  .ds-done{background:#DCFCE7;color:#166534;border:.5px solid #86EFAC;padding:3px 9px;border-radius:6px;font-size:10.5px;font-weight:600}
  .ds-todo{background:#F3F4F6;color:#6B7280;border:.5px solid #E5E7EB;padding:3px 9px;border-radius:6px;font-size:10.5px;font-weight:600}

  /* modal */
  .pr-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:9999;display:flex;align-items:center;justify-content:center}
  .pr-modal{background:#fff;border-radius:16px;padding:28px;width:460px;max-width:95vw;position:relative;max-height:90vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.18)}
  .pr-modal h2{font-size:18px;font-weight:700;color:#111827;margin-bottom:20px;text-align:center}
  .pr-modal-x{position:absolute;top:16px;right:16px;background:none;border:none;color:#9CA3AF;display:flex;align-items:center}
  .pr-label{font-size:13px;font-weight:500;color:#374151;margin-bottom:5px;display:block}
  .pr-input{width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:9px 12px;font-size:13px;color:#374151;outline:none;font-family:inherit;transition:border-color .2s}
  .pr-input:focus{border-color:#2563EB}
  .pr-textarea{width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:9px 12px;font-size:13px;color:#374151;outline:none;font-family:inherit;resize:vertical;min-height:80px;transition:border-color .2s}
  .pr-textarea:focus{border-color:#2563EB}
  .pr-dropzone{border:1.5px dashed #93C5FD;border-radius:8px;padding:20px;text-align:center;cursor:pointer;background:#EFF6FF}
  .pr-dropzone:hover{background:#DBEAFE}
  .pr-btn{width:100%;background:#2563EB;color:#fff;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:4px}
  .pr-btn:hover{background:#1D4ED8}
  .pr-m-row{display:flex;gap:10px;align-items:flex-start;margin-bottom:8px}
  .pr-m-input{flex:1;border:1.5px solid #E5E7EB;border-radius:8px;padding:9px 12px;font-size:13px;color:#374151;outline:none;font-family:inherit}
  .pr-m-input:focus{border-color:#2563EB}
  .pr-m-rm{width:36px;height:38px;border:1.5px solid #FECACA;border-radius:8px;background:none;color:#EF4444;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .pr-m-rm:disabled{border-color:#E5E7EB;color:#D1D5DB;cursor:not-allowed}
  .pr-m-add{width:100%;border:1.5px dashed #93C5FD;border-radius:8px;background:rgba(37,99,235,.05);color:#2563EB;padding:10px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;margin-top:4px}

  /* avatar */
  .av-stack{display:flex;align-items:center}
  .av-stack .av{width:26px;height:26px;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;margin-left:-6px;flex-shrink:0}
  .av-stack .av:first-child{margin-left:0}

  /* progress */
  .pr-prog{height:4px;background:#E5E7EB;border-radius:2px;width:80px;overflow:hidden}
  .pr-prog-fill{height:100%;background:#2563EB;border-radius:2px}

  /* empty */
  .pr-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;padding:60px 20px;text-align:center;min-height:400px}

  /* assigned docs / archive */
  .ad-file-icon{width:36px;height:40px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}
  .ad-badge-ip{background:#DBEAFE;color:#1D4ED8;border:.5px solid #93C5FD;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:600;display:inline-block;white-space:nowrap}
  .ad-badge-done{background:#DCFCE7;color:#166534;border:.5px solid #86EFAC;padding:3px 9px;border-radius:20px;font-size:10.5px;font-weight:600;display:inline-block;white-space:nowrap}
  .ad-prog-bar{height:4px;background:#E5E7EB;border-radius:2px;width:70px;overflow:hidden;margin-top:4px}
  .ad-prog-fill{height:100%;border-radius:2px}
  .ar-section-title{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#374151;margin:20px 4px 10px;padding:0 10px}

  /* calendar */
  .cal-cell{border-right:.5px solid #E5E7EB;border-bottom:.5px solid #E5E7EB;padding:6px;background:#fff;min-height:100px}
  .cal-event{background:#fff;border-radius:6px;padding:3px 6px;font-size:10.5px;color:#374151;box-shadow:0 1px 4px rgba(0,0,0,.08);margin-bottom:3px;border-left:2px solid #2563EB}

  /* overlay */
  .pr-sb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:15}

  /* spinner (shared, e.g. AI generate) */
  .ai-spin{width:13px;height:13px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:aiSpin .7s linear infinite;flex-shrink:0;display:inline-block}
  @keyframes aiSpin{to{transform:rotate(360deg)}}

  @media(max-width:768px){
    .pr-page{ width:100%; height:100svh }
    .pr-sb{display:none}
    .pr-sb:not(.closed){display:flex;position:fixed;top:0;left:0;bottom:0;height:100%;width:242px!important;box-shadow:4px 0 24px rgba(0,0,0,.13)}
    .pr-sb-overlay.show{display:block}
    .pr-container{margin:0 6px 78px 6px;border-radius:12px}
    .pr-topbar{padding:0 12px;gap:6px;font-size:12.5px;height:48px}
    .pr-topbar img{height:22px}
    .pr-topbar button{ padding:4px 8px!important; font-size:11.5px!important }
    /* tables → horizontal scroll wrapper */
    .ad-list-scroll, .pr-list-scroll{ overflow-x:auto }
    table{ min-width:560px }
    /* calendar cells smaller */
    .cal-cell{ min-height:64px; padding:4px }
    .cal-event{ font-size:9.5px; padding:2px 4px }
    /* member-invite rows wrap */
    .pr-m-row{ flex-wrap:wrap; gap:6px }
    .pr-m-row > div, .pr-m-row > select{ flex:1 1 100%!important }
    .pr-m-row > .pr-m-rm{ flex:0 0 auto }
    .ar-section-title{ font-size:13px; margin:14px 4px 8px }
  }
  @media(max-width:480px){
    .pr-container{ margin:0 4px 78px 4px }
    .pr-topbar{ padding:0 10px }
  }
`;

/* ══════════════════════════════════════════════════════════
  HELPERS
══════════════════════════════════════════════════════════ */
function AvatarStack({ members, extra=0 }) {
  // Поддерживает строки (инициалы) и объекты { initials, avatar_url }
  return (
    <div className="av-stack">
      {members.slice(0,3).map((m,i)=>{
        const isObj = m && typeof m === "object";
        const url   = isObj ? m.avatar_url : null;
        const label = isObj ? (m.initials || "?") : m;
        return (
          <div key={i} className="av"
            style={{ background: url ? "#E5E7EB" : AV_COLORS[i%AV_COLORS.length], zIndex:3-i, overflow:"hidden" }}>
            {url
              ? <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : label}
          </div>
        );
      })}
      {extra>0 && <div className="av" style={{ background:"#E5E7EB",color:"#6B7280",zIndex:0 }}>+{extra}</div>}
    </div>
  );
}

function MemberInvite({ members, setMembers, errors, setErrors }) {
  const { t } = useTranslation();
  const update=(i,f,v)=>{setMembers(m=>m.map((x,j)=>j===i?{...x,[f]:v}:x));if(errors)setErrors(e=>e.map((x,j)=>j===i?{...x,[f]:""}:x));};
  const add=()=>{if(members.length<7)setMembers(m=>[...m,{email:"",role:"viewer"}]);};
  const remove=(i)=>{if(members.length<=1)return;setMembers(m=>m.filter((_,j)=>j!==i));if(errors)setErrors(e=>e.filter((_,j)=>j!==i));};
  return (
    <div>
      <div style={{ display:"flex",gap:10,marginBottom:6 }}>
        <div style={{ flex:1,fontSize:12,fontWeight:500,color:"#374151" }}>{t("auth.email")} <span style={{ color:"#EF4444" }}>*</span></div>
        <div style={{ flex:1,fontSize:12,fontWeight:500,color:"#374151" }}>{t("projects.role")}</div>
        <div style={{ width:36 }}/>
      </div>
      {members.map((m,i)=>(
        <div key={i} className="pr-m-row">
          <div style={{ flex:1,display:"flex",flexDirection:"column",gap:3 }}>
            <input className="pr-m-input" placeholder="ex: example@gmail.com" value={m.email}
              onChange={e=>update(i,"email",e.target.value)}
              style={{ borderColor:errors?.[i]?.email?"#EF4444":"#E5E7EB" }}/>
            {errors?.[i]?.email&&<span style={{ fontSize:11,color:"#EF4444" }}>{errors[i].email}</span>}
          </div>
          <select value={m.role||"viewer"} onChange={e=>update(i,"role",e.target.value)}
            style={{ flex:1,border:"1.5px solid #E5E7EB",borderRadius:8,padding:"9px 10px",fontSize:13,color:"#374151",fontFamily:"inherit",background:"#fff",cursor:"pointer",outline:"none" }}>
            <option value="viewer">{t("projects.roles.viewer")}</option>
            <option value="editor">{t("projects.roles.editor")}</option>
            <option value="signer">{t("projects.roles.signer")}</option>
          </select>
          <button className="pr-m-rm" onClick={()=>remove(i)} disabled={members.length<=1}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      ))}
      {members.length<7&&(
        <button className="pr-m-add" onClick={add}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t("projects.addMember")}
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
  NEW PROJECT MODAL
══════════════════════════════════════════════════════════ */
function NewProjectModal({ onClose, onCreate }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({name:"",desc:"",docName:""});
  const [file,setFile]=useState(null);
  const [members,setMembers]=useState([{email:"",role:"viewer"},{email:"",role:"viewer"}]);
  const [errors,setErrors]=useState([]);
  const [formErr,setFormErr]=useState({});
  const [creating,setCreating]=useState(false);
  const fileRef=useRef(null);
  const activeOrgId = useOrgStore(s => s.activeOrgId);
  const handleFile=(e)=>{const f=e.dataTransfer?.files[0]||e.target.files?.[0];if(f)setFile(f);};
  const next=()=>{const errs={};if(!form.name.trim())errs.name="Required.";if(!form.docName.trim())errs.docName="Required.";if(Object.keys(errs).length){setFormErr(errs);return;}setStep(2);};
  const create=async()=>{
    if(!activeOrgId){toast.error("Сначала создайте или выберите организацию в меню слева");return;}
    const errs=members.map(m=>({email:m.email&&!/\S+@\S+\.\S+/.test(m.email)?"Invalid email.":" "}));
    if(errs.some(e=>e.email&&e.email!=" ")){setErrors(errs);return;}
    setCreating(true);
    try {
      const ws = await createWorkspace({ title: form.name, description: form.desc, type: "corporate", organization: activeOrgId });

      // Upload initial document only if the user actually attached a file.
      // A synthesized text/plain blob with a .docx extension is not a valid
      // DOCX (zip) archive and breaks mammoth / python-docx on the backend.
      if (file) {
        try {
          const docTitle = form.docName.trim() || file.name.replace(/\.[^.]+$/, "");
          await serverUploadDocument(ws.id, docTitle, file);
          qc.invalidateQueries({ queryKey: ["documents", ws.id] });
        } catch (err) {
          toast.error("Project created, but document upload failed.");
        }
      }

      await Promise.allSettled(
        members.filter(m=>m.email?.trim()).map(m=>addMember(ws.id,{email:m.email,role:m.role||"viewer"}))
      );
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      onCreate({ ...form, id: ws.id });
      onClose();
    } catch(err) {
      toast.error(err?.response?.data?.detail || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className="pr-overlay" onClick={onClose}>
      <div className="pr-modal" onClick={e=>e.stopPropagation()}>
        <button className="pr-modal-x" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2>{step===1?t("projects.newProjectTitle"):t("projects.inviteMembers")}</h2>
        {step===1&&(
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div>
              <label className="pr-label">{t("projects.projectName")} <span style={{ color:"#EF4444" }}>*</span></label>
              <input className="pr-input" placeholder="ex: Contract Approval Workflow" value={form.name}
                onChange={e=>{setForm(f=>({...f,name:e.target.value}));setFormErr(er=>({...er,name:""}));}}
                style={{ borderColor:formErr.name?"#EF4444":"#E5E7EB" }}/>
              {formErr.name&&<span style={{ fontSize:11,color:"#EF4444" }}>{formErr.name}</span>}
            </div>
            <div>
              <label className="pr-label">{t("projects.description")}</label>
              <textarea className="pr-textarea" placeholder="ex: A project…" value={form.desc} onChange={e=>setForm(f=>({...f,desc:e.target.value}))}/>
            </div>
            <div>
              <label className="pr-label">{t("projects.firstDocumentName")} <span style={{ color:"#EF4444" }}>*</span></label>
              <input className="pr-input" placeholder="ex: Service Agreement" value={form.docName}
                onChange={e=>{setForm(f=>({...f,docName:e.target.value}));setFormErr(er=>({...er,docName:""}));}}
                style={{ borderColor:formErr.docName?"#EF4444":"#E5E7EB" }}/>
              {formErr.docName&&<span style={{ fontSize:11,color:"#EF4444" }}>{formErr.docName}</span>}
            </div>
            <div className="pr-dropzone" onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={handleFile}>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.xlsx" style={{ display:"none" }} onChange={handleFile}/>
              {file?(
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5" width="32" height="32"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span style={{ fontSize:13,color:"#374151",fontWeight:500 }}>{file.name}</span>
                </div>
              ):(
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5" width="28" height="28" style={{ margin:"0 auto 8px",display:"block" }}>
                    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                  </svg>
                  <span style={{ fontSize:13,color:"#6B7280" }}>{t("projects.dragDrop")}</span>
                </>
              )}
            </div>
            <button className="pr-btn" onClick={next}>{t("common.next")} →</button>
          </div>
        )}
        {step===2&&(
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <p style={{ fontSize:13,color:"#6B7280" }}>Invite team members to <strong style={{ color:"#111827" }}>{form.name}</strong>.</p>
            <MemberInvite members={members} setMembers={setMembers} errors={errors} setErrors={setErrors}/>
            <div style={{ display:"flex",gap:10,marginTop:4 }}>
              <button onClick={()=>setStep(1)} style={{ flex:1,border:"1.5px solid #E5E7EB",borderRadius:8,padding:11,fontSize:13,fontWeight:500,background:"#fff",color:"#374151",fontFamily:"inherit" }}>← {t("common.back")}</button>
              <button className="pr-btn" style={{ flex:2,marginTop:0 }} onClick={create} disabled={creating}>{creating?t("projects.creating"):t("projects.createProject")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
  EMPTY STATE
══════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════
  ASSIGNED DOCS EMPTY STATE
══════════════════════════════════════════════════════════ */
function AssignedDocsEmpty() {
  const { t } = useTranslation();
  return (
    <div className="pr-empty">
      <svg viewBox="0 0 200 150" fill="none" width="220" height="170" style={{ marginBottom:24 }}>
        {/* blob shadow */}
        <ellipse cx="100" cy="120" rx="60" ry="10" fill="#EEF2FF"/>
        {/* back paper (rotated left) */}
        <rect x="62" y="32" width="64" height="84" rx="4" fill="#fff" stroke="#D1D5DB" strokeWidth="1.5" transform="rotate(-10 94 74)"/>
        {/* middle paper (slight right) */}
        <rect x="72" y="34" width="64" height="84" rx="4" fill="#fff" stroke="#D1D5DB" strokeWidth="1.5" transform="rotate(6 104 76)"/>
        {/* front paper */}
        <rect x="78" y="38" width="64" height="84" rx="4" fill="#fff" stroke="#D1D5DB" strokeWidth="1.5"/>
        {/* decoration dots / plus signs */}
        <circle cx="40" cy="50" r="1.5" fill="#9CA3AF"/>
        <circle cx="52" cy="34" r="1.2" fill="#D1D5DB"/>
        <circle cx="170" cy="48" r="1.5" fill="#9CA3AF"/>
        <circle cx="160" cy="32" r="1.2" fill="#D1D5DB"/>
        <circle cx="178" cy="86" r="1.2" fill="#D1D5DB"/>
        <path d="M48 88 v6 M45 91 h6" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M156 96 v5 M153.5 98.5 h5" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round"/>
        <path d="M168 124 v4 M166 126 h4" stroke="#9CA3AF" strokeWidth="1" strokeLinecap="round"/>
      </svg>
      <p style={{ fontSize:15,fontWeight:600,color:"#111827",marginBottom:8 }}>{t("projects.noAssignedYet")}</p>
      <p style={{ fontSize:13,color:"#9CA3AF" }}>{t("projects.assignedHint")}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
  WORKSPACE MEMBERS AVATARS (lazy, deduped via React Query)
══════════════════════════════════════════════════════════ */
function WsMembersAvs({ workspaceId }) {
  const { data } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => getMembers(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
  const list = data?.results ?? (Array.isArray(data) ? data : []);
  const avatars = list.map(m => {
    const src = m.user_name || m.user_email || "?";
    const initials = src.split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase().slice(0, 2) || "?";
    return { initials, avatar_url: m.user_avatar || null };
  });
  const extra = Math.max(0, avatars.length - 3);
  return <AvatarStack members={avatars.slice(0, 3)} extra={extra}/>;
}

/* ══════════════════════════════════════════════════════════
  ACTION LABEL (Sign / Approve / View based on task)
══════════════════════════════════════════════════════════ */
function actionForTask(task) {
  if (!task) return "Open";
  if (task.status === "done")    return "View";
  if (task.status === "skipped") return "View";
  if (task.request_type === "signature") return "Sign";
  if (task.request_type === "approval" || task.request_type === "review") return "Approve";
  // Fallback by title keywords
  const title = (task.title || "").toLowerCase();
  if (title.includes("подпис") || title.includes("sign"))  return "Sign";
  if (title.includes("соглас") || title.includes("approve")) return "Approve";
  return "Open";
}

/* ══════════════════════════════════════════════════════════
  ROLE FILTER BAR — chips by my role on the task (Editor / Signer)
══════════════════════════════════════════════════════════ */
function RoleFilterBar({ options = [], value, onChange }) {
  const iconFor = (id) => {
    if (id === "editor") {
      // pencil
      return <svg className="org-fb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
    }
    if (id === "signer") {
      // signature/check
      return <svg className="org-fb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 17c4-6 8-6 12 0"/><path d="M9 21l3-2 3 2"/><path d="M14 5l5 5-9 9H5v-5l9-9z"/></svg>;
    }
    // all
    return <svg className="org-fb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M17 11l2 2 4-4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>;
  };
  return (
    <div className="org-fb" style={{ paddingBottom: 6 }}>
      {options.map(opt => (
        <button
          key={opt.id}
          className={`org-fb-chip${value === opt.id ? " active" : ""}`}
          onClick={() => onChange(opt.id)}
        >
          {iconFor(opt.id)}
          <span>{opt.name}</span>
          <span className="org-fb-count">{opt.count}</span>
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
  ORG FILTER BAR — horizontal chips for Assigned Documents
══════════════════════════════════════════════════════════ */
function OrgFilterBar({ options = [], value, onChange }) {
  return (
    <>
      <style>{`
        .org-fb{display:flex;align-items:center;gap:8px;padding:8px 4px 14px;overflow-x:auto;flex-wrap:wrap}
        .org-fb-chip{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:20px;border:1px solid #E5E7EB;background:#fff;font-family:inherit;font-size:12.5px;font-weight:500;color:#374151;cursor:pointer;transition:all .15s;white-space:nowrap}
        .org-fb-chip:hover{border-color:#93C5FD;color:#1D4ED8}
        .org-fb-chip.active{background:#2563EB;border-color:#2563EB;color:#fff}
        .org-fb-chip.active:hover{background:#1D4ED8;color:#fff}
        .org-fb-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#F3F4F6;color:#6B7280;font-size:11px;font-weight:600}
        .org-fb-chip.active .org-fb-count{background:rgba(255,255,255,0.25);color:#fff}
        .org-fb-icon{width:14px;height:14px;flex-shrink:0;color:currentColor}
      `}</style>
      <div className="org-fb">
        {options.map(opt => (
          <button
            key={opt.id}
            className={`org-fb-chip${value === opt.id ? " active" : ""}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.id === "all"
              ? <svg className="org-fb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              : <svg className="org-fb-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h.01M9 13h.01M9 17h.01M13 9h2M13 13h2M13 17h2"/></svg>
            }
            <span>{opt.name}</span>
            <span className="org-fb-count">{opt.count}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
  ASSIGNED DOCS TABLE
  Same visual style as ProjectTable (Managed Projects) — uses
  .pr-table styles for consistency. Adds # column, polished pill
  badges with status dot, progress bar, and contextual action.
══════════════════════════════════════════════════════════ */
function AssignedDocsTable({ docs, onOpen }) {
  return (
    <>
      <style>{`
        .adv2-doc{display:flex;align-items:center;gap:12px}
        .adv2-doc-title{font-weight:500;font-size:14px;color:#111827}
        .adv2-doc-meta{font-size:12px;color:#9CA3AF;margin-top:3px}
        .adv2-progress{display:flex;align-items:center;gap:10px;min-width:140px}
        .adv2-bar{flex:1;height:6px;background:#E5E7EB;border-radius:4px;overflow:hidden}
        .adv2-bar-fill{height:100%;background:#2563EB;border-radius:4px;transition:width .25s}
        .adv2-pct{font-size:12px;color:#6B7280;font-weight:500;min-width:34px;text-align:right}
        .adv2-act{background:none;border:none;color:#2563EB;font-size:13.5px;font-weight:600;padding:0;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;font-family:inherit}
        .adv2-act:hover{color:#1D4ED8}
        .adv2-deadline{font-size:13px;color:#374151;white-space:nowrap}
        /* outlined status pills per design */
        .adv2-pill{display:inline-flex;align-items:center;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:.06em;background:#fff;border:1px solid;text-transform:uppercase}
        .adv2-pill-ip{color:#2563EB;border-color:#93C5FD}
        .adv2-pill-done{color:#16A34A;border-color:#86EFAC}
        .adv2-pill-ret{color:#B91C1C;border-color:#FCA5A5}
        .adv2-pill-pending{color:#6B7280;border-color:#D1D5DB}
      `}</style>
      <div style={{ padding:"0 4px 20px" }}>
        <table className="pr-table">
          <thead>
            <tr>
              <th>Documents</th>
              <th>Team Members</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const dt = fileTypeInfo(d.file_type);
              const task = d._task;
              // Реальный прогресс согласования документа (выполнено шагов / всего)
              const pct = typeof d.progress === "number"
                ? d.progress
                : (task?.status === "done" ? 100 : 0);
              const si = pct >= 100
                ? { label:"Completed",   cls:"adv2-pill-done" }
                : (task?.status === "skipped" || task?.status === "returned")
                  ? { label:"Returned",  cls:"adv2-pill-ret" }
                  : { label:"In Progress", cls:"adv2-pill-ip" };
              const dateSrc = d.created_at || task?.created_at;
              const dateLbl = dateSrc
                ? new Date(dateSrc).toLocaleDateString("en-US", { month:"long", day:"numeric" })
                : null;
              const sizeMb = d.file_size ? `${(d.file_size / 1024 / 1024).toFixed(1)} MB` : null;
              const subLine = [sizeMb, dateLbl].filter(Boolean).join(" . ");
              const deadlineSrc = d.due_date || task?.due_date;
              return (
                <tr key={d.id} style={{ cursor:"pointer" }} onClick={() => onOpen?.(d)}>
                  <td>
                    <div className="adv2-doc">
                      <div className="ad-file-icon" style={{ background:dt.bg, color:dt.color }}>{dt.ext}</div>
                      <div>
                        <div className="adv2-doc-title">{d.title}</div>
                        {subLine && <div className="adv2-doc-meta">{subLine}</div>}
                      </div>
                    </div>
                  </td>
                  <td><WsMembersAvs workspaceId={d.workspace}/></td>
                  <td>
                    <span className="adv2-deadline">
                      {deadlineSrc ? fmtDeadline(deadlineSrc) : <span style={{ color:"#9CA3AF" }}>—</span>}
                    </span>
                  </td>
                  <td>
                    <span className={`adv2-pill ${si.cls}`}>{si.label}</span>
                  </td>
                  <td>
                    <div className="adv2-progress">
                      <div className="adv2-bar"><div className="adv2-bar-fill" style={{ width:`${pct}%` }}/></div>
                      <div className="adv2-pct">{pct}%</div>
                    </div>
                  </td>
                  <td>
                    <button className="adv2-act" onClick={(e) => { e.stopPropagation(); onOpen?.(d); }}>
                      {actionForTask(task)}
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><polyline points="9 6 15 12 9 18"/></svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   ARCHIVED EMPTY STATE
══════════════════════════════════════════════════════════ */
function ArchivedEmpty() {
  const { t } = useTranslation();
  return (
    <div className="pr-empty">
      <svg viewBox="0 0 140 120" fill="none" width="200" height="160" style={{ marginBottom:20 }}>
        <ellipse cx="70" cy="110" rx="50" ry="8" fill="#F3F4F6"/>
        <rect x="20" y="54" width="100" height="52" rx="8" fill="#F9FAFB" stroke="#D1D5DB" strokeWidth="2"/>
        <rect x="32" y="66" width="30" height="4" rx="2" fill="#E5E7EB"/>
        <rect x="32" y="76" width="52" height="4" rx="2" fill="#E5E7EB"/>
        <rect x="32" y="86" width="40" height="4" rx="2" fill="#E5E7EB"/>
        <rect x="28" y="38" width="84" height="22" rx="6" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1.5"/>
        <rect x="40" y="45" width="60" height="4" rx="2" fill="#E5E7EB"/>
        <path d="M60 38 L70 28 L80 38" fill="#F9FAFB" stroke="#D1D5DB" strokeWidth="1.5" strokeLinejoin="round"/>
        <rect x="64" y="28" width="12" height="10" rx="1" fill="#F9FAFB" stroke="#D1D5DB" strokeWidth="1.5"/>
      </svg>
      <p style={{ fontSize:14,fontWeight:600,color:"#374151",marginBottom:6 }}>{t("projects.noArchivedYet")}</p>
      <p style={{ fontSize:13,color:"#9CA3AF" }}>{t("projects.archivedHint")}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ARCHIVED DATA + SECTION
══════════════════════════════════════════════════════════ */
function ArchivedSection({ projects = [], docs = [] }) {
  const { t } = useTranslation();
  return (
    <div style={{ padding:"0 4px 28px" }}>
      <div className="ar-section-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="16" height="16"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
        {t("projects.completedProjects")}
        <span style={{ color:"#9CA3AF",fontWeight:400 }}>({projects.length})</span>
        <span style={{ marginLeft:4,fontSize:11,color:"#9CA3AF",fontWeight:400,background:"#F3F4F6",borderRadius:4,padding:"1px 6px" }}>{t("projects.viewOnly")}</span>
      </div>
      {projects.length === 0
        ? <div style={{ fontSize:12.5,color:"#9CA3AF",padding:"12px 4px" }}>{t("projects.noCompletedProjects")}</div>
        : (
          <table className="pr-table">
            <thead>
              <tr>
                <th>{t("projects.table.project")}</th><th>{t("projects.table.documents")}</th><th>{t("projects.table.lastUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight:500 }}>{p.name}</td>
                  <td style={{ fontSize:12,color:"#6B7280" }}>{p.files} {p.files === 1 ? "file" : "files"}</td>
                  <td style={{ fontSize:12,color:"#6B7280" }}>{p.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }

      <div className="ar-section-title" style={{ marginTop:28 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="16" height="16"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        {t("projects.archivedDocuments")}
        <span style={{ color:"#9CA3AF",fontWeight:400 }}>({docs.length})</span>
        <span style={{ marginLeft:4,fontSize:11,color:"#9CA3AF",fontWeight:400,background:"#F3F4F6",borderRadius:4,padding:"1px 6px" }}>{t("projects.viewOnly")}</span>
      </div>
      {docs.length === 0
        ? <div style={{ fontSize:12.5,color:"#9CA3AF",padding:"12px 4px" }}>{t("projects.noArchivedDocs")}</div>
        : (
          <table className="pr-table">
            <thead>
              <tr>
                <th>{t("projects.table.document")}</th><th>{t("projects.table.lastUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d, i) => {
                const dt = fileTypeInfo(d.file_type);
                return (
                  <tr key={i}>
                    <td>
                      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                        <div className="ad-file-icon" style={{ background:dt.bg,color:dt.color }}>{dt.ext}</div>
                        <div style={{ fontWeight:500,fontSize:13,color:"#111827" }}>{d.title}</div>
                      </div>
                    </td>
                    <td style={{ fontSize:12,color:"#6B7280" }}>
                      {d.updated_at ? new Date(d.updated_at).toLocaleDateString("en-US",{month:"short",day:"numeric"}) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MANAGED PROJECTS EMPTY STATE
══════════════════════════════════════════════════════════ */
function EmptyState({ onNew }) {
  const { t } = useTranslation();
  return (
    <div className="pr-empty">
      <svg viewBox="0 0 140 120" fill="none" width="200" height="160" style={{ marginBottom:20 }}>
        <ellipse cx="70" cy="108" rx="50" ry="9" fill="#EEF2FF"/>
        <rect x="22" y="35" width="68" height="58" rx="7" stroke="#D1D5DB" strokeWidth="2" fill="#fff"/>
        <rect x="32" y="24" width="52" height="58" rx="7" stroke="#D1D5DB" strokeWidth="2" fill="#F9FAFB"/>
        <circle cx="92" cy="80" r="17" stroke="#D1D5DB" strokeWidth="2" fill="#fff"/>
        <line x1="104" y1="92" x2="116" y2="104" stroke="#D1D5DB" strokeWidth="3" strokeLinecap="round"/>
        <text x="58" y="28" fontSize="12" fill="#D1D5DB" textAnchor="middle">+</text>
        <text x="100" y="16" fontSize="12" fill="#D1D5DB" textAnchor="middle">+</text>
        <text x="18" y="88" fontSize="9" fill="#D1D5DB">·</text>
        <text x="128" y="52" fontSize="9" fill="#D1D5DB">·</text>
      </svg>
      <p style={{ fontSize:14,fontWeight:600,color:"#374151",marginBottom:6 }}>{t("projects.managedEmpty")}</p>
      <p style={{ fontSize:13,color:"#9CA3AF",marginBottom:16 }}>{t("projects.managedEmptyHint")}</p>
      {onNew && (
        <button onClick={onNew}
          style={{ background:"#2563EB",color:"#fff",border:"none",borderRadius:9,padding:"10px 22px",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t("inbox.newProject")}
        </button>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PROJECT TABLE
══════════════════════════════════════════════════════════ */
function ProjectTable({ projects, onManage }) {
  const { t } = useTranslation();
  const sc=(s)=>s==="Active"?"s-active":s==="Completed"?"s-completed":"s-inactive";
  const sd=(s)=>s==="Active"?"#22c55e":s==="Completed"?"#2563EB":"#EF4444";
  return (
    <div style={{ padding:"0 4px 20px" }}>
      <table className="pr-table">
        <thead>
          <tr>
            <th style={{ width:32 }}>{t("projects.table.num")}</th>
            <th>{t("projects.table.project")}</th><th>{t("projects.table.status")}</th><th>{t("projects.table.members")}</th>
            <th>{t("projects.table.documents")}</th><th>{t("projects.table.lastUpdated")}</th><th>{t("projects.table.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p,idx)=>(
            <tr key={p.id}>
              <td style={{ color:"#9CA3AF",fontSize:12 }}>{idx + 1}</td>
              <td style={{ fontWeight:500 }}>{p.name}</td>
              <td><span className={sc(p.status)}><span style={{ width:6,height:6,borderRadius:"50%",background:sd(p.status),display:"inline-block" }}/>{p.status}</span></td>
              <td>{p.members.length===0?<span style={{ color:"#9CA3AF",fontSize:12 }}>No members</span>:<AvatarStack members={p.members} extra={p.extra}/>}</td>
              <td><span style={{ display:"flex",alignItems:"center",gap:5,fontSize:12,color:"#6B7280" }}><svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="13" height="13"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>{p.files} {p.files===1?"file":"files"}</span></td>
              <td style={{ color:"#6B7280",fontSize:12 }}>{p.updated}</td>
              <td>
                <button onClick={()=>onManage(p)} style={{ background:"none",border:"none",color:"#2563EB",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:3,padding:0 }}>
                  {p.status==="Completed"?t("common.view"):t("common.edit")}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="12" height="12"><polyline points="9 6 15 12 9 18"/></svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   NEW DOCUMENT MODAL  (upload from PC  |  pick from cloud)
══════════════════════════════════════════════════════════ */
function NewDocModal({ project, onClose }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState("upload");  // "upload" | "cloud"
  const [saving, setSaving] = useState(false);

  /* ── Upload tab ── */
  const [title,    setTitle]    = useState("");
  const [fileType, setFileType] = useState("docx");
  const [pickedFile, setPickedFile] = useState(null);
  const fileInputRef = useRef(null);

  /* ── Cloud tab ── */
  const [search,      setSearch]      = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { data: cloudData, isLoading: cloudLoading } = useQuery({
    queryKey: ["documents-cloud"],
    queryFn: () => getDocuments(),
    enabled: tab === "cloud",
  });
  const cloudDocs = (cloudData?.results ?? (Array.isArray(cloudData) ? cloudData : []))
    .filter(d => String(d.workspace) !== String(project.id));
  const filteredCloud = search.trim()
    ? cloudDocs.filter(d => d.title.toLowerCase().includes(search.toLowerCase()))
    : cloudDocs;

  /* ── Handlers ── */
  const handleUpload = async () => {
    if (!title.trim()) return;
    if (!pickedFile) {
      // Don't synthesize a fake .docx — the backend parsers reject non-ZIP files.
      toast.error("Please attach a .docx or .xlsx file.");
      return;
    }
    setSaving(true);
    try {
      await serverUploadDocument(project.id, title.trim(), pickedFile);
      qc.invalidateQueries({ queryKey: ["documents", project.id] });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Document created");
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to create document");
    } finally { setSaving(false); }
  };

  const handleAddFromCloud = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      await copyDocument(selectedDoc.id, project.id);
      qc.invalidateQueries({ queryKey: ["documents", project.id] });
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Document added to project");
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to add document");
    } finally { setSaving(false); }
  };

  const tabBtn = (id, label, icon) => (
    <button onClick={()=>{setTab(id);setSelectedDoc(null);}}
      style={{ flex:1,padding:"10px 8px",fontSize:13,fontWeight:500,border:"1.5px solid",borderRadius:10,
        borderColor:tab===id?"#2563EB":"#E5E7EB",
        background:tab===id?"#EFF6FF":"#fff",
        color:tab===id?"#2563EB":"#6B7280",
        fontFamily:"inherit",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,transition:"all .15s" }}>
      {icon}{label}
    </button>
  );

  return (
    <div className="pr-overlay" onClick={onClose}>
      <div className="pr-modal" style={{ maxWidth:460 }} onClick={e=>e.stopPropagation()}>
        <button className="pr-modal-x" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h2 style={{ marginBottom:14 }}>{t("projects.addDocumentTitle")}</h2>

        {/* Tab switcher */}
        <div style={{ display:"flex",gap:8,marginBottom:18 }}>
          {tabBtn("upload", t("projects.uploadFromComputer"),
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
          )}
          {tabBtn("cloud", t("projects.fromCloud"),
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
          )}
        </div>

        {/* ── Upload tab ── */}
        {tab==="upload" && (
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <div>
              <label style={{ fontSize:12,fontWeight:500,color:"#374151",display:"block",marginBottom:5 }}>{t("projects.documentTitle")} *</label>
              <input className="pr-input" placeholder="e.g. Contract Draft" value={title}
                onChange={e=>setTitle(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter") handleUpload(); }}
                autoFocus/>
            </div>

            {/* File picker */}
            <div
              onClick={()=>fileInputRef.current?.click()}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)setPickedFile(f);}}
              style={{ border:"1.5px dashed #E5E7EB",borderRadius:10,padding:"16px 12px",textAlign:"center",cursor:"pointer",background:"#FAFAFA",transition:"border-color .15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#2563EB"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#E5E7EB"}>
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.xlsx" style={{ display:"none" }}
                onChange={e=>{ const f=e.target.files?.[0]; if(f) setPickedFile(f); }}/>
              {pickedFile ? (
                <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,color:"#374151",fontSize:13 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.8" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span style={{ fontWeight:500 }}>{pickedFile.name}</span>
                  <button onClick={e=>{e.stopPropagation();setPickedFile(null);}}
                    style={{ background:"none",border:"none",color:"#9CA3AF",cursor:"pointer",padding:0,display:"flex" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ) : (
                <div style={{ color:"#9CA3AF",fontSize:13 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" width="22" height="22" style={{ display:"block",margin:"0 auto 6px" }}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                  {t("documents.dropFileHere")} <span style={{ color:"#9CA3AF",fontSize:11 }}>(optional)</span>
                  <div style={{ fontSize:11,marginTop:3 }}>pdf · docx · xlsx</div>
                </div>
              )}
            </div>

            {/* File type selector (only when no file attached) */}
            {!pickedFile && (
              <div>
                <label style={{ fontSize:12,fontWeight:500,color:"#374151",display:"block",marginBottom:5 }}>{t("projects.createAs")}</label>
                <select value={fileType} onChange={e=>setFileType(e.target.value)}
                  style={{ width:"100%",border:"1.5px solid #E5E7EB",borderRadius:8,padding:"9px 12px",fontSize:13,color:"#374151",outline:"none",background:"#fff",fontFamily:"inherit",cursor:"pointer" }}>
                  <option value="docx">{t("projects.wordDocument")}</option>
                  <option value="xlsx">{t("projects.excelSpreadsheet")}</option>
                </select>
              </div>
            )}

            <div style={{ display:"flex",justifyContent:"flex-end",gap:10,marginTop:4 }}>
              <button onClick={onClose} style={{ padding:"9px 18px",fontSize:13,fontWeight:500,border:"1.5px solid #E5E7EB",borderRadius:8,background:"#fff",color:"#374151",fontFamily:"inherit",cursor:"pointer" }}>{t("common.cancel")}</button>
              <button onClick={handleUpload} disabled={!title.trim()||saving}
                style={{ display:"flex",alignItems:"center",gap:7,padding:"9px 20px",fontSize:13,fontWeight:600,border:"none",borderRadius:8,background:"#2563EB",color:"#fff",fontFamily:"inherit",cursor:(!title.trim()||saving)?"not-allowed":"pointer",opacity:(!title.trim()||saving)?0.5:1 }}>
                {saving && <span className="ai-spin"/>}
                {saving?t("projects.uploading"):t("projects.upload")}
              </button>
            </div>
          </div>
        )}

        {/* ── Cloud tab ── */}
        {tab==="cloud" && (
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <input className="pr-input" placeholder={t("projects.searchDocuments")} value={search}
              onChange={e=>setSearch(e.target.value)} autoFocus/>

            <div style={{ maxHeight:280,overflowY:"auto",borderRadius:10,border:"1.5px solid #F3F4F6" }}>
              {cloudLoading && (
                <div style={{ padding:24,textAlign:"center",color:"#9CA3AF",fontSize:13 }}>{t("common.loading")}</div>
              )}
              {!cloudLoading && filteredCloud.length===0 && (
                <div style={{ padding:24,textAlign:"center",color:"#9CA3AF",fontSize:13 }}>{t("projects.noDocumentsFound")}</div>
              )}
              {filteredCloud.map(doc=>{
                const dt = fileTypeInfo(doc.file_type);
                const isSelected = selectedDoc?.id === doc.id;
                return (
                  <div key={doc.id} onClick={()=>setSelectedDoc(isSelected ? null : doc)}
                    style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",cursor:"pointer",borderBottom:".5px solid #F3F4F6",
                      background:isSelected?"#EFF6FF":"#fff",transition:"background .1s" }}
                    onMouseEnter={e=>{ if(!isSelected) e.currentTarget.style.background="#F9FAFB"; }}
                    onMouseLeave={e=>{ if(!isSelected) e.currentTarget.style.background="#fff"; }}>
                    <div style={{ width:32,height:36,borderRadius:6,background:dt.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                      <span style={{ fontSize:8,fontWeight:700,color:dt.color }}>{dt.ext}</span>
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:500,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{doc.title}</div>
                      <div style={{ fontSize:11,color:"#9CA3AF",marginTop:1 }}>
                        {new Date(doc.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                      </div>
                    </div>
                    {isSelected && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display:"flex",justifyContent:"flex-end",gap:10,marginTop:4 }}>
              <button onClick={onClose} style={{ padding:"9px 18px",fontSize:13,fontWeight:500,border:"1.5px solid #E5E7EB",borderRadius:8,background:"#fff",color:"#374151",fontFamily:"inherit",cursor:"pointer" }}>{t("common.cancel")}</button>
              <button onClick={handleAddFromCloud} disabled={!selectedDoc||saving}
                style={{ padding:"9px 20px",fontSize:13,fontWeight:600,border:"none",borderRadius:8,background:"#2563EB",color:"#fff",fontFamily:"inherit",cursor:(!selectedDoc||saving)?"not-allowed":"pointer",opacity:(!selectedDoc||saving)?0.5:1 }}>
                {saving?t("projects.adding"):t("projects.addToProject")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MANAGE MEMBERS MODAL
══════════════════════════════════════════════════════════ */
function ManageMembersModal({ project, onClose }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const orgId = project._raw?.organization || project.organization || null;
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState({}); // { userId: role }

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["members", project.id],
    queryFn: () => getMembers(project.id),
    enabled: !!project.id,
  });
  const existing = membersData?.results ?? (Array.isArray(membersData) ? membersData : []);

  // Кандидаты на добавление — только участники организации, которых ещё нет в проекте
  const { data: orgMembersData, isLoading: orgLoading } = useQuery({
    queryKey: ["org-members", orgId],
    queryFn: () => getOrgMembers(orgId),
    enabled: !!orgId,
  });
  const orgMembers = orgMembersData?.results ?? (Array.isArray(orgMembersData) ? orgMembersData : []);
  const existingUserIds = new Set(existing.map(m => String(m.user)));
  const candidates = orgMembers.filter(u => !existingUserIds.has(String(u.id)));

  const toggle = (u) => setSelected(s => {
    const next = { ...s };
    if (next[u.id]) delete next[u.id]; else next[u.id] = "viewer";
    return next;
  });
  const setRole = (uid, role) => setSelected(s => ({ ...s, [uid]: role }));

  const handleAdd = async () => {
    const picks = candidates.filter(u => selected[u.id]);
    if (picks.length === 0) { onClose(); return; }
    setSaving(true);
    // Участники организации добавляются в проект напрямую — без приглашения
    // (приглашение/принятие требуется только на уровне организации).
    const results = await Promise.allSettled(
      picks.map(u => addMember(project.id, { user_id: u.id, role: selected[u.id] || "viewer" }))
    );
    setSaving(false);
    const failed = results.filter(r => r.status === "rejected");
    if (failed.length) {
      toast.error(failed[0]?.reason?.response?.data?.detail || `${failed.length} участник(ов) не добавлено`);
    } else {
      toast.success("Участники добавлены в проект");
    }
    qc.invalidateQueries({ queryKey: ["members", project.id] });
    qc.invalidateQueries({ queryKey: ["workspaces"] });
    onClose();
  };

  const roleLabel = { owner: "Owner", editor: "Editor", signer: "Signer", viewer: "Viewer" };

  return (
    <div className="pr-overlay" onClick={onClose}>
      <div className="pr-modal" onClick={e => e.stopPropagation()}
        style={{ maxWidth: 520, padding: "28px 28px 24px" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
          <h2 style={{ fontSize:17,fontWeight:700,color:"#111827",margin:0 }}>{t("projects.manageMembersTitle")}</h2>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:"#6B7280",padding:4,borderRadius:6,display:"flex",alignItems:"center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Current members */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:12,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:.5,marginBottom:10 }}>{t("projects.currentMembers")}</div>
          {isLoading
            ? <div style={{ fontSize:13,color:"#9CA3AF" }}>{t("common.loading")}</div>
            : existing.length === 0
              ? <div style={{ fontSize:13,color:"#9CA3AF" }}>{t("projects.noProjects")}</div>
              : existing.map((m, i) => (
                  <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:".5px solid #F3F4F6" }}>
                    <div style={{ width:32,height:32,borderRadius:"50%",background:AV_COLORS[i%AV_COLORS.length],display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",flexShrink:0 }}>
                      {(m.user_name||m.user_email||"?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:500,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{m.user_name||"—"}</div>
                      <div style={{ fontSize:11,color:"#9CA3AF" }}>{m.user_email||""}</div>
                    </div>
                    <span style={{ fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:20,background:"#EEF2FF",color:"#4F46E5",flexShrink:0 }}>
                      {roleLabel[m.role]||m.role}
                    </span>
                  </div>
                ))
          }
        </div>

        {/* Add from organization members only */}
        <div style={{ fontSize:12,fontWeight:600,color:"#6B7280",textTransform:"uppercase",letterSpacing:.5,marginBottom:10 }}>Добавить из участников организации</div>
        {!orgId ? (
          <div style={{ fontSize:13,color:"#9CA3AF" }}>Проект не привязан к организации.</div>
        ) : orgLoading ? (
          <div style={{ fontSize:13,color:"#9CA3AF" }}>Загрузка…</div>
        ) : candidates.length === 0 ? (
          <div style={{ fontSize:13,color:"#9CA3AF" }}>Все участники организации уже в проекте. Чтобы добавить новых людей — пригласите их в организацию на её странице.</div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:240,overflowY:"auto" }}>
            {candidates.map(u => {
              const sel = !!selected[u.id];
              return (
                <div key={u.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 10px",border:`1px solid ${sel?"#BFDBFE":"#F3F4F6"}`,borderRadius:8,background:sel?"#EFF6FF":"#fff" }}>
                  <input type="checkbox" checked={sel} onChange={()=>toggle(u)} style={{ width:15,height:15,accentColor:"#2563EB",cursor:"pointer",flexShrink:0 }}/>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:13,fontWeight:500,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.full_name||u.email}</div>
                    <div style={{ fontSize:11,color:"#9CA3AF" }}>{u.email}</div>
                  </div>
                  {sel && (
                    <select value={selected[u.id]} onChange={e=>setRole(u.id, e.target.value)}
                      style={{ border:"1px solid #E5E7EB",borderRadius:7,padding:"5px 8px",fontSize:12,fontFamily:"inherit",cursor:"pointer",color:"#374151" }}>
                      {["viewer","signer","editor","owner"].map(r=><option key={r} value={r}>{roleLabel[r]}</option>)}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:20 }}>
          <button onClick={onClose} style={{ border:".5px solid #E5E7EB",borderRadius:8,padding:"9px 20px",fontSize:13,background:"#fff",color:"#6B7280",cursor:"pointer",fontFamily:"inherit" }}>{t("common.cancel")}</button>
          <button onClick={handleAdd} disabled={saving}
            style={{ background:saving?"#93C5FD":"#2563EB",color:"#fff",border:"none",borderRadius:8,padding:"9px 24px",fontSize:13,fontWeight:500,cursor:saving?"not-allowed":"pointer",fontFamily:"inherit" }}>
            {saving ? t("projects.inviting") : t("projects.sendInvites")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PROJECT DETAIL
══════════════════════════════════════════════════════════ */
function ProjectDetail({ project, onNavigate }) {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [view,setView]=useState("table");
  const [openDoc,setOpenDoc]=useState(null);
  const [showNewDoc,setShowNewDoc]=useState(false);
  const [showMembers,setShowMembers]=useState(false);

  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ["documents", project.id],
    queryFn: () => getDocuments({ workspace: project.id }),
    enabled: !!project.id,
  });
  const docs = docsData?.results ?? (Array.isArray(docsData) ? docsData : []);

  const { data: projectMembers } = useQuery({
    queryKey: ["members", project.id],
    queryFn: () => getMembers(project.id),
    enabled: !!project.id,
  });
  const rawProjectMembers = projectMembers?.results ?? (Array.isArray(projectMembers) ? projectMembers : []);
  const currentUserRole = rawProjectMembers.find(m => String(m.user || m.id) === String(user?.id))?.role || null;

  // id -> { initials } lookup, used to render per-document assignee avatars in the table
  const memberById = new Map(rawProjectMembers.map(m => {
    const uid = String(m.user || m.id);
    const src = m.user_name || m.user_email || "?";
    const initials = src.split(/\s+/).filter(Boolean).slice(0,2).map(p => p[0]).join("").toUpperCase().slice(0,2) || "?";
    return [uid, { id: uid, initials, name: src }];
  }));

  const dsc=(s)=>docStatusClass(s);
  return (
    <div style={{ padding:"20px",flex:1,overflow:"auto" }}>
      {openDoc && <DocumentModal doc={openDoc} projectName={project.name} onClose={()=>setOpenDoc(null)} userRole={currentUserRole} onNavigate={onNavigate}/>}
      {showNewDoc && <NewDocModal project={project} onClose={()=>setShowNewDoc(false)}/>}
      {showMembers && <ManageMembersModal project={project} onClose={()=>setShowMembers(false)}/>}
      <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4 }}>
        <div>
          <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
            <h1 style={{ fontSize:22,fontWeight:700,color:"#111827" }}>{project.name}</h1>
            <span className="s-active"><span style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e" }}/>{t("projects.active")}</span>
          </div>
          <p style={{ fontSize:13,color:"#6B7280",maxWidth:600 }}>{project.description || "Document management workspace."}</p>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
            {/* Members button — только для owner */}
            {currentUserRole === "owner" && (
              <button onClick={()=>setShowMembers(true)}
                style={{ background:"#fff",color:"#374151",border:".5px solid #E5E7EB",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:6,fontFamily:"inherit",cursor:"pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                {t("projects.members")}
              </button>
            )}
            {/* Add Document — для owner И editor */}
            {(currentUserRole === "owner" || currentUserRole === "editor") && (
              <button onClick={()=>setShowNewDoc(true)} style={{ background:"#2563EB",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6,fontFamily:"inherit",cursor:"pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {t("projects.addDocument")}
              </button>
            )}
          </div>
      </div>
      <div style={{ display:"flex",gap:0,borderBottom:".5px solid #E5E7EB",margin:"16px 0" }}>
        {[
          { v:"table",    label:t("projects.view.table"),    icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg> },
          { v:"timeline", label:t("projects.view.timeline"), icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
        ].map(({v,label,icon})=>(
          <button key={v} onClick={()=>setView(v)}
            style={{ padding:"8px 16px",fontSize:13,fontWeight:500,background:"none",border:"none",fontFamily:"inherit",color:view===v?"#2563EB":"#9CA3AF",borderBottom:view===v?"2px solid #2563EB":"2px solid transparent",marginBottom:-1,display:"flex",alignItems:"center",gap:5,cursor:"pointer" }}>
            {icon}
            {label}
          </button>
        ))}
      </div>
      {view==="table"&&(
        <table className="pr-table" style={{ width:"100%" }}>
          <thead><tr><th>{t("projects.table.documents")}</th><th>{t("projects.table.assigned")}</th><th>{t("projects.table.uploadedBy")}</th><th>{t("projects.table.deadline")}</th><th>{t("projects.table.status")}</th><th>{t("projects.table.priority")}</th><th>{t("projects.table.action")}</th></tr></thead>
          <tbody>
            {docsLoading && (
              <tr><td colSpan={7} style={{ textAlign:"center",color:"#9CA3AF",padding:24 }}>{t("common.loading")}</td></tr>
            )}
            {!docsLoading && docs.length===0 && (
              <tr><td colSpan={7} style={{ textAlign:"center",color:"#9CA3AF",padding:24 }}>{t("projects.noDocumentsYet")}</td></tr>
            )}
            {docs.map((doc)=>{
              const dt=fileTypeInfo(doc.file_type);
              const statusLabel=docStatusDisplay(doc.status);
              const pri=priFromApi(doc.priority);
              return(
                <tr key={doc.id} style={{ cursor:"pointer" }} onClick={()=>setOpenDoc({ ...doc, workspace: doc.workspace || project.id })}>
                  <td>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <div style={{ width:32,height:36,borderRadius:6,background:dt.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <span style={{ fontSize:8,fontWeight:700,color:dt.color }}>{dt.ext}</span>
                      </div>
                      <div>
                        <div style={{ fontWeight:600,fontSize:13 }}>{doc.title}</div>
                        <div style={{ fontSize:11,color:"#9CA3AF" }}>
                          {new Date(doc.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {(() => {
                      const meta = doc.metadata || {};
                      const ids = Array.isArray(meta.assignee_ids)
                        ? meta.assignee_ids
                        : (meta.assignee_id ? [meta.assignee_id] : []);
                      const docAssignees = ids.map(id => memberById.get(String(id))).filter(Boolean);
                      if (docAssignees.length === 0) {
                        return <span style={{ fontSize:12,color:"#9CA3AF" }}>—</span>;
                      }
                      return (
                        <AvatarStack
                          members={docAssignees.slice(0,3).map(m => m.initials)}
                          extra={Math.max(0, docAssignees.length - 3)}
                        />
                      );
                    })()}
                  </td>
                  <td style={{ fontSize:12.5,color:"#374151" }}>{doc.uploaded_by_name || "—"}</td>
                  <td style={{ fontSize:12,color:"#6B7280" }}>{doc.due_date ? fmtDeadline(doc.due_date) : "—"}</td>
                  <td><span className={dsc(doc.status)}>{statusLabel}</span></td>
                  <td style={{ fontSize:12,color:"#6B7280" }}>{pri}</td>
                  <td>
                    <div style={{ display:"flex",gap:8 }} onClick={e=>e.stopPropagation()}>
                      <button style={{ background:"none",border:"none",color:"#6B7280",padding:0,display:"flex" }}
                        onClick={()=>setOpenDoc({ ...doc, workspace: doc.workspace || project.id })}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {view==="timeline"&&<TimelineView docs={docs}/>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TIMELINE
══════════════════════════════════════════════════════════ */
function TimelineView({ docs = [] }) {
  const { t } = useTranslation();
  const todayRaw = new Date();
  todayRaw.setHours(0, 0, 0, 0);
  const [month, setMonth] = useState(todayRaw.getMonth());
  const [year,  setYear]  = useState(todayRaw.getFullYear());

  const MN = t("timeline.months", { returnObjects: true });

  const first    = new Date(year, month, 1).getDay();
  const days     = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const cells    = [];
  for (let i = 0; i < first; i++) cells.push({ day: prevDays - first + 1 + i, out: true });
  for (let d = 1; d <= days; d++) cells.push({ day: d, out: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - days - first + 1, out: true });

  // Build deadline events from docs
  const events = docs
    .filter(d => d.due_date)
    .map(d => {
      const due      = new Date(d.due_date);
      const daysLeft = Math.floor((due - todayRaw) / (1000 * 60 * 60 * 24));
      let color = "#2563EB", bg = "#DBEAFE";           // > 1 day → blue
      if (daysLeft <= 0)      { color = "#EF4444"; bg = "#FEE2E2"; } // overdue → red
      else if (daysLeft === 1){ color = "#F97316"; bg = "#FFEDD5"; } // 1 day   → orange
      return { day: due.getDate(), month: due.getMonth(), year: due.getFullYear(), name: d.title, color, bg, daysLeft };
    });

  const unscheduled = docs.filter(d => !d.due_date).length;
  const overdue     = events.filter(e => e.daysLeft <= 0).length;

  const getEvts = (day, out) =>
    out ? [] : events.filter(e => e.day === day && e.month === month && e.year === year);

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
        <button onClick={prev} style={{ background:"none", border:"none", cursor:"pointer", color:"#6B7280", display:"flex", alignItems:"center" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span style={{ fontSize:14, fontWeight:600, color:"#111827" }}>{MN[month]}</span>
        <span style={{ fontSize:13, color:"#374151" }}>{year}</span>
        <button onClick={next} style={{ background:"none", border:"none", cursor:"pointer", color:"#6B7280", display:"flex", alignItems:"center" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><polyline points="9 6 15 12 9 18"/></svg>
        </button>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          {unscheduled > 0 && (
            <span style={{ fontSize:12, color:"#9CA3AF", background:"#F9FAFB", border:".5px solid #E5E7EB", borderRadius:6, padding:"3px 10px" }}>
              {unscheduled} {t("timeline.unscheduled")}
            </span>
          )}
          {overdue > 0 && (
            <span style={{ fontSize:12, color:"#EF4444", background:"#FEF2F2", border:".5px solid #FECACA", borderRadius:6, padding:"3px 10px" }}>
              {overdue} {t("timeline.overdue")}
            </span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderLeft:".5px solid #E5E7EB", borderTop:".5px solid #E5E7EB" }}>
        {(t("timeline.days", { returnObjects: true })).map(d => (
          <div key={d} style={{ fontSize:11, color:"#9CA3AF", fontWeight:500, padding:"8px 0", textAlign:"center", borderRight:".5px solid #E5E7EB", borderBottom:".5px solid #E5E7EB" }}>{d}</div>
        ))}
        {cells.map((cell, i) => {
          const ev = getEvts(cell.day, cell.out);
          const isTd = !cell.out && cell.day === todayRaw.getDate() && month === todayRaw.getMonth() && year === todayRaw.getFullYear();
          return (
            <div key={i} className="cal-cell" style={{ background: isTd ? "#F0F9FF" : "#fff" }}>
              <div style={{ fontSize:12, color:cell.out?"#D1D5DB":"#374151", fontWeight:500, textAlign:"right", marginBottom:4,
                ...(isTd ? { background:"#2563EB", color:"#fff", borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", marginLeft:"auto" } : {}) }}>
                {cell.day}
              </div>
              {ev.map((e, j) => (
                <div key={j} title={e.name} style={{ background:e.bg, borderRadius:6, padding:"3px 6px", fontSize:10.5, color:e.color, marginBottom:3, borderLeft:`2px solid ${e.color}`, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {e.name}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:16, marginTop:12, fontSize:11.5, color:"#6B7280" }}>
        <span style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ width:10, height:10, borderRadius:2, background:"#DBEAFE", border:"1.5px solid #2563EB", display:"inline-block" }}/>
          {t("timeline.moreThanOneDay")}
        </span>
        <span style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ width:10, height:10, borderRadius:2, background:"#FFEDD5", border:"1.5px solid #F97316", display:"inline-block" }}/>
          {t("timeline.oneDayLeft")}
        </span>
        <span style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ width:10, height:10, borderRadius:2, background:"#FEE2E2", border:"1.5px solid #EF4444", display:"inline-block" }}/>
          {t("timeline.overdue")}
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   NAV ITEMS
══════════════════════════════════════════════════════════ */
const NAV = [
  { key:"inbox",     navKey:"inbox",     icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg> },
  { key:"projects",  navKey:"projects",  active:true, icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  { key:"documents", navKey:"documents", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { key:"analytics", navKey:"analytics", icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { key:"help",      navKey:"help",      icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
];

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════ */
export default function Projects({ onGoToAuth, onNavigate }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [sbOpen, toggleSb] = useSidebarOpen();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileView, setProfileView] = useState(null);
  // Read query params for deep-linking from Inbox: ?tab=<managed|assigned|archived>&doc=<id>
  const initialQs = (() => {
    if (typeof window === "undefined") return { tab: null, doc: null };
    const p = new URLSearchParams(window.location.search);
    return { tab: p.get("tab"), doc: p.get("doc") };
  })();
  const [tab,           setTab]           = useState(
    ["managed","assigned","archived"].includes(initialQs.tab) ? initialQs.tab : "managed"
  );
  const [showModal,     setShowModal]     = useState(false);
  const [showCreateWs,  setShowCreateWs]  = useState(false);
  const [selected,      setSelected]      = useState(null);
  const [selectedDoc,   setSelectedDoc]   = useState(null);
  const [wsDropOpen,    setWsDropOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assignedOrgFilter, setAssignedOrgFilter] = useState("all");
  const [assignedRoleFilter, setAssignedRoleFilter] = useState("all"); // all | editor | signer
  const [pendingDocId, setPendingDocId] = useState(initialQs.doc || null);
  const wsDropRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!wsDropOpen) return;
    const h = (e) => { if (wsDropRef.current && !wsDropRef.current.contains(e.target)) setWsDropOpen(false); };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, [wsDropOpen]);

  const { data: wsData, isLoading: wsLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: getWorkspaces,
  });

  // Global hybrid search (FTS + vector via MeiliSearch, Postgres fallback)
  const [searchFocused, setSearchFocused] = useState(false);
  const { data: globalResults, isFetching: searching } = useQuery({
    queryKey: ["global-search", debouncedSearch],
    queryFn: () => globalSearch(debouncedSearch),
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 15_000,
  });
  const gsDocs = globalResults?.documents ?? [];
  const gsWs   = globalResults?.workspaces ?? [];
  const showGlobal = searchFocused && debouncedSearch.trim().length >= 2;

  // Assigned tab: задачи назначенные текущему пользователю → уникальные документы
  const { data: assignedTasksData, isLoading: assignedLoading } = useQuery({
    queryKey: ["tasks", "assigned-projects"],
    // Все задачи, назначенные мне (любой статус) — чтобы документ оставался
    // виден с растущим прогрессом, а не исчезал после «Согласовать».
    queryFn: () => getTasks(),
    enabled: tab === "assigned",
  });

  // Документы, ожидающие моей подписи как signer (все подзадачи закрыты).
  // Должны попадать в Assigned, а не в Managed.
  const { data: signerDocsData } = useQuery({
    queryKey: ["documents", "awaiting-my-signature"],
    queryFn: () => getDocuments({ awaiting_my_signature: "true" }),
    enabled: tab === "assigned",
  });

  const { data: archivedDocsData } = useQuery({
    queryKey: ["documents", "archived"],
    queryFn: () => getDocuments({ status: "archived" }),
    enabled: tab === "archived",
  });

  // Unread notifications badge
  const { data: unreadData } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => getNotifications({ is_read: "false", page_size: 1 }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const hasUnread = (unreadData?.count ?? 0) > 0;

  const activeOrgId = useOrgStore(s => s.activeOrgId);
  const allWs = wsData?.results ?? (Array.isArray(wsData) ? wsData : []);
  const _orgName = allWs[0]?.title || "Organization";

  const wsToRow = ws => {
    const statusMap = { active: "Active", archived: "Archived", closed: "Completed" };
    const membersCount = ws.members_count ?? 0;
    const filesCount   = ws.documents_count ?? 0;
    // Реальные инициалы участников из members_preview (с бэкенда)
    const toInitials = (name) =>
      (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join("").toUpperCase() || "?";
    const preview = Array.isArray(ws.members_preview) ? ws.members_preview : [];
    const memberAvatars = preview.slice(0, 3).map(m => ({ initials: toInitials(m.name), avatar_url: m.avatar_url || null }));
    return {
      id:      ws.id,
      name:    ws.title,
      status:  statusMap[ws.status] || "Active",
      members: memberAvatars,
      extra:   Math.max(0, membersCount - memberAvatars.length),
      files:   filesCount,
      updated: ws.created_at
        ? new Date(ws.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric" })
        : "—",
      _raw: ws,
    };
  };

  const searchLower = debouncedSearch.toLowerCase();

  // Managed: только активные кабинеты, где текущий пользователь — owner.
  // Кабинеты, где роль editor/signer/viewer, не считаются "своими" — относящиеся
  // к ним задачи попадают в Assigned Documents.
  const managedProjects = allWs
    .filter(ws => ws.status === "active" && ws.user_role === "owner")
    // Показываем проекты только активной организации (если она выбрана)
    .filter(ws => !activeOrgId || String(ws.organization) === String(activeOrgId))
    .filter(ws => !searchLower || ws.title.toLowerCase().includes(searchLower))
    .map(wsToRow);

  // Archive: workspaces that are closed or archived
  const archivedProjects = allWs
    .filter(ws => ws.status === "archived" || ws.status === "closed")
    .filter(ws => !searchLower || ws.title.toLowerCase().includes(searchLower))
    .map(wsToRow);

  // Из задач формируем список уникальных документов для Assigned tab.
  // Роль задачи: signature → signer, review/approval → editor.
  const taskRoleFromRequest = (rt) => (rt === "signature" ? "signer" : "editor");
  const assignedTasks = assignedTasksData?.results ?? [];
  const seenDocIds = new Set();
  const assignedDocs = assignedTasks
    .filter(t => t.document && !seenDocIds.has(t.document) && seenDocIds.add(t.document))
    .map(t => ({
      id:                t.document,
      title:             t.document_title || t.title || "—",
      file_type:         "docx",
      status:            t.status,
      due_date:          t.due_date || null,
      uploaded_by_name:  t.workspace_name || "—",
      workspace:         t.workspace,
      organization_id:   t.organization_id || null,
      organization_name: t.organization_name || null,
      role:              taskRoleFromRequest(t.request_type),
      progress:          typeof t.document_progress === "number" ? t.document_progress : 0,
      _task:             t,
    }));

  // Подмешиваем документы, где я signer и все подзадачи выполнены.
  const signerDocs = signerDocsData?.results ?? (Array.isArray(signerDocsData) ? signerDocsData : []);
  for (const d of signerDocs) {
    if (seenDocIds.has(d.id)) continue;
    seenDocIds.add(d.id);
    assignedDocs.push({
      id:                d.id,
      title:             d.title,
      file_type:         d.file_type || "docx",
      status:            d.status,
      due_date:          d.due_date || null,
      uploaded_by_name:  d.uploaded_by_name || d.workspace_title || "—",
      workspace:         d.workspace,
      organization_id:   d.organization_id || null,
      organization_name: d.organization_name || null,
      role:              "signer",
      _signerPending:    true,
    });
  }

  // Deep-link: open a specific doc on Assigned tab if ?doc=<id> is set
  useEffect(() => {
    if (!pendingDocId || tab !== "assigned") return;
    if (assignedLoading) return;
    if (!assignedTasksData) return; // wait until tasks have loaded
    const match = assignedDocs.find(d => d.id === pendingDocId);
    if (match) {
      setSelectedDoc({ ...match, workspace: match.workspace });
    }
    // Clear pending + query param regardless of match (so we don't loop)
    setPendingDocId(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("doc");
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
    }
  }, [assignedTasksData, assignedLoading, pendingDocId, tab, assignedDocs]);

  // Role filter chips (Editor/Signer) применяется первым,
  // org-фильтр считается уже от отфильтрованного набора.
  const roleFilteredAssignedDocs = assignedRoleFilter === "all"
    ? assignedDocs
    : assignedDocs.filter(d => d.role === assignedRoleFilter);

  const roleFilterOptions = [
    { id: "all",    name: t("projects.allRoles",  "All roles"), count: assignedDocs.length },
    { id: "editor", name: t("projects.roleEditor","Editor"),   count: assignedDocs.filter(d => d.role === "editor").length },
    { id: "signer", name: t("projects.roleSigner","Signer"),   count: assignedDocs.filter(d => d.role === "signer").length },
  ];

  // Filter by organization (used by Assigned tab)
  const orgFilterOptions = [
    { id: "all", name: t("projects.allOrgs", "All organizations"), count: roleFilteredAssignedDocs.length },
    ...Array.from(
      roleFilteredAssignedDocs.reduce((acc, d) => {
        const key = d.organization_id || "_none";
        const name = d.organization_name || t("projects.noOrg", "No organization");
        if (!acc.has(key)) acc.set(key, { id: key, name, count: 0 });
        acc.get(key).count += 1;
        return acc;
      }, new Map()).values()
    ),
  ];
  const filteredAssignedDocs = assignedOrgFilter === "all"
    ? roleFilteredAssignedDocs
    : roleFilteredAssignedDocs.filter(d => (d.organization_id || "_none") === assignedOrgFilter);
  const archivedDocs = archivedDocsData?.results ?? (Array.isArray(archivedDocsData) ? archivedDocsData : []);

  const handleCreate = (_data) => {
    qc.invalidateQueries({ queryKey: ["workspaces"] });
  };

  const breadcrumb = selected
    ? [t("projects.title"), t("projects.managed"), selected.name]
    : [t("projects.title"), t("projects.managed")];

  return (
    <div className="pr-page">
      <style>{prCss}</style>
      {showModal && <NewProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate}/>}
      {showCreateWs && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWs(false)}
          onCreated={(id) => {
            setShowCreateWs(false);
            qc.invalidateQueries({ queryKey: ["workspaces"] });
            if (id) onNavigate?.(`organization/${id}`);
          }}
        />
      )}
      {selectedDoc && (
        <DocumentModal
          doc={selectedDoc}
          projectName={selectedDoc?.uploaded_by_name || "Assigned Documents"}
          onClose={() => setSelectedDoc(null)}
          readOnly={true}
          userRole={selectedDoc?.role || "editor"}
          onNavigate={onNavigate}
        />
      )}

      {/* Mobile overlay */}
      <div className={`pr-sb-overlay${sbOpen ? " show" : ""}`} onClick={toggleSb}/>

      {/* ── HEADER ── */}
      <header className="pr-topbar">
        <img src={logoImg} alt="Logo" style={{ height:30,flexShrink:0 }}/>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>

          {/* Breadcrumb */}
          <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:13 }}>
            {breadcrumb.map((b,i) => (
              <span key={i} style={{ display:"flex",alignItems:"center",gap:5 }}>
                {i > 0 && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="9 6 15 12 9 18"/></svg>}
                <span
                  style={{ color:i===breadcrumb.length-1?"#111827":"#9CA3AF", fontWeight:i===breadcrumb.length-1?500:400, cursor:i<breadcrumb.length-1?"pointer":"default" }}
                  onClick={() => { if(i===breadcrumb.length-2&&selected) setSelected(null); }}>
                  {b}
                </span>
              </span>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:10 }}>
            <div onClick={()=>onNavigate&&onNavigate("notifications")} title="Notifications"
              style={{ position:"relative",width:30,height:30,borderRadius:8,border:"0.5px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"#fff" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              {hasUnread && <div style={{ position:"absolute",top:-2,right:-2,width:8,height:8,background:"#EF4444",borderRadius:"50%",border:"1.5px solid #fff" }}/>}
            </div>
            <div style={{ position:"relative", display:"flex", alignItems:"center", gap:6 }}>
              <svg onClick={()=>setProfileMenuOpen(v=>!v)}
                style={{ cursor:"pointer" }}
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              <div onClick={()=>setProfileMenuOpen(v=>!v)} title="Menu"
                style={{ position:"relative",width:30,height:30,cursor:"pointer",flexShrink:0 }}>
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
                  onClose={()=>setProfileMenuOpen(false)}
                  onProfile={()=>setProfileView("profile")}
                  onSettings={()=>setProfileView("settings")}
                  onLogOut={onGoToAuth}/>
              )}
            </div>
          </div>
      </header>

      {/* ── BODY ── */}
      <div className="pr-body">

        <Sidebar active="projects" onNavigate={onNavigate}/>
        <MobileBottomNav />

        {/* ── MAIN ── */}
        <div className="pr-main">
          <ProfileController show={!!profileView} view={profileView} setView={setProfileView} onLogOut={onGoToAuth}/>

          {/* White container */}
          <div className="pr-container">
            {selected ? (
              <div className="pr-inner" style={{ display:"flex",flexDirection:"column" }}>
                <ProjectDetail project={selected} onNavigate={onNavigate}/>
              </div>
            ) : (
              <>
                <div style={{ padding:"20px 20px 0",display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap",flexShrink:0 }}>
                  <div>
                    <h1 style={{ fontSize:22,fontWeight:700,color:"#111827",marginBottom:4,letterSpacing:"0.04em" }}>{t("projects.workspaceTitle")}</h1>
                    <p style={{ fontSize:13,color:"#9CA3AF" }}>{t("projects.workspaceDesc")}</p>
                  </div>
                  <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                    <div style={{ position:"relative" }}>
                      <div style={{ display:"flex",alignItems:"center",gap:6,border:".5px solid #E5E7EB",borderRadius:8,padding:"7px 12px",background:"#F9FAFB",minWidth:220 }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input
                          placeholder={t("projects.searchHint")}
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          onFocus={() => setSearchFocused(true)}
                          onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                          style={{ border:"none",outline:"none",background:"transparent",fontSize:12.5,color:"#374151",width:190,fontFamily:"inherit" }}
                        />
                        {searchQuery && (
                          <button onClick={() => { setSearchQuery(""); setDebouncedSearch(""); }}
                            style={{ border:"none",background:"none",cursor:"pointer",color:"#9CA3AF",padding:0,display:"flex",alignItems:"center" }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        )}
                      </div>

                      {showGlobal && (
                        <div style={{ position:"absolute",top:"calc(100% + 6px)",right:0,width:340,maxHeight:380,overflowY:"auto",background:"#fff",border:".5px solid #E5E7EB",borderRadius:12,boxShadow:"0 8px 28px rgba(0,0,0,.12)",zIndex:9600,padding:"6px 0" }}>
                          {searching && <div style={{ padding:"14px 16px",fontSize:12,color:"#9CA3AF" }}>Поиск…</div>}
                          {!searching && gsDocs.length === 0 && gsWs.length === 0 && (
                            <div style={{ padding:"14px 16px",fontSize:12,color:"#9CA3AF" }}>Ничего не найдено по «{debouncedSearch}»</div>
                          )}
                          {gsDocs.length > 0 && (
                            <>
                              <div style={{ padding:"6px 14px 4px",fontSize:10.5,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:".04em" }}>Документы</div>
                              {gsDocs.map(d => {
                                const dt = fileTypeInfo(d.file_type);
                                return (
                                  <div key={d.id} onMouseDown={() => setSelectedDoc({ id:d.id, title:d.title, workspace:d.workspace_id, file_type:d.file_type })}
                                    style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 14px",cursor:"pointer" }}
                                    onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                                    onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                                    <div style={{ width:28,height:32,borderRadius:6,background:dt.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                                      <span style={{ fontSize:8,fontWeight:700,color:dt.color }}>{dt.ext}</span>
                                    </div>
                                    <div style={{ flex:1,minWidth:0 }}>
                                      <div style={{ fontSize:12.5,fontWeight:500,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{d.title}</div>
                                      {d.workspace_title && <div style={{ fontSize:11,color:"#9CA3AF" }}>{d.workspace_title}</div>}
                                    </div>
                                  </div>
                                );
                              })}
                            </>
                          )}
                          {gsWs.length > 0 && (
                            <>
                              <div style={{ padding:"8px 14px 4px",fontSize:10.5,fontWeight:600,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:".04em" }}>Проекты</div>
                              {gsWs.map(w => (
                                <div key={w.id} onMouseDown={() => onNavigate?.("projects")}
                                  style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 14px",cursor:"pointer" }}
                                  onMouseEnter={e=>e.currentTarget.style.background="#F9FAFB"}
                                  onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                                  <div style={{ width:28,height:28,borderRadius:7,background:"#EEF2FF",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                                  </div>
                                  <div style={{ flex:1,minWidth:0 }}>
                                    <div style={{ fontSize:12.5,fontWeight:500,color:"#111827",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{w.title}</div>
                                    {w.type && <div style={{ fontSize:11,color:"#9CA3AF" }}>{w.type}</div>}
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pr-tabs" style={{ marginTop:12 }}>
                  {["managed","assigned","archived"].map(tabKey => (
                    <button key={tabKey} className={`pr-tab${tab===tabKey?" active":""}`} onClick={()=>setTab(tabKey)}>
                      {tabKey==="managed" ? t("projects.managed") : tabKey==="assigned" ? t("projects.assigned") : t("projects.archive")}
                    </button>
                  ))}
                </div>

                <div className="pr-inner" style={{ flex:1 }}>
                  <div key={tab} className="app-fade-in">
                  {tab==="managed" && (
                    wsLoading
                      ? <div style={{ display:"flex",alignItems:"center",justifyContent:"center",flex:1,padding:60,color:"#9CA3AF",fontSize:13 }}>{t("common.loading")}</div>
                      : managedProjects.length===0
                        ? <EmptyState onNew={() => setShowModal(true)}/>
                        : <ProjectTable projects={managedProjects} onManage={p=>setSelected(p)}/>
                  )}
                  {tab==="assigned" && (
                    assignedLoading
                      ? <div style={{ display:"flex",alignItems:"center",justifyContent:"center",flex:1,padding:60,color:"#9CA3AF",fontSize:13 }}>{t("common.loading")}</div>
                      : assignedDocs.length===0
                        ? <AssignedDocsEmpty/>
                        : <>
                            <RoleFilterBar
                              options={roleFilterOptions}
                              value={assignedRoleFilter}
                              onChange={setAssignedRoleFilter}
                            />
                            <OrgFilterBar
                              options={orgFilterOptions}
                              value={assignedOrgFilter}
                              onChange={setAssignedOrgFilter}
                            />
                            {filteredAssignedDocs.length === 0
                              ? <div style={{ padding:"24px 4px", fontSize:13, color:"#9CA3AF", textAlign:"center" }}>
                                  {t("projects.noDocsForFilter", "No documents matching this filter.")}
                                </div>
                              : <AssignedDocsTable docs={filteredAssignedDocs} onOpen={d=>setSelectedDoc({ ...d, workspace: d.workspace })}/>
                            }
                          </>
                  )}
                  {tab==="archived" && (archivedProjects.length===0 && archivedDocs.length===0 ? <ArchivedEmpty/> : <ArchivedSection projects={archivedProjects} docs={archivedDocs}/>)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
