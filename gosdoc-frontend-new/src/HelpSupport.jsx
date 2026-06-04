import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import Sidebar from "./components/Sidebar";
import MobileBottomNav from "./components/MobileBottomNav";
import ProfileController, { ProfileMenu } from "./Profile";
import useAuthStore from "./store/authStore";
import { getFaqs, sendHelpChat } from "./api/help";
import { getWorkspaces } from "./api/workspaces";
import { getNotifications } from "./api/notifications";
import logoImg from "./assets/Group 2.svg";

/* ══════════════════════════════════════════════════════════
   CSS  — восстановлено из dist-сборки (May 28)
══════════════════════════════════════════════════════════ */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{width:100%;height:100%;overflow:hidden;margin:0;padding:0}
  button{font-family:'Gilroy','Segoe UI',sans-serif;cursor:pointer}
  button:hover{opacity:unset}
  input,textarea{font-family:'Gilroy','Segoe UI',sans-serif}

  .hs-page{display:flex;flex-direction:column;width:100vw;height:100vh;font-family:'Gilroy','Segoe UI',sans-serif;letter-spacing:0.02em;background:#EEEDF0;overflow:hidden}

  /* HEADER */
  .hs-topbar{display:flex;align-items:center;padding:0 20px;height:52px;gap:10px;flex-shrink:0;background:#fff;border-bottom:.5px solid #E5E7EB;z-index:30}
  .hs-body{display:flex;flex:1;overflow:hidden;min-height:0}

  /* MAIN */
  .hs-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;background:#EEEDF0}
  .hs-container{flex:1;margin:0 12px 12px 6px;background:#fff;border-radius:16px;display:flex;flex-direction:column;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden;position:relative}
  .hs-inner{flex:1;overflow-y:auto;padding:40px 32px;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent}
  .hs-inner::-webkit-scrollbar{width:4px}
  .hs-inner::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}

  /* HELP CENTER */
  .hs-title{font-size:26px;font-weight:700;color:#111827;text-align:center;margin-bottom:10px}
  .hs-subtitle{font-size:13.5px;color:#6B7280;text-align:center;max-width:720px;margin:0 auto 26px;line-height:1.6}
  .hs-search-wrap{display:flex;justify-content:center;margin-bottom:34px}
  .hs-search{display:flex;align-items:center;gap:8px;background:#F9FAFB;border:.5px solid #E5E7EB;border-radius:22px;padding:10px 20px;width:100%;max-width:520px}
  .hs-search input{border:none;outline:none;background:transparent;font-size:13px;color:#374151;flex:1;font-family:inherit}

  .hs-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:1000px;margin:0 auto}
  .hs-card{background:#fff;border:1px solid #F3F4F6;border-radius:14px;padding:26px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;transition:all .18s ease;cursor:pointer}
  .hs-card:hover{box-shadow:0 8px 28px rgba(37,99,235,0.15);border-color:#DBEAFE;transform:translateY(-2px)}
  .hs-card-icon{width:54px;height:54px;border-radius:10px;background:#2563EB;display:flex;align-items:center;justify-content:center;margin-bottom:18px}
  .hs-card-title{font-size:15px;font-weight:700;color:#111827;margin-bottom:10px}
  .hs-card-desc{font-size:12.5px;color:#6B7280;line-height:1.6;margin-bottom:16px;min-height:58px}
  .hs-card-btn{background:#fff;color:#2563EB;border:1px solid #DBEAFE;border-radius:20px;padding:6px 18px;font-size:12.5px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s}
  .hs-card:hover .hs-card-btn{background:#2563EB;color:#fff;border-color:#2563EB}

  /* DETAIL FAQ */
  .hs-detail-search{margin:0 auto 30px;max-width:620px}
  .hs-detail-title{font-size:24px;font-weight:700;color:#111827;margin-bottom:6px}
  .hs-detail-sub{font-size:13.5px;color:#6B7280;margin-bottom:24px}
  .hs-faq-list{display:flex;flex-direction:column;gap:10px;max-width:820px;margin:0 auto}

  .hs-faq{border:1px solid #F3F4F6;border-radius:10px;overflow:hidden;transition:all .18s ease;background:#fff}
  .hs-faq:hover{border-color:#93C5FD;box-shadow:0 4px 14px rgba(37,99,235,0.1)}
  .hs-faq.open{border-color:#93C5FD;box-shadow:0 4px 14px rgba(37,99,235,0.1)}
  .hs-faq-q{display:flex;align-items:center;gap:14px;padding:14px 20px;font-size:13.5px;color:#374151;cursor:pointer;user-select:none}
  .hs-faq-icon{width:18px;height:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:400;color:#6B7280;transition:transform .25s}
  .hs-faq.open .hs-faq-icon{transform:rotate(180deg);color:#2563EB}
  .hs-faq-a{max-height:0;overflow:hidden;transition:max-height .3s ease,padding .3s ease;padding:0 20px 0 52px;font-size:13px;color:#6B7280;line-height:1.7;white-space:pre-line}
  .hs-faq.open .hs-faq-a{max-height:400px;padding:4px 20px 18px 52px}

  /* AI ASSISTANT PILL */
  .hs-ai-pill{position:absolute;bottom:24px;right:24px;background:#fff;border:1px solid #E5E7EB;border-radius:14px;padding:14px;width:240px;box-shadow:0 8px 24px rgba(0,0,0,0.1);z-index:50}
  .hs-ai-close{position:absolute;top:10px;right:10px;background:none;border:none;cursor:pointer;color:#9CA3AF;display:flex;align-items:center}
  .hs-ai-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .hs-ai-logo{width:24px;height:24px;border-radius:6px;background:#2563EB;display:flex;align-items:center;justify-content:center}
  .hs-ai-title-pill{font-size:13px;font-weight:600;color:#111827}
  .hs-ai-desc{font-size:11.5px;color:#6B7280;line-height:1.5;margin-bottom:10px}
  .hs-ai-start{width:100%;background:#2563EB;color:#fff;border:none;border-radius:8px;padding:8px;font-size:12.5px;font-weight:500;cursor:pointer;font-family:inherit}
  .hs-ai-start:hover{background:#1D4ED8}

  /* AI CHAT MODAL */
  .hs-ai-modal{position:absolute;bottom:24px;right:24px;background:#fff;border:1px solid #E5E7EB;border-radius:16px;width:440px;height:440px;box-shadow:0 16px 48px rgba(0,0,0,0.18);z-index:100;display:flex;flex-direction:column;overflow:hidden;background-image:radial-gradient(circle at 85% 50%, rgba(191,219,254,0.2), transparent 50%), radial-gradient(circle at 20% 80%, rgba(219,234,254,0.3), transparent 40%);background-color:#fff}
  .hs-ai-modal.expanded{width:80vw;height:80vh;bottom:10vh;right:10vw}
  .hs-ai-modal-head{display:flex;align-items:center;justify-content:flex-end;padding:12px;gap:4px;flex-shrink:0}
  .hs-ai-icon-btn{width:28px;height:28px;border:none;background:none;cursor:pointer;color:#6B7280;border-radius:6px;display:flex;align-items:center;justify-content:center}
  .hs-ai-icon-btn:hover{background:#F3F4F6}

  .hs-ai-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 30px;text-align:center;overflow-y:auto}
  .hs-ai-greeting{font-size:36px;font-weight:700;background:linear-gradient(90deg,#2563EB,#8B5CF6);background-clip:text;-webkit-background-clip:text;color:transparent;margin-bottom:18px}
  .hs-ai-helptext{font-size:14px;color:#6B7280;line-height:1.6;max-width:400px}

  .hs-ai-messages{flex:1;overflow-y:auto;padding:12px 20px;display:flex;flex-direction:column;gap:10px;width:100%}
  .hs-ai-msg{max-width:75%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5}
  .hs-ai-msg.user{align-self:flex-end;background:#2563EB;color:#fff;border-bottom-right-radius:4px}
  .hs-ai-msg.bot{align-self:flex-start;background:#F3F4F6;color:#374151;border-bottom-left-radius:4px}

  .hs-ai-input-area{margin:12px 20px;border:1px solid #E5E7EB;border-radius:14px;padding:10px 14px;background:#fff;display:flex;flex-direction:column;gap:6px;flex-shrink:0}
  .hs-ai-input{border:none;outline:none;font-size:13px;color:#374151;background:transparent;width:100%;font-family:inherit;resize:none;min-height:22px;max-height:80px}
  .hs-ai-input::placeholder{color:#9CA3AF}
  .hs-ai-actions{display:flex;align-items:center;gap:10px}
  .hs-ai-action{background:none;border:none;cursor:pointer;color:#9CA3AF;display:flex;align-items:center;gap:4px;font-size:12px;font-family:inherit;padding:2px 4px}
  .hs-ai-action:hover{color:#374151}
  .hs-ai-send{margin-left:auto;width:30px;height:30px;border-radius:8px;background:#2563EB;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}
  .hs-ai-send:hover{background:#1D4ED8}
  .hs-ai-mic{width:28px;height:28px;border-radius:50%;border:none;background:#F3F4F6;cursor:pointer;color:#6B7280;display:flex;align-items:center;justify-content:center}

  @media(max-width:768px){
    .hs-page{ width:100%; height:100svh }
    .hs-topbar{ padding:0 12px; gap:6px; font-size:12.5px; height:48px }
    .hs-topbar button{ padding:4px 8px!important; font-size:11.5px!important }
    .hs-container{ margin:8px 8px 78px 8px; border-radius:12px; padding:12px 12px 16px }
    .hs-cards{grid-template-columns:1fr; gap:10px}
    .hs-ai-pill{left:12px;right:12px;width:auto}
    .hs-ai-modal{left:12px;right:12px;width:auto;height:70vh}
    .hs-ai-modal.expanded{left:12px;right:12px;width:auto;height:90vh;bottom:5vh}
    .hs-hero h1{ font-size:24px!important }
    .hs-hero p{ font-size:13px }
  }
  @media(max-width:480px){
    .hs-topbar{ padding:0 10px }
  }
`;

/* ══════════════════════════════════════════════════════════
   TOPICS
══════════════════════════════════════════════════════════ */
const TOPICS = [
  {
    id: "platform",
    title: "About Platform",
    subtitle: "Here you can find answers to questions about using the platform.",
    desc: "Get an overview of the platform and understand what it provides and how it can help you.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" width="22" height="22">
        <rect x="4" y="4" width="16" height="16" rx="2" fill="#fff"/>
      </svg>
    ),
    color: "#2563EB",
  },
  {
    id: "tasks",
    title: "Task Management",
    subtitle: "Find out how to create, assign, and track tasks across your team.",
    desc: "Find out how to create, assign, and track tasks across your team.",
    icon: (
      <svg viewBox="0 0 24 24" fill="#fff" width="22" height="22">
        <path d="M8 5v14l11-7L8 5z"/>
      </svg>
    ),
    color: "#2563EB",
  },
  {
    id: "orgs",
    title: "Organization & Projects",
    subtitle: "Learn how to manage organizations, teams, and projects effectively.",
    desc: "Understand how to set up organizations and manage your projects efficiently.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="22" height="22">
        <line x1="4" y1="20" x2="4" y2="10"/>
        <line x1="10" y1="20" x2="10" y2="4"/>
        <line x1="16" y1="20" x2="16" y2="12"/>
        <line x1="22" y1="20" x2="22" y2="8"/>
        <line x1="2" y1="20" x2="24" y2="20"/>
      </svg>
    ),
    color: "#2563EB",
  },
];

/* ══════════════════════════════════════════════════════════
   FAQ ACCORDION ITEM
══════════════════════════════════════════════════════════ */
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`hs-faq${open ? " open" : ""}`} onClick={() => setOpen(v => !v)}>
      <div className="hs-faq-q">
        <span className="hs-faq-icon">{open ? "−" : "+"}</span>
        <span style={{ flex: 1 }}>{q}</span>
      </div>
      <div className="hs-faq-a">{a}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   OVERVIEW — 3 cards
══════════════════════════════════════════════════════════ */
function Overview({ onSelectTopic }) {
  const { t } = useTranslation();
  return (
    <>
      <h1 className="hs-title">{t("help.helpCenter")}</h1>
      <p className="hs-subtitle">
        To get familiar with GosDoc and learn how to work with it, you can find everything you need here — from getting started to managing your workspace and projects, and answers to common questions.
      </p>
      <div className="hs-search-wrap">
        <div className="hs-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="15" height="15">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder={t("help.searchArticles")}/>
        </div>
      </div>
      <div className="hs-cards">
        {TOPICS.map(topic => (
          <div key={topic.id} className="hs-card" onClick={() => onSelectTopic(topic.id)}>
            <div className="hs-card-icon" style={{ background: topic.color }}>{topic.icon}</div>
            <div className="hs-card-title">{topic.title}</div>
            <div className="hs-card-desc">{topic.desc}</div>
            <button className="hs-card-btn" onClick={(e) => { e.stopPropagation(); onSelectTopic(topic.id); }}>
              {t("help.learnMore")}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   DETAIL — FAQ list for one topic
══════════════════════════════════════════════════════════ */
function Detail({ topicId }) {
  const { t } = useTranslation();
  const topic = TOPICS.find(x => x.id === topicId);
  const [search, setSearch] = useState("");
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ["faqs", topicId],
    queryFn: () => getFaqs(topicId),
    staleTime: 300_000,
  });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? faqs.filter(f => (f.question || "").toLowerCase().includes(q) || (f.answer || "").toLowerCase().includes(q))
    : faqs;

  if (!topic) return null;

  return (
    <>
      <div className="hs-detail-search">
        <div className="hs-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="15" height="15">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder={t("help.searchArticles")} value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <h2 className="hs-detail-title">{topic.title}</h2>
        <p className="hs-detail-sub">{topic.subtitle}</p>
      </div>
      {isLoading
        ? <div style={{ textAlign:"center", color:"#9CA3AF", fontSize:13, padding:40 }}>{t("help.loading")}</div>
        : <div className="hs-faq-list">
            {filtered.length === 0
              ? <div style={{ textAlign:"center", color:"#9CA3AF", fontSize:13, padding:40 }}>{t("help.noResults")}</div>
              : filtered.map(f => <FAQItem key={f.id} q={f.question} a={f.answer}/>)
            }
          </div>
      }
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   AI ASSISTANT — pill / modal / floating button
══════════════════════════════════════════════════════════ */
function AIAssistant() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [pillVisible, setPillVisible] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setMessages(m => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await sendHelpChat(text);
      setMessages(m => [...m, { role: "bot", text: reply }]);
    } catch {
      setMessages(m => [...m, { role: "bot", text: t("help.errorMsg") }]);
    } finally {
      setBusy(false);
    }
  };

  if (modalOpen) {
    return (
      <div className={`hs-ai-modal${expanded ? " expanded" : ""}`}>
        <div className="hs-ai-modal-head">
          <button className="hs-ai-icon-btn" onClick={() => setExpanded(v => !v)} title={expanded ? "Collapse" : "Expand"}>
            {expanded ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="4 14 10 14 10 20"/>
                <polyline points="20 10 14 10 14 4"/>
                <line x1="14" y1="10" x2="21" y2="3"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <polyline points="15 3 21 3 21 9"/>
                <polyline points="9 21 3 21 3 15"/>
                <line x1="21" y1="3" x2="14" y2="10"/>
                <line x1="3" y1="21" x2="10" y2="14"/>
              </svg>
            )}
          </button>
          <button className="hs-ai-icon-btn"
                  onClick={() => { setModalOpen(false); setExpanded(false); setPillVisible(false); }}
                  title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        {messages.length === 0 ? (
          <div className="hs-ai-body">
            <div className="hs-ai-greeting">
              {`Hi, ${user?.full_name?.split(" ")[0] || "there"}!`}
            </div>
            <div className="hs-ai-helptext">
              {t("help.greeting").split("\n").map((line, i) => (
                <span key={i}>{line}{i === 0 && <br/>}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="hs-ai-messages">
            {messages.map((m, i) => (
              <div key={i} className={`hs-ai-msg ${m.role}`}>{m.text}</div>
            ))}
            {busy && <div className="hs-ai-msg bot" style={{ opacity: .6 }}>…</div>}
            <div ref={endRef}/>
          </div>
        )}
        <div className="hs-ai-input-area">
          <textarea className="hs-ai-input"
                    placeholder={`✦ ${t("help.askAnything")}`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    disabled={busy}/>
          <div className="hs-ai-actions">
            <button className="hs-ai-action">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              {t("help.attach")}
            </button>
            <button className="hs-ai-mic" title="Voice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="13" height="13">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <button className="hs-ai-send" onClick={send} title="Send" disabled={busy} style={{ opacity: busy ? .6 : 1 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" width="13" height="13">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pillVisible) {
    return (
      <div className="hs-ai-pill">
        <button className="hs-ai-close" onClick={() => setPillVisible(false)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div className="hs-ai-head">
          <div className="hs-ai-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="14" height="14">
              <circle cx="12" cy="12" r="9"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </div>
          <span className="hs-ai-title-pill">{t("help.aiAssistant")}</span>
        </div>
        <div className="hs-ai-desc">{t("help.aiDesc")}</div>
        <button className="hs-ai-start" onClick={() => setModalOpen(true)}>{t("help.start")}</button>
      </div>
    );
  }

  return (
    <button onClick={() => { setPillVisible(true); setModalOpen(true); }}
            style={{
              position:"absolute", bottom:24, right:24, width:52, height:52, borderRadius:"50%",
              background:"#2563EB", border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 8px 24px rgba(37,99,235,0.4)", zIndex:50
            }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" width="22" height="22">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
        <line x1="9" y1="9" x2="9.01" y2="9"/>
        <line x1="15" y1="9" x2="15.01" y2="9"/>
      </svg>
    </button>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════ */
export default function HelpSupport({ onGoToAuth, onNavigate }) {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileView, setProfileView] = useState(null);

  useQuery({ queryKey: ["workspaces"], queryFn: getWorkspaces });

  const { data: notifData } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => getNotifications({ is_read: "false", page_size: 1 }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const hasUnread = (notifData?.count ?? 0) > 0;
  const currentTopicTitle = selectedTopic ? TOPICS.find(x => x.id === selectedTopic)?.title : null;

  return (
    <div className="hs-page">
      <style>{css}</style>

      <header className="hs-topbar">
        <img src={logoImg} alt="Logo" style={{ height:30, flexShrink:0 }}/>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor:"pointer" }}
             onClick={() => selectedTopic ? setSelectedTopic(null) : onNavigate?.("inbox")}>
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:13 }}>
          <span style={{ color: selectedTopic ? "#9CA3AF" : "#111827", fontWeight: selectedTopic ? 400 : 500, cursor: selectedTopic ? "pointer" : "default" }}
                onClick={() => selectedTopic && setSelectedTopic(null)}>
            Help &amp; Support
          </span>
          {selectedTopic && (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
                <polyline points="9 6 15 12 9 18"/>
              </svg>
              <span style={{ color:"#111827", fontWeight:500 }}>{currentTopicTitle}</span>
            </>
          )}
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
          <div onClick={() => onNavigate?.("notifications")} title="Notifications"
               style={{ position:"relative", width:30, height:30, borderRadius:8, border:".5px solid #E5E7EB", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {hasUnread && (
              <div style={{ position:"absolute", top:-2, right:-2, width:8, height:8, background:"#EF4444", borderRadius:"50%", border:"1.5px solid #fff" }}/>
            )}
          </div>
          <svg onClick={() => setProfileMenuOpen(v => !v)} style={{ cursor:"pointer" }}
               width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <div style={{ position:"relative" }}>
            <div onClick={() => setProfileMenuOpen(v => !v)} title="Menu"
                 style={{ position:"relative", width:30, height:30, cursor:"pointer" }}>
              <div style={{ width:30, height:30, borderRadius:"50%", overflow:"hidden" }}>
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  : <svg viewBox="0 0 30 30" fill="none" width="30" height="30">
                      <rect width="30" height="30" fill="#CBD5E1"/>
                      <circle cx="15" cy="11" r="5" fill="#94A3B8"/>
                      <ellipse cx="15" cy="26" rx="10" ry="6" fill="#94A3B8"/>
                    </svg>}
              </div>
              <div style={{ position:"absolute", top:-2, right:-2, width:8, height:8, background:"#22c55e", borderRadius:"50%", border:"1.5px solid #fff" }}/>
            </div>
            {profileMenuOpen && (
              <ProfileMenu onClose={() => setProfileMenuOpen(false)}
                onProfile={() => setProfileView("profile")}
                onSettings={() => setProfileView("settings")}
                onLogOut={onGoToAuth}/>
            )}
          </div>
        </div>
      </header>

      <div className="hs-body">
        <Sidebar active="help" onNavigate={onNavigate}/>
        <MobileBottomNav />
        <div className="hs-main">
          <ProfileController show={!!profileView} view={profileView} setView={setProfileView} onLogOut={onGoToAuth}/>
          <div className="hs-container">
            <div className="hs-inner">
              {selectedTopic
                ? <Detail topicId={selectedTopic}/>
                : <Overview onSelectTopic={setSelectedTopic}/>}
            </div>
            <AIAssistant/>
          </div>
        </div>
      </div>
    </div>
  );
}
