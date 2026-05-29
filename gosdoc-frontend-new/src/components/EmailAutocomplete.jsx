import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../api/users";

const CSS = `
  .ea-wrap{position:relative;flex:1;font-family:'Gilroy','Segoe UI',sans-serif}
  .ea-field{display:flex;align-items:center;border:1.5px solid #E2E5EF;border-radius:8px;height:40px;padding:0 12px;gap:8px;transition:border-color .15s;background:#fff}
  .ea-field:focus-within{border-color:#2563EB}
  .ea-field.error{border-color:#EF4444}
  .ea-icon{flex-shrink:0;color:#9CA3AF;display:flex;align-items:center}
  .ea-input{flex:1;border:none;outline:none;font-size:13px;color:#374151;font-family:inherit;background:transparent;padding:0;min-width:0}

  .ea-dd{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:.5px solid #E5E7EB;border-radius:10px;box-shadow:0 6px 24px rgba(0,0,0,0.12);z-index:10001;max-height:240px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#E5E7EB transparent}
  .ea-dd::-webkit-scrollbar{width:4px}
  .ea-dd::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}
  .ea-dd-loading{padding:12px 14px;font-size:12px;color:#9CA3AF;text-align:center}
  .ea-dd-empty{padding:12px 14px;font-size:12px;color:#9CA3AF;text-align:center}
  .ea-dd-item{display:flex;align-items:center;gap:10px;padding:9px 12px;cursor:pointer;transition:background .15s;border-bottom:.5px solid #F9FAFB}
  .ea-dd-item:last-child{border-bottom:none}
  .ea-dd-item:hover,.ea-dd-item.active{background:#EFF6FF}
  .ea-dd-av{width:30px;height:30px;border-radius:50%;background:#DBEAFE;color:#2563EB;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0}
  .ea-dd-info{flex:1;min-width:0}
  .ea-dd-name{font-size:13px;font-weight:500;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ea-dd-email{font-size:11.5px;color:#6B7280;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}
`;

function initials(name, email) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function useDebounced(value, delay = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export default function EmailAutocomplete({
  value,
  onChange,
  onPick,
  placeholder = "ex: name@workplace.com",
  error = false,
  excludeEmails = [],
  autoFocus = false,
}) {
  const [open, setOpen]   = useState(false);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);

  const debounced = useDebounced(value, 250);
  const trimmed   = (debounced || "").trim();
  const shouldSearch = trimmed.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ["users-search", trimmed],
    queryFn: () => getUsers({ search: trimmed, page_size: 8 }),
    enabled: shouldSearch && open,
    staleTime: 30_000,
  });

  const exclude = new Set(excludeEmails.filter(Boolean).map(e => e.toLowerCase()));
  const allResults = data?.results ?? (Array.isArray(data) ? data : []);
  const results = allResults.filter(u => {
    if (!u?.email) return false;
    if (u.email.toLowerCase() === (value || "").toLowerCase().trim()) return false;
    if (exclude.has(u.email.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [open]);

  useEffect(() => { setHoverIdx(-1); }, [results.length, trimmed]);

  const pick = (u) => {
    onChange(u.email);
    onPick?.(u);
    setOpen(false);
    setHoverIdx(-1);
  };

  const onKeyDown = (e) => {
    if (!open || !results.length) {
      if (e.key === "ArrowDown" && shouldSearch) setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoverIdx(i => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoverIdx(i => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter" && hoverIdx >= 0) {
      e.preventDefault();
      pick(results[hoverIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && shouldSearch;

  return (
    <>
      <style>{CSS}</style>
      <div className="ea-wrap" ref={wrapRef}>
        <div className={`ea-field${error ? " error" : ""}`}>
          <div className="ea-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <polyline points="2,4 12,13 22,4"/>
            </svg>
          </div>
          <input
            ref={inputRef}
            className="ea-input"
            type="email"
            placeholder={placeholder}
            value={value || ""}
            autoFocus={autoFocus}
            onChange={(e) => { onChange(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
        </div>
        {showDropdown && (
          <div className="ea-dd">
            {isFetching && !results.length && (
              <div className="ea-dd-loading">Поиск…</div>
            )}
            {!isFetching && !results.length && (
              <div className="ea-dd-empty">Пользователи не найдены</div>
            )}
            {results.map((u, i) => (
              <div key={u.id}
                   className={`ea-dd-item${hoverIdx === i ? " active" : ""}`}
                   onMouseEnter={() => setHoverIdx(i)}
                   onMouseDown={(e) => { e.preventDefault(); pick(u); }}>
                <div className="ea-dd-av">{initials(u.full_name, u.email)}</div>
                <div className="ea-dd-info">
                  <div className="ea-dd-name">{u.full_name || "—"}</div>
                  <div className="ea-dd-email">{u.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
