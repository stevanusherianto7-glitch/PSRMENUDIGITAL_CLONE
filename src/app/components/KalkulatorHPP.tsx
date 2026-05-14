import React, { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabase";
import { Trash2, Plus, Calculator, RefreshCw, Info, ArrowUpRight, Percent, DollarSign } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  purchasePrice: number;
  conversionValue: number; // e.g., 1000 for 1kg = 1000g
  quantityNeeded: number;
}

function calculateHPPData(
  ingredients: Ingredient[],
  shrinkagePercent: number,
  laborCost: number,
  overheadCost: number,
  yieldPortions: number,
  targetMargin: number
) {
  const baseHpp = ingredients.reduce((sum, item) => {
    const pricePerUnit = item.conversionValue > 0 ? item.purchasePrice / item.conversionValue : 0;
    return sum + (item.quantityNeeded * pricePerUnit);
  }, 0);

  const wasteCost = baseHpp * (shrinkagePercent / 100);
  const totalHpp = baseHpp + wasteCost + laborCost + overheadCost;
  const hppPerPortion = yieldPortions > 0 ? Math.round(totalHpp / yieldPortions) : 0;
  const recommendedSellingPrice = targetMargin < 100 ? Math.round(hppPerPortion / (1 - targetMargin / 100)) : 0;

  return { baseHpp, wasteCost, totalHpp, hppPerPortion, recommendedSellingPrice };
}

export const KalkulatorHPP = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [shrinkagePercent, setShrinkagePercent] = useState<number>(5); // Default 5% susut
  const [laborCost, setLaborCost] = useState<number>(2000); // Default biaya tenaga kerja
  const [overheadCost, setOverheadCost] = useState<number>(1000); // Default biaya overhead
  const [yieldPortions, setYieldPortions] = useState<number>(10);
  const [targetMargin, setTargetMargin] = useState<number>(50); // Default target margin 50%
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadIngredients() {
      setLoading(true);
      // Mencoba mengambil data dari Supabase (Tabel bahan_resep)
      const { data, error } = await supabase
        .from('bahan_resep')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (data && data.length > 0) {
        // Mapping data dari DB ke struktur baru yang lebih lengkap
        const mappedData = data.map((item: any) => ({
          id: item.id,
          name: item.name || 'Bahan Tanpa Nama',
          purchasePrice: item.price || 0,
          conversionValue: item.conversion_value || 1000, // Default 1000 (asumsi kg ke gram)
          quantityNeeded: item.qty || 1,
        }));
        setIngredients(mappedData);
      } else {
        // Fallback Premium Data jika kosong/offline
        setIngredients([
          { id: '1', name: 'Daging Ayam (kg)', purchasePrice: 40000, conversionValue: 1000, quantityNeeded: 500 },
          { id: '2', name: 'Bawang Putih (kg)', purchasePrice: 35000, conversionValue: 1000, quantityNeeded: 50 },
          { id: '3', name: 'Minyak Goreng (liter)', purchasePrice: 15000, conversionValue: 1000, quantityNeeded: 100 },
        ]);
      }
      setLoading(false);
    }
    loadIngredients();
  }, []);

  const { baseHpp, wasteCost, totalHpp, hppPerPortion, recommendedSellingPrice } = calculateHPPData(
    ingredients,
    shrinkagePercent,
    laborCost,
    overheadCost,
    yieldPortions,
    targetMargin
  );

  const handleAddIngredient = () => {
    const newItem: Ingredient = {
      id: Date.now().toString(),
      name: '',
      purchasePrice: 0,
      conversionValue: 1000,
      quantityNeeded: 0,
    };
    setIngredients([...ingredients, newItem]);
  };

  const handleUpdate = (id: string, field: keyof Ingredient, value: string | number) => {
    setIngredients(
      ingredients.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleDelete = (id: string) => {
    setIngredients(ingredients.filter(item => item.id !== id));
  };

  // Helper format rupiah
  const rp = (val: number) => `Rp ${val.toLocaleString('id-ID')}`;

  if (loading) {
    return (
      <div className="bg-card/50 backdrop-blur-md rounded-3xl p-8 border border-border max-w-5xl mx-auto mt-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-muted rounded-2xl animate-pulse"></div>
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-muted rounded-lg w-1/4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded-lg w-1/3 animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-14 bg-muted rounded-xl animate-pulse"></div>
          <div className="h-14 bg-muted rounded-xl animate-pulse"></div>
          <div className="h-14 bg-muted rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-tr from-card via-card to-secondary/20 backdrop-blur-xl rounded-3xl p-8 border border-border max-w-5xl mx-auto mt-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] transition-all duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20 glow-effect">
            <Calculator size={24} className="animate-float" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight font-['Poppins']">Kalkulator HPP</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-0.5">Metode Recipe Manager · Kedai Elvera 57</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => window.location.reload()} 
            className="p-2.5 text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-xl transition-all duration-300 border border-border"
            title="Refresh Data"
          >
            <RefreshCw size={18} />
          </button>
          <span className="text-xs text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Terhubung Supabase
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Ingredients (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Komposisi Bahan</h3>
              <button
                onClick={handleAddIngredient}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-500/5 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-all duration-300 border border-indigo-500/10"
              >
                <Plus size={14} />
                Tambah Bahan
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">
              <div className="col-span-5">Nama Bahan</div>
              <div className="col-span-2">Harga Beli</div>
              <div className="col-span-2">Konversi</div>
              <div className="col-span-2">Dibutuhkan</div>
              <div className="col-span-1 text-right"></div>
            </div>

            {/* Ingredients List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
              {ingredients.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center group bg-secondary/30 hover:bg-secondary/60 p-2 rounded-xl transition-all duration-200 border border-border/50 hover:border-border">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="Nama Bahan"
                      value={item.name}
                      onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium text-foreground"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Harga"
                      value={item.purchasePrice || ''}
                      onChange={(e) => handleUpdate(item.id, 'purchasePrice', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium text-foreground"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Konv"
                      value={item.conversionValue || ''}
                      onChange={(e) => handleUpdate(item.id, 'conversionValue', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium text-foreground"
                      title="Contoh: 1000 jika beli per kg tapi resep pakai gram"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantityNeeded || ''}
                      onChange={(e) => handleUpdate(item.id, 'quantityNeeded', Number(e.target.value))}
                      className="w-full px-3 py-2 bg-card border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-xs font-medium text-foreground"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100"
                      title="Hapus Bahan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {ingredients.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-xs font-medium bg-secondary/20 rounded-xl border border-dashed border-border">
                  Belum ada bahan. Klik "Tambah Bahan" untuk memulai.
                </div>
              )}
            </div>
          </div>

          {/* Parameter Tambahan */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">Parameter Tambahan</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="shrinkagePercent" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                  Susut (%)
                  <span title="Persentase bahan yang hilang saat proses"><Info size={10} /></span>
                </label>
                <input
                  id="shrinkagePercent"
                  type="number"
                  value={shrinkagePercent}
                  onChange={(e) => setShrinkagePercent(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs font-semibold text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="laborCost" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tenaga Kerja (Rp)</label>
                <input
                  id="laborCost"
                  type="number"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs font-semibold text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="overheadCost" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Overhead (Rp)</label>
                <input
                  id="overheadCost"
                  type="number"
                  value={overheadCost}
                  onChange={(e) => setOverheadCost(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs font-semibold text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="yieldPortions" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Jumlah Porsi</label>
                <input
                  id="yieldPortions"
                  type="number"
                  value={yieldPortions}
                  onChange={(e) => setYieldPortions(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs font-semibold text-foreground"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Results & Projections (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Card 1: HPP Summary */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/10">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mb-1">Total Modal (Semua Porsi)</p>
                <h3 className="text-2xl font-bold font-['Poppins']">{rp(Math.round(totalHpp))}</h3>
              </div>
              <div className="pt-3 border-t border-indigo-500/30">
                <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider mb-1">HPP per Porsi</p>
                <h2 className="text-4xl font-bold text-yellow-300 font-['Poppins']">{rp(hppPerPortion)}</h2>
                <p className="text-[10px] text-indigo-100/70 mt-1">Dasar penentuan harga jual</p>
              </div>
            </div>
          </div>

          {/* Card 2: Pricing Strategy (Proaktif) */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Strategi Harga</h3>
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">PRO</Badge>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label htmlFor="targetMargin" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Target Margin</label>
                <span className="text-xs font-bold text-indigo-500">{targetMargin}%</span>
              </div>
              <div className="relative flex items-center">
                <input
                  id="targetMargin"
                  type="range"
                  min="5"
                  max="90"
                  step="5"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(Number(e.target.value))}
                  className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            </div>

            <div className="p-3 bg-secondary/50 rounded-xl border border-border">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Rekomendasi Harga Jual</p>
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-foreground font-['Poppins']">{rp(recommendedSellingPrice)}</h4>
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-0.5">
                  <ArrowUpRight size={12} />
                  Laba {rp(recommendedSellingPrice - hppPerPortion)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold uppercase tracking-widest">
              <div className="p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10 text-emerald-600">
                Food Cost: {targetMargin ? 100 - targetMargin : 100}%
              </div>
              <div className="p-2 bg-indigo-500/5 rounded-lg border border-indigo-500/10 text-indigo-600">
                Markup: {targetMargin}%
              </div>
            </div>
          </div>

          {/* Card 3: Info Mini */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
              <Info size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Tips HPP</p>
              <p className="text-[10px] text-muted-foreground font-medium">Food cost ideal restoran biasanya berkisar antara 28% - 35%.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// Simple Badge component to avoid missing shadcn/ui
const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${className}`}>
    {children}
  </span>
);
