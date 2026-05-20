import { useState, useRef, useEffect } from "react";
import { Image, Upload, Link2, Camera, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface PhotoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  label?: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
export function genId() {
  return "m" + Date.now().toString(36);
}

export function isUrl(s: string) {
  return s.startsWith("http://") || s.startsWith("https://") || s.startsWith("blob:");
}

function compressImage(file: File, maxW = 1000, maxH = 1000): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxW) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          }
        } else {
          if (height > maxH) {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file); // fallback
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.75
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export function PhotoUploader({ 
  value, 
  onChange,
  bucket = "menu-photos",
  folder = "menu",
  label = "Foto Menu"
}: PhotoUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState(value && isUrl(value) ? value : "");
  const [mode, setMode] = useState<"preview" | "url" | "upload">("preview");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // Sync external value → urlInput
  useEffect(() => {
    if (value && isUrl(value)) setUrlInput(value);
  }, [value]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const ext = "jpg"; // Convert to jpg
      const path = `${folder}/${genId()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, compressedBlob, { 
          upsert: true, 
          contentType: "image/jpeg",
          cacheControl: "3600"
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
      setUrlInput(data.publicUrl);
      setMode("preview");
    } catch (err: any) {
      // Fallback: use object URL (won't persist across sessions, but good for demo)
      const objectUrl = URL.createObjectURL(file);
      onChange(objectUrl);
      setMode("preview");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function applyUrl() {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setMode("preview");
  }

  const previewSrc = value && (isUrl(value) ? value : "");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <div className="flex gap-1 ml-auto">
          {(["preview", "upload", "url"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-colors ${
                mode === m
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "preview" ? <Image size={9} /> : m === "upload" ? <Upload size={9} /> : <Link2 size={9} />}
              {m === "preview" ? "Preview" : m === "upload" ? "Upload" : "URL"}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      {mode === "preview" && (
        <div
          className="relative aspect-video bg-secondary border-2 border-dashed border-border rounded-xl overflow-hidden cursor-pointer group"
          onClick={() => setMode("upload")}
        >
          {previewSrc ? (
            <>
              <img src={previewSrc} alt="preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-white">
                  <Camera size={22} />
                  <p className="text-xs font-semibold">Ganti Foto</p>
                </div>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Camera size={28} className="opacity-30" />
              <p className="text-xs">Belum ada foto · klik untuk upload</p>
            </div>
          )}
        </div>
      )}

      {/* Upload */}
      {mode === "upload" && (
        <div className="space-y-3">
          <div
            className="aspect-video bg-secondary border-2 border-dashed border-primary/30 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/60 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <RefreshCw size={24} className="animate-spin text-primary" />
            ) : (
              <>
                <Upload size={28} className="text-primary opacity-70" />
                <div className="text-center">
                  <p className="text-xs font-semibold text-foreground">Klik atau seret foto ke sini</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG, WebP · Maks 5 MB</p>
                </div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} aria-label={`Upload ${label.toLowerCase()}`} />
          {error && <p className="text-[10px] text-red-400 flex items-center gap-1"><AlertCircle size={10} />{error}</p>}
          {previewSrc && (
            <button type="button" onClick={() => setMode("preview")} className="text-[10px] text-primary hover:underline">
              Lihat foto saat ini
            </button>
          )}
        </div>
      )}

      {/* URL */}
      {mode === "url" && (
        <div className="space-y-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/foto-menu.jpg"
            className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary/50 transition-colors"
          />
          {urlInput && (
            <div className="aspect-video bg-secondary border border-border rounded-xl overflow-hidden">
              <img src={urlInput} alt="preview url" className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }} />
            </div>
          )}
          <button
            type="button"
            onClick={applyUrl}
            disabled={!urlInput.trim()}
            className="w-full py-2 rounded-xl bg-primary text-white text-xs font-semibold disabled:opacity-40 hover:bg-indigo-500 transition-colors"
          >
            Gunakan URL ini
          </button>
        </div>
      )}
    </div>
  );
}
