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
      <div className="bg-card/50 backdrop-blur-md rounded-b-[3rem] p-6 border border-white/5 w-full">
        <div className="flex items-center gap-4 mb-8 px-4">
          <div className="w-12 h-12 bg-muted rounded-2xl animate-pulse"></div>
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-muted rounded-lg w-1/4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded-lg w-1/3 animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-4 px-4">
          <div className="h-14 bg-muted rounded-xl animate-pulse"></div>
          <div className="h-14 bg-muted rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700">
      
      {/* Header - Edge to Edge Style */}
      <div className="bg-gradient-to-br from-card via-card/80 to-secondary/30 backdrop-blur-2xl rounded-b-[4rem] border-b border-white/5 p-8 pb-12 shadow-2xl relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] text-white shadow-2xl shadow-indigo-500/30 glow-primary ring-4 ring-white/5">
              <Calculator size={28} className="animate-float" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter font-poppins leading-none">HPP MASTER</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Recipe Engineering System
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="p-3 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all duration-300 border border-white/5 group"
            >
              <RefreshCw size={20} className="group-active:rotate-180 transition-transform duration-500" />
            </button>
            <div className="px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Supabase Node Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid - Expanded to full width */}
      <div className="px-4 lg:px-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-full">

          {/* Left Column: Ingredients (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 shadow-2xl border-white/5">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Ingredient Analysis</h3>
                </div>
                <button
                  onClick={handleAddIngredient}
                  className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-primary hover:text-white bg-primary/10 hover:bg-primary px-6 py-3 rounded-2xl transition-all duration-500 border border-primary/20 shadow-lg shadow-primary/10"
                >
                  <Plus size={16} />
                  Add Matrix
                </button>
              </div>

              {/* Table Body */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {ingredients.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-3 items-center group bg-white/2 hover:bg-white/5 p-4 rounded-[2rem] transition-all duration-300 border border-white/5 hover:border-primary/20">
                    <div className="col-span-12 sm:col-span-5">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Name</p>
                      <input
                        type="text"
                        placeholder="INGREDIENT NAME"
                        value={item.name}
                        onChange={(e) => handleUpdate(item.id, 'name', e.target.value)}
                        className="w-full px-5 py-3.5 bg-black/40 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-xs font-black text-white uppercase tracking-wider"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Price</p>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.purchasePrice || ''}
                        onChange={(e) => handleUpdate(item.id, 'purchasePrice', Number(e.target.value))}
                        className="w-full px-4 py-3.5 bg-black/40 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-xs font-black text-primary font-mono"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Conv</p>
                      <input
                        type="number"
                        placeholder="1000"
                        value={item.conversionValue || ''}
                        onChange={(e) => handleUpdate(item.id, 'conversionValue', Number(e.target.value))}
                        className="w-full px-4 py-3.5 bg-black/40 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-xs font-black text-white font-mono"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-2">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Need</p>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.quantityNeeded || ''}
                        onChange={(e) => handleUpdate(item.id, 'quantityNeeded', Number(e.target.value))}
                        className="w-full px-4 py-3.5 bg-black/40 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-xs font-black text-white font-mono"
                      />
                    </div>
                    <div className="col-span-1 text-right flex items-center justify-end pt-5 sm:pt-0">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-3 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all duration-300 opacity-100 sm:opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {ingredients.length === 0 && (
                  <div className="py-20 text-center space-y-4 bg-white/2 rounded-[3rem] border border-dashed border-white/5">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                      <Plus size={32} className="text-slate-700" />
                    </div>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">System Empty · Awaiting Data Input</p>
                  </div>
                )}
              </div>
            </div>

            {/* Parameter Tambahan */}
            <div className="glass-card rounded-[2.5rem] p-6 lg:p-8 shadow-2xl border-white/5">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1.5 h-6 bg-primary rounded-full" />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Variable Constants</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {[
                  { id: "shrinkagePercent", label: "Shrinkage %", val: shrinkagePercent, set: setShrinkagePercent, icon: Percent },
                  { id: "laborCost", label: "Labor Cost", val: laborCost, set: setLaborCost, icon: DollarSign },
                  { id: "overheadCost", label: "Overhead", val: overheadCost, set: setOverheadCost, icon: Info },
                  { id: "yieldPortions", label: "Portions", val: yieldPortions, set: setYieldPortions, icon: Package },
                ].map(param => (
                  <div key={param.id} className="space-y-3">
                    <label htmlFor={param.id} className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                      <param.icon size={10} className="text-primary" />
                      {param.label}
                    </label>
                    <input
                      id={param.id}
                      type="number"
                      value={param.val}
                      onChange={(e) => param.set(Number(e.target.value))}
                      className="w-full px-5 py-3.5 bg-black/40 border border-white/5 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none transition-all text-xs font-black text-white font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Results & Projections (4 Cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Card 1: HPP Summary */}
            <div className="bg-gradient-to-br from-primary via-orange-600 to-red-700 rounded-[3rem] p-8 text-white shadow-2xl shadow-primary/20 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000" />
              <div className="relative z-10 space-y-8">
                <div>
                  <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mb-2">Operational Cost (Batch)</p>
                  <h3 className="text-4xl font-black font-poppins tracking-tighter">{rp(Math.round(totalHpp))}</h3>
                </div>
                <div className="pt-8 border-t border-white/10">
                  <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mb-2">Base Cost / Portion</p>
                  <h2 className="text-5xl font-black text-yellow-300 font-poppins tracking-tighter">{rp(hppPerPortion)}</h2>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-3">Calculated Real-Time Matrix</p>
                </div>
              </div>
            </div>

            {/* Card 2: Pricing Strategy (Proaktif) */}
            <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl border-white/5 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Market Strategy</h3>
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest">Smart Pricing</div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label htmlFor="targetMargin" className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Profit Margin</label>
                  <span className="text-xl font-black text-primary font-mono">{targetMargin}%</span>
                </div>
                <div className="relative flex items-center h-8">
                  <input
                    id="targetMargin"
                    type="range"
                    min="5"
                    max="90"
                    step="5"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(Number(e.target.value))}
                    className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-primary"
                  />
                </div>
              </div>

              <div className="p-6 bg-black/40 rounded-3xl border border-white/5 space-y-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Recommended Retail</p>
                <div className="flex items-center justify-between">
                  <h4 className="text-3xl font-black text-white font-poppins tracking-tighter">{rp(recommendedSellingPrice)}</h4>
                  <div className="flex items-center gap-1 text-emerald-400 font-black text-xs">
                    <ArrowUpRight size={16} />
                  </div>
                </div>
                <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest pt-2">
                  Projected Net Profit: {rp(recommendedSellingPrice - hppPerPortion)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white/2 rounded-2xl border border-white/5 text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Food Cost</p>
                  <p className="text-xs font-black text-white">{targetMargin ? 100 - targetMargin : 100}%</p>
                </div>
                <div className="p-4 bg-white/2 rounded-2xl border border-white/5 text-center">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Mark-Up</p>
                  <p className="text-xs font-black text-white">{targetMargin}%</p>
                </div>
              </div>
            </div>

            {/* Card 3: Info Mini */}
            <div className="glass-card rounded-[2rem] p-6 shadow-xl border-white/5 flex items-center gap-5">
              <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
                <Info size={24} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-white uppercase tracking-widest">Engineering Tip</p>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">Ideal food cost for premium restaurants ranges from 28% to 35% for maximum scalability.</p>
              </div>
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
