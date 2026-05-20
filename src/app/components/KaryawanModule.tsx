import React, { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabase";
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit2, Trash2, Search, UserPlus, Mail, Lock, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

// Buat client sementara agar tidak mengganggu session manager yang sedang login
const SUPABASE_URL = 'https://ugfpbkjuxrdgveyfbfks.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4fJEkMwBlAmMjBez-6KgXA_eAXRMdsJ';
const tempSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false }
});

interface Employee {
  id: string;
  employee_name: string;
  role: string;
}

export const KaryawanModule = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({ name: '', role: 'waiter', email: '', password: '' });
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('jadwal_shift')
      .select('id, employee_name, role')
      .order('created_at', { ascending: true });
      
    if (data) setEmployees(data);
    setLoading(false);
  };

  const handleOpenDialog = (emp: Employee | null) => {
    setCurrentEmp(emp);
    setFormData(emp 
      ? { name: emp.employee_name, role: emp.role, email: '', password: '' } 
      : { name: '', role: 'waiter', email: '', password: '' }
    );
    setError('');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setError('');
    
    try {
      if (currentEmp) {
        // Update di jadwal_shift (hanya update nama dan role)
        const { error: updateError } = await supabase
          .from('jadwal_shift')
          .update({ employee_name: formData.name, role: formData.role })
          .eq('id', currentEmp.id);
          
        if (updateError) throw updateError;
        fetchEmployees();
        setIsDialogOpen(false);
      } else {
        // 1. Daftarkan Akun Login di Supabase Auth
        if (!formData.email || !formData.password) {
          throw new Error("Email dan Password wajib diisi untuk karyawan baru.");
        }
        
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { 
              nama: formData.name,
              role: formData.role
            }
          }
        });
        
        if (authError) throw authError;
        
        // 2. Tambahkan ke jadwal_shift untuk jadwal
        const { error: insertError } = await supabase
          .from('jadwal_shift')
          .insert({ 
            employee_name: formData.name, 
            role: formData.role,
            schedule: ['O', 'O', 'O', 'O', 'O', 'O', 'O'] // Default schedule
          });
          
        if (insertError) throw insertError;
        
        fetchEmployees();
        setIsDialogOpen(false);
        alert(`Sukses! Karyawan ${formData.name} berhasil didaftarkan.`);
      }
    } catch (err: any) {
      console.error("Error saving employee:", err);
      setError(err.message || "Gagal menyimpan data.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus karyawan ini? (Catatan: Ini hanya menghapus dari jadwal, bukan dari akun login)")) {
      const { error } = await supabase
        .from('jadwal_shift')
        .delete()
        .eq('id', id);
        
      if (!error) fetchEmployees();
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    emp.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-2 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Daftar Karyawan</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Kelola data karyawan dan pendaftaran akun.</p>
        </div>
        <Button onClick={() => handleOpenDialog(null)} className="btn-heritage flex items-center gap-2">
          <UserPlus size={16} /> Daftarkan Karyawan
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-border shadow-sm">
        <Search size={16} className="text-muted-foreground ml-2" />
        <input
          type="text"
          placeholder="Cari nama atau peran..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm p-1"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-10">
          {filteredEmployees.map(emp => {
            const initials = emp.employee_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            
            // Gradient & warna per role (terinspirasi desain kartu cuaca Uiverse.io)
            const roleStyles: Record<string, { 
              gradient: string; badge: string; badgeText: string; accent: string; 
              iconBg: string; label: string; emoji: string;
            }> = {
              waiter: {
                gradient: "from-blue-50 via-white to-white",
                badge: "bg-blue-500/15 border-blue-400/30",
                badgeText: "text-blue-600",
                accent: "bg-blue-400",
                iconBg: "from-blue-400 to-cyan-400",
                label: "Pelayan",
                emoji: "🍽️",
              },
              cook: {
                gradient: "from-orange-50 via-amber-50/50 to-white",
                badge: "bg-orange-500/15 border-orange-400/30",
                badgeText: "text-orange-600",
                accent: "bg-orange-400",
                iconBg: "from-orange-400 to-red-400",
                label: "Dapur",
                emoji: "🔥",
              },
              manager: {
                gradient: "from-purple-50 via-violet-50/30 to-white",
                badge: "bg-purple-500/15 border-purple-400/30",
                badgeText: "text-purple-600",
                accent: "bg-purple-400",
                iconBg: "from-purple-400 to-pink-400",
                label: "Manager",
                emoji: "⭐",
              },
              owner: {
                gradient: "from-emerald-50 via-teal-50/30 to-white",
                badge: "bg-emerald-500/15 border-emerald-400/30",
                badgeText: "text-emerald-600",
                accent: "bg-emerald-400",
                iconBg: "from-emerald-400 to-cyan-400",
                label: "Owner",
                emoji: "👑",
              },
              "assisten kepala resto": {
                gradient: "from-amber-50 via-yellow-50/30 to-white",
                badge: "bg-amber-500/15 border-amber-400/30",
                badgeText: "text-amber-700",
                accent: "bg-amber-400",
                iconBg: "from-amber-400 to-orange-400",
                label: "Asisten Kepala",
                emoji: "🏅",
              },
            };
            
            const style = roleStyles[emp.role.toLowerCase()] || roleStyles.waiter;

            return (
              <div 
                key={emp.id} 
                className={`relative overflow-hidden rounded-[23px] bg-gradient-to-br ${style.gradient} p-6 cursor-pointer group`}
                style={{
                  boxShadow: '0px 100px 40px rgba(0,0,0,0.01), 0px 50px 35px rgba(0,0,0,0.04), 0px 22px 22px rgba(0,0,0,0.07), 0px 6px 12px rgba(0,0,0,0.08), 0px 0px 0px rgba(0,0,0,0.08)',
                  transition: 'all 0.8s cubic-bezier(0.15, 0.83, 0.66, 1)',
                  minHeight: '200px',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {/* ═══ Header — Nama & ID ═══ */}
                <div className="relative z-10 flex flex-col gap-1.5 pr-4">
                  <span className="font-extrabold text-[15px] leading-tight text-slate-700 truncate" title={emp.employee_name}>
                    {emp.employee_name}
                  </span>
                </div>

                {/* ═══ Role Badge (seperti temp-scale di kartu cuaca) ═══ */}
                <div className="absolute left-6 bottom-14">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${style.badge} ${style.badgeText}`}>
                    {style.emoji} {emp.role}
                  </span>
                </div>

                {/* ═══ Role Label Besar (seperti suhu di kartu cuaca) ═══ */}
                <div className="absolute left-6 bottom-[52px]">
                </div>

                {/* ═══ Aksi (kanan bawah) ═══ */}
                <div className="absolute right-5 bottom-5 flex items-center gap-1 z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenDialog(emp); }} 
                    className="p-2 rounded-xl bg-white/60 hover:bg-white border border-slate-200/60 text-slate-400 hover:text-blue-500 transition-all hover:shadow-md"
                    aria-label="Edit karyawan"
                    title="Edit"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(emp.id); }} 
                    className="p-2 rounded-xl bg-white/60 hover:bg-red-50 border border-slate-200/60 text-slate-400 hover:text-red-500 transition-all hover:shadow-md"
                    aria-label="Hapus karyawan"
                    title="Hapus"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* ═══ Label "AKSI" kiri bawah ═══ */}
                <div className="absolute left-6 bottom-5">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Aksi →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog for Add/Edit */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/ backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-foreground mb-4">{currentEmp ? "Edit Karyawan" : "Daftarkan Karyawan Baru"}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nama Lengkap</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nama Karyawan"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Peran (Role)</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  title="Pilih Peran"
                  className="w-full mt-1 bg-input-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all"
                >
                  <option value="waiter">Pelayan (Waiter)</option>
                  <option value="cook">Dapur (Cook)</option>
                  <option value="manager">Manager</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              {!currentEmp && (
                <>
                  <div className="gold-rule-short my-2 opacity-30" />
                  <p className="text-[10px] text-amber-600 font-semibold uppercase">Akun Login (Hanya untuk Karyawan Baru)</p>
                  
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Mail size={12} /> Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@perusahaan.com"
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                      <Lock size={12} /> Password
                    </label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min. 6 karakter"
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </div>

            {error && (
              <div className="bg-destructive/8 border border-destructive/25 rounded-lg px-3 py-2 mt-4 text-xs text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setIsDialogOpen(false)} variant="secondary" disabled={saveLoading}>Batal</Button>
              <Button onClick={handleSave} className="btn-heritage" disabled={saveLoading}>
                {saveLoading ? <span className="w-4 h-4 border-2 border-foreground/30 border-t-white rounded-full animate-spin" /> : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
