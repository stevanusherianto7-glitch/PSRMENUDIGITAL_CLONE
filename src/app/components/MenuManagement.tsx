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
import type { MenuItem } from "../types";

// ─── Tipe props ────────────────────────────────────────────────────────────────
interface MenuManagementProps {
  menuItems: MenuItem[];
  connected: boolean;
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

const CATEGORY_OPTIONS = ["Makanan Utama", "Snack", "Minuman"];
const TAG_CHIPS = ["Best Seller", "Favorit", "Baru", "Promo", "Limited", "Spesial"];





// ─── Edit / Add Modal ──────────────────────────────────────────────────────────
function MenuItemModal({
  item,
  isNew,
  onClose,
  onSave,
  onDelete,
}: {
  item: MenuItem;
  isNew: boolean;
  onClose: () => void;
  onSave: (item: MenuItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState<MenuItem>({ ...item });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof MenuItem, string>>>({});

  function setField<K extends keyof MenuItem>(key: K, val: MenuItem[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof MenuItem, string>> = {};
    if (!form.name.trim()) e.name = "Nama menu wajib diisi";
    if (form.price <= 0) e.price = "Harga harus lebih dari 0";
    if (!form.category) e.category = "Pilih kategori";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await onDelete(item.id);
    setDeleting(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-bold text-base text-foreground font-poppins">
              {isNew ? "✨ Tambah Menu Baru" : "✏️ Edit Menu"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isNew ? "Isi detail item menu baru" : `Mengedit: ${item.name}`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Photo */}
          <PhotoUploader
            value={form.image}
            onChange={(url) => setField("image", url)}
          />

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Nama Menu <span className="text-red-400">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Contoh: Nasi Ayam Penyet Semarang"
              className={`w-full bg-secondary border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                errors.name ? "border-red-500/50" : "border-border focus:border-primary/50"
              }`}
            />
            {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
          </div>

          {/* Category + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="menu-category" className="text-xs font-semibold text-foreground mb-1.5 block">
                Kategori <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  id="menu-category"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors appearance-none"
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Harga (Rp) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={form.price || ""}
                onChange={(e) => setField("price", Number(e.target.value))}
                placeholder="25000"
                min={0}
                className={`w-full bg-secondary border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-colors ${
                  errors.price ? "border-red-500/50" : "border-border focus:border-primary/50"
                }`}
              />
              {errors.price && <p className="text-[10px] text-red-400 mt-1">{errors.price}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Deskripsi <span className="text-muted-foreground font-normal">(opsional)</span>
            </label>
            <textarea
              value={form.description || ""}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Jelaskan bahan, rasa, atau keunggulan menu ini..."
              rows={3}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
            />
          </div>

          {/* Tag */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Tag size={11} className="text-amber-400" /> Label / Tag
              <span className="text-muted-foreground font-normal">(opsional)</span>
            </label>
            <input
              value={form.tag || ""}
              onChange={(e) => setField("tag", e.target.value)}
              placeholder="Contoh: Best Seller"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 transition-colors mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {TAG_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setField("tag", form.tag === chip ? "" : chip)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
                    form.tag === chip
                      ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Available toggle */}
          <div className="flex items-center justify-between bg-secondary border border-border rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Status Ketersediaan</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {form.available ? "Menu tersedia & tampil di buku menu tamu" : "Menu tidak tersedia, tersembunyi dari tamu"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setField("available", !form.available)}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                form.available ? "bg-green-500" : "bg-secondary border border-border"
              }`}
              aria-label="Status Ketersediaan"
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                  form.available ? "left-6" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-3 flex-shrink-0">
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                confirmDelete
                  ? "bg-red-500 border-red-500 text-white hover:bg-red-600"
                  : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
              }`}
            >
              {deleting ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
              {confirmDelete ? "Konfirmasi Hapus?" : "Hapus"}
            </button>
          )}
          {confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Batal
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-indigo-500 disabled:opacity-50 transition-all"
          >
            {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
            {isNew ? "Simpan Menu Baru" : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Layout Editor (Drag & Drop) ───────────────────────────────────────────────
function LayoutEditor({
  items,
  onReorder,
  onEditPhoto,
}: {
  items: MenuItem[];
  onReorder: (ordered: MenuItem[]) => void;
  onEditPhoto: (item: MenuItem) => void;
}) {
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

// ─── Main MenuManagement ───────────────────────────────────────────────────────
export function MenuManagement({
  menuItems,
  connected,
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-foreground">Katalog Menu Kedai Elvera 57</h3>
          <p className="text-muted-foreground text-xs mt-0.5">
            {menuItems.length} item · {availableCount} aktif · {unavailableCount} tidak tersedia
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex items-center gap-1 bg-secondary border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                viewMode === "grid" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid size={12} /> Daftar
            </button>
            <button
              onClick={() => setViewMode("layout")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                viewMode === "layout" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpDown size={12} /> Atur Urutan
            </button>
          </div>

          {viewMode === "grid" && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-500 transition-colors"
            >
              <Plus size={14} /> Tambah Menu
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Menu", val: menuItems.length, color: "text-foreground", icon: Package },
          { label: "Tersedia", val: availableCount, color: "text-green-400", icon: CheckCircle2 },
          { label: "Tidak Aktif", val: unavailableCount, color: "text-red-400", icon: EyeOff },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
              <Icon size={16} className={s.color} />
              <div>
                <p className={`text-xl font-bold ${s.color} font-poppins`}>{s.val}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
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
