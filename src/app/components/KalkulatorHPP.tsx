import React, { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabase";
import { Trash2, Plus, Calculator, RefreshCw, Info, ArrowUpRight, Percent, DollarSign, Package } from 'lucide-react';

interface Ingredient {
  id: string;
  name: string;
  purchasePrice: number;
  conversionValue: number;
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
  const [shrinkagePercent, setShrinkagePercent] = useState<number>(5);
  const [laborCost, setLaborCost] = useState<number>(2000);
  const [overheadCost, setOverheadCost] = useState<number>(1000);
  const [yieldPortions, setYieldPortions] = useState<number>(10);
  const [targetMargin, setTargetMargin] = useState<number>(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadIngredients() {
      setLoading(true);
      const { data } = await supabase
        .from('bahan_resep')
        .select('*')
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        const mappedData = data.map((item: any) => ({
          id: item.id,
          name: item.name || 'Bahan Tanpa Nama',
          purchasePrice: item.price || 0,
          conversionValue: item.conversion_value || 1000,
          quantityNeeded: item.qty || 1,
        }));
        setIngredients(mappedData);
      } else {
        setIngredients([
          { id: '1', name: 'Daging Ayam', purchasePrice: 40000, conversionValue: 1000, quantityNeeded: 500 },
          { id: '2', name: 'Bawang Putih', purchasePrice: 35000, conversionValue: 1000, quantityNeeded: 50 },
          { id: '3', name: 'Minyak Goreng', purchasePrice: 15000, conversionValue: 1000, quantityNeeded: 100 },
        ]);
      }
      setLoading(false);
    }
    loadIngredients();
  }, []);

  const { baseHpp, wasteCost, totalHpp, hppPerPortion, recommendedSellingPrice } = calculateHPPData(
    ingredients, shrinkagePercent, laborCost, overheadCost, yieldPortions, targetMargin
  );

  const handleAddIngredient = () => {
    setIngredients([...ingredients, {
      id: Date.now().toString(),
      name: '',
      purchasePrice: 0,
      conversionValue: 1000,
      quantityNeeded: 0,
    }]);
  };

  const handleUpdate = (id: string, field: keyof Ingredient, value: string | number) => {
    setIngredients(ingredients.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleDelete = (id: string) => {
    setIngredients(ingredients.filter(item => item.id !== id));
  };

  const rp = (val: number) => `Rp ${Math.round(val).toLocaleString('id-ID')}`;

  const inputClass = "w-full px-3 py-2.5 bg-white border border-[#E8DDD5] rounded-xl text-sm font-semibold text-[#3D2B1F] outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-[#C4B5AD]";
  const labelClass = "text-[10px] font-black text-[#9C8070] uppercase tracking-widest mb-1 block";

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="h-14 bg-[#EDE6DE] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">

      {/* ── Header ─────────────────────────────────── */}
      <div className="bg-white border-b border-[#E8DDD5] px-6 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Calculator size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#3D2B1F] tracking-tight">Kalkulator HPP</h2>
            <p className="text-[10px] text-[#9C8070] font-bold uppercase tracking-widest">Harga Pokok Produksi</p>
          </div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="p-2.5 text-[#9C8070] hover:text-[#3D2B1F] bg-[#F5EFE8] hover:bg-[#EDE6DE] rounded-xl transition-all border border-[#E8DDD5]"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── Left: Ingredients + Variables ─────── */}
          <div className="lg:col-span-8 space-y-5">

            {/* Ingredient Analysis */}
            <div className="bg-white border border-[#E8DDD5] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-primary rounded-full" />
                  <h3 className="text-xs font-black text-[#3D2B1F] uppercase tracking-widest">Bahan Baku</h3>
                </div>
                <button
                  onClick={handleAddIngredient}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary hover:text-white px-4 py-2 rounded-xl transition-all border border-primary/20"
                >
                  <Plus size={13} /> Tambah Bahan
                </button>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 mb-2 px-1">
                {["Nama Bahan", "Harga Beli (Rp)", "Konversi (g/ml)", "Pemakaian (g/ml)", ""].map((h, i) => (
                  <div key={i} className={`${i === 0 ? "col-span-4" : i === 4 ? "col-span-1" : "col-span-2"} ${labelClass}`}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {ingredients.map(item => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-[#FAF7F4] border border-[#EDE6DE] rounded-xl px-3 py-2.5 hover:border-primary/30 transition-all group">
                    <div className="col-span-4">
                      <input
                        type="text"
                        placeholder="Nama bahan..."
                        value={item.name}
                        onChange={e => handleUpdate(item.id, 'name', e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="0"
                        value={item.purchasePrice || ''}
                        onChange={e => handleUpdate(item.id, 'purchasePrice', Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="1000"
                        value={item.conversionValue || ''}
                        onChange={e => handleUpdate(item.id, 'conversionValue', Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="0"
                        value={item.quantityNeeded || ''}
                        onChange={e => handleUpdate(item.id, 'quantityNeeded', Number(e.target.value))}
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-[#C4B5AD] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {ingredients.length === 0 && (
                  <div className="py-12 text-center border-2 border-dashed border-[#E8DDD5] rounded-xl">
                    <Plus size={24} className="text-[#C4B5AD] mx-auto mb-2" />
                    <p className="text-xs font-bold text-[#9C8070]">Belum ada bahan baku</p>
                    <p className="text-[10px] text-[#C4B5AD] mt-0.5">Klik "Tambah Bahan" untuk mulai</p>
                  </div>
                )}
              </div>
            </div>

            {/* Variable Constants */}
            <div className="bg-white border border-[#E8DDD5] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-primary rounded-full" />
                <h3 className="text-xs font-black text-[#3D2B1F] uppercase tracking-widest">Parameter Biaya</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { id: "shrinkage", label: "Susut (%)", val: shrinkagePercent, set: setShrinkagePercent, icon: Percent },
                  { id: "labor",    label: "Biaya Tenaga", val: laborCost,        set: setLaborCost,        icon: DollarSign },
                  { id: "overhead", label: "Overhead",     val: overheadCost,     set: setOverheadCost,     icon: Info },
                  { id: "portions", label: "Porsi",        val: yieldPortions,    set: setYieldPortions,    icon: Package },
                ].map(p => (
                  <div key={p.id}>
                    <label htmlFor={p.id} className={labelClass + " flex items-center gap-1"}>
                      <p.icon size={9} className="text-primary" /> {p.label}
                    </label>
                    <input
                      id={p.id}
                      type="number"
                      value={p.val}
                      onChange={e => p.set(Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white border border-[#E8DDD5] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-primary rounded-full" />
                <h3 className="text-xs font-black text-[#3D2B1F] uppercase tracking-widest">Rincian Biaya</h3>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Biaya Bahan Dasar", val: baseHpp, color: "text-[#3D2B1F]" },
                  { label: `Biaya Susut (${shrinkagePercent}%)`, val: wasteCost, color: "text-orange-600" },
                  { label: "Biaya Tenaga Kerja", val: laborCost, color: "text-[#3D2B1F]" },
                  { label: "Biaya Overhead", val: overheadCost, color: "text-[#3D2B1F]" },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-[#F0EAE4] last:border-0">
                    <span className="text-xs text-[#7C6A60] font-semibold">{row.label}</span>
                    <span className={`text-xs font-black ${row.color}`}>{rp(row.val)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 mt-1">
                  <span className="text-xs font-black text-[#3D2B1F] uppercase tracking-wide">Total HPP (Batch)</span>
                  <span className="text-sm font-black text-primary">{rp(totalHpp)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Results ─────────────────────── */}
          <div className="lg:col-span-4 space-y-4">

            {/* HPP Per Porsi */}
            <div className="bg-white border border-[#E8DDD5] rounded-2xl p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#9C8070] mb-1">HPP Per Porsi</p>
              <p className="text-xl font-black tracking-tight text-[#3D2B1F]">{rp(hppPerPortion)}</p>
              <p className="text-[10px] text-[#9C8070] font-bold mt-1">dari {yieldPortions} porsi · total {rp(totalHpp)}</p>
            </div>

            {/* Smart Pricing */}
            <div className="bg-white border border-[#E8DDD5] rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-[#3D2B1F] uppercase tracking-widest">Target Margin</h3>
                <span className="text-sm font-black text-primary">{targetMargin}%</span>
              </div>
              <input
                type="range"
                min="5" max="90" step="5"
                value={targetMargin}
                onChange={e => setTargetMargin(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-primary cursor-pointer mb-4"
              />
              <div className="bg-[#FAF7F4] border border-[#EDE6DE] rounded-xl p-4">
                <p className={labelClass}>Harga Jual Rekomendasi</p>
                <p className="text-xl font-black text-[#3D2B1F]">{rp(recommendedSellingPrice)}</p>
                <div className="flex items-center gap-1 mt-1.5 text-emerald-600">
                  <ArrowUpRight size={12} />
                  <p className="text-[11px] font-bold">Laba bersih: {rp(recommendedSellingPrice - hppPerPortion)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-[#FAF7F4] border border-[#EDE6DE] rounded-xl p-3 text-center">
                  <p className={labelClass}>Food Cost</p>
                  <p className="text-sm font-black text-[#3D2B1F]">{100 - targetMargin}%</p>
                </div>
                <div className="bg-[#FAF7F4] border border-[#EDE6DE] rounded-xl p-3 text-center">
                  <p className={labelClass}>Mark-Up</p>
                  <p className="text-sm font-black text-[#3D2B1F]">{targetMargin}%</p>
                </div>
              </div>
            </div>

            {/* Tip */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info size={16} className="text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Tips F&B</p>
                <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                  Food cost ideal restoran premium berkisar 28%–35% untuk menjaga profitabilitas jangka panjang.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
