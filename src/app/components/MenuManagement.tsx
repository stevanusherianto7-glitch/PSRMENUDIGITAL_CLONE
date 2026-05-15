import { useState, useRef, useCallback, useEffect } from "react";
import {
  Plus, Search, X, Upload, Image, Save, Trash2, RefreshCw,
  GripVertical, Eye, EyeOff, Tag, ChevronDown, LayoutGrid,
  LayoutList, CheckCircle2, AlertCircle, Edit3, Camera, Link2,
  ArrowUpDown, Star, Package
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { rp, menuCategories, SEED_MENU } from "../data";
import { PhotoUploader, genId, isUrl } from "./PhotoUploader";
import { MenuItemModal } from "./MenuItemModal";
import { LayoutEditor } from "./LayoutEditor";
import type { MenuItem } from "../types";

// ─── Tipe props ────────────────────────────────────────────────────────────────
interface MenuManagementProps {
  menuItems: MenuItem[];
  connected: boolean;
  loading?: boolean;
  onSaveItem: (item: MenuItem, isNew: boolean) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onToggleAvailability: (id: string, available: boolean) => Promise<void>;
  onReorder: (ordered: MenuItem[]) => void;
}

// ─── Form default ──────────────────────────────────────────────────────────────
const EMPTY_FORM: Omit<MenuItem, "id"> = {
  name: "",
  category: "Makanan Utama",
  price: 0,
  image: "",
  available: true,
  tag: "",
  description: "",
};









// ─── Main MenuManagement ───────────────────────────────────────────────────────
export function MenuManagement({
  menuItems,
  connected,
  loading = false,
  onSaveItem,
  onDeleteItem,
  onToggleAvailability,
  onReorder,
}: MenuManagementProps) {
  const [viewMode, setViewMode] = useState<"grid" | "layout">("grid");
  const [activeCat, setActiveCat] = useState("Semua");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ item: MenuItem; isNew: boolean } | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const filtered = menuItems
    .filter((m) => activeCat === "Semua" || m.category === activeCat)
    .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()));

  function openAdd() {
    setModal({
      item: { id: genId(), ...EMPTY_FORM },
      isNew: true,
    });
  }

  function openEdit(item: MenuItem) {
    setModal({ item, isNew: false });
  }

  async function handleToggle(item: MenuItem) {
    setToggling(item.id);
    await onToggleAvailability(item.id, !item.available);
    setToggling(null);
  }

  // ensure storage bucket for photos
  useEffect(() => {
    if (!connected) return;
    async function ensureBucket() {
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some((b) => b.name === "menu-photos");
        if (!exists) {
          await supabase.storage.createBucket("menu-photos", { public: true });
        }
      } catch (e) {
        console.log("Storage bucket check:", e);
      }
    }
    ensureBucket();
  }, [connected]);

  const availableCount = menuItems.filter((m) => m.available).length;
  const unavailableCount = menuItems.filter((m) => !m.available).length;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          {/* View switcher */}
          <div className="flex items-center gap-1.5 bg-secondary/50 border border-border/60 rounded-xl p-1.5 shadow-inner">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                viewMode === "grid" ? "bg-card text-primary shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid size={14} /> Daftar
            </button>
            <button
              onClick={() => setViewMode("layout")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                viewMode === "layout" ? "bg-card text-primary shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpDown size={14} /> Atur Urutan
            </button>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === "grid" ? (
              <button
                onClick={openAdd}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                <Plus size={16} /> Tambah Menu
              </button>
            ) : (
              <div id="layout-editor-save-portal" />
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Menu", val: menuItems.length, color: "text-foreground", icon: Package },
          { label: "Tersedia", val: availableCount, color: "text-green-500", icon: CheckCircle2 },
          { label: "Tidak Aktif", val: unavailableCount, color: "text-red-500", icon: EyeOff },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card border border-border/60 rounded-xl p-3 flex flex-col gap-1.5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <Icon size={14} className={s.color} />
                <p className={`text-lg font-black ${s.color} font-poppins leading-none`}>{s.val}</p>
              </div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Grid View */}
      {viewMode === "grid" && (
        <>
          {/* Filter bar */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 flex-wrap">
              {menuCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    activeCat === c
                      ? "bg-primary border-primary text-white"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari menu..."
                className="bg-card border border-border rounded-lg pl-8 pr-4 py-2 text-xs focus:outline-none focus:border-primary/50 transition-colors w-44"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Hapus pencarian">
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl overflow-hidden animate-pulse">
                  <div className="relative aspect-[4/3] bg-secondary"></div>
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-secondary rounded w-3/4"></div>
                    <div className="h-3 bg-secondary rounded w-1/2"></div>
                    <div className="h-5 bg-secondary rounded w-1/4 mt-2"></div>
                  </div>
                </div>
              ))
            ) : (
              <>
                {/* Add New Card */}
                <button
                  onClick={openAdd}
                  className="bg-card border-2 border-dashed border-border rounded-xl overflow-hidden transition-all hover:border-primary/40 hover:bg-primary/5 group flex flex-col items-center justify-center gap-3 min-h-[220px]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Plus size={22} className="text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-foreground">Tambah Menu Baru</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Klik untuk menambah item</p>
                  </div>
                </button>

                {filtered.map((item) => {
                  const previewSrc = item.image && isUrl(item.image) ? item.image : item.image || "";
                  return (
                    <div
                      key={item.id}
                      className={`bg-card border rounded-xl overflow-hidden transition-all hover:border-foreground/15 group ${
                        !item.available ? "opacity-70 border-border" : "border-border"
                      }`}
                    >
                      {/* Photo */}
                      <div className="relative aspect-[4/3] bg-secondary overflow-hidden">
                        {previewSrc ? (
                          <img src={previewSrc} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Image size={28} className="text-muted-foreground opacity-20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
                        {item.tag && (
                          <span className="absolute top-2 left-2 bg-primary text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                            {item.tag}
                          </span>
                        )}
                        <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${item.available ? "bg-green-400" : "bg-red-400"}`} />

                        {/* Quick edit overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={() => openEdit(item)}
                            className="flex items-center gap-1.5 bg-foreground/90 text-background text-[11px] font-bold px-3 py-1.5 rounded-full hover:bg-white transition-colors"
                          >
                            <Edit3 size={11} /> Edit
                          </button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3 space-y-2">
                        <p className="font-semibold text-xs text-foreground leading-tight line-clamp-2">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.category}</p>
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-sm text-primary font-poppins">{rp(item.price)}</p>
                          <button
                            onClick={() => handleToggle(item)}
                            disabled={toggling === item.id}
                            className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${
                              item.available
                                ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
                                : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-green-500/10 hover:border-green-500/20 hover:text-green-400"
                            }`}
                          >
                            {toggling === item.id ? (
                              <RefreshCw size={10} className="animate-spin" />
                            ) : item.available ? (
                              "Tersedia"
                            ) : (
                              "Habis"
                            )}
                          </button>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-1.5 pt-1 border-t border-border">
                          <button
                            onClick={() => openEdit(item)}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-semibold bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                          >
                            <Edit3 size={10} /> Edit Detail
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-amber-400/30 transition-colors"
                            aria-label="Edit foto"
                          >
                            <Camera size={10} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {filtered.length === 0 && search && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 bg-card border border-border rounded-xl">
              <Search size={32} className="opacity-20" />
              <p className="text-sm">Tidak ada menu dengan kata "<span className="font-semibold">{search}</span>"</p>
              <button onClick={() => setSearch("")} className="text-xs text-primary font-semibold">Hapus pencarian</button>
            </div>
          )}
        </>
      )}

      {/* Layout View */}
      {viewMode === "layout" && (
        <LayoutEditor
          items={menuItems}
          onReorder={onReorder}
          onEditPhoto={openEdit}
        />
      )}

      {/* Modal */}
      {modal && (
        <MenuItemModal
          item={modal.item}
          isNew={modal.isNew}
          onClose={() => setModal(null)}
          onSave={(item) => onSaveItem(item, modal.isNew)}
          onDelete={onDeleteItem}
        />
      )}
    </div>
  );
}
