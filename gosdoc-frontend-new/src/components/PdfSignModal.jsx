import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { getDocumentRaw, signPdf } from "../api/documents";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Модал подписи PDF: рендерит документ, даёт перетащить и изменить размер
 * подписи на нужном месте страницы, затем впечатывает её через бэкенд.
 */
export default function PdfSignModal({ docId, title, signatureData, onClose, onSigned }) {
  const canvasRef = useRef(null);
  const [pdf, setPdf]           = useState(null);
  const [pageNum, setPageNum]   = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 }); // отрисованный размер, px
  const [sig, setSig]           = useState({ x: 40, y: 40, w: 200, h: 80 });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const aspectRef = useRef(80 / 200); // высота/ширина картинки подписи

  // Естественные пропорции подписи (чтобы не искажать)
  useEffect(() => {
    if (!signatureData) return;
    const img = new Image();
    img.onload = () => {
      if (img.width) aspectRef.current = img.height / img.width;
    };
    img.src = signatureData;
  }, [signatureData]);

  // Загрузка PDF (через бэкенд → без CORS)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const buf = await getDocumentRaw(docId);
        if (cancelled) return;
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buf) });
        const _pdf = await loadingTask.promise;
        if (cancelled) return;
        setPdf(_pdf);
        setNumPages(_pdf.numPages);
        setLoading(false);
      } catch (e) {
        toast.error("Не удалось загрузить PDF для подписи");
        onClose?.();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  // Рендер страницы
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    (async () => {
      const page = await pdf.getPage(pageNum);
      const base = page.getViewport({ scale: 1 });
      const maxW = 720;
      const scale = Math.min(1.6, maxW / base.width);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (cancelled) return;
      setPageSize({ w: viewport.width, h: viewport.height });
      // подпись по умолчанию — снизу слева
      const w = Math.min(200, viewport.width * 0.3);
      const h = w * aspectRef.current;
      setSig({ x: viewport.width * 0.08, y: viewport.height - h - 40, w, h });
    })();
    return () => { cancelled = true; };
  }, [pdf, pageNum]);

  // Перетаскивание подписи
  const onDragStart = useCallback((e) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    setSig((orig) => {
      const base = { ...orig };
      const move = (ev) => {
        const dx = ev.clientX - startX, dy = ev.clientY - startY;
        setSig((s) => ({
          ...s,
          x: Math.max(0, Math.min(base.x + dx, pageSize.w - s.w)),
          y: Math.max(0, Math.min(base.y + dy, pageSize.h - s.h)),
        }));
      };
      const up = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      return orig;
    });
  }, [pageSize]);

  // Изменение размера (угол), сохраняя пропорции
  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    setSig((orig) => {
      const base = { ...orig };
      const move = (ev) => {
        const dx = ev.clientX - startX;
        setSig((s) => {
          const w = Math.max(60, Math.min(base.w + dx, pageSize.w - base.x));
          return { ...s, w, h: w * aspectRef.current };
        });
      };
      const up = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", up);
      };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
      return orig;
    });
  }, [pageSize]);

  const confirm = async () => {
    if (saving || !pageSize.w) return;
    setSaving(true);
    try {
      await signPdf(docId, {
        signature_data: signatureData,
        page: pageNum - 1,
        x: sig.x / pageSize.w,
        y: sig.y / pageSize.h,
        width: sig.w / pageSize.w,
        height: sig.h / pageSize.h,
      });
      toast.success("Документ подписан");
      onSigned?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Не удалось подписать PDF");
    } finally { setSaving(false); }
  };

  return createPortal(
    <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={S.head}>
          <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" width="18" height="18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span style={{ fontSize:14, fontWeight:600, color:"#111827", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              Подпись: {title || "Документ"}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {numPages > 1 && (
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12.5, color:"#6B7280" }}>
                <button style={S.navBtn} disabled={pageNum<=1} onClick={() => setPageNum(p => Math.max(1, p-1))}>‹</button>
                {pageNum} / {numPages}
                <button style={S.navBtn} disabled={pageNum>=numPages} onClick={() => setPageNum(p => Math.min(numPages, p+1))}>›</button>
              </div>
            )}
            <button onClick={confirm} disabled={saving || loading} style={S.signBtn}>
              {saving ? "Подписываю…" : "Подтвердить подпись"}
            </button>
            <button onClick={onClose} style={S.closeBtn}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div style={S.hint}>Перетащите подпись на нужное место, потяните за угол чтобы изменить размер, затем нажмите «Подтвердить подпись».</div>

        {/* Body */}
        <div style={S.body}>
          {loading && <div style={{ color:"#9CA3AF", fontSize:13, padding:40 }}>Загрузка PDF…</div>}
          <div style={{ position:"relative", width: pageSize.w || "auto", margin:"0 auto", lineHeight:0 }}>
            <canvas ref={canvasRef} style={{ display:"block", boxShadow:"0 2px 16px rgba(0,0,0,.15)", borderRadius:2 }}/>
            {!loading && pageSize.w > 0 && signatureData && (
              <div onMouseDown={onDragStart}
                style={{
                  position:"absolute", left:sig.x, top:sig.y, width:sig.w, height:sig.h,
                  cursor:"move", border:"1.5px dashed #2563EB", background:"rgba(37,99,235,0.05)",
                  boxSizing:"border-box",
                }}>
                <img src={signatureData} alt="signature" draggable={false}
                  style={{ width:"100%", height:"100%", objectFit:"contain", pointerEvents:"none" }}/>
                {/* resize handle */}
                <div onMouseDown={onResizeStart}
                  style={{ position:"absolute", right:-6, bottom:-6, width:14, height:14, borderRadius:3,
                    background:"#2563EB", border:"2px solid #fff", cursor:"nwse-resize", boxShadow:"0 1px 4px rgba(0,0,0,.3)" }}/>
              </div>
            )}
          </div>
          {!signatureData && !loading && (
            <div style={{ color:"#EF4444", fontSize:13, padding:20, textAlign:"center" }}>
              У вас нет сохранённой подписи. Создайте её в разделе «Документы» → «Add Signature».
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

const S = {
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:10050, display:"flex", alignItems:"center", justifyContent:"center", padding:16, backdropFilter:"blur(2px)" },
  modal: { background:"#fff", borderRadius:14, width:"100%", maxWidth:840, maxHeight:"calc(100vh - 32px)", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 24px 80px rgba(0,0,0,0.3)", fontFamily:"'Gilroy','Segoe UI',sans-serif" },
  head: { display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"14px 18px", borderBottom:".5px solid #F3F4F6", flexShrink:0 },
  hint: { fontSize:11.5, color:"#9CA3AF", padding:"8px 18px 0" },
  body: { flex:1, overflow:"auto", padding:18, background:"#F3F4F6" },
  navBtn: { width:24, height:24, border:"1px solid #E5E7EB", borderRadius:6, background:"#fff", cursor:"pointer", fontSize:14, lineHeight:1, color:"#374151" },
  signBtn: { display:"flex", alignItems:"center", gap:6, background:"#2563EB", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  closeBtn: { background:"none", border:"none", cursor:"pointer", color:"#9CA3AF", display:"flex", alignItems:"center", padding:4 },
};
