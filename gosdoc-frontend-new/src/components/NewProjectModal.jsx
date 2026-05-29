import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { createWorkspace, addMember } from "../api/workspaces";
import { serverUploadDocument } from "../api/documents";
import EmailAutocomplete from "./EmailAutocomplete";

const CSS = `
  .npm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:'Gilroy','Segoe UI',sans-serif}
  .npm-modal{background:#fff;border-radius:16px;padding:28px;width:460px;max-width:95vw;position:relative;max-height:90vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,0.18)}
  .npm-modal h2{font-size:18px;font-weight:700;color:#111827;margin-bottom:20px;text-align:center}
  .npm-modal-x{position:absolute;top:16px;right:16px;background:none;border:none;color:#9CA3AF;display:flex;align-items:center;cursor:pointer}
  .npm-label{font-size:13px;font-weight:500;color:#374151;margin-bottom:5px;display:block}
  .npm-input{width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:9px 12px;font-size:13px;color:#374151;outline:none;font-family:inherit;transition:border-color .2s}
  .npm-input:focus{border-color:#2563EB}
  .npm-textarea{width:100%;border:1.5px solid #E5E7EB;border-radius:8px;padding:9px 12px;font-size:13px;color:#374151;outline:none;font-family:inherit;resize:vertical;min-height:80px;transition:border-color .2s}
  .npm-textarea:focus{border-color:#2563EB}
  .npm-dropzone{border:1.5px dashed #93C5FD;border-radius:8px;padding:20px;text-align:center;cursor:pointer;background:#EFF6FF}
  .npm-dropzone:hover{background:#DBEAFE}
  .npm-btn{width:100%;background:#2563EB;color:#fff;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;margin-top:4px}
  .npm-btn:hover{background:#1D4ED8}
  .npm-m-row{display:flex;gap:10px;margin-bottom:8px;align-items:flex-start}
  .npm-m-input{flex:1;border:1.5px solid #E5E7EB;border-radius:8px;padding:9px 12px;font-size:13px;color:#374151;outline:none;font-family:inherit}
  .npm-m-input:focus{border-color:#2563EB}
  .npm-m-rm{width:36px;height:36px;border:1.5px solid #E5E7EB;border-radius:8px;background:#fff;color:#9CA3AF;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
  .npm-m-rm:hover:not(:disabled){border-color:#EF4444;color:#EF4444}
  .npm-m-rm:disabled{opacity:.4;cursor:not-allowed}
  .npm-m-add{display:flex;align-items:center;gap:6px;background:none;border:none;color:#2563EB;font-size:13px;font-weight:500;cursor:pointer;font-family:inherit;padding:6px 0;margin-top:4px}
`;

function MemberInvite({ members, setMembers, errors, setErrors }) {
  const { t } = useTranslation();
  const update = (i, f, v) => {
    setMembers(m => m.map((x, j) => j === i ? { ...x, [f]: v } : x));
    if (errors) setErrors(e => e.map((x, j) => j === i ? { ...x, [f]: "" } : x));
  };
  const add = () => { if (members.length < 7) setMembers(m => [...m, { email: "", role: "viewer" }]); };
  const remove = (i) => {
    if (members.length <= 1) return;
    setMembers(m => m.filter((_, j) => j !== i));
    if (errors) setErrors(e => e.filter((_, j) => j !== i));
  };

  return (
    <div>
      <div style={{ display:"flex", gap:10, marginBottom:6 }}>
        <div style={{ flex:1, fontSize:12, fontWeight:500, color:"#374151" }}>{t("auth.email")} <span style={{ color:"#EF4444" }}>*</span></div>
        <div style={{ flex:1, fontSize:12, fontWeight:500, color:"#374151" }}>{t("projects.role")}</div>
        <div style={{ width:36 }}/>
      </div>
      {members.map((m, i) => (
        <div key={i} className="npm-m-row">
          <div style={{ flex:1, display:"flex", flexDirection:"column", gap:3 }}>
            <EmailAutocomplete
              value={m.email}
              onChange={(v) => update(i, "email", v)}
              error={!!errors?.[i]?.email}
              excludeEmails={members.filter((_, j) => j !== i).map(x => x.email)}
              placeholder="ex: example@gmail.com"
            />
            {errors?.[i]?.email && <span style={{ fontSize:11, color:"#EF4444" }}>{errors[i].email}</span>}
          </div>
          <select value={m.role || "viewer"} onChange={e => update(i, "role", e.target.value)}
                  style={{ flex:1, border:"1.5px solid #E5E7EB", borderRadius:8, padding:"9px 10px", fontSize:13, color:"#374151", fontFamily:"inherit", background:"#fff", cursor:"pointer", outline:"none" }}>
            <option value="viewer">{t("projects.roles.viewer")}</option>
            <option value="editor">{t("projects.roles.editor")}</option>
            <option value="signer">{t("projects.roles.signer")}</option>
          </select>
          <button className="npm-m-rm" onClick={() => remove(i)} disabled={members.length <= 1}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
      {members.length < 7 && (
        <button className="npm-m-add" onClick={add}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t("projects.addMember")}
        </button>
      )}
    </div>
  );
}

export default function NewProjectModal({ onClose, onCreate }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", desc: "", docName: "" });
  const [file, setFile] = useState(null);
  const [members, setMembers] = useState([{ email: "", role: "viewer" }, { email: "", role: "viewer" }]);
  const [errors, setErrors] = useState([]);
  const [formErr, setFormErr] = useState({});
  const [creating, setCreating] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const f = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (f) setFile(f);
  };

  const next = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Required.";
    if (!form.docName.trim()) errs.docName = "Required.";
    if (Object.keys(errs).length) { setFormErr(errs); return; }
    setStep(2);
  };

  const create = async () => {
    const errs = members.map(m => ({ email: m.email && !/\S+@\S+\.\S+/.test(m.email) ? "Invalid email." : " " }));
    if (errs.some(e => e.email && e.email !== " ")) { setErrors(errs); return; }
    setCreating(true);
    try {
      const ws = await createWorkspace({ title: form.name, description: form.desc, type: "corporate" });

      try {
        const docTitle = form.docName.trim();
        const fileName = file ? file.name : `${docTitle.replace(/\s+/g, "_")}.docx`;
        const fileToUpload = file || new File([new Blob([" "], { type: "text/plain" })], fileName);
        await serverUploadDocument(ws.id, docTitle, fileToUpload);
        qc.invalidateQueries({ queryKey: ["documents", ws.id] });
      } catch {
        toast.error("Project created, but document upload failed.");
      }

      await Promise.allSettled(
        members.filter(m => m.email?.trim()).map(m => addMember(ws.id, { email: m.email, role: m.role || "viewer" }))
      );
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      onCreate?.({ ...form, id: ws.id });
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="npm-overlay" onClick={onClose}>
        <div className="npm-modal" onClick={e => e.stopPropagation()}>
          <button className="npm-modal-x" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <h2>{step === 1 ? t("projects.newProjectTitle") : t("projects.inviteMembers")}</h2>
          {step === 1 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label className="npm-label">{t("projects.projectName")} <span style={{ color:"#EF4444" }}>*</span></label>
                <input className="npm-input" placeholder="ex: Contract Approval Workflow" value={form.name}
                       onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormErr(er => ({ ...er, name: "" })); }}
                       style={{ borderColor: formErr.name ? "#EF4444" : "#E5E7EB" }}/>
                {formErr.name && <span style={{ fontSize:11, color:"#EF4444" }}>{formErr.name}</span>}
              </div>
              <div>
                <label className="npm-label">{t("projects.description")}</label>
                <textarea className="npm-textarea" placeholder="ex: A project…" value={form.desc}
                          onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}/>
              </div>
              <div>
                <label className="npm-label">{t("projects.firstDocumentName")} <span style={{ color:"#EF4444" }}>*</span></label>
                <input className="npm-input" placeholder="ex: Service Agreement" value={form.docName}
                       onChange={e => { setForm(f => ({ ...f, docName: e.target.value })); setFormErr(er => ({ ...er, docName: "" })); }}
                       style={{ borderColor: formErr.docName ? "#EF4444" : "#E5E7EB" }}/>
                {formErr.docName && <span style={{ fontSize:11, color:"#EF4444" }}>{formErr.docName}</span>}
              </div>
              <div className="npm-dropzone" onClick={() => fileRef.current?.click()}
                   onDragOver={e => e.preventDefault()} onDrop={handleFile}>
                <input ref={fileRef} type="file" accept=".docx,.xlsx" style={{ display:"none" }} onChange={handleFile}/>
                {file ? (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5" width="32" height="32">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span style={{ fontSize:13, color:"#374151", fontWeight:500 }}>{file.name}</span>
                  </div>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5" width="28" height="28" style={{ margin:"0 auto 8px", display:"block" }}>
                      <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                    </svg>
                    <span style={{ fontSize:13, color:"#6B7280" }}>{t("projects.dragDrop")}</span>
                  </>
                )}
              </div>
              <button className="npm-btn" onClick={next}>{t("common.next")} →</button>
            </div>
          )}
          {step === 2 && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <p style={{ fontSize:13, color:"#6B7280" }}>
                Invite team members to <strong style={{ color:"#111827" }}>{form.name}</strong>.
              </p>
              <MemberInvite members={members} setMembers={setMembers} errors={errors} setErrors={setErrors}/>
              <div style={{ display:"flex", gap:10, marginTop:4 }}>
                <button onClick={() => setStep(1)}
                        style={{ flex:1, border:"1.5px solid #E5E7EB", borderRadius:8, padding:11, fontSize:13, fontWeight:500, background:"#fff", color:"#374151", fontFamily:"inherit", cursor:"pointer" }}>
                  ← {t("common.back")}
                </button>
                <button className="npm-btn" style={{ flex:2, marginTop:0 }} onClick={create} disabled={creating}>
                  {creating ? t("projects.creating") : t("projects.createProject")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
