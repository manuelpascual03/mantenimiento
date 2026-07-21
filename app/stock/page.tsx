"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { AddSparePartModal } from "../../components/dashboard/add-spare-parts-modal";
import { AdjustStockModal } from "../../components/dashboard/adjust-stock-modal";

export default function StockPage() {
  const [repuestos, setRepuestos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const { perfil } = useAuth();

  const obtenerStock = async () => {
    try {
      setCargando(true);
      // Traemos todo incluyendo el stock_minimo para la validación visual
      const { data, error } = await supabase.from("repuestos").select("*").order("codigo", { ascending: true });
      if (error) throw error;
      setRepuestos(data || []);
    } catch (err: any) {
      console.error(err.message);
    } finally { setCargando(false); }
  };

  const borrarRepuesto = async (id: string) => {
    if (!confirm("¿Eliminar este repuesto del inventario permanente?")) return;
    await supabase.from("repuestos").delete().eq("id", id);
    obtenerStock();
  };

  useEffect(() => { obtenerStock(); }, []);

  // Estadísticas rápidas
  const totalItems = repuestos.length;
  const bajoStock = repuestos.filter(r => r.stock_actual <= r.stock_minimo).length;

  if (perfil && perfil.rol !== 'admin') {
    return (
      <main className="flex-1 flex items-center justify-center bg-slate-50 min-h-screen">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Inventario de Repuestos</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 min-h-screen overflow-y-auto p-8 space-y-8 bg-slate-50 text-left">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Inventario de Repuestos</h1>
        </div>
        <AddSparePartModal onPartAdded={obtenerStock} />
      </div>

      {/* TARJETAS DE ESTADO CRÍTICO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items Totales</p>
          <p className="text-3xl font-black text-slate-900 leading-none">{totalItems}</p>
        </div>
        <div className={`p-6 rounded-[32px] border shadow-sm transition-all ${bajoStock > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${bajoStock > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            Bajo Stock Mínimo
          </p>
          <div className="flex items-center gap-2">
            <p className={`text-3xl font-black leading-none ${bajoStock > 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {bajoStock}
            </p>
            {bajoStock > 0 && <span className="animate-pulse text-xl">⚠️</span>}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cod. Insumo</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">En Depósito</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-900">
            {cargando ? (
              <tr><td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-bold italic uppercase text-[10px]">Sincronizando almacén...</td></tr>
            ) : (
              repuestos.map((r) => {
                const esCritico = r.stock_actual <= r.stock_minimo;
                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-8 py-6 text-sm font-mono text-emerald-600 font-black">#{r.codigo}</td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 leading-tight uppercase">{r.nombre}</span>
                        <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase truncate max-w-xs">{r.descripcion}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-lg font-black ${esCritico ? 'text-red-600' : 'text-slate-900'}`}>
                          {r.stock_actual}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Min: {r.stock_minimo}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {esCritico ? (
                        <span className="bg-red-100 text-red-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-red-200">
                          Reponer
                        </span>
                      ) : (
                        <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-200">
                          Disponible
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <AdjustStockModal repuesto={r} onUpdated={obtenerStock} />
                        <button onClick={() => borrarRepuesto(r.id)} className="p-2 text-slate-200 hover:text-red-500 transition-all cursor-pointer" title="Eliminar Insumo">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}