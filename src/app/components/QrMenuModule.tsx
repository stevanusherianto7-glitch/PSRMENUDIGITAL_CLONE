import { useState, useEffect, useCallback } from "react";
import { PhotoUploader } from "./PhotoUploader";
import { 
  Printer, Download, ExternalLink, QrCode, 
  Edit2, Trash2, Plus, Sparkles, Calendar, 
  Camera, Image as ImageIcon, Tag, X, Save,
  AlertCircle
} from "lucide-react";
import QRCode from "react-qr-code";
import { GUEST_BASE_URL } from "../pages/AdminPage";
import { supabase } from "../../lib/supabase";
import type { TableData } from "../types";

interface QrMenuModuleProps {
  tables: TableData[];
}

interface EventPhoto {
  id: string;
  title: string;
  date: string;
  category: string;
  image: string;
  description: string;
}

const DEFAULT_EVENT_PHOTOS: EventPhoto[] = [
  {
    id: "event-1",
    title: "Jamuan Pernikahan Premium",
    date: "12 Mei 2026",
    category: "Wedding",
    image: "/imports/event_wedding.png",
    description: "Merayakan hari bahagia bersama keluarga tercinta dengan konsep prasmanan premium dan dekorasi adat Jawa modern yang anggun."
  },
  {
    id: "event-2",
    title: "Gathering & Rapat Korporat",
    date: "28 April 2026",
    category: "Corporate",
    image: "/imports/event_gathering.png",
    description: "Jamuan makan siang prasmanan premium dan kopi rehat berkualitas untuk kegiatan rapat kerja instansi dan forum korporat."
  },
  {
    id: "event-3",
    title: "Ulang Tahun & Kumpul Keluarga",
    date: "05 April 2026",
    category: "Birthday",
    image: "/imports/event_birthday.png",
    description: "Momen hangat kumpul keluarga besar merayakan ulang tahun dengan hidangan lezat racikan khusus koki andalan kami."
  },
  {
    id: "event-4",
    title: "Weekend Live Music Session",
    date: "Maret - Mei 2026",
    category: "Music Event",
    image: "/imports/event_livemusic.png",
    description: "Keseruan akhir pekan di area taman outdoor menikmati alunan live acoustic music ditemani hidangan santai bersama sahabat."
  }
];

export function QrMenuModule({ tables }: QrMenuModuleProps) {
  const baseUrl = GUEST_BASE_URL;
  const [activeTab, setActiveTab] = useState<"qr" | "gallery">("qr");
  
  // --- QR Code Module State ---
  const [selectedTable, setSelectedTable] = useState<string>("all");

  // --- Event Gallery CRUD Module State ---
  const [eventPhotos, setEventPhotos] = useState<EventPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<EventPhoto | null>(null);
  
  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formCategory, setFormCategory] = useState("Wedding");
  const [formImage, setFormImage] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState("");

  // --- Load Event Photos ---
  const loadEventPhotos = useCallback(async () => {
    setLoadingPhotos(true);
    try {
      const { data, error } = await supabase
        .from("event_gallery")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setEventPhotos(data);
        localStorage.setItem("local_event_gallery", JSON.stringify(data));
      } else {
        // Table is empty, seed it with defaults
        setEventPhotos(DEFAULT_EVENT_PHOTOS);
      }
    } catch (err) {
      console.warn("Using local cache or presets for event gallery:", err);
      const saved = localStorage.getItem("local_event_gallery");
      if (saved) {
        setEventPhotos(JSON.parse(saved));
      } else {
        setEventPhotos(DEFAULT_EVENT_PHOTOS);
      }
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "gallery") {
      loadEventPhotos();

      // Realtime subscription
      const channel = supabase.channel("event_gallery_realtime_admin")
        .on("postgres_changes", { event: "*", schema: "public", table: "event_gallery" }, () => {
          loadEventPhotos();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeTab, loadEventPhotos]);

  // --- Reset Form ---
  const resetForm = () => {
    setFormTitle("");
    setFormDate("");
    setFormCategory("Wedding");
    setFormImage("");
    setFormDescription("");
    setEditingPhoto(null);
    setErrorMsg("");
  };

  // --- Open Add Modal ---
  const handleOpenAdd = () => {
    resetForm();
    setShowFormModal(true);
  };

  // --- Open Edit Modal ---
  const handleOpenEdit = (photo: EventPhoto) => {
    setEditingPhoto(photo);
    setFormTitle(photo.title);
    setFormDate(photo.date);
    setFormCategory(photo.category);
    setFormImage(photo.image);
    setFormDescription(photo.description);
    setErrorMsg("");
    setShowFormModal(true);
  };

  // --- Save / Update Photo ---
  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDate || !formCategory || !formImage || !formDescription) {
      setErrorMsg("Semua bidang harus diisi!");
      return;
    }
    setErrorMsg("");
    setIsSaving(true);

    const payload = {
      title: formTitle,
      date: formDate,
      category: formCategory,
      image: formImage,
      description: formDescription,
    };

    try {
      if (editingPhoto) {
        // Edit existing
        const { error } = await supabase
          .from("event_gallery")
          .update(payload)
          .eq("id", editingPhoto.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("event_gallery")
          .insert([payload]);

        if (error) throw error;
      }
      
      await loadEventPhotos();
      setShowFormModal(false);
      resetForm();
    } catch (err: any) {
      console.warn("Failed to write to Supabase, saving locally:", err);
      // Fallback: save to local state and LocalStorage
      let updatedList: EventPhoto[] = [];
      if (editingPhoto) {
        updatedList = eventPhotos.map(p => 
          p.id === editingPhoto.id ? { ...p, ...payload } : p
        );
      } else {
        const newPhoto: EventPhoto = {
          id: "local-" + Date.now(),
          ...payload
        };
        updatedList = [newPhoto, ...eventPhotos];
      }
      setEventPhotos(updatedList);
      localStorage.setItem("local_event_gallery", JSON.stringify(updatedList));
      setShowFormModal(false);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  // --- Save Title Inline ---
  const handleInlineSaveTitle = async (photo: EventPhoto) => {
    if (!tempTitle.trim()) return;
    
    const payload = {
      title: tempTitle,
      date: photo.date,
      category: photo.category,
      image: photo.image,
      description: photo.description
    };

    try {
      const { error } = await supabase
        .from("event_gallery")
        .update({ title: tempTitle })
        .eq("id", photo.id);

      if (error) throw error;
      await loadEventPhotos();
      setEditingTitleId(null);
    } catch (err) {
      console.warn("Failed to update title in Supabase, updating locally:", err);
      const updatedList = eventPhotos.map(p => 
        p.id === photo.id ? { ...p, title: tempTitle } : p
      );
      setEventPhotos(updatedList);
      localStorage.setItem("local_event_gallery", JSON.stringify(updatedList));
      setEditingTitleId(null);
    }
  };

  // --- Delete Photo ---
  const handleDeletePhoto = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus foto acara ini?")) return;
    
    try {
      const { error } = await supabase
        .from("event_gallery")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await loadEventPhotos();
    } catch (err) {
      console.warn("Failed to delete from Supabase, removing locally:", err);
      const updatedList = eventPhotos.filter(p => p.id !== id);
      setEventPhotos(updatedList);
      localStorage.setItem("local_event_gallery", JSON.stringify(updatedList));
    }
  };

  // --- QR Code Actions ---
  function handleDownload(tableId: string) {
    const svg = document.querySelector(`#qr-code-${tableId} svg`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 120;
      canvas.height = 120;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_Meja_${tableId}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  }

  function handlePrint() {
    const tablesToPrint = selectedTable === "all" ? tables : tables.filter(t => t.id === selectedTable);
    
    const printContent = tablesToPrint.map(t => `
      <div style="page-break-inside:avoid; display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px dashed #C8A96E; border-radius:20px; padding:32px 28px; margin:16px; width:380px; background:#fff;">
        <p style="font-family:Poppins,sans-serif; font-size:20px; font-weight:800; margin:0 0 4px; color:#1F2937; letter-spacing:0.5px;">Buku Menu Digital</p>
        <p style="font-family:Poppins,sans-serif; font-size:12px; font-weight:600; color:#C8A96E; margin:0 0 24px; text-transform:uppercase; letter-spacing:2px;">Kedai Elvera 57</p>
        <div style="background:#fff; padding:16px; border:1px solid #E5E7EB; border-radius:16px; box-shadow:0 4px 12px -2px rgba(0,0,0,0.08);">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(`${baseUrl}/#/menu/${t.id}`)}" width="220" height="220" />
        </div>
        <img src="https://ugfpbkjuxrdgveyfbfks.supabase.co/storage/v1/object/public/logo/ID_halal.png" style="height:56px; margin:20px 0 4px; object-fit:contain;" crossorigin="anonymous" />
        <p style="font-family:Poppins,sans-serif; font-size:11px; font-weight:600; color:#9CA3AF; margin:0; text-transform:uppercase; letter-spacing:3px;">Nomor Meja</p>
        <p style="font-family:Poppins,sans-serif; font-size:36px; font-weight:900; margin:4px 0 0; color:#1F2937; letter-spacing:1px;">MEJA ${t.id}</p>
        <p style="font-family:Poppins,sans-serif; font-size:10px; color:#9CA3AF; margin-top:12px;">Scan QR untuk pesan menu favorit Anda</p>
      </div>
    `).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>QR Menu - KEDAI ELVERA 57</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');
        body { margin:0; display:flex; flex-wrap:wrap; justify-content:center; font-family:Poppins,sans-serif; background:#f3f4f6; }
        @media print { 
          @page { margin: 0; }
          body { margin: 0; background:#fff; }
        }
      </style></head><body>${printContent}
      <script>
        window.onload = () => {
          setTimeout(() => { window.print(); window.close(); }, 500);
        };
      </script></body></html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="space-y-6">
      {/* Premium Tab Switcer */}
      <div className="flex border-b border-border bg-card/30 backdrop-blur-md rounded-xl p-1 gap-1 border">
        <button
          onClick={() => setActiveTab("qr")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "qr"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <QrCode size={14} /> Generator QR Meja
        </button>
        <button
          onClick={() => setActiveTab("gallery")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            activeTab === "gallery"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
          }`}
        >
          <Camera size={14} /> Kelola Galeri Acara
        </button>
      </div>

      {/* --- Tab 1: QR Code Generator --- */}
      {activeTab === "qr" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm">Buku Menu Digital</h3>
              <p className="text-muted-foreground text-xs mt-0.5 font-medium">QR Code untuk setiap meja — tamu scan langsung lihat menu &amp; pesan mandiri</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                title="Pilih meja"
                aria-label="Pilih meja"
                value={selectedTable}
                onChange={(e) => setSelectedTable(e.target.value)}
                className="bg-card border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary transition-colors text-foreground"
              >
                <option value="all">Semua Meja</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>Meja {t.id}</option>
                ))}
              </select>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-colors whitespace-nowrap"
              >
                <Printer size={14} /> {selectedTable === "all" ? "Cetak Semua" : `Cetak Meja ${selectedTable}`}
              </button>
            </div>
          </div>

          <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4 flex items-start gap-3">
            <QrCode size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Cara kerja:</strong> Cetak QR stiker untuk setiap meja, tempel di meja. Tamu scan QR → buka menu digital → pilih item → pesan langsung ke dapur.</p>
              <p>URL dasar: <code className="bg-secondary border border-border px-1.5 py-0.5 rounded font-mono text-[10px]">{baseUrl}/#/menu/{"{meja}"}</code></p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {tables.map(t => {
              const url = `${baseUrl}/#/menu/${t.id}`;
              return (
                <div key={t.id} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col items-center p-5 gap-3 group hover:border-primary/30 transition-colors shadow-sm">
                  <p className="font-bold text-sm font-['Poppins']">Meja {t.id}</p>
                  <div id={`qr-code-${t.id}`} className="bg-white p-2 rounded-lg">
                    <QRCode value={url} size={120} />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono break-all text-center leading-tight">{url}</p>
                  <div className="flex gap-2 w-full mt-auto">
                    <button
                      onClick={() => handleDownload(t.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-secondary border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Download size={10} /> Unduh
                    </button>
                    <button
                      onClick={() => window.open(url, "_blank")}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
                    >
                      <ExternalLink size={10} /> Buka
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- Tab 2: Kelola Galeri Acara --- */}
      {activeTab === "gallery" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-sm">Manajemen Galeri Acara Restoran</h3>
              <p className="text-muted-foreground text-xs mt-0.5 font-medium">Kelola foto-foto dokumentasi momen berharga untuk ditampilkan di Buku Menu Tamu</p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center gap-2 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-500 hover:shadow-lg hover:shadow-primary/20 transition-all self-start sm:self-auto"
            >
              <Plus size={14} /> Tambah Foto Acara
            </button>
          </div>

          {loadingPhotos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden animate-pulse aspect-[4/3]" />
              ))}
            </div>
          ) : eventPhotos.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-3">
              <Camera size={40} className="mx-auto text-muted-foreground opacity-30 animate-bounce" />
              <p className="text-sm font-bold">Belum ada foto acara</p>
              <p className="text-xs text-muted-foreground">Silakan tambahkan foto dokumentasi acara pertama Anda dengan tombol di atas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {eventPhotos.map(photo => (
                <div key={photo.id} className="bg-card border border-border/80 rounded-2xl overflow-hidden group hover:border-primary/45 hover:shadow-lg transition-all duration-300 flex flex-col">
                  <div className="aspect-[16/9] relative overflow-hidden bg-secondary">
                    <img 
                      src={photo.image} 
                      alt={photo.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&auto=format&fit=crop&q=60";
                      }}
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md text-[8px] font-black uppercase tracking-widest text-white px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5">
                      <Tag size={10} className="text-primary" />
                      {photo.category}
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2 w-full">
                      {editingTitleId === photo.id ? (
                        <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            className="bg-secondary border border-primary text-foreground rounded px-1.5 py-0.5 text-[11px] font-semibold flex-1 focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleInlineSaveTitle(photo);
                              if (e.key === "Escape") setEditingTitleId(null);
                            }}
                          />
                          <button
                            onClick={() => handleInlineSaveTitle(photo)}
                            className="text-emerald-500 hover:text-emerald-400 p-0.5"
                            title="Simpan"
                          >
                            <Save size={12} />
                          </button>
                          <button
                            onClick={() => setEditingTitleId(null)}
                            className="text-red-500 hover:text-red-400 p-0.5"
                            title="Batal"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-1 group/title">
                          <h4 
                            onClick={() => {
                              setEditingTitleId(photo.id);
                              setTempTitle(photo.title);
                            }}
                            className="font-bold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1 font-poppins cursor-pointer hover:underline"
                            title="Klik untuk ubah cepat"
                          >
                            {photo.title}
                          </h4>
                          <button
                            onClick={() => {
                              setEditingTitleId(photo.id);
                              setTempTitle(photo.title);
                            }}
                            className="text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity hover:text-primary"
                            title="Edit Judul"
                          >
                            <Edit2 size={9} />
                          </button>
                        </div>
                      )}
                      <span className="text-[9px] text-muted-foreground font-black whitespace-nowrap uppercase tracking-wider">{photo.date}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed flex-1">{photo.description}</p>
                    
                    <div className="flex items-center gap-2 pt-3 border-t border-border mt-auto">
                      <button
                        onClick={() => handleOpenEdit(photo)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                      >
                        <Edit2 size={10} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-bold rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 size={10} /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- FORM MODAL (ADD & EDIT) --- */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/55 dark:bg-black/75 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#141418] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-wider text-white font-poppins flex items-center gap-2">
                <Sparkles size={16} className="text-primary animate-pulse" />
                {editingPhoto ? "Edit Foto Acara" : "Tambah Foto Acara"}
              </h3>
              <button 
                onClick={() => setShowFormModal(false)}
                className="text-white/40 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-colors"
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSavePhoto} className="p-5 space-y-4 overflow-y-auto max-h-[75vh] custom-scrollbar">
              {errorMsg && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/25 p-3 rounded-lg">
                  <AlertCircle size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Judul Acara</label>
                <input 
                  type="text"
                  placeholder="Contoh: Jamuan Pernikahan Premium"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-[#1e1e24] border border-white/10 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary transition-all font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal</label>
                  <input 
                    type="text"
                    placeholder="Contoh: 12 Mei 2026"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-[#1e1e24] border border-white/10 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary transition-all font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kategori</label>
                  <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-[#1e1e24] border border-white/10 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary transition-all font-semibold"
                    required
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Music Event">Music Event</option>
                    <option value="Kumpul Keluarga">Kumpul Keluarga</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <PhotoUploader 
                  value={formImage} 
                  onChange={setFormImage} 
                  bucket="menu-photos" 
                  folder="events" 
                  label="Gambar Acara" 
                />
                
                {/* Preset Defaults Quick Select */}
                <div className="pt-1.5 space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Pilih Cepat dari Gambar Default:</span>
                  <div className="grid grid-cols-4 gap-2">
                    {DEFAULT_EVENT_PHOTOS.map((def, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormImage(def.image);
                          setFormCategory(def.category);
                        }}
                        className={`border rounded-lg overflow-hidden aspect-[16/9] transition-all relative ${
                          formImage === def.image ? "border-primary ring-2 ring-primary/20 scale-95" : "border-white/5 opacity-60 hover:opacity-100"
                        }`}
                        title={def.title}
                      >
                        <img src={def.image} alt={def.title} className="w-full h-full object-cover" />
                        <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-[8px] font-bold text-white uppercase tracking-wider text-center p-1 leading-tight">{def.category}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Deskripsi Acara</label>
                <textarea 
                  rows={3}
                  placeholder="Tuliskan deskripsi singkat mengenai jalannya acara..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[#1e1e24] border border-white/10 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary transition-all font-medium leading-relaxed resize-none"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl border border-white/10 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wider hover:bg-indigo-500 hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>Sedang Menyimpan...</>
                  ) : (
                    <>
                      <Save size={14} />
                      Simpan Acara
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
