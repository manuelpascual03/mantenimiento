"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { AssetDetailModal } from "./asset-detail-modal";

interface AssetGridProps {
  mtbfData?: {[key: string]: number};
  mttrData?: {[key: string]: number};
  filtroSector?: string | null;
}

export function AssetGrid({ mtbfData, mttrData, filtroSector }: AssetGridProps) {
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        let query = supabase.from("maquinas").select("*").order("numero_maquina", { ascending: true });
        
        if (filtroSector) {
          query = query.eq("sector", filtroSector);
        }

        const { data: mData, error } = await query;
        if (error) throw error;
        
        setMaquinas(mData || []);
      } catch (err) {
        console.error("Error cargando activos:", err);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, [filtroSector]);

  const getIndividualStats = (maquinaId: string) => {
    let mtbf = "---";
    let mttr = "---";

    if (mtbfData && mtbfData[maquinaId] !== undefined) {
      mtbf = mtbfData[maquinaId] === 0 ? "---" : `${mtbfData[maquinaId]}h`;
    }

    if (mttrData && mttrData[maquinaId] !== undefined) {
      mttr = mttrData[maquinaId] === 0 ? "---" : `${Math.round(mttrData[maquinaId])}m`;
    }

    return { mtbf, mttr };
  };

  if (cargando) return <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-8">Sincronizando activos...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {maquinas.map((maquina) => {
        const { mtbf: mtbfValue, mttr: mttrValue } = getIndividualStats(maquina.id);
        
        return (
          <AssetDetailModal key={maquina.id} maquina={maquina}>
            <div className="bg-white border border-slate-200 p-8 rounded-[32px] shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-mono text-emerald-600 font-black bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-tighter">
                  #{maquina.numero_maquina}
                </span>
                <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black border uppercase tracking-widest ${
                  maquina.estado === 'operativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                  maquina.estado === 'parada' ? 'bg-red-50 text-red-700 border-red-100' : 
                  'bg-amber-50 text-amber-700 border-amber-100'
                }`}>
                  {maquina.estado}
                </span>
              </div>
              
              <div className="flex-1">
                <h3 className="font-black text-2xl text-slate-900 leading-none mb-2 group-hover:text-emerald-600 transition-colors tracking-tighter uppercase">
                  {maquina.nombre}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {maquina.marca} — {maquina.modelo}
                </p>
                {!filtroSector && (
                   <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                     Sector: {maquina.sector || "General"}
                   </p>
                )}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">MTBF Individual</p>
                  <p className={`text-xl font-black text-left ${mtbfValue === '---' ? 'text-slate-300' : 'text-slate-900'}`}>
                    {mtbfValue}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left">MTTR Individual</p>
                  <p className={`text-xl font-black text-left ${mttrValue === '---' ? 'text-slate-300' : 'text-slate-900'}`}>
                    {mttrValue}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-slate-300 group-hover:text-emerald-600 transition-colors">
                <span className="text-[9px] font-black uppercase tracking-widest">Ver Ficha Técnica</span>
                <span className="text-xl font-light">→</span>
              </div>
            </div>
          </AssetDetailModal>
        );
      })}
    </div>
  );
}