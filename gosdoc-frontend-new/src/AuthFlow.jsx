import './App.css'
import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════
   CONSTANTS & DATA
═══════════════════════════════════════════════════════ */
const TOTAL_STEPS = 3;

const features = [
  {
    icon: <UsersIcon />,
    title: "Structured Team Workflows",
    desc: "Assign roles, define approval steps, and track progress in real time.",
  },
  {
    icon: <DocIcon />,
    title: "AI Change Verification",
    desc: "Automatically detects meaningful document changes before approval.",
  },
  {
    icon: <ShieldIcon />,
    title: "Secure Digital Signatures",
    desc: "Sign documents directly within the platform with verified electronic signatures.",
  },
];

/* ═══════════════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════════════ */
function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#aab" strokeWidth="1.8" width="15" height="15">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function MailIcon({ color = "#aab" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" width="15" height="15">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#aab" strokeWidth="1.8" width="15" height="15">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#aab" strokeWidth="1.8" width="15" height="15">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   SHARED UI PRIMITIVES
═══════════════════════════════════════════════════════ */
function InputWrap({ error, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      border: `1.5px solid ${error ? "#EF4444" : "#E2E5EF"}`,
      borderRadius: 8, background: "#fff",
      padding: "0 12px", height: 44, gap: 8,
      transition: "border-color 0.2s",
    }}>
      {children}
    </div>
  );
}

function FieldGroup({ label, required, optional, error, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", textAlign: "left", display: "block" }}>
          {label}
          {required && <span style={{ color: "#EF4444", marginLeft: 2 }}>*</span>}
          {optional && <span style={{ color: "#9CA3AF", fontWeight: 400 }}> (optional)</span>}
        </label>
      )}
      {children}
      {error && <span style={{ fontSize: 11, color: "#EF4444", marginTop: 1 }}>{error}</span>}
    </div>
  );
}

function SocialButtons() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
      <button style={s.socialBtn} aria-label="Apple">
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      </button>
      <button style={s.socialBtn} aria-label="Google">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      </button>
    </div>
  );
}

function Divider() {
  return (
    <div style={s.dividerRow}>
      <div style={s.divLine} />
      <span style={{ fontSize: 12, color: "#9CA3AF" }}>or</span>
      <div style={s.divLine} />
    </div>
  );
}

function ProgressBar({ step }) {
  return (
    <div className="auth-progressbar">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} style={{
          ...s.progressSegment,
          background: i < step ? "#2563EB" : "#E5E7EB",
        }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   RIGHT PANEL (shared across all pages)
═══════════════════════════════════════════════════════ */
function RightPanel({ activePage, onNavigate }) {
  return (
    <div className="auth-right">
      <div style={s.rightTopBar}>
        <div style={s.langPicker}>
          EN
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" style={{ marginLeft: 3 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        <button
          onClick={() => onNavigate(activePage === "signin" ? "signup" : "signin")}
          style={s.navBtn}
        >
          {activePage === "signin" ? "SIGN UP" : "SIGN IN"}
        </button>
      </div>

      {/* Centered content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={s.featuresList}>
          {features.map((f, i) => (
            <div key={i} style={{ ...s.featureCard, animationDelay: `${i * 0.1}s` }}>
              <div style={s.featureIconWrap}>{f.icon}</div>
              <div>
                <p style={s.featureTitle}>{f.title}</p>
                <p style={s.featureDesc}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tagline pinned to bottom */}
      <p style={{ ...s.tagline, paddingTop: 0, marginTop: 0 }}>
        Collaborate in real time, automate approvals, and<br />
        manage document workflows in one secure workspace.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SIGN IN PAGE
═══════════════════════════════════════════════════════ */
function SignInPage({ onNavigate }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const change = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(er => ({ ...er, [e.target.name]: "" }));
  };

  const submit = () => {
    const errs = {};
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = "Valid email required.";
    if (!form.password) errs.password = "Password is required.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onNavigate("inbox"); }, 1200);
  };

  return (
    <>
      {/* Top bar */}
      <div className="auth-topbar">
        <div style={s.logoBox}>Logo</div>
      </div>

      {/* Form */}
      <div className="auth-formwrap">
        <div className="auth-inner">
          <h1 className="auth-heading" style={{ ...s.heading, textAlign: "center" }}>Sign In</h1>
          <p style={{ ...s.subtext, textAlign: "center" }}>Welcome back! Please enter your details.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <FieldGroup label="Email Address" required error={errors.email}>
              <InputWrap error={errors.email}>
                <MailIcon />
                <input
                  name="email" type="email" style={s.input}
                  placeholder="ex: example@gmail.com"
                  value={form.email} onChange={change}
                />
              </InputWrap>
            </FieldGroup>

            <FieldGroup label="Password" required error={errors.password}>
              <InputWrap error={errors.password}>
                <LockIcon />
                <input
                  name="password" type={showPw ? "text" : "password"} style={s.input}
                  placeholder="Enter your password"
                  value={form.password} onChange={change}
                />
                <button onClick={() => setShowPw(v => !v)} style={s.iconBtn}>
                  <EyeIcon open={showPw} />
                </button>
              </InputWrap>
            </FieldGroup>
          </div>

          {/* Remember + Forgot */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
              <input
                type="checkbox" checked={remember}
                onChange={e => setRemember(e.target.checked)}
                style={{ accentColor: "#2563EB", width: 14, height: 14 }}
              />
              <span style={{ fontSize: 13, color: "#6B7280" }}>Remember me</span>
            </label>
            <button onClick={() => onNavigate("forgot")} style={{ ...s.ghostBtn, color: "#2563EB", fontSize: 13 }}>
              Forgot password?
            </button>
          </div>

          {/* CTA */}
          <button
            style={{ ...s.ctaBtn, marginTop: 20, opacity: loading ? 0.7 : 1 }}
            onClick={submit}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>

          <Divider />
          <SocialButtons />

          <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 20 }}>
            Don't have an account?{" "}
            <button
              onClick={() => onNavigate("signup")}
              style={{ ...s.ghostBtn, color: "#2563EB", fontSize: 13, fontWeight: 600 }}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SIGN UP — STEP 1
═══════════════════════════════════════════════════════ */
function SignUpStep1({ onNext, onNavigate }) {
  const [form, setForm] = useState({ fullName: "", email: "", orgName: "", password: "", agreed: false });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});

  const change = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setErrors(er => ({ ...er, [name]: "" }));
  };

  const submit = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = "Full name is required.";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) errs.email = "Valid email required.";
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password))
      errs.password = "Min 8 chars, one uppercase and one number.";
    if (!form.agreed) errs.agreed = "You must agree to continue.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onNext({ email: form.email });
  };

  return (
    <>
      <div className="auth-topbar">
        <div style={s.logoBox}>Logo</div>
      </div>
      <div className="auth-formwrap">
        <div className="auth-inner">
          <h1 className="auth-heading" style={s.heading}>Sign Up</h1>
          <p style={s.stepLabel}>STEP 1 OF 3</p>
          <p style={s.subtext}>Please fill in the form to create an account.</p>

          <div className="auth-row-split">
            <FieldGroup label="Full name" required error={errors.fullName}>
              <InputWrap error={errors.fullName}>
                <PersonIcon />
                <input name="fullName" style={s.input} placeholder="ex: John Doe" value={form.fullName} onChange={change} />
              </InputWrap>
            </FieldGroup>
            <FieldGroup label="Email Address" required error={errors.email}>
              <InputWrap error={errors.email}>
                <MailIcon />
                <input name="email" type="email" style={s.input} placeholder="ex: example@gmail.com" value={form.email} onChange={change} />
              </InputWrap>
            </FieldGroup>
          </div>

          <FieldGroup label="Organization Name" optional>
            <InputWrap>
              <BuildingIcon />
              <input name="orgName" style={s.input} placeholder="ex: Adeli Corp" value={form.orgName} onChange={change} />
            </InputWrap>
          </FieldGroup>

          <div style={{ marginTop: 14 }}>
            <FieldGroup label="Password" required error={errors.password}>
              <InputWrap error={errors.password}>
                <LockIcon />
                <input name="password" type={showPw ? "text" : "password"} style={s.input} placeholder="Create a password" value={form.password} onChange={change} />
                <button onClick={() => setShowPw(v => !v)} style={s.iconBtn}><EyeIcon open={showPw} /></button>
              </InputWrap>
              {!errors.password && (
                <span style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3, display: "block" }}>
                  Min 8 characters, one uppercase letter and one number.*
                </span>
              )}
            </FieldGroup>
          </div>

          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, margin: "14px 0 4px", cursor: "pointer" }}>
            <input type="checkbox" name="agreed" checked={form.agreed} onChange={change}
              style={{ marginTop: 2, accentColor: "#2563EB", width: 14, height: 14, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: "#6B7280", lineHeight: 1.4 }}>
              I have read and agree to the{" "}
              <a href="#" style={s.blueLink}>User Agreement</a> &amp;{" "}
              <a href="#" style={s.blueLink}>Privacy Policy</a>.
            </span>
          </label>
          {errors.agreed && <span style={{ fontSize: 11, color: "#EF4444" }}>{errors.agreed}</span>}

          <button style={{ ...s.ctaBtn, marginTop: 14 }} onClick={submit}>Create Account</button>
          <Divider />
          <SocialButtons />

          <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 20 }}>
            Already have an account?{" "}
            <button onClick={() => onNavigate("signin")}
              style={{ ...s.ghostBtn, color: "#2563EB", fontSize: 13, fontWeight: 600 }}>
              Sign In
            </button>
          </p>
        </div>
      </div>
      <ProgressBar step={1} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SIGN UP — STEP 2 (OTP)
═══════════════════════════════════════════════════════ */
function SignUpStep2({ data, onNext }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(36);
  const [status, setStatus] = useState("idle"); // "idle" | "error" | "success"
  const inputs = useRef([]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code]; next[i] = val;
    setCode(next);
    if (status !== "idle") setStatus("idle");
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setCode(pasted.split("")); inputs.current[5]?.focus(); }
  };

  // Demo: code "123456" is correct, everything else is wrong
  const DEMO_CODE = "123456";
  const submit = () => {
    const entered = code.join("");
    if (entered.length < 6) { setStatus("error"); return; }
    if (entered !== DEMO_CODE) { setStatus("error"); return; }
    setStatus("success");
    setTimeout(() => onNext(), 600);
  };

  const borderColor = (d) => {
    if (status === "error") return "#EF4444";
    if (status === "success") return "#22C55E";
    return d ? "#2563EB" : "#E2E5EF";
  };
  const bgColor = () => {
    if (status === "error") return "#FFF5F5";
    if (status === "success") return "#F0FDF4";
    return "#fff";
  };

  const fmt = String(Math.floor(timer / 60)).padStart(2, "0") + ":" + String(timer % 60).padStart(2, "0");

  return (
    <>
      <div className="auth-topbar">
        <div style={s.logoBox}>Logo</div>
      </div>
      <div className="auth-formwrap">
        <div className="auth-inner">
          <h1 className="auth-heading" style={s.heading}>Sign Up</h1>
          <p style={s.stepLabel}>STEP 2 OF 3</p>
          <p style={s.subtext}>We've sent a 6-digit confirmation code to your email.</p>

          <div style={{ textAlign: "center", marginTop: 36, marginBottom: 28 }}>
            <p style={{ fontSize: 14, color: "#374151", marginBottom: 6 }}>
              Please enter the verification code sent to
            </p>
            <p style={{ fontSize: 14, color: "#2563EB", fontWeight: 600 }}>
              {data?.email || "example@gmail.com"}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 8 }} onPaste={handlePaste}>
            {code.map((d, i) => (
              <input
                key={i} ref={el => inputs.current[i] = el}
                value={d} maxLength={1}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: 48, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700,
                  border: `2px solid ${borderColor(d)}`,
                  borderRadius: 10, outline: "none",
                  background: bgColor(),
                  color: status === "error" ? "#EF4444" : status === "success" ? "#16A34A" : "#111827",
                  transition: "all 0.2s", fontFamily: "inherit",
                }}
              />
            ))}
          </div>

          {/* Status message */}
          {status === "error" && (
            <p style={{ textAlign: "center", fontSize: 12, color: "#EF4444", margin: "4px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Invalid code. Please try again.
            </p>
          )}
          {status === "success" && (
            <p style={{ textAlign: "center", fontSize: 12, color: "#16A34A", margin: "4px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
              </svg>
              Code verified!
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              Didn't receive the code?{" "}
              <button onClick={() => { setTimer(60); setCode(["","","","","",""]); setStatus("idle"); }}
                style={{ ...s.ghostBtn, color: "#2563EB", fontSize: 13 }}>
                Resend
              </button>
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#EF4444" }}>{fmt}</span>
          </div>

          <button
            style={{ ...s.ctaBtn, marginTop: 28, background: status === "success" ? "#16A34A" : "#2563EB", transition: "background 0.3s" }}
            onClick={submit}
          >
            {status === "success" ? "✓ Verified" : "Verify Code"}
          </button>
          <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
            Demo: enter <strong>123456</strong> to verify
          </p>
        </div>
      </div>
      <ProgressBar step={2} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SIGN UP — STEP 3 (Project)
═══════════════════════════════════════════════════════ */
function SignUpStep3({ onNext, onBack, onSkip }) {
  const [form, setForm] = useState({ name: "", desc: "" });
  const [errors, setErrors] = useState({});

  const change = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(er => ({ ...er, [e.target.name]: "" }));
  };

  const submit = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Project name is required.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onNext();
  };

  return (
    <>
      <div className="auth-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={s.backBtn}><BackIcon /></button>
          <div style={s.logoBox}>Logo</div>
        </div>
        <button onClick={onSkip} style={s.skipBtn}>Skip and start</button>
      </div>
      <div className="auth-formwrap">
        <div className="auth-inner">
          <h1 className="auth-heading" style={s.heading}>Sign Up</h1>
          <p style={s.stepLabel}>STEP 3 OF 3</p>
          <p style={s.subtext}>Set up your first project to start managing documents and workflows.</p>

          <FieldGroup label="Project Name" required error={errors.name}>
            <InputWrap error={errors.name}>
              <input name="name" style={s.input} placeholder="ex: Docs" value={form.name} onChange={change} />
            </InputWrap>
          </FieldGroup>

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "#374151", display: "block", marginBottom: 5 }}>
              Description
            </label>
            <textarea
              name="desc" value={form.desc} onChange={change}
              placeholder="ex: A project…" rows={4}
              style={{
                width: "100%", border: "1.5px solid #E2E5EF", borderRadius: 8,
                padding: "10px 14px", fontSize: 13.5, color: "#374151",
                resize: "vertical", outline: "none", fontFamily: "inherit",
                boxSizing: "border-box", background: "#fff",
              }}
            />
          </div>

          <button style={{ ...s.ctaBtn, marginTop: 20 }} onClick={submit}>Continue</button>
        </div>
      </div>
      <ProgressBar step={3} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SIGN UP — STEP 4 (Team)
═══════════════════════════════════════════════════════ */
function SignUpStep4({ onBack, onSkip, onFinish }) {
  const [members, setMembers] = useState([{ email: "", role: "" }, { email: "", role: "" }]);
  const [errors, setErrors] = useState([]);

  const updateMember = (i, field, val) => {
    setMembers(m => m.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
    setErrors(er => er.map((e, idx) => idx === i ? { ...e, [field]: "" } : e));
  };

  const addMember = () => {
    if (members.length < 7) setMembers(m => [...m, { email: "", role: "" }]);
  };

  const removeMember = (i) => {
    if (members.length <= 1) return;
    setMembers(m => m.filter((_, idx) => idx !== i));
    setErrors(er => er.filter((_, idx) => idx !== i));
  };

  const submit = () => {
    const errs = members.map(m => ({
      email: m.email && !/\S+@\S+\.\S+/.test(m.email) ? "Invalid email." : "",
    }));
    if (errs.some(e => e.email)) { setErrors(errs); return; }
    onFinish();
  };

  return (
    <>
      <div className="auth-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={s.backBtn}><BackIcon /></button>
          <div style={s.logoBox}>Logo</div>
        </div>
        <button onClick={onSkip} style={s.skipBtn}>Skip and start</button>
      </div>
      <div className="auth-formwrap">
        <div className="auth-inner">
          <h1 className="auth-heading" style={s.heading}>Sign Up</h1>
          <p style={s.stepLabel}>STEP 4 OF 4</p>
          <p style={s.subtext}>Add 2–7 team members by email to begin working together in your project.</p>

          <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
            <div style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Team Member Email<span style={{ color: "#EF4444", marginLeft: 2 }}>*</span></span></div>
            <div style={{ flex: 1 }}><span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Role<span style={{ color: "#EF4444", marginLeft: 2 }}>*</span></span></div>
            <div style={{ width: 32 }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {members.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <FieldGroup error={errors[i]?.email}>
                  <InputWrap error={errors[i]?.email}>
                    <MailIcon color="#aab" />
                    <input style={s.input} placeholder="ex: example@gmail.com" value={m.email} onChange={e => updateMember(i, "email", e.target.value)} />
                  </InputWrap>
                </FieldGroup>
                <FieldGroup>
                  <InputWrap>
                    <PersonIcon />
                    <input style={s.input} placeholder="ex: Product Manager" value={m.role} onChange={e => updateMember(i, "role", e.target.value)} />
                  </InputWrap>
                </FieldGroup>
                <button onClick={() => removeMember(i)} disabled={members.length <= 1} title="Remove member"
                  style={{ width: 32, height: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: `1.5px solid ${members.length <= 1 ? "#E5E7EB" : "#FECACA"}`, borderRadius: 8, cursor: members.length <= 1 ? "not-allowed" : "pointer", color: members.length <= 1 ? "#D1D5DB" : "#EF4444", transition: "all 0.15s", padding: 0 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
          </div>

          {members.length < 7 && (
            <button onClick={addMember} style={s.addMemberBtn}><PlusIcon /> Add member</button>
          )}

          <button style={{ ...s.ctaBtn, marginTop: 24 }} onClick={submit}>Invite Team Members</button>
        </div>
      </div>
      <ProgressBar step={4} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   SUCCESS SCREEN
═══════════════════════════════════════════════════════ */
function SuccessScreen({ onNavigate }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: 40, textAlign: "center",
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "#DBEAFE", display: "flex",
        alignItems: "center", justifyContent: "center", marginBottom: 24,
        animation: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" width="36" height="36">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 8 }}>You're all set!</h2>
      <p style={{ fontSize: 14, color: "#6B7280", marginBottom: 32, lineHeight: 1.6 }}>
        Your account has been created successfully.<br />Start collaborating with your team.
      </p>
      <button style={{ ...s.ctaBtn, maxWidth: 320 }} onClick={() => onNavigate("inbox")}>
        Go to Dashboard
      </button>
      <button
        style={{ ...s.ghostBtn, color: "#6B7280", marginTop: 14, fontSize: 13 }}
        onClick={() => onNavigate("signin")}
      >
        Back to Sign In
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FORGOT PASSWORD PAGE
═══════════════════════════════════════════════════════ */
/* ── Forgot Step 1: Enter email ── */
function ForgotStep1({ onNext, onNavigate }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    onNext({ email });
  };

  return (
    <>
      <div className="auth-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => onNavigate("signin")} style={s.backBtn}><BackIcon /></button>
          <div style={s.logoBox}>Logo</div>
        </div>
      </div>
      <div className="auth-formwrap">
        <div className="auth-inner">
          <h1 className="auth-heading" style={s.heading}>Forgot Password</h1>
          <p style={{ ...s.subtext, marginBottom: 28 }}>
            Enter your email and we'll send you a 6-digit confirmation code.
          </p>

          <FieldGroup label="Email Address" required error={error}>
            <InputWrap error={error}>
              <MailIcon />
              <input
                type="email" style={s.input}
                placeholder="ex: example@gmail.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
              />
            </InputWrap>
          </FieldGroup>

          <button style={{ ...s.ctaBtn, marginTop: 20 }} onClick={submit}>
            Send Code
          </button>

          <p style={{ textAlign: "center", fontSize: 13, color: "#6B7280", marginTop: 20 }}>
            Remembered it?{" "}
            <button onClick={() => onNavigate("signin")}
              style={{ ...s.ghostBtn, color: "#2563EB", fontSize: 13, fontWeight: 600 }}>
              Back to Sign In
            </button>
          </p>
        </div>
      </div>
    </>
  );
}

/* ── Forgot Step 2: OTP verification ── */
function ForgotStep2({ data, onNext, onBack }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(36);
  const [status, setStatus] = useState("idle"); // "idle" | "error" | "success"
  const inputs = useRef([]);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code]; next[i] = val;
    setCode(next);
    if (status !== "idle") setStatus("idle");
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) { setCode(pasted.split("")); inputs.current[5]?.focus(); }
  };

  // Demo: code "123456" is correct
  const DEMO_CODE = "123456";
  const submit = () => {
    const entered = code.join("");
    if (entered.length < 6) { setStatus("error"); return; }
    if (entered !== DEMO_CODE) { setStatus("error"); return; }
    setStatus("success");
    setTimeout(() => onNext(), 600);
  };

  const borderColor = (d) => {
    if (status === "error") return "#EF4444";
    if (status === "success") return "#22C55E";
    return d ? "#2563EB" : "#E2E5EF";
  };
  const bgColor = () => {
    if (status === "error") return "#FFF5F5";
    if (status === "success") return "#F0FDF4";
    return "#fff";
  };

  const fmt = String(Math.floor(timer / 60)).padStart(2, "0") + ":" + String(timer % 60).padStart(2, "0");

  return (
    <>
      <div className="auth-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={s.backBtn}><BackIcon /></button>
          <div style={s.logoBox}>Logo</div>
        </div>
      </div>
      <div className="auth-formwrap">
        <div className="auth-inner">
          <h1 className="auth-heading" style={s.heading}>Request sent</h1>
          <p style={s.subtext}>We've sent a 6-digit confirmation code to your email.</p>

          <div style={{ textAlign: "center", marginTop: 32, marginBottom: 24 }}>
            <p style={{ fontSize: 14, color: "#374151", marginBottom: 6 }}>
              Please enter the verification code sent to
            </p>
            <p style={{ fontSize: 14, color: "#EF4444", fontWeight: 600 }}>
              {data?.email || "example@gmail.com"}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 4 }} onPaste={handlePaste}>
            {code.map((d, i) => (
              <input
                key={i} ref={el => inputs.current[i] = el}
                value={d} maxLength={1}
                onChange={e => handleDigit(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: 52, height: 56, textAlign: "center", fontSize: 22, fontWeight: 700,
                  border: `2px solid ${borderColor(d)}`,
                  borderRadius: 10, outline: "none",
                  background: bgColor(),
                  color: status === "error" ? "#EF4444" : status === "success" ? "#16A34A" : "#111827",
                  transition: "all 0.2s", fontFamily: "inherit",
                }}
              />
            ))}
          </div>

          {status === "error" && (
            <p style={{ textAlign: "center", fontSize: 12, color: "#EF4444", margin: "6px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Invalid code. Please try again.
            </p>
          )}
          {status === "success" && (
            <p style={{ textAlign: "center", fontSize: 12, color: "#16A34A", margin: "6px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
                <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
              </svg>
              Code verified!
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              Didn't receive the code?{" "}
              <button onClick={() => { setTimer(60); setCode(["","","","","",""]); setStatus("idle"); }}
                style={{ ...s.ghostBtn, color: "#2563EB", fontSize: 13 }}>
                Resend
              </button>
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#EF4444" }}>{fmt}</span>
          </div>

          <button
            style={{ ...s.ctaBtn, marginTop: 24, background: status === "success" ? "#16A34A" : "#2563EB", transition: "background 0.3s" }}
            onClick={submit}
          >
            {status === "success" ? "✓ Verified" : "Confirm"}
          </button>
          <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 8 }}>
            Demo: enter <strong>123456</strong> to verify
          </p>
        </div>
      </div>
    </>
  );
}

/* ── Forgot Step 3: Reset password ── */
function ForgotStep3({ onNavigate }) {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [show, setShow] = useState({ pw: false, confirm: false });
  const [errors, setErrors] = useState({});

  const change = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(er => ({ ...er, [e.target.name]: "" }));
  };

  const submit = () => {
    const errs = {};
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password))
      errs.password = "Min 8 chars, one uppercase letter and one number.";
    if (form.confirm !== form.password)
      errs.confirm = "Passwords do not match.";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onNavigate("signin");
  };

  return (
    <>
      <div className="auth-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => onNavigate("forgot")} style={s.backBtn}><BackIcon /></button>
          <div style={s.logoBox}>Logo</div>
        </div>
      </div>
      <div className="auth-formwrap">
        <div className="auth-inner">
          <h1 className="auth-heading" style={s.heading}>Reset password</h1>
          <p style={{ ...s.subtext, marginBottom: 28 }}>
            Enter a new password below to change your password.
          </p>

          <FieldGroup label="New Password" required error={errors.password}>
            <InputWrap error={errors.password}>
              <LockIcon />
              <input
                name="password" type={show.pw ? "text" : "password"} style={s.input}
                placeholder="••••••••"
                value={form.password} onChange={change}
              />
              <button onClick={() => setShow(v => ({ ...v, pw: !v.pw }))} style={s.iconBtn}>
                <EyeIcon open={show.pw} />
              </button>
            </InputWrap>
            {!errors.password && (
              <span style={{ fontSize: 11, color: "#9CA3AF", marginTop: 3, display: "block" }}>
                Must be at least 8 characters, including one uppercase letter and one number.*
              </span>
            )}
          </FieldGroup>

          <div style={{ marginTop: 16 }}>
            <FieldGroup label="Re-enter New Password" required error={errors.confirm}>
              <InputWrap error={errors.confirm}>
                <LockIcon />
                <input
                  name="confirm" type={show.confirm ? "text" : "password"} style={s.input}
                  placeholder="Re-enter password"
                  value={form.confirm} onChange={change}
                />
                <button onClick={() => setShow(v => ({ ...v, confirm: !v.confirm }))} style={s.iconBtn}>
                  <EyeIcon open={show.confirm} />
                </button>
              </InputWrap>
            </FieldGroup>
          </div>

          <button style={{ ...s.ctaBtn, marginTop: 28 }} onClick={submit}>Done</button>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT APP — ROUTER
═══════════════════════════════════════════════════════ */
export default function AuthFlow({ onGoToDashboard }) {
  const [page, setPage] = useState("signin");
  const [step, setStep] = useState(1);
  const [stepData, setStepData] = useState({});
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotData, setForgotData] = useState({});

  const navigate = (target) => {
    if (target === "inbox") { onGoToDashboard(); return; }
    setPage(target);
    if (target === "signup") { setStep(1); setStepData({}); }
    if (target === "forgot") { setForgotStep(1); setForgotData({}); }
  };

  const goNext = (data = {}) => {
    setStepData(d => ({ ...d, ...data }));
    setStep(s => s + 1);
  };
  const goBack = () => setStep(s => s - 1);
  const goSkip = () => setStep(s => s + 1);

  const forgotNext = (data = {}) => {
    setForgotData(d => ({ ...d, ...data }));
    setForgotStep(s => s + 1);
  };
  const forgotBack = () => setForgotStep(s => s - 1);

  const activePage = page === "signup" ? "signup" : "signin";

  return (
    <div className="auth-page">
      <style>{globalCss}</style>
      <div className="auth-root">

      {/* LEFT PANEL */}
      <div className="auth-left">
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>

          {page === "signin" && <SignInPage onNavigate={navigate} />}

          {page === "forgot" && forgotStep === 1 && (
            <ForgotStep1 onNext={forgotNext} onNavigate={navigate} />
          )}
          {page === "forgot" && forgotStep === 2 && (
            <ForgotStep2 data={forgotData} onNext={forgotNext} onBack={forgotBack} />
          )}
          {page === "forgot" && forgotStep === 3 && (
            <ForgotStep3 onNavigate={navigate} />
          )}

          {page === "signup" && step === 1 && <SignUpStep1 onNext={goNext} onNavigate={navigate} />}
          {page === "signup" && step === 2 && <SignUpStep2 data={stepData} onNext={goNext} />}
          {page === "signup" && step === 3 && <SignUpStep3 onNext={goNext} onBack={goBack} onSkip={goSkip} />}
          {page === "signup" && step === 4 && <SuccessScreen onNavigate={navigate} />}

        </div>
      </div>

      {/* RIGHT PANEL */}
      <RightPanel activePage={activePage} onNavigate={navigate} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════ */
const s = {
  logoBox: {
    width: 70, height: 40, background: "#9CA3AF", borderRadius: 6,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#fff", fontWeight: 600, fontSize: 13,
  },
  backBtn: {
    background: "none", border: "1.5px solid #E5E7EB", borderRadius: 8,
    width: 34, height: 34, display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", color: "#374151",
  },
  skipBtn: {
    background: "none", border: "none", color: "#6B7280",
    fontSize: 13, cursor: "pointer", fontWeight: 500,
  },
  heading: {
    fontSize: 34, fontWeight: 700, color: "#111827",
    margin: "0 0 4px", letterSpacing: "-0.5px",
  },
  stepLabel: {
    fontSize: 12, fontWeight: 700, color: "#2563EB",
    letterSpacing: "0.08em", margin: "0 0 4px",
  },
  subtext: { fontSize: 13, color: "#6B7280", margin: "0 0 18px" },
  input: {
    flex: 1, border: "none", outline: "none", fontSize: 13.5,
    color: "#374151", background: "transparent", minWidth: 0, fontFamily: "inherit",
  },
  iconBtn: {
    background: "none", border: "none", cursor: "pointer",
    padding: 0, display: "flex", alignItems: "center", color: "#9CA3AF",
  },
  ghostBtn: {
    background: "none", border: "none", cursor: "pointer",
    padding: 0, fontFamily: "inherit", fontWeight: 500,
  },
  blueLink: { color: "#2563EB", textDecoration: "none" },
  ctaBtn: {
    width: "100%", height: 46, background: "#2563EB", color: "#fff",
    border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600,
    cursor: "pointer", transition: "background 0.2s",
    letterSpacing: "0.01em", fontFamily: "inherit",
  },
  dividerRow: {
    display: "flex", alignItems: "center", gap: 10, margin: "16px 0 12px",
  },
  divLine: { flex: 1, height: 1, background: "#E5E7EB" },
  socialBtn: {
    width: 46, height: 46, borderRadius: "50%", border: "1.5px solid #E5E7EB",
    background: "#fff", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", color: "#111",
  },
  addMemberBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "rgba(37,99,235,0.08)", border: "1.5px dashed #93C5FD",
    borderRadius: 8, color: "#2563EB", fontSize: 13, fontWeight: 600,
    padding: "10px 16px", cursor: "pointer", marginTop: 10,
    fontFamily: "inherit", width: "100%", justifyContent: "center",
  },
  progressSegment: {
    flex: 1, height: 4, borderRadius: 999, transition: "background 0.4s",
  },

  /* Right panel */
  rightTopBar: {
    display: "flex", justifyContent: "flex-end",
    alignItems: "center", gap: 20, marginBottom: 0, flexShrink: 0,
  },
  langPicker: {
    display: "flex", alignItems: "center",
    color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500, cursor: "pointer",
  },
  navBtn: {
    color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em",
    background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
    borderBottom: "2px solid rgba(255,255,255,0.5)", paddingBottom: 1,
  },
  featuresList: { display: "flex", flexDirection: "column", gap: 14 },
  featureCard: {
    background: "rgba(255,255,255,0.13)", backdropFilter: "blur(10px)",
    borderRadius: 14, padding: "16px 18px", display: "flex",
    alignItems: "flex-start", gap: 14,
    border: "1px solid rgba(255,255,255,0.15)",
    animation: "slideIn 0.45s ease both",
  },
  featureIconWrap: {
    width: 42, height: 42, borderRadius: 10,
    background: "rgba(255,255,255,0.15)", display: "flex",
    alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0,
  },
  featureTitle: { fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 3px" },
  featureDesc: { fontSize: 12, color: "rgba(255,255,255,0.72)", margin: 0, lineHeight: 1.55 },
  tagline: {
    color: "rgba(255,255,255,0.82)", fontSize: 13.5, textAlign: "center",
    lineHeight: 1.65, marginTop: "auto", paddingTop: 28,
  },
};

/* ═══════════════════════════════════════════════════════
   GLOBAL CSS + RESPONSIVE
═══════════════════════════════════════════════════════ */
const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { margin: 0; padding: 0; height: 100%; }

  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(0.7); }
    to   { opacity: 1; transform: scale(1); }
  }

  button { font-family: 'DM Sans', 'Segoe UI', sans-serif; }
  button:hover { opacity: 0.88; }

  /* ── Fullscreen two-panel layout ── */
  .auth-page {
    display: flex;
    width: 100vw;
    height: 100vh;
    font-family: 'DM Sans', 'Segoe UI', sans-serif;
  }
  .auth-root { display: contents; }

  .auth-left {
    flex: 0 0 52%;
    background: #fff;
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .auth-left::-webkit-scrollbar { width: 0; }

  .auth-right {
    flex: 1;
    background: linear-gradient(145deg, #1E40AF 0%, #2563EB 55%, #1D4ED8 100%);
    display: flex;
    flex-direction: column;
    padding: 28px 32px 40px;
    overflow: hidden;
    height: 100vh;
  }

  /* ── Top bar & form paddings ── */
  .auth-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 40px 0;
    flex-shrink: 0;
  }
  /* formwrap: centers content vertically and horizontally */
  .auth-formwrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 40px;
    overflow-y: auto;
  }
  .auth-progressbar {
    display: flex;
    gap: 4px;
    padding: 16px 40px 22px;
    flex-shrink: 0;
    max-width: 660px;
  }

  /* ── Inner content: max 620px, never stretches ── */
  .auth-inner {
    width: 100%;
    max-width: 620px;
    display: flex;
    flex-direction: column;
  }
  .auth-row-split {
    display: flex;
    gap: 14px;
    margin-bottom: 14px;
    width: 100%;
  }
  .auth-heading {
    font-size: 34px !important;
  }

  /* ── Tablet ── */
  @media (min-width: 769px) and (max-width: 1024px) {
    .auth-left  { flex: 0 0 56%; }
    .auth-right { padding: 24px 20px 32px; }
  }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .auth-page   { flex-direction: column; height: auto; min-height: 100vh; }
    .auth-left   { flex: none; width: 100%; height: auto; min-height: 100dvh; overflow: visible; }
    .auth-right  { display: none; }
    .auth-topbar      { padding: 16px 20px 0; }
    .auth-formwrap    { padding: 14px 20px 12px; align-items: flex-start; justify-content: flex-start; }
    .auth-progressbar { padding: 12px 20px 18px; max-width: 100%; }
    .auth-inner       { max-width: 100%; }
    .auth-row-split   { flex-direction: column; gap: 12px; margin-bottom: 12px; }
    .auth-heading     { font-size: 26px !important; }
  }
`;