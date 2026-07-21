"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export function AdjustStockModal({ repuesto, onUpdated }: { repuesto: any, onUpdated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [cargando, setCargando] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
      const nuevoStock = repuesto.stock_actual + cantidad;
      
      const { error } = await supabase
        .from("repuestos")
        .update({ stock_actual: nuevoStock, fecha_actualizacion: new Date() })
        .eq("id", repuesto.id);

      if (error) throw error;
      setIsOpen(false);
      setCantidad(1);
      onUpdated();
    } catch (err: any) {
      alert("Error al actualizar: " + err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
        title="Ingresar Mercadería"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-left animate-in fade-in zoom-in duration-200">
            <div className="mb-6">
              <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest block mb-1">Ingreso de Stock</span>
              <h2 className="text-xl font-black text-slate-900 tracking-tighter">[{repuesto.codigo}] {repuesto.nombre}</h2>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block text-center">Cantidad que ingresa</label>
                <div className="flex items-center justify-center gap-4">
                  <button type="button" onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 font-black">-</button>
                  <input 
                    type="number" 
                    className="w-20 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-lg font-black outline-none focus:border-emerald-500" 
                    value={cantidad} 
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 0)} 
                  />
                  <button type="button" onClick={() => setCantidad(cantidad + 1)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 font-black">+</button>
                </div>
                <p className="text-[10px] text-slate-400 font-bold text-center mt-4 uppercase">Stock actual: {repuesto.stock_actual} → Nuevo: {repuesto.stock_actual + cantidad}</p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase">Cancelar</button>
                <button type="submit" disabled={cargando} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-emerald-600/20">
                  {cargando ? "Actualizando..." : "Confirmar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}