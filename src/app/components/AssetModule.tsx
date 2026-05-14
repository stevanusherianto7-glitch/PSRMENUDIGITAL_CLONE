import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Search, Briefcase, Tag, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface Asset {
  id: string;
  name: string;
  category: string;
  quantity: number;
  condition: string;
}

const CATEGORIES = ['Semua', 'Elektronik', 'Furnitur', 'Peralatan Dapur', 'Lainnya'];
const CONDITIONS = ['Bagus', 'Rusak', 'Butuh Servis'];

export const AssetModule = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({ name: '', category: 'Elektronik', quantity: 1, condition: 'Bagus' });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (data) setAssets(data);
    setLoading(false);
  };

  const handleOpenDialog = (asset: Asset | null) => {
    setCurrentAsset(asset);
    setFormData(asset ? { name: asset.name, category: asset.category, quantity: asset.quantity, condition: asset.condition } : { name: '', category: 'Elektronik', quantity: 1, condition: 'Bagus' });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (currentAsset) {
      // Update
      const { error } = await supabase
        .from('assets')
        .update({ name: formData.name, category: formData.category, quantity: formData.quantity, condition: formData.condition })
        .eq('id', currentAsset.id);
        
      if (!error) fetchAssets();
    } else {
      // Create
      const { error } = await supabase
        .from('assets')
        .insert(formData);
        
      if (!error) fetchAssets();
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus asset ini?")) {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);
        
      if (!error) fetchAssets();
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'Semua' || asset.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getConditionStyle = (condition: string) => {
    switch (condition) {
      case 'Bagus': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'Rusak': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'Butuh Servis': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Asset Restoran</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Kelola data inventaris non-bahan baku.</p>
        </div>
        <Button onClick={() => handleOpenDialog(null)} className="btn-heritage flex items-center gap-2">
          <Briefcase size={16} /> Tambah Asset
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-border overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap ${activeCategory === cat ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-border shadow-sm">
        <Search size={16} className="text-muted-foreground ml-2" />
        <input
          type="text"
          placeholder="Cari nama asset..."
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
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50 text-muted-foreground text-left text-xs uppercase tracking-wider">
                <th className="p-4 font-bold">Nama Asset</th>
                <th className="p-4 font-bold">Kategori</th>
                <th className="p-4 font-bold text-center">Jumlah</th>
                <th className="p-4 font-bold text-center">Kondisi</th>
                <th className="p-4 font-bold text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="p-4 font-medium text-foreground">{asset.name}</td>
                  <td className="p-4 text-muted-foreground">{asset.category}</td>
                  <td className="p-4 text-center font-semibold">{asset.quantity}</td>
                  <td className="p-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getConditionStyle(asset.condition)}`}>
                      {asset.condition === 'Bagus' && <CheckCircle2 size={12} />}
                      {asset.condition === 'Rusak' && <XCircle size={12} />}
                      {asset.condition === 'Butuh Servis' && <AlertCircle size={12} />}
                      {asset.condition}
                    </span>
                  </td>
                  <td className="p-4 flex justify-center gap-2">
                    <button onClick={() => handleOpenDialog(asset)} title="Edit" className="p-2 hover:bg-secondary rounded-lg text-primary transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(asset.id)} title="Hapus" className="p-2 hover:bg-secondary rounded-lg text-destructive transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredAssets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Tidak ada asset yang ditemukan.
            </div>
          )}
        </div>
      )}

      {/* Dialog for Add/Edit */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-foreground mb-4">{currentAsset ? "Edit Asset" : "Tambah Asset"}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nama Asset</label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <label htmlFor="asset-category" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Kategori</label>
                <select
                  id="asset-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full mt-1 p-2 border border-border rounded-lg bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORIES.slice(1).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Jumlah</label>
                <Input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  className="mt-1"
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="asset-condition" className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Kondisi</label>
                <select
                  id="asset-condition"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full mt-1 p-2 border border-border rounded-lg bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CONDITIONS.map(cond => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setIsDialogOpen(false)} variant="secondary">Batal</Button>
              <Button onClick={handleSave} className="btn-heritage">Simpan</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
