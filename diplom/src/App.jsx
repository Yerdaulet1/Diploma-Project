import { useState } from 'react'
import './App.css'
const STEPS = 4;
 
const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Structured Team Workflows",
    desc: "Assign roles, define approval steps, and track progress in real time.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    title: "AI Change Verification",
    desc: "Automatically detects meaningful document changes before approval.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: "Secure Digital Signatures",
    desc: "Sign documents directly within the platform with verified electronic signatures.",
  },
];
 
function EyeIcon({ open }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
 
export default function SignUpPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    orgName: "",
    password: "",
    agreed: false,
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const currentStep = 1;
 
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
    setErrors((er) => ({ ...er, [name]: "" }));
  };
 
  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = "Full name is required.";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Valid email required.";
    if (!form.password || form.password.length < 8)
      newErrors.password = "Must be at least 8 characters.";
    if (!/[A-Z]/.test(form.password)) newErrors.password = "Include one uppercase letter.";
    if (!/\d/.test(form.password)) newErrors.password = "Include one number.";
    if (!form.agreed) newErrors.agreed = "You must agree to continue.";
    return newErrors;
  };
 
  const handleSubmit = () => {
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    alert("Account created! (Step 1 of 4 complete)");
  };
 
  return (
    <div style={styles.root}>
      <style>{cssAnimations}</style>
 
      {/* LEFT PANEL */}
      <div style={styles.left}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoBox}>Logo</div>
        </div>
 
        <div style={styles.formWrap}>
          <h1 style={styles.heading}>Sign Up</h1>
          <p style={styles.stepLabel}>STEP {currentStep} OF {STEPS}</p>
          <p style={styles.subtext}>Please fill in the form to create an account.</p>
 
          {/* Row: Full Name + Email */}
          <div style={styles.row}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full name<span style={styles.req}>*</span></label>
              <div style={inputWrapStyle(errors.fullName)}>
                <span style={styles.inputIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#aab" strokeWidth="1.8" width="16" height="16">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  name="fullName"
                  style={styles.input}
                  placeholder="ex: John Doe"
                  value={form.fullName}
                  onChange={handleChange}
                />
              </div>
              {errors.fullName && <span style={styles.error}>{errors.fullName}</span>}
            </div>
 
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email Address<span style={styles.req}>*</span></label>
              <div style={inputWrapStyle(errors.email)}>
                <span style={styles.inputIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#aab" strokeWidth="1.8" width="16" height="16">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <polyline points="2,4 12,13 22,4" />
                  </svg>
                </span>
                <input
                  name="email"
                  type="email"
                  style={styles.input}
                  placeholder="ex: example@gmail.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
              {errors.email && <span style={styles.error}>{errors.email}</span>}
            </div>
          </div>
 
          {/* Org name */}
          <div style={{ ...styles.fieldGroup, marginBottom: 16 }}>
            <label style={styles.label}>Organization Name <span style={styles.optional}>(optional)</span></label>
            <div style={inputWrapStyle(false)}>
              <span style={styles.inputIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#aab" strokeWidth="1.8" width="16" height="16">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
              </span>
              <input
                name="orgName"
                style={styles.input}
                placeholder="ex: Adeli Corp"
                value={form.orgName}
                onChange={handleChange}
              />
            </div>
          </div>
 
          {/* Password */}
          <div style={{ ...styles.fieldGroup, marginBottom: 4 }}>
            <label style={styles.label}>Password<span style={styles.req}>*</span></label>
            <div style={inputWrapStyle(errors.password)}>
              <span style={styles.inputIcon}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#aab" strokeWidth="1.8" width="16" height="16">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                name="password"
                type={showPw ? "text" : "password"}
                style={styles.input}
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
              />
              <button
                onClick={() => setShowPw((v) => !v)}
                style={styles.eyeBtn}
                type="button"
                aria-label="Toggle password"
              >
                <EyeIcon open={showPw} />
              </button>
            </div>
            {errors.password ? (
              <span style={styles.error}>{errors.password}</span>
            ) : (
              <span style={styles.hint}>
                Must be at least 8 characters, including one uppercase letter and one number.*
              </span>
            )}
          </div>
 
          {/* Agree */}
          <label style={styles.checkRow}>
            <input
              type="checkbox"
              name="agreed"
              checked={form.agreed}
              onChange={handleChange}
              style={styles.checkbox}
            />
            <span style={styles.checkText}>
              I have read and agree to the{" "}
              <a href="#" style={styles.link}>User Agreement</a>
              {" & "}
              <a href="#" style={styles.link}>Privacy Policy</a>.
            </span>
          </label>
          {errors.agreed && <span style={styles.error}>{errors.agreed}</span>}
 
          {/* CTA */}
          <button style={styles.ctaBtn} onClick={handleSubmit}>
            Create Account
          </button>
 
          {/* Divider */}
          <div style={styles.dividerRow}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>
 
          {/* Social */}
          <div style={styles.socialRow}>
            <button style={styles.socialBtn} aria-label="Sign up with Apple">
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
            </button>
            <button style={styles.socialBtn} aria-label="Sign up with Google">
              <svg viewBox="0 0 24 24" width="22" height="22">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </button>
          </div>
        </div>
 
        {/* Progress bar */}
        <div style={styles.progressBar}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.progressSegment,
                background: i < currentStep ? "#2563EB" : "#E5E7EB",
              }}
            />
          ))}
        </div>
      </div>
 
      {/* RIGHT PANEL */}
      <div style={styles.right}>
        <div style={styles.rightTopBar}>
          <div style={styles.langPicker}>
            EN
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" style={{ marginLeft: 4 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
          <a href="#" style={styles.signInLink}>SIGN IN</a>
        </div>
 
        <div style={styles.featuresList}>
          {features.map((f, i) => (
            <div key={i} style={{ ...styles.featureCard, animationDelay: `${i * 0.12}s` }} className="feature-card-anim">
              <div style={styles.featureIconWrap}>{f.icon}</div>
              <div>
                <p style={styles.featureTitle}>{f.title}</p>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
 
        <p style={styles.tagline}>
          Collaborate in real time, automate approvals, and<br />
          manage document workflows in one secure workspace.
        </p>
      </div>
    </div>
  );
}
const inputWrapStyle = (hasError) => ({
  display: "flex",
  alignItems: "center",
  border: `1.5px solid ${hasError ? "#EF4444" : "#E5E7EB"}`,
  borderRadius: 8,
  background: "#fff",
  padding: "0 12px",
  height: 44,
  gap: 8,
  transition: "border-color 0.2s",
});
 
const styles = {
  root: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    background: "#F3F4F6",
  },
  left: {
    flex: "0 0 52%",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    padding: "0 0 24px",
    position: "relative",
  },
  logo: {
    padding: "24px 40px 0",
  },
  logoBox: {
    width: 72,
    height: 44,
    background: "#9CA3AF",
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
  },
  formWrap: {
    flex: 1,
    padding: "24px 40px 0",
  },
  heading: {
    fontSize: 36,
    fontWeight: 700,
    color: "#111827",
    margin: "0 0 6px",
    letterSpacing: "-0.5px",
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#2563EB",
    letterSpacing: "0.08em",
    margin: "0 0 4px",
  },
  subtext: {
    fontSize: 13,
    color: "#6B7280",
    margin: "0 0 20px",
  },
  row: {
    display: "flex",
    gap: 16,
    marginBottom: 16,
  },
  fieldGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: "#374151",
  },
  req: {
    color: "#EF4444",
    marginLeft: 2,
  },
  optional: {
    color: "#9CA3AF",
    fontWeight: 400,
  },
  inputIcon: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  },
  input: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: 13.5,
    color: "#374151",
    background: "transparent",
    minWidth: 0,
  },
  eyeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    color: "#9CA3AF",
  },
  hint: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  error: {
    fontSize: 11,
    color: "#EF4444",
    marginTop: 2,
  },
  checkRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    margin: "14px 0 4px",
    cursor: "pointer",
  },
  checkbox: {
    marginTop: 2,
    accentColor: "#2563EB",
    width: 14,
    height: 14,
    flexShrink: 0,
    cursor: "pointer",
  },
  checkText: {
    fontSize: 12.5,
    color: "#6B7280",
    lineHeight: 1.4,
  },
  link: {
    color: "#2563EB",
    textDecoration: "none",
  },
  ctaBtn: {
    width: "100%",
    height: 46,
    background: "#2563EB",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 14,
    transition: "background 0.2s, transform 0.1s",
    letterSpacing: "0.01em",
  },
  dividerRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "16px 0 12px",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "#E5E7EB",
  },
  dividerText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  socialRow: {
    display: "flex",
    justifyContent: "center",
    gap: 20,
  },
  socialBtn: {
    width: 48,
    height: 48,
    borderRadius: "50%",
    border: "1.5px solid #E5E7EB",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color 0.2s, box-shadow 0.2s",
    color: "#111",
  },
  progressBar: {
    display: "flex",
    gap: 4,
    padding: "0 40px",
    marginTop: 24,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    transition: "background 0.3s",
  },
 
  /* Right panel */
  right: {
    flex: 1,
    background: "linear-gradient(145deg, #1E40AF 0%, #2563EB 50%, #1D4ED8 100%)",
    display: "flex",
    flexDirection: "column",
    padding: "28px 36px 40px",
    position: "relative",
    overflow: "hidden",
  },
  rightTopBar: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 20,
    marginBottom: 60,
  },
  langPicker: {
    display: "flex",
    alignItems: "center",
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
  signInLink: {
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.05em",
    textDecoration: "none",
    borderBottom: "2px solid rgba(255,255,255,0.5)",
    paddingBottom: 1,
  },
  featuresList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  featureCard: {
    background: "rgba(255,255,255,0.12)",
    backdropFilter: "blur(10px)",
    borderRadius: 14,
    padding: "18px 20px",
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    border: "1px solid rgba(255,255,255,0.15)",
    animation: "slideInRight 0.5s ease both",
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: "rgba(255,255,255,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    flexShrink: 0,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#fff",
    margin: "0 0 4px",
  },
  featureDesc: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.75)",
    margin: 0,
    lineHeight: 1.5,
  },
  tagline: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 1.6,
    marginTop: "auto",
    paddingTop: 32,
  },
};
 
const cssAnimations = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  
  .feature-card-anim {
    animation: slideInRight 0.5s ease both;
  }
  
  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(24px); }
    to   { opacity: 1; transform: translateX(0); }
  }
 
  button[style*="background: #2563EB"]:hover {
    background: #1D4ED8 !important;
    transform: translateY(-1px);
  }
`;