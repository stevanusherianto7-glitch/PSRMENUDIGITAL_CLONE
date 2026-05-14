import { useState, useRef, useEffect } from "react";
import { GripVertical, CheckCircle2, Save, Image, Camera } from "lucide-react";
import { isUrl } from "./PhotoUploader";
import { rp } from "../data";
import type { MenuItem } from "../types";

interface LayoutEditorProps {
  items: MenuItem[];
  onReorder: (ordered: MenuItem[]) => void;
  onEditPhoto: (item: MenuItem) => void;
}

export function LayoutEditor({
  items,
  onReorder,
  onEditPhoto,
}: LayoutEditorProps) {
  const [list, setList] = useState<MenuItem[]>([...items]);
  const dragIdx = useRef<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  // sync if parent changes
  useEffect(() => { setList([...items]); }, [items]);

  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragEnter(i: number) { setDragOver(i); }

  function onDrop(i: number) {
    if (dragIdx.current === null || dragIdx.current === i) { setDragOver(null); return; }
    const reordered = [...list];
    const [moved] = reordered.splice(dragIdx.current, 1);
    reordered.splice(i, 0, moved);
    setList(reordered);
    dragIdx.current = null;
    setDragOver(null);
  }

  function handleSave() {
    onReorder(list);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-indigo-500/5 border border-indigo-500/15 rounded-lg px-3 py-2">
          <GripVertical size={12} className="text-indigo-400" />
          <span>Seret kartu untuk mengatur urutan tampilan di menu tamu</span>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            saved
              ? "bg-green-500/15 border border-green-500/25 text-green-400"
              : "bg-primary text-white hover:bg-indigo-500"
          }`}
        >
          {saved ? <CheckCircle2 size={12} /> : <Save size={12} />}
          {saved ? "Tersimpan!" : "Simpan Urutan"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((item, i) => {
          const previewSrc = item.image && isUrl(item.image) ? item.image : item.image || "";
          return (
            <div
              key={item.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragEnter={() => onDragEnter(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(i)}
              onDragEnd={() => setDragOver(null)}
              className={`relative bg-card border rounded-xl overflow-hidden cursor-grab active:cursor-grabbing transition-all select-none ${
                dragOver === i
                  ? "border-primary scale-[1.02] ring-2 ring-primary/30"
                  : "border-border hover:border-foreground/20"
              } ${!item.available ? "opacity-50" : ""}`}
            >
              {/* Drag handle */}
              <div className="absolute top-2 left-2 z-10 bg-black/50 rounded-lg p-1">
                <GripVertical size={12} className="text-white/70" />
              </div>

              {/* Order number */}
              <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{i + 1}</span>
              </div>

              {/* Photo */}
              <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                {previewSrc ? (
                  <img src={previewSrc} alt={item.name} className="w-full h-full object-cover pointer-events-none" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image size={24} className="text-muted-foreground opacity-30" />
                  </div>
                )}
                {/* Edit photo overlay */}
                <button
                  onClick={() => onEditPhoto(item)}
                  className="absolute inset-0 bg-black/0 hover:bg-black/50 transition-all flex items-center justify-center opacity-0 hover:opacity-100 group"
                >
                  <div className="flex flex-col items-center gap-1 text-white">
                    <Camera size={18} />
                    <span className="text-[10px] font-semibold">Ganti Foto</span>
                  </div>
                </button>
              </div>

              <div className="p-2.5">
                <p className="text-xs font-semibold text-foreground leading-tight line-clamp-1">{item.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-primary font-bold text-xs font-poppins">{rp(item.price)}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.available ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                  }`}>
                    {item.available ? "Aktif" : "Habis"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
