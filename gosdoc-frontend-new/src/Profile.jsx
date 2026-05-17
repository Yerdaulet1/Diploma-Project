import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import useAuthStore from "./store/authStore";
import {
  getMe, updateProfile, changePassword, deleteAccount,
  serverUploadAvatar,
  getSettings, updateSettings,
  requestEmailChange, confirmEmailChange,
} from "./api/users";

/* Применяет тему к <html> и сохраняет в localStorage */
export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme || "light");
  localStorage.setItem("gosdoc_theme", theme || "light");
}

/* ══════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════ */
const css = `
  /* Profile menu dropdown */
  .pf-menu {
    position:absolute; top:calc(100% + 8px); right:0;
    background:#fff; border-radius:12px;
    box-shadow:0 8px 28px rgba(0,0,0,0.12);
    z-index:9500; min-width:180px; padding:8px 0;
    border:.5px solid #F3F4F6;
  }
  .pf-menu-item {
    display:flex; align-items:center; gap:10px;
    padding:10px 16px; font-size:13px; color:#374151;
    cursor:pointer; font-family:inherit; background:none; border:none; width:100%;
    text-align:left; transition:all .15s;
  }
  .pf-menu-item:hover {
    background:#EEF2FF; color:#2563EB;
  }
  .pf-menu-item:hover svg { stroke:#2563EB; }
  .pf-menu-item.danger:hover { background:#FEF2F2; color:#DC2626; }
  .pf-menu-item.danger:hover svg { stroke:#DC2626; }
  .pf-menu-item svg { stroke:#6B7280; transition:stroke .15s; flex-shrink:0; }

  /* Modal overlay */
  .pf-overlay {
    position:fixed; inset:0;
    background:rgba(0,0,0,0.35);
    z-index:9600;
    display:flex; align-items:center; justify-content:center;
    padding:20px;
  }
  .pf-modal {
    background:#fff; border-radius:16px;
    width:100%; max-width:560px;
    position:relative; overflow:hidden;
    box-shadow:0 16px 60px rgba(0,0,0,0.2);
    max-height:90vh; overflow-y:auto;
  }
  .pf-modal-sm { max-width:480px; }

  .pf-close {
    position:absolute; top:14px; right:14px;
    background:none; border:none; cursor:pointer;
    color:#9CA3AF; display:flex; align-items:center;
    z-index:10; padding:6px; border-radius:6px;
  }
  .pf-close:hover { background:#F3F4F6; }
  .pf-close-white { color:#fff; }
  .pf-close-white:hover { background:rgba(255,255,255,0.15); }

  /* Profile modal blue header */
  .pf-header {
    background:linear-gradient(135deg,#2563EB 0%,#3B82F6 100%);
    height:100px; position:relative;
  }
  .pf-avatar-wrap {
    position:absolute; left:50%; bottom:-44px;
    transform:translateX(-50%);
    width:90px; height:90px;
  }
  .pf-avatar {
    width:90px; height:90px; border-radius:50%;
    background:#CBD5E1; border:4px solid #fff;
    overflow:hidden; display:flex;
    align-items:center; justify-content:center;
  }
  .pf-avatar-edit {
    position:absolute; bottom:2px; right:2px;
    width:26px; height:26px; border-radius:50%;
    background:#6B7280; color:#fff; border:2px solid #fff;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; font-family:inherit;
  }

  .pf-body { padding:60px 36px 30px; }
  .pf-section-title {
    font-size:16px; font-weight:700; color:#111827;
    margin-bottom:14px;
  }
  .pf-section { margin-bottom:24px; }

  .pf-field-row {
    display:grid; grid-template-columns:1fr 1fr; gap:16px;
    margin-bottom:14px;
  }
  .pf-label {
    font-size:13px; font-weight:500; color:#374151;
    margin-bottom:5px; display:block;
  }
  .pf-input {
    width:100%; border:1.5px solid #E5E7EB; border-radius:8px;
    padding:9px 12px; font-size:13px; color:#374151;
    outline:none; font-family:inherit; transition:border-color .2s;
  }
  .pf-input:focus { border-color:#2563EB; }
  .pf-input-icon-wrap {
    position:relative;
    display:flex; align-items:center;
  }
  .pf-input-icon {
    position:absolute; left:12px; color:#9CA3AF;
    display:flex; align-items:center;
  }
  .pf-input-icon-wrap input {
    padding-left:38px;
  }
  .pf-input-eye {
    position:absolute; right:12px; background:none; border:none;
    cursor:pointer; color:#9CA3AF; display:flex; align-items:center;
  }

  .pf-save-btn {
    background:#2563EB; color:#fff; border:none;
    border-radius:8px; padding:8px 20px;
    font-size:13px; font-weight:500; cursor:pointer;
    font-family:inherit; margin-left:auto; display:block;
  }
  .pf-save-btn:hover { background:#1D4ED8; }

  .pf-btn-primary {
    width:100%; background:linear-gradient(90deg,#2563EB,#3B82F6);
    color:#fff; border:none; border-radius:10px;
    padding:13px; font-size:14px; font-weight:600;
    cursor:pointer; font-family:inherit;
  }
  .pf-btn-primary:hover { background:#1D4ED8; }
  .pf-btn-primary:disabled { opacity:0.5; cursor:not-allowed; }

  .pf-security-item {
    display:flex; align-items:center; gap:10px;
    border:1.5px solid #E5E7EB; border-radius:10px;
    padding:11px 14px; cursor:pointer; margin-bottom:8px;
    background:#fff; transition:all .15s; width:100%;
    font-family:inherit; font-size:13px; color:#374151; text-align:left;
  }
  .pf-security-item:hover {
    border-color:#2563EB; background:#F8FAFF;
  }
  .pf-security-item svg { flex-shrink:0; }
  .pf-security-item.danger { color:#DC2626; }
  .pf-security-item.danger:hover { border-color:#DC2626; background:#FEF2F2; }

  .pf-hint {
    font-size:11px; color:#9CA3AF; margin-top:4px;
  }

  .pf-otp-wrap {
    display:flex; gap:10px; justify-content:center;
    margin:24px 0;
  }
  .pf-otp-input {
    width:50px; height:56px; border:1.5px solid #E5E7EB;
    border-radius:10px; text-align:center;
    font-size:20px; font-weight:600; color:#111827;
    outline:none; font-family:inherit;
  }
  .pf-otp-input:focus { border-color:#2563EB; }
  .pf-otp-input.filled { border-color:#2563EB; }

  .pf-resend-row {
    display:flex; justify-content:space-between; align-items:center;
    margin-top:10px; font-size:13px;
  }
  .pf-resend {
    color:#2563EB; cursor:pointer; font-weight:500;
    background:none; border:none; font-family:inherit;
    text-decoration:underline;
  }
  .pf-resend:disabled { color:#9CA3AF; cursor:not-allowed; text-decoration:none; }
  .pf-timer { color:#EF4444; font-weight:500; }

  /* Toggle switch */
  .pf-switch{position:relative;width:40px;height:22px;flex-shrink:0;display:inline-block}
  .pf-switch input{opacity:0;width:0;height:0;position:absolute}
  .pf-switch-track{position:absolute;inset:0;background:#D1D5DB;border-radius:11px;cursor:pointer;transition:background .2s}
  .pf-switch input:checked + .pf-switch-track{background:#2563EB}
  .pf-switch-thumb{position:absolute;width:16px;height:16px;background:#fff;border-radius:50%;top:3px;left:3px;transition:transform .2s;pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,.15)}
  .pf-switch input:checked ~ .pf-switch-thumb{transform:translateX(18px)}

  /* Settings rows */
  .pf-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:.5px solid #F3F4F6}
  .pf-toggle-row:last-child{border-bottom:none}
  .pf-toggle-label{font-size:13px;color:#374151}

  /* Theme selector */
  .pf-theme-sel{display:flex;gap:3px;border:.5px solid #E5E7EB;border-radius:10px;padding:3px;background:#F9FAFB}
  .pf-theme-btn{width:30px;height:30px;border:none;background:transparent;border-radius:7px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#9CA3AF;transition:all .15s}
  .pf-theme-btn.active{background:#2563EB;color:#fff}

  /* Success toast */
  .pf-success {
    background:#FEF3C7; border-radius:14px;
    padding:40px; text-align:center;
    max-width:500px; width:100%;
    box-shadow:0 16px 60px rgba(0,0,0,0.2);
  }
  .pf-success-text {
    font-size:15px; color:#374151; font-weight:500;
    margin-top:18px;
  }
`;

/* ══════════════════════════════════════════════════════════
   PROFILE MENU (avatar dropdown)
══════════════════════════════════════════════════════════ */
export function ProfileMenu({ onProfile, onSettings, onLogOut, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="pf-menu">
      <style>{css}</style>
      <button className="pf-menu-item" onClick={() => { onProfile(); onClose(); }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" width="16" height="16">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Profile
      </button>
      <button className="pf-menu-item" onClick={() => { onSettings?.(); onClose(); }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" width="16" height="16">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        Settings
      </button>
      <button className="pf-menu-item danger" onClick={() => { onLogOut(); onClose(); }}>
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" width="16" height="16">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Log Out
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PROFILE MODAL
══════════════════════════════════════════════════════════ */
export function ProfileModal({ onClose, onChangePassword, onChangeEmail }) {
  const { user, setUser } = useAuthStore();
  const [fullName,    setFullName]    = useState(user?.full_name || "");
  const [phone,       setPhone]       = useState(user?.phone || "");
  const [avatarSrc,   setAvatarSrc]   = useState(user?.avatar_url || null);
  const [saving,      setSaving]      = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const avatarInputRef = useRef(null);
  const { logout } = useAuthStore();

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateProfile({ full_name: fullName, phone: phone || null });
      setUser({ ...user, full_name: updated.full_name, phone: updated.phone });
      toast.success("Profile updated");
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (file) => {
    if (!file) return;
    setAvatarLoading(true);
    try {
      await serverUploadAvatar(file);
      const freshUser = await getMe();
      setAvatarSrc(freshUser.avatar_url || null);
      setUser(freshUser);
      toast.success("Avatar updated");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to upload avatar");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      logout();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="pf-overlay" onClick={onClose}>
      <style>{css}</style>
      <div className="pf-modal" onClick={e=>e.stopPropagation()}>
        {/* Blue header with avatar */}
        <div className="pf-header">
          <button className="pf-close pf-close-white" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="pf-avatar-wrap">
            <div className="pf-avatar">
              {avatarSrc
                ? <img src={avatarSrc} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                : <svg viewBox="0 0 90 90" fill="none" width="90" height="90"><rect width="90" height="90" fill="#CBD5E1"/><circle cx="45" cy="34" r="16" fill="#94A3B8"/><ellipse cx="45" cy="78" rx="28" ry="18" fill="#94A3B8"/></svg>
              }
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display:"none" }}
              onChange={e => handleAvatarChange(e.target.files?.[0])}/>
            <button className="pf-avatar-edit" title="Change photo" disabled={avatarLoading}
              onClick={() => avatarInputRef.current?.click()}>
              {avatarLoading
                ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><circle cx="12" cy="12" r="10"/></svg>
                : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              }
            </button>
          </div>
        </div>

        <div className="pf-body">
          {/* Personal Info */}
          <div className="pf-section">
            <div className="pf-section-title">Personal Information</div>
            <div style={{ marginBottom:14 }}>
              <label className="pf-label">Full Name</label>
              <input className="pf-input" value={fullName} onChange={e=>setFullName(e.target.value)}/>
            </div>
            <div style={{ marginBottom:14 }}>
              <label className="pf-label">Email</label>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <input className="pf-input" value={user?.email || ""} readOnly style={{ background:"#F9FAFB", color:"#9CA3AF", flex:1 }}/>
                <button onClick={onChangeEmail}
                  style={{ flexShrink:0, border:"1.5px solid #2563EB", color:"#2563EB", background:"#fff", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                  Change
                </button>
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label className="pf-label">Phone</label>
              <input className="pf-input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+7 000 000 0000"/>
            </div>
            <button className="pf-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>

          {/* Security Settings */}
          <div className="pf-section">
            <div className="pf-section-title">Security Settings</div>

            <button className="pf-security-item" onClick={onChangePassword}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8" width="16" height="16">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span style={{ flex:1 }}>Change password</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="14" height="14">
                <polyline points="9 6 15 12 9 18"/>
              </svg>
            </button>

            <button className="pf-security-item danger" onClick={()=>setShowDelete(true)} style={{ borderColor:"transparent" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.8" width="16" height="16">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
              </svg>
              Delete account
            </button>

            {showDelete && (
              <div style={{ marginTop:12, padding:12, background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8 }}>
                <div style={{ fontSize:13, color:"#991B1B", marginBottom:8 }}>Are you sure? This cannot be undone.</div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={()=>setShowDelete(false)}
                    style={{ flex:1, border:".5px solid #E5E7EB", background:"#fff", borderRadius:6, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                    Cancel
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    style={{ flex:1, border:"none", background:"#DC2626", color:"#fff", borderRadius:6, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:500, opacity:deleting?0.6:1 }}>
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CHANGE PASSWORD MODAL
══════════════════════════════════════════════════════════ */
export function ChangePasswordModal({ onClose, onDone }) {
  const [prev, setPrev] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPrev, setShowPrev] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const errs = {};
    if (!prev) errs.prev = "Required";
    if (!next) errs.next = "Required";
    else if (next.length < 8) errs.next = "Must be at least 8 characters";
    else if (!/[A-Z]/.test(next) || !/\d/.test(next)) errs.next = "Must include uppercase and number";
    if (confirmPw !== next) errs.confirmPw = "Passwords don't match";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      await changePassword(prev, next);
      toast.success("Password changed successfully");
      onDone?.();
      onClose();
    } catch (e) {
      const detail = e?.response?.data;
      if (detail?.old_password) setErrors(er => ({ ...er, prev: detail.old_password[0] }));
      else toast.error(detail?.detail || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pf-overlay" onClick={onClose}>
      <style>{css}</style>
      <div className="pf-modal pf-modal-sm" onClick={e=>e.stopPropagation()} style={{ padding:"36px 40px" }}>
        <button className="pf-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <h2 style={{ fontSize:22, fontWeight:700, color:"#111827", textAlign:"center", marginBottom:24 }}>
          Change password
        </h2>

        <div style={{ marginBottom:14 }}>
          <label className="pf-label">Previous Password <span style={{ color:"#EF4444" }}>*</span></label>
          <div className="pf-input-icon-wrap">
            <span className="pf-input-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <input type={showPrev?"text":"password"} className="pf-input" value={prev}
              onChange={e=>{setPrev(e.target.value);setErrors(er=>({...er,prev:""}));}}
              style={{ borderColor:errors.prev?"#EF4444":"#E5E7EB", paddingRight:38 }}/>
            <button className="pf-input-eye" onClick={()=>setShowPrev(v=>!v)}>
              <EyeIcon open={showPrev}/>
            </button>
          </div>
          {errors.prev && <span style={{ fontSize:11, color:"#EF4444" }}>{errors.prev}</span>}
        </div>

        <p style={{ fontSize:12, color:"#6B7280", margin:"14px 0" }}>
          Enter a new password below to change your password.
        </p>

        <div style={{ marginBottom:14 }}>
          <label className="pf-label">New Password <span style={{ color:"#EF4444" }}>*</span></label>
          <div className="pf-input-icon-wrap">
            <span className="pf-input-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <input type={showNext?"text":"password"} className="pf-input" value={next}
              onChange={e=>{setNext(e.target.value);setErrors(er=>({...er,next:""}));}}
              style={{ borderColor:errors.next?"#EF4444":"#E5E7EB", paddingRight:38 }}/>
            <button className="pf-input-eye" onClick={()=>setShowNext(v=>!v)}>
              <EyeIcon open={showNext}/>
            </button>
          </div>
          <div className="pf-hint">
            {errors.next
              ? <span style={{ color:"#EF4444" }}>{errors.next}</span>
              : "Must be at least 8 characters, including one uppercase letter and one number."
            }
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <label className="pf-label">Re-enter New Password <span style={{ color:"#EF4444" }}>*</span></label>
          <div className="pf-input-icon-wrap">
            <span className="pf-input-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
            <input type={showConfirm?"text":"password"} className="pf-input" value={confirmPw}
              onChange={e=>{setConfirmPw(e.target.value);setErrors(er=>({...er,confirmPw:""}));}}
              style={{ borderColor:errors.confirmPw?"#EF4444":"#E5E7EB", paddingRight:38 }}/>
            <button className="pf-input-eye" onClick={()=>setShowConfirm(v=>!v)}>
              <EyeIcon open={showConfirm}/>
            </button>
          </div>
          {errors.confirmPw && <span style={{ fontSize:11, color:"#EF4444" }}>{errors.confirmPw}</span>}
        </div>

        <button className="pf-btn-primary" onClick={submit} disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CHANGE EMAIL MODAL — 3 steps: email → otp → success
══════════════════════════════════════════════════════════ */
export function ChangeEmailModal({ onClose }) {
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState(1); // 1=email, 2=otp, 3=success
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef([]);

  // Timer
  useEffect(() => {
    if (step !== 2 || timer <= 0) return;
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [step, timer]);

  // Auto-close success
  useEffect(() => {
    if (step === 3) {
      const id = setTimeout(onClose, 2500);
      return () => clearTimeout(id);
    }
  }, [step]);

  const submitEmail = async () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErr("Please enter a valid email."); return;
    }
    setLoading(true);
    try {
      await requestEmailChange(email.trim().toLowerCase());
      setErr("");
      setStep(2);
      setTimer(60);
    } catch (e) {
      setErr(e?.response?.data?.new_email?.[0] || e?.response?.data?.detail || "Failed to send code");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (val.length > 1) val = val.slice(-1);
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputsRef.current[i + 1]?.focus();
    if (next.every(x => x !== "")) {
      const code = next.join("");
      setLoading(true);
      confirmEmailChange(email.trim().toLowerCase(), code)
        .then(() => {
          setUser({ ...user, email: email.trim().toLowerCase() });
          setStep(3);
        })
        .catch(e => {
          toast.error(e?.response?.data?.detail || "Invalid or expired code");
          setOtp(["","","","","",""]);
          inputsRef.current[0]?.focus();
        })
        .finally(() => setLoading(false));
    }
  };

  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputsRef.current[i - 1]?.focus();
  };

  const resend = async () => {
    setOtp(["","","","","",""]);
    setTimer(60);
    inputsRef.current[0]?.focus();
    try {
      await requestEmailChange(email.trim().toLowerCase());
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to resend code");
    }
  };

  if (step === 3) {
    return (
      <div className="pf-overlay">
        <style>{css}</style>
        <div className="pf-success">
          <svg viewBox="0 0 100 100" width="100" height="100" style={{ margin:"0 auto", display:"block" }}>
            <ellipse cx="50" cy="92" rx="28" ry="4" fill="#FDE68A"/>
            <rect x="28" y="26" width="44" height="52" rx="4" fill="#F59E0B"/>
            <rect x="34" y="36" width="32" height="2" fill="#FFF7ED"/>
            <rect x="34" y="44" width="32" height="2" fill="#FFF7ED"/>
            <rect x="34" y="52" width="24" height="2" fill="#FFF7ED"/>
            <circle cx="68" cy="28" r="10" fill="#22C55E"/>
            <polyline points="63 28 67 32 73 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="22" cy="40" r="3" fill="#BFDBFE"/>
            <circle cx="80" cy="60" r="2.5" fill="#BFDBFE"/>
            <circle cx="20" cy="72" r="2" fill="#FDE68A"/>
          </svg>
          <div className="pf-success-text">Your email has been successfully updated.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pf-overlay" onClick={onClose}>
      <style>{css}</style>
      <div className="pf-modal pf-modal-sm" onClick={e=>e.stopPropagation()} style={{ padding:"40px" }}>
        <button className="pf-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        {step === 1 && (
          <>
            <h2 style={{ fontSize:22, fontWeight:700, color:"#111827", textAlign:"center", marginBottom:24 }}>
              Change email
            </h2>
            <label className="pf-label">New Email Address <span style={{ color:"#EF4444" }}>*</span></label>
            <div className="pf-input-icon-wrap" style={{ marginBottom: err ? 4 : 20 }}>
              <span className="pf-input-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="15" height="15">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <polyline points="2,4 12,13 22,4"/>
                </svg>
              </span>
              <input type="email" className="pf-input" value={email}
                onChange={e=>{setEmail(e.target.value);setErr("");}}
                style={{ borderColor: err ? "#EF4444" : "#E5E7EB" }}/>
            </div>
            {err && <div style={{ fontSize:12, color:"#EF4444", marginBottom:16 }}>{err}</div>}
            <button className="pf-btn-primary" onClick={submitEmail} disabled={loading}>
              {loading ? "Sending…" : "Get verification code"}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ fontSize:22, fontWeight:700, color:"#111827", textAlign:"center", marginBottom:12 }}>
              Change email
            </h2>
            <p style={{ fontSize:13, color:"#6B7280", textAlign:"center" }}>
              Please enter the verification code sent to
            </p>
            <p style={{ fontSize:13, color:"#F97316", textAlign:"center", marginBottom:10 }}>
              {email}
            </p>

            <div className="pf-otp-wrap">
              {otp.map((d, i) => (
                <input key={i} ref={el => inputsRef.current[i] = el}
                  className={`pf-otp-input${d ? " filled" : ""}`}
                  value={d} maxLength={1}
                  onChange={e=>handleOtpChange(i, e.target.value)}
                  onKeyDown={e=>handleOtpKey(i, e)}/>
              ))}
            </div>

            <div className="pf-resend-row">
              <span>
                Didn't receive the code?{" "}
                <button className="pf-resend" disabled={timer > 0} onClick={resend}>Resend</button>
              </span>
              <span className="pf-timer">
                {timer > 0 ? `00:${String(timer).padStart(2,"0")}` : "00:00"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SETTINGS MODAL
══════════════════════════════════════════════════════════ */
export function SettingsModal({ onClose }) {
  const { t, i18n } = useTranslation();
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush,  setNotifPush]  = useState(true);
  const [theme,      setTheme]      = useState("light");
  const [lang,       setLang]       = useState(i18n.language || "en");
  const [loaded,     setLoaded]     = useState(false);
  const saveRef = useRef(null);

  const changeLang = (l) => {
    setLang(l);
    i18n.changeLanguage(l);
    localStorage.setItem("gosdoc_lang", l);
    persist({ language: l });
  };

  // Load settings on mount
  useEffect(() => {
    getSettings()
      .then(s => {
        setNotifEmail(s.notification_email);
        setNotifPush(s.notification_push);
        const savedTheme = s.theme || "light";
        setTheme(savedTheme);
        applyTheme(savedTheme);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const persist = (patch) => {
    clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      updateSettings(patch).catch(() => {});
    }, 600);
  };

  const Toggle = ({ checked, onChange }) => (
    <label className="pf-switch">
      <input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/>
      <div className="pf-switch-track"/>
      <div className="pf-switch-thumb"/>
    </label>
  );

  if (!loaded) return (
    <div className="pf-overlay">
      <style>{css}</style>
      <div className="pf-modal pf-modal-sm" style={{ padding:60, textAlign:"center", color:"#9CA3AF", fontSize:13 }}>Loading…</div>
    </div>
  );

  return (
    <div className="pf-overlay" onClick={onClose}>
      <style>{css}</style>
      <div className="pf-modal pf-modal-sm" onClick={e=>e.stopPropagation()}>
        <button className="pf-close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div style={{ padding:"36px 36px 32px" }}>
          <h2 style={{ fontSize:22,fontWeight:700,color:"#111827",textAlign:"center",marginBottom:28 }}>{t("settings.title")}</h2>

          {/* Notifications */}
          <div style={{ marginBottom:22 }}>
            <div style={{ fontSize:15,fontWeight:600,color:"#111827",marginBottom:4 }}>{t("settings.notifications")}</div>
            <div className="pf-toggle-row">
              <span className="pf-toggle-label">{t("settings.emailNotif")}</span>
              <Toggle checked={notifEmail} onChange={v=>{ setNotifEmail(v); persist({ notification_email: v }); }}/>
            </div>
            <div className="pf-toggle-row">
              <span className="pf-toggle-label">{t("settings.pushNotif")}</span>
              <Toggle checked={notifPush} onChange={v=>{ setNotifPush(v); persist({ notification_push: v }); }}/>
            </div>
          </div>

          {/* Appearance */}
          <div style={{ marginBottom:22 }}>
            <div style={{ fontSize:15,fontWeight:600,color:"#111827",marginBottom:12 }}>{t("settings.appearance")}</div>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <span className="pf-toggle-label">{t("settings.theme")}</span>
              <div className="pf-theme-sel">
                <button className={`pf-theme-btn${theme==="light"?" active":""}`} onClick={()=>{ setTheme("light"); applyTheme("light"); persist({ theme:"light" }); }} title="Light">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                </button>
                <button className={`pf-theme-btn${theme==="dark"?" active":""}`} onClick={()=>{ setTheme("dark"); applyTheme("dark"); persist({ theme:"dark" }); }} title="Dark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                </button>
                <button className={`pf-theme-btn${theme==="auto"?" active":""}`} onClick={()=>{ setTheme("auto"); applyTheme("auto"); persist({ theme:"auto" }); }} title="Auto">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Language */}
          <div>
            <div style={{ fontSize:15,fontWeight:600,color:"#111827",marginBottom:12 }}>{t("settings.language")}</div>
            <div style={{ display:"flex", gap:8 }}>
              {[
                { code:"en", label:"English" },
                { code:"ru", label:"Русский" },
                { code:"kk", label:"Қазақша" },
              ].map(l => (
                <button key={l.code} onClick={() => changeLang(l.code)}
                  style={{
                    flex:1, padding:"8px 0", borderRadius:8, fontSize:13, fontWeight:500,
                    cursor:"pointer", fontFamily:"inherit", transition:"all .15s",
                    border: lang === l.code ? "2px solid #2563EB" : "1.5px solid #E5E7EB",
                    background: lang === l.code ? "#EEF2FF" : "#fff",
                    color: lang === l.code ? "#2563EB" : "#6B7280",
                  }}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   EYE ICON
══════════════════════════════════════════════════════════ */
function EyeIcon({ open }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════
   COMBINED PROFILE CONTROLLER
   Use this to wire up all modals in one place
══════════════════════════════════════════════════════════ */
export default function ProfileController({ show, view, setView, onLogOut }) {
  if (!show || !view) return null;

  const close = () => setView(null);

  if (view === "profile") {
    return <ProfileModal onClose={close}
      onChangePassword={()=>setView("password")}
      onChangeEmail={()=>setView("email")}/>;
  }
  if (view === "password") return <ChangePasswordModal onClose={()=>setView("profile")}/>;
  if (view === "email")    return <ChangeEmailModal    onClose={()=>setView("profile")}/>;
  if (view === "settings") return <SettingsModal onClose={close}/>;
  return null;
}