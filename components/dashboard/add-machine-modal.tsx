"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export function AddMachineModal({ onMachineAdded }: { onMachineAdded: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [cargando, setCargando] = useState(false);

  const [formData, setFormData] = useState({
    numero_maquina: "",
    nombre: "",
    marca: "",
    modelo: "",
    sector: "", 
    estado: "operativo",
    url_manual: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    try {
      const { error } = await supabase
        .from("maquinas")
        .insert([formData]);

      if (error) throw error;

      setIsOpen(false);
      setFormData({ 
        numero_maquina: "", 
        nombre: "", 
        marca: "", 
        modelo: "", 
        sector: "", 
        estado: "operativo", 
        url_manual: "" 
      });
      onMachineAdded(); 
    } catch (error) {
      alert("Error al guardar la máquina. Revisa si el N° de máquina ya existe.");
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm"
      >
        + Nueva Máquina
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh] text-left">
            
            <div className="flex justify-between items-center mb-8">
              <div>
                <span className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em]">Gestion de Activos</span>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tighter">Registrar Nueva Máquina</h2>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 text-3xl cursor-pointer transition-colors">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Denominación*</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:border-emerald-500 outline-none transition-colors"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">N de máquina*</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:border-emerald-500 outline-none transition-colors font-mono"
                  value={formData.numero_maquina}
                  onChange={(e) => setFormData({...formData, numero_maquina: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:border-emerald-500 outline-none transition-colors cursor-pointer"
                  value={formData.estado}
                  onChange={(e) => setFormData({...formData, estado: e.target.value})}
                >
                  <option value="operativo">Operativo</option>
                  <option value="parada">Parada</option>
                  <option value="mantenimiento">Mantenimiento</option>
                </select>
              </div>

              {/* SECTOR AGREGADO MANTENIENDO TU ESTÉTICA */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Sector</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:border-emerald-500 outline-none transition-colors"
                  value={formData.sector}
                  onChange={(e) => setFormData({...formData, sector: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Marca</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:border-emerald-500 outline-none transition-colors"
                  value={formData.marca}
                  onChange={(e) => setFormData({...formData, marca: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modelo</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:border-emerald-500 outline-none transition-colors"
                  value={formData.modelo}
                  onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">URL Manual (PDF)</label>
                <input
                  type="url"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:border-emerald-500 outline-none transition-colors"
                  placeholder="https://..."
                  value={formData.url_manual}
                  onChange={(e) => setFormData({...formData, url_manual: e.target.value})}
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {cargando ? "Guardando..." : "Guardar Maquina"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}