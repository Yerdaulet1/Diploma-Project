import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ProfileController, { ProfileMenu } from "./Profile";
import logoImg from "./assets/Group 2.svg";
import { getTasks, completeTask, skipTask } from "./api/tasks";
import { getWorkspaces } from "./api/workspaces";
import useAuthStore from "./store/authStore";
import CreateWorkspaceModal from "./CreateWorkspaceModal";
import useSidebarOpen from "./hooks/useSidebarOpen";

/* ══════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════ */
const BADGE_STYLE = {
  urgent:    { background:"#FEE2E2", color:"#991B1B", border:"0.5px solid #FCA5A5" },
  inprog:    { background:"#DBEAFE", color:"#1D4ED8", border:"0.5px solid #93C5FD" },
  pending:   { background:"#FEF9C3", color:"#854D0E", border:"0.5px solid #FDE047" },
  completed: { background:"#DCFCE7", color:"#166534", border:"0.5px solid #86EFAC" },
  returned:  { background:"#FFEDD5", color:"#9A3412", border:"0.5px solid #FDBA74" },
  waiting:   { background:"#EDE9FE", color:"#5B21B6", border:"0.5px solid #C4B5FD" },
};
const BADGE_LABEL = { urgent:"URGENT", inprog:"IN PROGRESS", pending:"PENDING", completed:"COMPLETED", returned:"RETURNED", waiting:"WAITING" };

const MONTHS       = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WEEK_DAYS    = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
const DATE_OPTS    = ["Today","Yesterday","Last 7 days","This month","Custom range"];

/* ══════════════════════════════════════════════════════════
   API → CARD HELPERS
══════════════════════════════════════════════════════════ */
function taskIcon(requestType, title) {
  if (requestType === "signature") return { icon:"pen",    color:"#F0FDF4", stroke:"#16A34A" };
  if (requestType === "approval")  return { icon:"folder", color:"#EEF2FF", stroke:"#4F46E5" };
  if (requestType === "review")    return { icon:"doc",    color:"#FFF7ED", stroke:"#EA580C" };
  const t = (title || "").toLowerCase();
  if (t.includes("sign"))                       return { icon:"pen",    color:"#F0FDF4", stroke:"#16A34A" };
  if (t.includes("review") || t.includes("approve")) return { icon:"folder", color:"#EEF2FF", stroke:"#4F46E5" };
  if (t.includes("edit")   || t.includes("return"))  return { icon:"alert",  color:"#FEF3C7", stroke:"#B45309" };
  return { icon:"doc", color:"#FFF7ED", stroke:"#EA580C" };
}

function statusToBadges(status) {
  if (status === "in_progress") return ["inprog"];
  if (status === "done")        return ["completed"];
  if (status === "skipped")     return ["returned"];
  if (status === "urgent")      return ["urgent"];
  if (status === "returned")    return ["returned"];
  if (status === "waiting")     return ["waiting"];
  return ["pending"];
}

function docStatusToBadges(status) {
  if (status === "review") return ["waiting"];
  if (status === "signed") return ["completed"];
  if (status === "archived") return ["completed"];
  return ["pending"];
}

function fmtRelTime(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} h ago`;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

function isToday(isoStr) {
  if (!isoStr) return false;
  const d = new Date(isoStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function taskToCard(task) {
  const { icon, color, stroke } = taskIcon(task.request_type, task.title);
  return {
    id: task.id,
    icon, color, stroke,
    name: task.document_title || "Document",
    from: task.workspace_name || "—",
    action: task.title,
    badges: statusToBadges(task.status),
    time: fmtRelTime(task.created_at),
    _taskId: task.id,
    _status: task.status,
    _requestType: task.request_type,
  };
}

function docToCard(doc) {
  return {
    id: doc.id,
    icon: "folder",
    color: "#EEF2FF",
    stroke: "#4F46E5",
    name: doc.title,
    to: doc.uploaded_by_name || "—",
    action: doc.status ? doc.status.charAt(0).toUpperCase() + doc.status.slice(1) : "Draft",
    badges: docStatusToBadges(doc.status),
    time: fmtRelTime(doc.updated_at),
    _docId: doc.id,
  };
}

/* ══════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════ */
function getDaysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function getFirstDay(y,m){ return new Date(y,m,1).getDay(); }
function sameDay(a,b){ return a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate(); }
function inRange(d,s,e){ const t=d.getTime(),st=Math.min(s.getTime(),e.getTime()),en=Math.max(s.getTime(),e.getTime()); return t>st&&t<en; }
function fmtDate(d){ return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getFullYear()).slice(2)}`; }

/* ══════════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════════ */
function DocSvg({type,stroke}){
  const p={fill:"none",stroke,strokeWidth:"1.8",width:"17",height:"17"};
  if(type==="folder") return <svg viewBox="0 0 24 24" {...p}><path d="M2 7a2 2 0 0 1 2-2h4l2 3H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-2H4"/></svg>;
  if(type==="pen")    return <svg viewBox="0 0 24 24" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>;
  if(type==="alert")  return <svg viewBox="0 0 24 24" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 12v3M12 9v.01"/></svg>;
  return <svg viewBox="0 0 24 24" {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>;
}

/* ══════════════════════════════════════════════════════════
   PORTAL DROPDOWN — renders via fixed position
   Uses getBoundingClientRect to position below trigger
══════════════════════════════════════════════════════════ */
function FixedDropdown({ triggerRef, open, children }) {
  const [pos, setPos] = useState({ top:0, left:0 });

  useEffect(() => {
    if (open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
  }, [open]);

  if (!open) return null;

  return (
    <div style={{
      position:"fixed", top:pos.top, left:pos.left,
      background:"#fff", borderRadius:12,
      boxShadow:"0 4px 24px rgba(0,0,0,0.14)",
      zIndex:9999, minWidth:170, padding:"6px 0",
      overflow:"hidden",
    }}>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PROJECT FILTER
══════════════════════════════════════════════════════════ */
function ProjectFilter({ value, onChange, projects }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (btnRef.current && !btnRef.current.closest("[data-proj-wrap]")?.contains(e.target)) setOpen(false); };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  return (
    <div data-proj-wrap="" style={{ position:"relative" }}>
      <button ref={btnRef} onClick={() => setOpen(v=>!v)} style={FBTN_STYLE}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
        {value}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      <FixedDropdown triggerRef={btnRef} open={open}>
        {projects.map(p => (
          <div key={p} onClick={() => { onChange(p); setOpen(false); }}
            style={{ ...DD_ITEM_STYLE, color: p===value ? "#2563EB" : "#374151", fontWeight: p===value ? 500 : 400 }}>
            {p}
          </div>
        ))}
      </FixedDropdown>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CALENDAR
══════════════════════════════════════════════════════════ */
function Calendar({ onClose, onSelect }) {
  const today = new Date();
  const [vm, setVm] = useState(today.getMonth());
  const [vy, setVy] = useState(today.getFullYear());
  const [start, setStart] = useState(null);
  const [end,   setEnd]   = useState(null);
  const [hover, setHover] = useState(null);
  const [picker, setPicker] = useState(null); // "month"|"year"

  const days = getDaysInMonth(vy,vm);
  const first = getFirstDay(vy,vm);

  const clickDay = (d) => {
    const date = new Date(vy,vm,d);
    if (!start || (start&&end)) { setStart(date); setEnd(null); }
    else if (date<start) { setEnd(start); setStart(date); }
    else setEnd(date);
  };

  const dayClass = (d) => {
    const date = new Date(vy,vm,d);
    const eff  = end || (start && hover && hover>start ? hover : null);
    let c = "";
    if (start && eff) {
      if (sameDay(date,start)) c = " rs";
      else if (sameDay(date,eff)) c = " re";
      else if (inRange(date,start,eff)) c = " ir";
    } else if (start && sameDay(date,start)) c = " sel";
    if (sameDay(date,today)) c += " tr";
    return c;
  };

  const doSelect = () => {
    if (start && end) onSelect(`${fmtDate(start)}-${fmtDate(end)}`);
    else if (start)   onSelect(fmtDate(start));
    onClose();
  };

  const prevM = () => { if(vm===0){setVm(11);setVy(v=>v-1);}else setVm(v=>v-1); };
  const nextM = () => { if(vm===11){setVm(0);setVy(v=>v+1);}else setVm(v=>v+1); };

  const cells = [];
  for(let i=0;i<first;i++) cells.push(null);
  for(let d=1;d<=days;d++) cells.push(d);

  const yrStart = vy - (vy%12);

  return (
    <div style={{ background:"#fff", borderRadius:12, padding:16, width:288, boxShadow:"0 4px 24px rgba(0,0,0,0.14)", position:"relative" }}>

      {/* Month/Year picker overlay */}
      {picker && (
        <>
          <div onClick={()=>setPicker(null)} style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.15)",borderRadius:12,zIndex:10 }} />
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:"#fff",borderRadius:14,padding:18,zIndex:11,width:264,boxShadow:"0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
              <span style={{ fontSize:14,fontWeight:600,color:"#111827" }}>{picker==="month"?"Select Month":"Select Year"}</span>
              {picker==="year" && (
                <div style={{ display:"flex",gap:4 }}>
                  <button onClick={()=>setVy(v=>v-12)} style={NAV_BTN}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="15 18 9 12 15 6"/></svg></button>
                  <button onClick={()=>setVy(v=>v+12)} style={NAV_BTN}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="9 6 15 12 9 18"/></svg></button>
                </div>
              )}
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8 }}>
              {picker==="month"
                ? MONTHS_SHORT.map((m,i)=>(
                    <div key={m} onClick={()=>{setVm(i);setPicker(null);}}
                      style={{ padding:"9px 4px",textAlign:"center",fontSize:13,cursor:"pointer",borderRadius:i===vm?20:8,
                        border:i===vm?"1.5px solid #2563EB":"1.5px solid transparent",
                        color:i===vm?"#2563EB":"#374151",fontWeight:i===vm?500:400,
                        background:"transparent" }}>
                      {m}
                    </div>))
                : Array.from({length:12},(_,i)=>yrStart+i).map(y=>(
                    <div key={y} onClick={()=>{setVy(y);setPicker(null);}}
                      style={{ padding:"9px 4px",textAlign:"center",fontSize:13,cursor:"pointer",borderRadius:y===vy?20:8,
                        border:y===vy?"1.5px solid #2563EB":"1.5px solid transparent",
                        color:y===vy?"#2563EB":"#374151",fontWeight:y===vy?500:400 }}>
                      {y}
                    </div>))
              }
            </div>
            <div style={{ display:"flex",gap:10,marginTop:14 }}>
              <button onClick={()=>setPicker(null)} style={CAL_CANCEL}>Cancel</button>
              <button onClick={()=>setPicker(null)} style={CAL_SELECT}>Select</button>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
        <button onClick={prevM} style={NAV_BTN}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg></button>
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={()=>setPicker("month")} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"#111827",display:"flex",alignItems:"center",gap:3 }}>
            {MONTHS[vm]} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button onClick={()=>setPicker("year")} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,color:"#111827",display:"flex",alignItems:"center",gap:3 }}>
            {vy} <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="11" height="11"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
        <button onClick={nextM} style={NAV_BTN}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="9 6 15 12 9 18"/></svg></button>
      </div>

      {/* Grid */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2 }}>
        {WEEK_DAYS.map(d=><div key={d} style={{ fontSize:10,color:"#9CA3AF",textAlign:"center",padding:"4px 0",fontWeight:500 }}>{d}</div>)}
        {cells.map((day,i)=> day===null
          ? <div key={`e${i}`} />
          : <div key={day}
              onClick={()=>clickDay(day)}
              onMouseEnter={()=>{ if(start&&!end) setHover(new Date(vy,vm,day)); }}
              onMouseLeave={()=>setHover(null)}
              style={{
                width:34,height:34,margin:"1px auto",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:12.5,cursor:"pointer",userSelect:"none",
                ...(()=>{
                  const date=new Date(vy,vm,day);
                  const eff=end||(start&&hover&&hover>start?hover:null);
                  const isStart=start&&sameDay(date,start);
                  const isEnd=eff&&sameDay(date,eff);
                  const isIn=start&&eff&&!isStart&&!isEnd&&inRange(date,start,eff);
                  const isToday=sameDay(date,today);
                  if(isStart&&eff) return { background:"#2563EB",color:"#fff",borderRadius:"50% 0 0 50%" };
                  if(isEnd)        return { background:"#2563EB",color:"#fff",borderRadius:"0 50% 50% 0" };
                  if(isIn)         return { background:"#DBEAFE",color:"#1D4ED8",borderRadius:0 };
                  if(isStart)      return { background:"#2563EB",color:"#fff",borderRadius:"50%",boxShadow:isToday?"0 0 0 2px #93C5FD":"none" };
                  if(isToday)      return { borderRadius:"50%",boxShadow:"0 0 0 1.5px #2563EB",color:"#2563EB",fontWeight:600 };
                  return { borderRadius:"50%",color:"#374151" };
                })()
              }}>
              {day}
            </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display:"flex",gap:10,marginTop:14 }}>
        <button onClick={onClose} style={CAL_CANCEL}>Cancel</button>
        <button onClick={doSelect} style={CAL_SELECT}>Select</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DATE FILTER
══════════════════════════════════════════════════════════ */
function DateFilter({ value, onChange }) {
  const [open,    setOpen]    = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [calPos,  setCalPos]  = useState({ top:0, left:0 });
  const btnRef = useRef(null);
  const wrapRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const h = (e) => {
      if (!wrapRef.current?.contains(e.target) && !e.target.closest("[data-cal-portal]")) {
        setOpen(false);
        setShowCal(false);
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const openCal = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setCalPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(false);
    setShowCal(true);
  };

  const [ddPos, setDdPos] = useState({ top:0, left:0 });
  const openDd = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setDdPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(v=>!v);
    setShowCal(false);
  };

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <button ref={btnRef} onClick={openDd} style={FBTN_STYLE}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        {value}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      {/* Dropdown list — fixed position */}
      {open && (
        <div style={{
          position:"fixed", top:ddPos.top, left:ddPos.left,
          background:"#fff", borderRadius:12,
          boxShadow:"0 4px 24px rgba(0,0,0,0.14)",
          zIndex:9999, minWidth:170, padding:"6px 0", overflow:"hidden",
        }}>
          {DATE_OPTS.map(opt => (
            <div key={opt}
              onClick={() => { if(opt==="Custom range") openCal(); else { onChange(opt); setOpen(false); } }}
              style={{ ...DD_ITEM_STYLE, color:opt===value?"#2563EB":"#374151", fontWeight:opt===value?500:400 }}>
              {opt}
            </div>
          ))}
        </div>
      )}

      {/* Calendar — fixed position portal */}
      {showCal && (
        <div data-cal-portal="" style={{ position:"fixed", top:calPos.top, left:calPos.left, zIndex:9999 }}>
          <Calendar
            onClose={() => setShowCal(false)}
            onSelect={(range) => { onChange(range); setShowCal(false); }}
          />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SHARED STYLES
══════════════════════════════════════════════════════════ */
const FBTN_STYLE = {
  display:"flex", alignItems:"center", gap:6, flexShrink:0,
  border:"1.5px solid #2563EB", borderRadius:30,
  padding:"6px 14px", fontSize:12.5, color:"#2563EB",
  cursor:"pointer", background:"#fff", fontFamily:"inherit", fontWeight:500,
};
const DD_ITEM_STYLE = {
  padding:"10px 18px", fontSize:13, cursor:"pointer",
  whiteSpace:"nowrap", transition:"background 0.1s",
};
const NAV_BTN = {
  background:"none", border:"none", cursor:"pointer", color:"#6B7280",
  display:"flex", alignItems:"center", padding:4, borderRadius:6,
};
const CAL_CANCEL = {
  flex:1, border:"0.5px solid #E5E7EB", borderRadius:8, padding:"8px",
  fontSize:13, cursor:"pointer", background:"#fff", fontFamily:"inherit", color:"#6B7280",
};
const CAL_SELECT = {
  flex:2, background:"#2563EB", color:"#fff", border:"none", borderRadius:8,
  padding:"8px", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:500,
};

/* ══════════════════════════════════════════════════════════
   CONTEXT MENU
══════════════════════════════════════════════════════════ */
function ContextMenu({ onClear, onOpenTask, onClose }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if(ref.current&&!ref.current.contains(e.target)) onClose(); };
    setTimeout(()=>document.addEventListener("mousedown",h),0);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);
  return (
    <div ref={ref} style={{
      position:"absolute", right:0, top:"100%",
      background:"#fff", borderRadius:10,
      boxShadow:"0 4px 18px rgba(0,0,0,0.13)",
      zIndex:500, padding:"6px 0", minWidth:130,
    }}>
      <div onClick={()=>{onClear();onClose();}} style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 16px",fontSize:13,cursor:"pointer",color:"#374151" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
        {t("inbox.clear")}
      </div>
      <div onClick={()=>{onOpenTask();onClose();}} style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 16px",fontSize:13,cursor:"pointer",color:"#374151" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" width="14" height="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        {t("inbox.openTask")}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CARD ROW
══════════════════════════════════════════════════════════ */
function CardRow({ item, isOut, onClearReq, onOpenTask }) {
  const [menu, setMenu] = useState(false);
  return (
    <div style={{ display:"flex",alignItems:"center",gap:12,borderBottom:"0.5px solid #F3F4F6",padding:"11px 4px",cursor:"pointer",position:"relative" }}>
      <div style={{ width:36,height:36,borderRadius:8,background:item.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
        <DocSvg type={item.icon} stroke={item.stroke}/>
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:13,fontWeight:600,color:"#111827" }}>{item.name}</div>
        <div style={{ fontSize:11.5,color:"#9CA3AF",marginTop:2 }}>
          {isOut
            ? <><span style={{ color:"#374151",fontWeight:500 }}>Sent to {item.to}</span> · {item.action}</>
            : <>{item.from} · {item.action}</>}
        </div>
      </div>
      <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
        <div style={{ display:"flex",gap:5 }}>
          {item.badges.map(b=>(
            <span key={b} style={{ fontSize:10.5,fontWeight:600,padding:"3px 9px",borderRadius:20,whiteSpace:"nowrap",...BADGE_STYLE[b] }}>
              {BADGE_LABEL[b]}
            </span>
          ))}
        </div>
        <div style={{ fontSize:11.5,color:"#9CA3AF",display:"flex",alignItems:"center",gap:3,whiteSpace:"nowrap" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {item.time}
        </div>
        <div style={{ position:"relative" }}>
          <button onClick={(e)=>{e.stopPropagation();setMenu(v=>!v);}}
            style={{ fontSize:15,color:"#D1D5DB",cursor:"pointer",letterSpacing:"2px",background:"none",border:"none",padding:"0 4px",lineHeight:1 }}>
            ···
          </button>
          {menu && <ContextMenu onClose={()=>setMenu(false)} onClear={onClearReq} onOpenTask={()=>{ onOpenTask && onOpenTask(); setMenu(false); }}/>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CONFIRM MODAL
══════════════════════════════════════════════════════════ */
function ConfirmModal({ onClose, onConfirm }) {
  const { t } = useTranslation();
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:14,padding:"28px 28px 22px",width:340,textAlign:"center",position:"relative",boxShadow:"0 8px 32px rgba(0,0,0,0.15)" }}>
        <button onClick={onClose} style={{ position:"absolute",top:14,right:14,background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",display:"flex",alignItems:"center" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <h3 style={{ fontSize:18,fontWeight:600,color:"#111827",marginBottom:10 }}>{t("inbox.confirmDeleteTitle")}</h3>
        <p style={{ fontSize:13,color:"#6B7280",lineHeight:1.6,marginBottom:22 }}>{t("inbox.confirmDeleteMsg")}</p>
        <button onClick={()=>{onConfirm();onClose();}} style={{ width:"100%",background:"#2563EB",color:"#fff",border:"none",borderRadius:8,padding:12,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"inherit" }}>
          {t("inbox.yes")}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   NAV ITEMS
══════════════════════════════════════════════════════════ */
const NAV_KEYS = [
  { key:"inbox",    navKey:"inbox",    active:true,  icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg> },
  { key:"projects", navKey:"projects", active:false, icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg> },
  { key:"documents",navKey:"documents",active:false, icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { key:"analytics",navKey:"analytics",active:false, icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { key:"help",     navKey:"help",     active:false, icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
];

/* ══════════════════════════════════════════════════════════
   CSS STRING (только layout, не дропдауны)
══════════════════════════════════════════════════════════ */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;height:100%;overflow:hidden}
  #root{width:100%;height:100%;display:flex}
  button{font-family:'DM Sans','Segoe UI',sans-serif;cursor:pointer}
  button:hover{opacity:unset}

  .ib-page{display:flex;flex-direction:column;width:100%;height:100%;font-family:'DM Sans','Segoe UI',sans-serif;overflow:hidden}

  /* header */
  .ib-topbar{display:flex;align-items:center;padding:0 20px;height:52px;gap:10px;flex-shrink:0;background:#fff;border-bottom:.5px solid #E5E7EB;z-index:30}
  .ib-body{display:flex;flex:1;overflow:hidden;min-height:0}

  /* sidebar */
  .ib-sb{width:60px;flex-shrink:0;background:#fff;border-right:.5px solid #E5E7EB;display:flex;flex-direction:column;align-items:center;padding:0 0 14px;height:100%;z-index:20;transition:width .28s cubic-bezier(.4,0,.2,1);overflow:hidden}
  .ib-sb.open{width:268px;align-items:stretch}
  .ib-profile{background:#2563EB;width:100%;display:flex;flex-direction:column;align-items:center;padding:10px 0 32px;flex-shrink:0;position:relative}
  .ib-toggle{position:absolute;top:8px;left:8px;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.18);border:none;color:#fff;cursor:pointer;flex-shrink:0}
  .ib-toggle:hover{background:rgba(255,255,255,0.32)}
  .ib-toggle svg{transition:transform .28s}
  .ib-sb.open .ib-toggle svg{transform:rotate(180deg)}
  .ib-avatar{display:none;position:absolute;bottom:-30px;left:50%;transform:translateX(-50%);width:60px;height:60px;border-radius:50%;overflow:hidden;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.12);z-index:1}
  .ib-sb.open .ib-avatar{display:block}
  .ib-profile-info{display:none;text-align:center;padding:36px 12px 4px;flex-shrink:0}
  .ib-sb.open .ib-profile-info{display:block}
  .ib-org{display:none;align-items:center;gap:6px;margin:4px 10px 6px;border:.5px solid #E5E7EB;border-radius:10px;padding:5px 10px;cursor:pointer;flex-shrink:0;transition:border-color .15s}
  .ib-org:hover{border-color:#2563EB}
  .ib-sb.open .ib-org{display:flex}
  .ib-navlist{display:flex;flex-direction:column;flex:1;width:100%;gap:1px;align-items:center;padding:4px 0}
  .ib-sb.open .ib-navlist{align-items:stretch;padding:4px 8px}
  .ib-navitem{width:42px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#9CA3AF;border:1.5px solid transparent;background:none;font-family:inherit;flex-shrink:0;transition:background .15s,color .15s,border-color .15s;cursor:pointer}
  .ib-sb.open .ib-navitem{width:auto;height:36px;justify-content:flex-start;gap:10px;padding:0 10px;font-size:13px;border-radius:12px}
  .ib-navitem:hover{background:#EFF6FF;color:#2563EB;border-color:#2563EB}
  .ib-navitem.active{background:#EEF2FF;color:#4F46E5;border-color:transparent}
  .ib-navlabel{display:none;flex:1;text-align:left;white-space:nowrap}
  .ib-navchev{display:none}
  .ib-sb.open .ib-navlabel{display:block}
  .ib-sb.open .ib-navchev{display:block}
  .ib-sbbottom{margin-top:auto;width:100%;display:flex;justify-content:center;padding:0 8px;flex-shrink:0}
  .ib-addbtn{width:42px;height:42px;background:#2563EB;color:#fff;border:none;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;font-size:13px;font-weight:500;font-family:inherit;overflow:hidden;transition:width .28s cubic-bezier(.4,0,.2,1);flex-shrink:0;padding:0}
  .ib-sb.open .ib-addbtn{width:100%;border-radius:10px;justify-content:flex-start;padding:0 14px}
  .ib-addbtn-plus{transition:transform .28s;flex-shrink:0}
  .ib-sb.open .ib-addbtn-plus{transform:rotate(45deg)}
  .ib-addbtn-label{display:none;white-space:nowrap}
  .ib-sb.open .ib-addbtn-label{display:block}

  /* main */
  .ib-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;background:#EEEDF0}
  .ib-container{flex:1;margin:0 12px 12px 6px;background:#fff;border-radius:16px;display:flex;flex-direction:column;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:visible;min-height:0}
  .ib-inner{flex:1;overflow-y:auto;overflow-x:visible;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent}
  .ib-inner::-webkit-scrollbar{width:4px}
  .ib-inner::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}
  .ib-tabs{display:flex;border-bottom:.5px solid #E5E7EB;flex-shrink:0}
  .ib-tab{padding:12px 24px;font-size:13px;color:#9CA3AF;border:none;background:none;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-.5px;font-weight:500}
  .ib-tab.active{color:#2563EB;border-bottom-color:#2563EB}
  .ib-filters{display:flex;align-items:center;gap:8px;padding:14px 20px 12px;flex-shrink:0;overflow:visible}
  .ib-content{padding:0 20px 20px;overflow:visible}
  .ib-sec{font-size:13px;font-weight:500;color:#6B7280;margin-bottom:8px;padding:0 4px}

  /* mobile */
  .ib-mob-nav{display:none;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:.5px solid #E5E7EB;padding:8px 0 calc(8px + env(safe-area-inset-bottom));z-index:50;justify-content:space-around;align-items:center}
  .ib-mob-btn{display:flex;flex-direction:column;align-items:center;gap:3px;border:none;background:none;color:#9CA3AF;font-size:10px;font-family:inherit;padding:4px 12px;border-radius:8px}
  .ib-mob-btn.active{color:#4F46E5}
  .ib-mob-add{width:48px;height:48px;border-radius:14px;background:#2563EB;display:flex;align-items:center;justify-content:center;border:none;margin-bottom:4px}

  @media(max-width:768px){
    .ib-sb{display:none}
    .ib-sb.open{display:flex;position:fixed;top:52px;left:0;bottom:0;height:calc(100% - 52px);width:268px!important;background:#fff;border-right:.5px solid #E5E7EB;box-shadow:4px 0 24px rgba(0,0,0,.13)}
    .ib-mob-nav{display:flex}
    .ib-container{margin:0 8px 80px 8px;border-radius:12px}
    .ib-topbar{padding:0 14px}
    .ib-hamburger{display:flex!important}
    .ib-back-arrow{display:none!important}
  }
`;

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════ */
export default function Inbox({ onGoToAuth, onNavigate }) {
  const { t } = useTranslation();
  const [sbOpen, toggleSb] = useSidebarOpen();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileView,   setProfileView]   = useState(null);
  const [tab,           setTab]           = useState("incoming");
  const [project,       setProject]       = useState("All projects");
  const [date,          setDate]          = useState("Last 7 days");
  const [confirm,       setConfirm]       = useState(false);
  const [wsDropOpen,    setWsDropOpen]    = useState(false);
  const [showCreateWs,  setShowCreateWs]  = useState(false);
  const wsDropRef = useRef(null);

  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();

  const { data: wsData } = useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });
  const workspaces = wsData?.results ?? (Array.isArray(wsData) ? wsData : []);
  const orgName    = workspaces[0]?.title || "Organization";
  const wsNames    = workspaces.map(w => w.title);
  const projectOptions = ["All projects", ...wsNames];

  /* close ws dropdown on outside click */
  useEffect(() => {
    if (!wsDropOpen) return;
    const h = (e) => { if (wsDropRef.current && !wsDropRef.current.contains(e.target)) setWsDropOpen(false); };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, [wsDropOpen]);

  const isOut = tab === "outgoing";

  // Convert UI date label → API date_from / date_to params
  const dateParams = (() => {
    const now = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    if (date === "Today") {
      return { date_from: fmt(now), date_to: fmt(now) };
    }
    if (date === "Yesterday") {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { date_from: fmt(y), date_to: fmt(y) };
    }
    if (date === "Last 7 days") {
      const w = new Date(now); w.setDate(w.getDate() - 7);
      return { date_from: fmt(w) };
    }
    if (date === "This month") {
      return { date_from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)) };
    }
    // Custom range: "DD.MM.YY-DD.MM.YY" or "DD.MM.YY"
    const match = date.match(/^(\d{2})\.(\d{2})\.(\d{2})(?:-(\d{2})\.(\d{2})\.(\d{2}))?$/);
    if (match) {
      const parse = (d, m, y) => `20${y}-${m}-${d}`;
      const from = parse(match[1], match[2], match[3]);
      const to   = match[4] ? parse(match[4], match[5], match[6]) : from;
      return { date_from: from, date_to: to };
    }
    return {};
  })();

  // Always fetch all tasks — split incoming/outgoing by status
  const { data: tasksData } = useQuery({
    queryKey: ["tasks", dateParams],
    queryFn: () => getTasks(dateParams),
  });

  const TERMINAL = new Set(["done", "skipped"]);
  const rawTasks = tasksData?.results ?? [];

  const activeTasks = rawTasks.filter(t => !TERMINAL.has(t.status));
  const doneTasks   = rawTasks.filter(t =>  TERMINAL.has(t.status));

  const todayIn  = activeTasks.filter(t =>  isToday(t.created_at)).map(taskToCard);
  const weekIn   = activeTasks.filter(t => !isToday(t.created_at)).map(taskToCard);
  const todayOut = doneTasks.filter(t =>  isToday(t.created_at)).map(taskToCard);
  const weekOut  = doneTasks.filter(t => !isToday(t.created_at)).map(taskToCard);

  const todayData = isOut ? todayOut : todayIn;
  const weekData  = isOut ? weekOut  : weekIn;

  const handleComplete = async (taskId, taskStatus) => {
    if (!taskId) return;
    if (taskStatus !== "in_progress") {
      toast.error("Task must be in progress to complete");
      return;
    }
    try {
      await completeTask(taskId);
      toast.success("Task completed");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to complete task");
    }
  };

  const handleSkip = async (taskId) => {
    if (!taskId) return;
    try {
      await skipTask(taskId);
      toast.success("Task cleared");
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to skip task");
    }
  };

  return (
    <div className="ib-page">
      <style>{css}</style>

      {showCreateWs && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWs(false)}
          onCreated={(id) => {
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            if (id) onNavigate?.(`organization/${id}`);
          }}
        />
      )}

      {confirm && <ConfirmModal onClose={()=>setConfirm(false)} onConfirm={()=>{
        queryClient.setQueryData(["tasks", dateParams], (old) => {
          if (!old) return old;
          const results = (old.results ?? old).filter(t => !TERMINAL.has(t.status));
          return Array.isArray(old) ? results : { ...old, results };
        });
      }} />}

      {/* ── HEADER ── */}
      <header className="ib-topbar">
        <button className="ib-hamburger" onClick={()=>toggleSb()}
          style={{ display:"none",width:36,height:36,border:"none",background:"none",color:"#6B7280",alignItems:"center",justifyContent:"center",borderRadius:8,flexShrink:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <img src={logoImg} alt="Logo" style={{ height:30,flexShrink:0 }}/>
        <svg className="ib-back-arrow" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        <div style={{ display:"flex",alignItems:"center",gap:5,fontSize:13 }}>
          <span style={{ color:"#9CA3AF" }}>Inbox</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><polyline points="9 6 15 12 9 18"/></svg>
          <span style={{ color:"#111827",fontWeight:500 }}>{isOut?"Outgoing":"Incoming"}</span>
        </div>
          <div style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:10 }}>
            <div onClick={()=>onNavigate&&onNavigate("notifications")} title="Notifications"
              style={{ position:"relative",width:30,height:30,borderRadius:8,border:"0.5px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"#fff" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <div style={{ position:"absolute",top:-2,right:-2,width:8,height:8,background:"#EF4444",borderRadius:"50%",border:"1.5px solid #fff" }}/>
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
                  <svg viewBox="0 0 30 30" fill="none" width="30" height="30"><rect width="30" height="30" fill="#CBD5E1"/><circle cx="15" cy="11" r="5" fill="#94A3B8"/><ellipse cx="15" cy="26" rx="10" ry="6" fill="#94A3B8"/></svg>
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

      {/* sidebar overlay mobile */}
      {sbOpen && <div onClick={toggleSb} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:15 }}/>}

      {/* ── BODY ── */}
      <div className="ib-body">

        {/* ── SIDEBAR ── */}
        <aside className={`ib-sb${sbOpen?" open":""}`}>
          <div className="ib-profile">
            <button className="ib-toggle" onClick={()=>toggleSb()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><polyline points="9 6 15 12 9 18"/></svg>
            </button>
            <div className="ib-avatar">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                : <svg viewBox="0 0 60 60" fill="none" width="60" height="60"><rect width="60" height="60" fill="#CBD5E1"/><circle cx="30" cy="22" r="10" fill="#94A3B8"/><ellipse cx="30" cy="52" rx="20" ry="12" fill="#94A3B8"/></svg>
              }
            </div>
          </div>
          <div className="ib-profile-info">
            <div style={{ fontSize:13,fontWeight:600,color:"#111827" }}>{user?.full_name || "User"}</div>
            <div style={{ fontSize:10.5,color:"#9CA3AF",marginTop:2 }}>{user?.email || ""}</div>
          </div>
          {/* Workspace switcher */}
          <div ref={wsDropRef} style={{ position:"relative",margin:"0 10px 4px" }}>
            <div className="ib-org" onClick={() => setWsDropOpen(v=>!v)} style={{ cursor:"pointer" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              <span style={{ fontSize:11.5,color:"#6B7280",flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{orgName}</span>
              <div style={{ width:7,height:7,borderRadius:"50%",background:"#22c55e",flexShrink:0 }}/>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
                style={{ transform: wsDropOpen?"rotate(180deg)":"none", transition:"transform .2s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
            {wsDropOpen && (
              <div style={{ position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#fff",borderRadius:10,boxShadow:"0 4px 20px rgba(0,0,0,0.12)",zIndex:200,overflow:"hidden",border:"1px solid #F3F4F6" }}>
                <div style={{ padding:"6px 12px 4px",fontSize:10.5,color:"#9CA3AF",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em" }}>
                  Switch Workplaces
                </div>
                {workspaces.map((ws) => (
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
                  <div
                    onClick={() => { setWsDropOpen(false); setShowCreateWs(true); }}
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
          <div className="ib-navlist">
            {NAV_KEYS.map((n,i)=>(
              <button key={i} className={`ib-navitem${n.active?" active":""}`}
                onClick={() => { if (n.navKey !== "inbox" && onNavigate) onNavigate(n.navKey); }}>
                {n.icon}
                <span className="ib-navlabel">{t(`nav.${n.key}`)}</span>
                <svg className="ib-navchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><polyline points="9 6 15 12 9 18"/></svg>
              </button>
            ))}
          </div>
          <div className="ib-sbbottom">
            <button className="ib-addbtn" onClick={() => onNavigate && onNavigate("projects")}>
              <svg className="ib-addbtn-plus" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span className="ib-addbtn-label">{t("inbox.newProject")}</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="ib-main">
          <ProfileController show={!!profileView} view={profileView} setView={setProfileView} onLogOut={onGoToAuth}/>

          <div className="ib-container">
            {/* Tabs */}
            <div className="ib-tabs">
              <button className={`ib-tab${tab==="incoming"?" active":""}`} onClick={()=>setTab("incoming")}>{t("inbox.incoming")}</button>
              <button className={`ib-tab${tab==="outgoing"?" active":""}`} onClick={()=>setTab("outgoing")}>{t("inbox.outgoing")}</button>
            </div>

            {/* Filters */}
            <div className="ib-filters">
              <ProjectFilter value={project} onChange={setProject} projects={projectOptions}/>
              <DateFilter    value={date}    onChange={setDate}/>
              <button onClick={()=>{setProject("All projects");setDate("Last 7 days");}}
                style={{ marginLeft:"auto",display:"flex",alignItems:"center",gap:4,fontSize:12,color:"#6B7280",background:"none",border:"none",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                {t("inbox.clearAll")}
              </button>
            </div>

            {/* Scrollable content */}
            <div className="ib-inner">
              <div className="ib-content">
                <div className="ib-sec">{t("inbox.today")}</div>
                {todayData.length === 0 && <div style={{ fontSize:12.5,color:"#9CA3AF",padding:"12px 4px" }}>{t("inbox.noItems")}</div>}
                {todayData.map(item=>(
                  <CardRow
                    key={item.id}
                    item={item}
                    isOut={isOut}
                    onClearReq={() => isOut ? setConfirm(true) : handleSkip(item._taskId)}
                    onOpenTask={() => handleComplete(item._taskId, item._status)}
                  />
                ))}
                <div className="ib-sec" style={{ marginTop:20 }}>{t("inbox.lastWeek")}</div>
                {weekData.length === 0 && <div style={{ fontSize:12.5,color:"#9CA3AF",padding:"12px 4px" }}>{t("inbox.noItems")}</div>}
                {weekData.map(item=>(
                  <CardRow
                    key={item.id}
                    item={item}
                    isOut={isOut}
                    onClearReq={() => isOut ? setConfirm(true) : handleSkip(item._taskId)}
                    onOpenTask={() => handleComplete(item._taskId, item._status)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="ib-mob-nav">
        <button className="ib-mob-btn active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
          {t("nav.inbox")}
        </button>
        <button className="ib-mob-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          {t("nav.projects")}
        </button>
        <button className="ib-mob-add"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        <button className="ib-mob-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          {t("nav.documents")}
        </button>
        <button className="ib-mob-btn" onClick={onGoToAuth}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {t("profile.title")}
        </button>
      </nav>
    </div>
  );
}