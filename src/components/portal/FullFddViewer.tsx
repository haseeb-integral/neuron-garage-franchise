import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Download, Loader2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

GlobalWorkerOptions.workerSrc = workerUrl;

function PdfPage({ doc, number, width, root, onError }: { doc: PDFDocumentProxy; number: number; width: number; root: HTMLDivElement | null; onError: () => void }) {
  const holder = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);
  useEffect(() => {
    const node = holder.current;
    if (!node || !root) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { root, rootMargin: "500px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [root]);
  useEffect(() => {
    if (!visible) { const node = canvas.current; if (node) { node.width = 0; node.height = 0; } setRendered(false); return; }
    let disposed = false;
    let task: ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]> | undefined;
    setRendered(false);
    void doc.getPage(number).then(async (page) => {
      const node = canvas.current;
      if (disposed || !node) return;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / base.width });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      node.width = Math.floor(viewport.width * ratio); node.height = Math.floor(viewport.height * ratio);
      const context = node.getContext("2d");
      if (!context) throw new Error("PDF canvas unavailable");
      task = page.render({ canvasContext: context, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
      await task.promise;
      if (!disposed) setRendered(true);
    }).catch(() => { if (!disposed) onError(); });
    return () => { disposed = true; task?.cancel(); };
  }, [doc, number, width, visible, onError]);
  return <div ref={holder} className="shrink-0 space-y-1" style={{ width }}>
    <div className="relative border bg-background" style={{ aspectRatio: "612 / 792" }}>
      <canvas ref={canvas} role="img" aria-label={`FDD page ${number}`} className="w-full h-full" />
      {!rendered && <span className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Page {number}</span>}
    </div>
    <p className="text-center text-xs text-muted-foreground">Page {number} of {doc.numPages}</p>
  </div>;
}

export function FullFddViewer({ expectedId, onReady }: { expectedId: string; onReady: (id: string | null) => void }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [file, setFile] = useState<{ blob: Blob; name: string } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(600);
  const ready = useRef(onReady); ready.current = onReady;
  const fail = useRef(() => { setError(true); ready.current(null); });
  useEffect(() => {
    if (!root) return;
    const observer = new ResizeObserver(() => setWidth(Math.max(200, root.clientWidth - 24)));
    observer.observe(root); return () => observer.disconnect();
  }, [root]);
  useEffect(() => {
    let disposed = false;
    let loaded: PDFDocumentProxy | null = null;
    ready.current(null); setError(false); setDoc(null); setFile(null);
    void (async () => {
      const { data, error: invokeError } = await supabase.functions.invoke("portal-receipt-fdd", { body: { form_key: "item23" } });
      if (invokeError || data?.fdd_file_id !== expectedId || !data?.url) throw new Error("FDD unavailable");
      const response = await fetch(data.url);
      if (!response.ok) throw new Error("FDD download failed");
      const bytes = await response.arrayBuffer();
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      const fingerprint = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      if (fingerprint !== data.sha256) throw new Error("FDD mismatch");
      const blob = new Blob([bytes], { type: "application/pdf" });
      loaded = await getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise;
      await loaded.getPage(1);
      if (disposed) { void loaded.destroy(); return; }
      setDoc(loaded); setFile({ blob, name: data.file_name }); ready.current(expectedId);
    })().catch(() => { if (!disposed) fail.current(); });
    return () => { disposed = true; ready.current(null); if (loaded) void loaded.destroy(); };
  }, [expectedId, retry]);
  const download = () => {
    if (!file) return;
    const url = URL.createObjectURL(file.blob); const a = document.createElement("a");
    a.href = url; a.download = file.name; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section aria-label="Full Franchise Disclosure Document" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-bold text-portal-navy">Franchise Disclosure Document</h2>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" title="Zoom out" aria-label="Zoom out" disabled={!doc || zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - 0.25))}><ZoomOut className="h-4 w-4" /></Button>
        <span className="w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="icon" title="Zoom in" aria-label="Zoom in" disabled={!doc || zoom >= 2} onClick={() => setZoom((z) => Math.min(2, z + 0.25))}><ZoomIn className="h-4 w-4" /></Button>
        <Button variant="outline" size="sm" disabled={!file} onClick={download}><Download className="h-4 w-4" /> Download FDD</Button>
      </div>
    </div>
    {error ? <div role="alert" className="border border-destructive rounded-md p-4 space-y-3">
      <p>Your full FDD could not be opened. Please try again before signing.</p>
      <Button variant="outline" onClick={() => setRetry((r) => r + 1)}><RotateCw className="h-4 w-4" /> Try again</Button>
    </div> : !doc ? <p role="status" className="flex gap-2 items-center p-4"><Loader2 className="h-4 w-4 animate-spin" /> Opening your full FDD…</p> : null}
    <div ref={setRoot} tabIndex={0} aria-label="FDD pages" className="h-[65vh] min-h-80 max-h-[800px] overflow-auto border rounded-md bg-muted p-3 space-y-4">
      {!error && doc && Array.from({ length: doc.numPages }, (_, i) => <PdfPage key={i} doc={doc} number={i + 1} width={width * zoom} root={root} onError={fail.current} />)}
    </div>
  </section>;
}