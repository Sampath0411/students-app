import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Props {
  file: File | null;
  onClose: () => void;
  onCropped: (blob: Blob, previewUrl: string) => void;
  outputSize?: number;
}

const BOX = 280;

export const ImageCropper = ({ file, onClose, onCropped, outputSize = 512 }: Props) => {
  const [src, setSrc] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{ sx: number; sy: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (!file) { setSrc(""); return; }
    const url = URL.createObjectURL(file);
    setSrc(url);
    const img = new Image();
    img.onload = () => {
      const baseScale = Math.max(BOX / img.width, BOX / img.height);
      setNatural({ w: img.width, h: img.height });
      setZoom(baseScale);
      setPos({
        x: (BOX - img.width * baseScale) / 2,
        y: (BOX - img.height * baseScale) / 2,
      });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    setPos((p) => {
      const w = natural.w * zoom, h = natural.h * zoom;
      const minX = Math.min(0, BOX - w);
      const minY = Math.min(0, BOX - h);
      return {
        x: Math.min(0, Math.max(minX, p.x)),
        y: Math.min(0, Math.max(minY, p.y)),
      };
    });
  }, [zoom, natural]);

  const start = (cx: number, cy: number) => { dragRef.current = { sx: cx, sy: cy, px: pos.x, py: pos.y }; };
  const move = (cx: number, cy: number) => {
    if (!dragRef.current) return;
    const w = natural.w * zoom, h = natural.h * zoom;
    const minX = Math.min(0, BOX - w);
    const minY = Math.min(0, BOX - h);
    const nx = Math.min(0, Math.max(minX, dragRef.current.px + (cx - dragRef.current.sx)));
    const ny = Math.min(0, Math.max(minY, dragRef.current.py + (cy - dragRef.current.sy)));
    setPos({ x: nx, y: ny });
  };
  const end = () => { dragRef.current = null; };

  const apply = async () => {
    if (!src) return;
    setBusy(true);
    const img = new Image();
    img.src = src;
    await new Promise<void>((r) => { img.onload = () => r(); });
    const canvas = document.createElement("canvas");
    canvas.width = outputSize; canvas.height = outputSize;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outputSize, outputSize);
    const scale = outputSize / BOX;
    ctx.drawImage(
      img,
      0, 0, img.width, img.height,
      pos.x * scale, pos.y * scale,
      img.width * zoom * scale, img.height * zoom * scale,
    );
    canvas.toBlob((blob) => {
      setBusy(false);
      if (!blob) return;
      onCropped(blob, URL.createObjectURL(blob));
      onClose();
    }, "image/jpeg", 0.9);
  };

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Adjust your photo</DialogTitle></DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative overflow-hidden rounded-2xl bg-muted/40 touch-none select-none cursor-grab active:cursor-grabbing"
            style={{ width: BOX, height: BOX }}
            onMouseDown={(e) => start(e.clientX, e.clientY)}
            onMouseMove={(e) => move(e.clientX, e.clientY)}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={(e) => { const t = e.touches[0]; start(t.clientX, t.clientY); }}
            onTouchMove={(e) => { const t = e.touches[0]; move(t.clientX, t.clientY); }}
            onTouchEnd={end}
          >
            {src && (
              <img
                src={src} alt="" draggable={false}
                style={{
                  position: "absolute", left: pos.x, top: pos.y,
                  width: natural.w * zoom, height: natural.h * zoom, maxWidth: "none",
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-primary/60" />
          </div>
          <div className="w-full">
            <label className="mb-2 block text-xs text-muted-foreground">Zoom — drag the photo to reposition</label>
            <Slider min={0.5} max={4} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0])} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={apply} disabled={busy} className="gradient-primary text-primary-foreground hover:opacity-90">
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
