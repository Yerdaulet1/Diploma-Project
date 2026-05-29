import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import Sidebar from "./components/Sidebar";
import ProfileController, { ProfileMenu } from "./Profile";
import useAuthStore from "./store/authStore";
import logoImg from "./assets/Group 2.svg";

import {
  getAdminStats,
  getAdminUsers,
  deleteAdminUser,
  getAdminWorkspaces,
  deleteAdminWorkspace,
} from "./api/admin";

const css = `
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body,#root{width:100%;height:100%;overflow:hidden;margin:0;padding:0}
  button{font-family:'Gilroy','Segoe UI',sans-serif;cursor:pointer}
  input,select{font-family:'Gilroy','Segoe UI',sans-serif}

  .ad-page{display:flex;flex-direction:column;width:100vw;height:100vh;font-family:'Gilroy','Segoe UI',sans-serif;letter-spacing:0.02em;background:#EEEDF0;overflow:hidden}
  .ad-topbar{display:flex;align-items:center;padding:0 20px;height:52px;gap:10px;flex-shrink:0;background:#fff;border-bottom:.5px solid #E5E7EB;z-index:30}
  .ad-body{display:flex;flex:1;overflow:hidden;min-height:0}
  .ad-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;background:#EEEDF0}
  .ad-container{flex:1;margin:0 12px 12px 6px;background:#fff;border-radius:16px;display:flex;flex-direction:column;box-shadow:0 1px 4px rgba(0,0,0,.06);overflow:hidden;min-height:0}
  .ad-inner{flex:1;overflow-y:auto;padding:24px 28px;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent}
  .ad-inner::-webkit-scrollbar{width:4px}
  .ad-inner::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}

  .ad-tabs{display:flex;gap:4px;border-bottom:.5px solid #E5E7EB;padding:0 28px;flex-shrink:0}
  .ad-tab{padding:12px 18px;font-size:13px;color:#6B7280;cursor:pointer;border:none;background:none;font-family:inherit;border-bottom:2px solid transparent;font-weight:500;transition:color .15s}
  .ad-tab.active{color:#2563EB;border-bottom-color:#2563EB}
  .ad-tab:hover:not(.active){color:#374151}

  .ad-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:24px}
  .ad-stat{background:#F8FAFF;border:1px solid #DBEAFE;border-radius:12px;padding:18px 20px}
  .ad-stat-val{font-size:28px;font-weight:700;color:#2563EB}
  .ad-stat-lbl{font-size:12px;color:#6B7280;margin-top:6px}

  .ad-search-row{display:flex;align-items:center;gap:12px;margin-bottom:16px}
  .ad-search{flex:1;display:flex;align-items:center;gap:8px;border:.5px solid #E5E7EB;border-radius:8px;padding:8px 14px;background:#F9FAFB;max-width:360px}
  .ad-search input{border:none;outline:none;background:transparent;font-size:13px;color:#374151;font-family:inherit;flex:1}

  .ad-table{width:100%;border-collapse:collapse}
  .ad-table th{font-size:11.5px;color:#9CA3AF;font-weight:500;padding:10px 14px;text-align:left;border-bottom:.5px solid #F3F4F6;white-space:nowrap;text-transform:uppercase;letter-spacing:.05em}
  .ad-table td{font-size:13px;color:#374151;padding:12px 14px;border-bottom:.5px solid #F9FAFB;vertical-align:middle}
  .ad-table tr:last-child td{border-bottom:none}
  .ad-table tbody tr:hover td{background:#FAFAFA}

  .ad-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:6px;font-size:11.5px;font-weight:500}
  .ad-badge.green{background:#DCFCE7;color:#15803D}
  .ad-badge.red{background:#FEE2E2;color:#B91C1C}
  .ad-badge.blue{background:#DBEAFE;color:#1D4ED8}
  .ad-badge.gray{background:#F3F4F6;color:#6B7280}

  .ad-del{background:none;border:.5px solid #FECACA;color:#DC2626;border-radius:6px;padding:5px 12px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;transition:all .15s}
  .ad-del:hover{background:#FEF2F2;border-color:#DC2626}
  .ad-del:disabled{opacity:.4;cursor:not-allowed}

  .ad-empty{text-align:center;padding:60px 20px;color:#9CA3AF;font-size:14px}
  .ad-deny{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:14px;color:#9CA3AF;text-align:center;padding:40px}
`;

function Stat({ value, label }) {
  return (
    <div className="ad-stat">
      <div className="ad-stat-val">{value ?? "—"}</div>
      <div className="ad-stat-lbl">{label}</div>
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => getAdminUsers(search ? { search } : undefined),
  });
  const me = useAuthStore((s) => s.user);
  const users = data?.results ?? [];

  const onDelete = async (u) => {
    if (!confirm(`Удалить пользователя ${u.email}?\nЭто действие необратимо.`)) return;
    try {
      await deleteAdminUser(u.id);
      toast.success(`User ${u.email} deleted`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete");
    }
  };

  return (
    <>
      <div className="ad-search-row">
        <div className="ad-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="14" height="14">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search by email or name…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{data?.count ?? 0} total</span>
      </div>

      {isLoading ? (
        <div className="ad-empty">Loading…</div>
      ) : users.length === 0 ? (
        <div className="ad-empty">No users found</div>
      ) : (
        <table className="ad-table">
          <thead>
            <tr>
              <th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Created</th><th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = me?.id === u.id;
              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500, color: "#111827" }}>{u.email}</td>
                  <td>{u.full_name || "—"}</td>
                  <td>
                    {u.is_staff
                      ? <span className="ad-badge blue">Admin</span>
                      : <span className="ad-badge gray">User</span>}
                  </td>
                  <td>
                    {u.is_active
                      ? <span className="ad-badge green">Active</span>
                      : <span className="ad-badge red">Inactive</span>}
                  </td>
                  <td style={{ color: "#9CA3AF" }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="ad-del" onClick={() => onDelete(u)} disabled={isMe} title={isMe ? "You can't delete yourself" : "Delete user"}>
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

function WorkspacesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-workspaces", search],
    queryFn: () => getAdminWorkspaces(search ? { search } : undefined),
  });
  const wss = data?.results ?? [];

  const onDelete = async (w) => {
    if (!confirm(`Удалить организацию "${w.title}"?\nЭто удалит ${w.member_count} участник(ов) и ${w.doc_count} документ(ов).`)) return;
    try {
      await deleteAdminWorkspace(w.id);
      toast.success(`"${w.title}" deleted`);
      qc.invalidateQueries({ queryKey: ["admin-workspaces"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete");
    }
  };

  return (
    <>
      <div className="ad-search-row">
        <div className="ad-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" width="14" height="14">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input placeholder="Search by title…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>{data?.count ?? 0} total</span>
      </div>

      {isLoading ? (
        <div className="ad-empty">Loading…</div>
      ) : wss.length === 0 ? (
        <div className="ad-empty">No workspaces found</div>
      ) : (
        <table className="ad-table">
          <thead>
            <tr>
              <th>Title</th><th>Type</th><th>Owner</th><th>Members</th><th>Docs</th><th>Created</th><th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {wss.map((w) => (
              <tr key={w.id}>
                <td style={{ fontWeight: 500, color: "#111827" }}>{w.title}</td>
                <td><span className="ad-badge gray">{w.type}</span></td>
                <td>{w.created_by || "—"}</td>
                <td>{w.member_count}</td>
                <td>{w.doc_count}</td>
                <td style={{ color: "#9CA3AF" }}>
                  {w.created_at ? new Date(w.created_at).toLocaleDateString() : "—"}
                </td>
                <td style={{ textAlign: "right" }}>
                  <button className="ad-del" onClick={() => onDelete(w)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

export default function Admin({ onNavigate, onGoToAuth }) {
  const { t: _t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState("users");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileView, setProfileView] = useState(null);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getAdminStats,
    enabled: !!user?.is_staff,
  });

  if (!user?.is_staff) {
    return (
      <div className="ad-page">
        <style>{css}</style>
        <div className="ad-deny">
          <svg viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" width="56" height="56">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>Access denied</div>
          <div style={{ fontSize: 13 }}>This page is only for administrators.</div>
          <button onClick={() => onNavigate?.("inbox")}
            style={{ background:"#2563EB", color:"#fff", border:"none", borderRadius:8, padding:"9px 22px", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
            ← Back to Inbox
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-page">
      <style>{css}</style>

      <header className="ad-topbar">
        <img src={logoImg} alt="Logo" style={{ height: 30, flexShrink: 0 }} />
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{ cursor: "pointer" }} onClick={() => onNavigate?.("inbox")}>
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
          <span style={{ color: "#111827", fontWeight: 500 }}>Admin</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <div onClick={() => onNavigate?.("notifications")} title="Notifications"
            style={{ position: "relative", width: 30, height: 30, borderRadius: 8, border: ".5px solid #E5E7EB", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.8">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <svg onClick={() => setProfileMenuOpen(v => !v)} style={{ cursor: "pointer" }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <div style={{ position: "relative" }}>
            <div onClick={() => setProfileMenuOpen(v => !v)} style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", cursor: "pointer" }}>
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <svg viewBox="0 0 30 30" fill="none" width="30" height="30"><rect width="30" height="30" fill="#CBD5E1"/><circle cx="15" cy="11" r="5" fill="#94A3B8"/><ellipse cx="15" cy="26" rx="10" ry="6" fill="#94A3B8"/></svg>
              }
            </div>
            {profileMenuOpen && (
              <ProfileMenu onClose={() => setProfileMenuOpen(false)}
                onProfile={() => setProfileView("profile")}
                onSettings={() => setProfileView("settings")}
                onLogOut={onGoToAuth} />
            )}
          </div>
        </div>
      </header>

      <div className="ad-body">
        <Sidebar active="admin" onNavigate={onNavigate} />
        <div className="ad-main">
          <ProfileController show={!!profileView} view={profileView} setView={setProfileView} onLogOut={onGoToAuth} />
          <div className="ad-container">
            <div className="ad-tabs">
              <button className={`ad-tab${tab === "users" ? " active" : ""}`} onClick={() => setTab("users")}>Users</button>
              <button className={`ad-tab${tab === "workspaces" ? " active" : ""}`} onClick={() => setTab("workspaces")}>Organizations</button>
            </div>
            <div className="ad-inner">
              <div className="ad-stats">
                <Stat value={stats?.users_total} label="Users total"/>
                <Stat value={stats?.users_active} label="Active users"/>
                <Stat value={stats?.users_admin} label="Admins"/>
                <Stat value={stats?.workspaces_total} label="Organizations"/>
                <Stat value={stats?.documents_total} label="Documents"/>
                <Stat value={stats?.memberships_total} label="Memberships"/>
              </div>
              {tab === "users" ? <UsersTab/> : <WorkspacesTab/>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
