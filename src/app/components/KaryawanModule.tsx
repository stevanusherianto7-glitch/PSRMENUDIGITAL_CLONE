import React, { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabase";
import { createClient } from '@supabase/supabase-js';
import { Plus, Edit2, Trash2, Search, UserPlus, Mail, Lock, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

import { projectId, publicAnonKey } from '../../utils/supabase/info';

// Buat client sementara agar tidak mengganggu session manager yang sedang login
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || publicAnonKey;
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
          {filteredEmployees.map(emp => {
            const initials = emp.employee_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            
            // Warna role yang soft dan premium
            const roleColors: Record<string, string> = {
              waiter: "bg-blue-500/10 border-blue-500/20 text-blue-500",
              cook: "bg-orange-500/10 border-orange-500/20 text-orange-500",
              manager: "bg-purple-500/10 border-purple-500/20 text-purple-500",
              owner: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
            };
            
            const currentRoleColor = roleColors[emp.role.toLowerCase()] || "bg-secondary border-border text-muted-foreground";

            return (
              <div key={emp.id} className="bg-card border border-border/60 rounded-2xl p-4 flex flex-col justify-between space-y-4 relative overflow-hidden group hover:border-primary/20 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-4">
                  {/* Avatar Lingkaran */}
                  <div className="w-12 h-12 rounded-full bg-secondary/80 flex items-center justify-center text-sm font-black text-muted-foreground border border-border/40 shadow-inner flex-shrink-0">
                    {initials}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-sm text-foreground leading-tight truncate" title={emp.employee_name}>{emp.employee_name}</h4>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50 mt-0.5">{emp.id}</p>
                    
                    <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${currentRoleColor}`}>
                      {emp.role}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border/40 pt-3 flex items-center justify-between">
                  <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                    Aksi
                  </div>
                  {/* Di HP selalu muncul, di Desktop muncul saat hover */}
                  <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleOpenDialog(emp)} 
                      className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Edit"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => handleDelete(emp.id)} 
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      aria-label="Hapus"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
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
