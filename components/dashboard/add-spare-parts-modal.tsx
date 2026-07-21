"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export function AddSparePartModal({ onPartAdded }: { onPartAdded: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    stock_actual: 0
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      const { error } = await supabase.from("repuestos").insert([formData]);
      if (error) throw error;
      setIsOpen(false);
      setFormData({ codigo: "", nombre: "", descripcion: "", stock_actual: 0 });
      onPartAdded();
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm">
        + Cargar Insumo
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-md shadow-2xl text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-6">Nuevo Repuesto</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Código</label>
                  <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-emerald-500 font-mono" value={formData.codigo} onChange={(e) => setFormData({...formData, codigo: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Stock Inicial</label>
                  <input type="number" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-emerald-500" value={formData.stock_actual} onChange={(e) => setFormData({...formData, stock_actual: parseInt(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nombre</label>
                <input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-emerald-500" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Descripción</label>
                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-emerald-500 resize-none" rows={2} value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase tracking-widest">Cancelar</button>
                <button type="submit" disabled={cargando} className="flex-1 py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}