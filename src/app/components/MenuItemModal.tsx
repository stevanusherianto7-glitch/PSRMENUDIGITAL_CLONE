import { useState } from "react";
import { X, ChevronDown, Tag, RefreshCw, Trash2, Save } from "lucide-react";
import { PhotoUploader } from "./PhotoUploader";
import type { MenuItem } from "../types";

interface MenuItemModalProps {
  item: MenuItem;
  isNew: boolean;
  onClose: () => void;
  onSave: (item: MenuItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CATEGORY_OPTIONS = ["Makanan Utama", "Snack", "Minuman"];
const TAG_CHIPS = ["Best Seller", "Favorit", "Baru", "Promo", "Limited", "Spesial"];

export function MenuItemModal({
  item,
  isNew,
  onClose,
  onSave,
  onDelete,
}: MenuItemModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/ backdrop-blur-sm p-4"
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
