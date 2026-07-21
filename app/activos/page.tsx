"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { AddMachineModal } from "../../components/dashboard/add-machine-modal";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import { Search, Filter } from "lucide-react"; // Iconos para la búsqueda

export default function MaquinasPage() {
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState(""); // Estado para el término de búsqueda
  const { perfil } = useAuth();

  const obtenerMaquinas = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from("maquinas")
        .select("*")
        .order("numero_maquina", { ascending: true });

      if (error) throw error;
      setMaquinas(data || []);
    } catch (err: any) {
      console.error("Error:", err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { obtenerMaquinas(); }, []);

  // Lógica de filtrado dinámico
  const maquinasFiltradas = maquinas.filter((m) => {
    const term = busqueda.toLowerCase();
    return (
      m.numero_maquina?.toString().includes(term) ||
      m.nombre?.toLowerCase().includes(term) ||
      m.sector?.toLowerCase().includes(term)
    );
  });

  if (cargando) return (
    <div className="p-8 text-slate-500 font-black bg-slate-50 min-h-screen flex items-center justify-center uppercase tracking-widest text-xs">
      Sincronizando activos...
    </div>
  );

  return (
    <main className="flex-1 min-h-screen overflow-y-auto p-8 space-y-8 bg-slate-50 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">Máquinas en Planta</h1>
        </div>
        {(perfil?.rol === 'admin' || perfil?.rol === 'supervisor') && (
          <AddMachineModal onMachineAdded={obtenerMaquinas} />
        )}
      </div>

      {/* BARRA DE BÚSQUEDA DINÁMICA */}
      <div className="relative max-w-xl group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <Search size={16} className="text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
        </div>
        <input 
          type="text"
          placeholder="BUSCAR POR N°, NOMBRE O SECTOR..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-6 text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">N° Máquina</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Equipo</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca / Modelo</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ingeniería</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-slate-900">
            {maquinasFiltradas.length > 0 ? (
              maquinasFiltradas.map((maquina) => (
                <tr 
                  key={maquina.id} 
                  className="hover:bg-slate-50/80 transition-all cursor-default group"
                >
                  <td className="px-8 py-6 text-sm font-mono text-emerald-600 font-black">
                    #{maquina.numero_maquina}
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-black text-slate-900 block leading-tight">
                      {maquina.nombre}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block">
                      {maquina.sector || "Producción"}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-xs text-slate-500 font-bold uppercase">
                    {maquina.marca} — {maquina.modelo}
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black border uppercase tracking-widest ${
                      maquina.estado === 'operativo' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : maquina.estado === 'parada' 
                        ? 'bg-red-50 text-red-700 border-red-100' 
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {maquina.estado}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <Link 
                      href={`/activos/${maquina.id}/config`}
                      className="inline-block px-5 py-2 bg-slate-100 text-slate-400 group-hover:bg-emerald-600 group-hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Configurar Plan
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center text-slate-400 text-xs font-black uppercase tracking-widest italic">
                  No se encontraron activos con esa referencia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}