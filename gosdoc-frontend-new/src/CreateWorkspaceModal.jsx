import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { createWorkspace, addMember } from "./api/workspaces";
import { getDocuments } from "./api/documents";

const TOTAL = 4;

const ROLE_OPTIONS = ["editor", "signer", "viewer", "owner"];

const WORKSPACE_TYPES = [
  {
    value: "personal",
    label: "Personal",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    value: "team",
    label: "Team",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    value: "organization",
    label: "Organization",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 9h18M9 21V9"/>
      </svg>
    ),
  },
];

export default function CreateWorkspaceModal({ onClose, onCreated }) {
  const [step,    setStep]    = useState(1);
  const [wsType,  setWsType]  = useState("");
  const [wsName,  setWsName]  = useState("");
  const [members, setMembers] = useState([{ email: "", role: "editor" }, { email: "", role: "editor" }]);
  const [projName, setProjName] = useState("");
  const [projDesc, setProjDesc] = useState("");
  const [docName,  setDocName]  = useState("");
  const [docFile,  setDocFile]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const fileRef = useRef(null);

  /* ── member rows ── */
  const addMemberRow = () => setMembers(m => [...m, { email: "", role: "editor" }]);
  const updateMember = (i, field, val) =>
    setMembers(m => m.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const removeMember = (i) => setMembers(m => m.filter((_, idx) => idx !== i));

  /* ── step actions ── */
  const goNext = () => setStep(s => Math.min(s + 1, TOTAL));
  const goBack = () => setStep(s => Math.max(s - 1, 1));

  /* Step 1 → 2 */
  const onStep1Next = () => {
    if (!wsType) { toast.error("Please select a workspace type"); return; }
    goNext();
  };

  /* Step 2 → 3 */
  const onStep2Next = async () => {
    if (!wsName.trim()) { toast.error("Please enter a workspace name"); return; }
    setLoading(true);
    try {
      const ws = await createWorkspace({ title: wsName.trim(), type: wsType });
      setCreatedId(ws.id);
      goNext();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create workspace");
    } finally { setLoading(false); }
  };

  /* Step 3 → 4 (invite) */
  const onInvite = async () => {
    const valid = members.filter(m => m.email.trim() && /\S+@\S+\.\S+/.test(m.email));
    if (valid.length && createdId) {
      const results = await Promise.allSettled(
        valid.map(m => addMember(createdId, { email: m.email.trim(), role: m.role }))
      );
      const failed = results.filter(r => r.status === "rejected").length;
      if (failed) toast.error(`${failed} invite(s) could not be sent`);
      else if (valid.length) toast.success("Invitations sent!");
    }
    goNext();
  };

  /* Step 3 — skip */
  const onSkip3 = () => goNext();

  /* Step 4 — finish */
  const onFinish = () => {
    toast.success("Workspace created!");
    onCreated?.(createdId);
    onClose();
  };

  /* Step 4 — skip */
  const onSkip4 = () => {
    toast.success("Workspace created!");
    onCreated?.(createdId);
    onClose();
  };

  /* ── drag-drop ── */
  const onDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setDocFile(f);
  };

  const stepLabel = `STEP ${step} OF ${TOTAL}`;

  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:16,width:520,maxWidth:"94vw",maxHeight:"90vh",overflowY:"auto",position:"relative",boxShadow:"0 8px 40px rgba(0,0,0,0.18)",display:"flex",flexDirection:"column" }}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"22px 24px 0" }}>
          <span style={{ fontSize:11.5,fontWeight:700,color:"#2563EB",letterSpacing:"0.08em" }}>{stepLabel}</span>
          <button onClick={onClose} style={{ border:"none",background:"none",cursor:"pointer",color:"#9CA3AF",display:"flex",alignItems:"center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ display:"flex",gap:4,padding:"10px 24px 0" }}>
          {Array.from({length:TOTAL}).map((_,i)=>(
            <div key={i} style={{ flex:1,height:3,borderRadius:999,background:i<step?"#2563EB":"#E5E7EB",transition:"background .3s" }}/>
          ))}
        </div>

        <div style={{ padding:"28px 28px 24px",flex:1 }}>

          {/* ─── STEP 1 ─── */}
          {step === 1 && (
            <>
              <h2 style={{ fontSize:20,fontWeight:700,color:"#111827",textAlign:"center",marginBottom:32 }}>
                What will you use this Workspace for?
              </h2>
              <div style={{ display:"flex",gap:12,justifyContent:"center",marginBottom:32 }}>
                {WORKSPACE_TYPES.map(t => (
                  <button key={t.value} onClick={() => setWsType(t.value)}
                    style={{
                      display:"flex",flexDirection:"column",alignItems:"center",gap:10,
                      padding:"18px 24px",borderRadius:12,cursor:"pointer",fontFamily:"inherit",
                      border:`2px solid ${wsType===t.value ? "#2563EB" : "#E5E7EB"}`,
                      background: wsType===t.value ? "#EFF6FF" : "#fff",
                      color: wsType===t.value ? "#2563EB" : "#6B7280",
                      transition:"all .15s",minWidth:110,
                    }}>
                    {t.icon}
                    <span style={{ fontSize:13.5,fontWeight:600 }}>{t.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ display:"flex",justifyContent:"flex-end" }}>
                <button onClick={onStep1Next} style={btnBlue}>Next →</button>
              </div>
            </>
          )}

          {/* ─── STEP 2 ─── */}
          {step === 2 && (
            <>
              <h2 style={{ fontSize:20,fontWeight:700,color:"#111827",textAlign:"center",marginBottom:32 }}>
                What would you like to name your Workspace?
              </h2>
              <input
                value={wsName} onChange={e => setWsName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onStep2Next()}
                placeholder="ex: Dream Workplace"
                style={{ width:"100%",border:"none",borderBottom:"2px solid #E5E7EB",outline:"none",fontSize:16,color:"#111827",padding:"8px 0",background:"transparent",fontFamily:"inherit",boxSizing:"border-box",marginBottom:40 }}
              />
              <div style={{ display:"flex",justifyContent:"space-between" }}>
                <button onClick={goBack} style={btnGhost}>← Back</button>
                <button onClick={onStep2Next} disabled={loading} style={{ ...btnBlue,opacity:loading?0.7:1 }}>
                  {loading ? "Creating…" : "Next →"}
                </button>
              </div>
            </>
          )}

          {/* ─── STEP 3 ─── */}
          {step === 3 && (
            <>
              <h2 style={{ fontSize:18,fontWeight:700,color:"#111827",marginBottom:6,textAlign:"center" }}>
                Invite Team Members
              </h2>
              <p style={{ fontSize:13,color:"#6B7280",textAlign:"center",marginBottom:22 }}>
                Add team members by email to begin working together in your workspace.
              </p>

              {members.map((m, i) => (
                <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:10 }}>
                  <div style={{ flex:1,display:"flex",flexDirection:"column",gap:4 }}>
                    <label style={{ fontSize:11.5,fontWeight:500,color:"#374151" }}>Team Member Email*</label>
                    <div style={inputRow}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="14" height="14"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="2,4 12,13 22,4"/></svg>
                      <input style={inputInner} type="email" placeholder="ex: example@workplace.com"
                        value={m.email} onChange={e => updateMember(i, "email", e.target.value)}/>
                    </div>
                  </div>
                  <div style={{ flex:1,display:"flex",flexDirection:"column",gap:4 }}>
                    <label style={{ fontSize:11.5,fontWeight:500,color:"#374151" }}>Role*</label>
                    <div style={inputRow}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8" width="14" height="14"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      <select value={m.role} onChange={e => updateMember(i, "role", e.target.value)}
                        style={{ flex:1,border:"none",outline:"none",fontSize:13,fontFamily:"inherit",background:"transparent",cursor:"pointer",color:"#374151" }}>
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                  {members.length > 1 && (
                    <button onClick={() => removeMember(i)}
                      style={{ marginTop:22,border:"none",background:"none",cursor:"pointer",color:"#9CA3AF",padding:4 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              ))}

              <button onClick={addMemberRow}
                style={{ display:"flex",alignItems:"center",gap:6,fontSize:13,color:"#2563EB",background:"none",border:"none",cursor:"pointer",padding:"4px 0",marginBottom:24,fontFamily:"inherit",fontWeight:500 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add member
              </button>

              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <button onClick={goBack} style={btnGhost}>← Back</button>
                <div style={{ display:"flex",gap:10 }}>
                  <button onClick={onSkip3} style={btnOutline}>Skip</button>
                  <button onClick={onInvite} style={btnBlue}>Invite →</button>
                </div>
              </div>
            </>
          )}

          {/* ─── STEP 4 ─── */}
          {step === 4 && (
            <>
              <h2 style={{ fontSize:20,fontWeight:700,color:"#111827",textAlign:"center",marginBottom:22 }}>
                New Project
              </h2>

              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                <div>
                  <label style={labelStyle}>Project Name*</label>
                  <input value={projName} onChange={e=>setProjName(e.target.value)}
                    placeholder="ex: Docs" style={textInput}/>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea value={projDesc} onChange={e=>setProjDesc(e.target.value)}
                    placeholder="ex: A project for managing approvals…" rows={3}
                    style={{ ...textInput,resize:"vertical",height:"auto",padding:"10px 14px" }}/>
                </div>
                <div>
                  <label style={labelStyle}>First Document Name*</label>
                  <input value={docName} onChange={e=>setDocName(e.target.value)}
                    placeholder="ex: Contract" style={textInput}/>
                </div>
                <div
                  onDrop={onDrop} onDragOver={e=>e.preventDefault()}
                  onClick={() => fileRef.current?.click()}
                  style={{ border:"1.5px dashed #93C5FD",borderRadius:10,padding:"20px",textAlign:"center",cursor:"pointer",background:"#F8FAFF",display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="1.8" width="28" height="28"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
                  <span style={{ fontSize:12.5,color:"#6B7280" }}>
                    {docFile ? docFile.name : "Drag & drop or click to upload the document"}
                  </span>
                  <input ref={fileRef} type="file" style={{ display:"none" }} onChange={e=>setDocFile(e.target.files?.[0]||null)}/>
                </div>
              </div>

              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:24 }}>
                <button onClick={goBack} style={btnGhost}>← Back</button>
                <div style={{ display:"flex",gap:10 }}>
                  <button onClick={onSkip4} style={btnOutline}>Skip</button>
                  <button onClick={onFinish} style={btnBlue}>Finish →</button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── shared styles ── */
const btnBlue = {
  background:"#2563EB",color:"#fff",border:"none",borderRadius:8,
  padding:"10px 22px",fontSize:13.5,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
};
const btnGhost = {
  background:"none",border:"none",color:"#6B7280",cursor:"pointer",
  fontSize:13.5,fontFamily:"inherit",fontWeight:500,
};
const btnOutline = {
  background:"none",border:"1.5px solid #E5E7EB",color:"#374151",borderRadius:8,
  padding:"10px 18px",fontSize:13.5,fontWeight:500,cursor:"pointer",fontFamily:"inherit",
};
const inputRow = {
  display:"flex",alignItems:"center",border:"1.5px solid #E2E5EF",
  borderRadius:8,height:40,padding:"0 12px",gap:8,background:"#fff",
};
const inputInner = {
  flex:1,border:"none",outline:"none",fontSize:13,color:"#374151",
  background:"transparent",fontFamily:"inherit",
};
const labelStyle = {
  display:"block",fontSize:12,fontWeight:500,color:"#374151",marginBottom:5,
};
const textInput = {
  width:"100%",border:"1.5px solid #E2E5EF",borderRadius:8,padding:"0 14px",
  height:42,fontSize:13.5,color:"#374151",fontFamily:"inherit",outline:"none",
  boxSizing:"border-box",background:"#fff",
};
