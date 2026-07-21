"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export function AssetDetailModal({ maquina, children }: { maquina: any, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const formatDate = (date: string | null) => {
  if (!date) return "Sin registros";
  
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC' 
  });
};

  const formatDateTime = (date: string | null) => {
    if (!date) return "Sin registros";
    return new Date(date).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="h-full cursor-pointer">{children}</div>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
          
          <div className="relative bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-md shadow-2xl text-left animate-in fade-in zoom-in duration-200">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1 block">Ficha Técnica</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
                  {maquina.nombre}
                </h2>
                <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase tracking-tight">ID: {maquina.numero_maquina}</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-slate-900 text-3xl leading-none transition-colors">&times;</button>
            </div>

            <div className="space-y-2 mb-8">
              {[
                { label: "Ubicación", value: maquina.sector || "Planta General" },
                { label: "Mantenimiento Correctivo", value: formatDateTime(maquina.ultimo_correctivo) },
                { label: "Mantenimiento Preventivo", value: formatDate(maquina.ultimo_preventivo) },
                { label: "Próximo Preventivo", value: formatDate(maquina.proximo_preventivo), highlight: true },
              ].map((field, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center">
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">{field.label}</span>
                  <span className={`text-xs font-bold ${field.highlight ? 'text-emerald-600' : 'text-slate-900'}`}>{field.value}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <a 
                href={maquina.url_manual || "#"} 
                target="_blank" 
                className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-[10px] text-center transition-all ${
                  maquina.url_manual ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
                onClick={(e) => !maquina.url_manual && e.preventDefault()}
              >
                {maquina.url_manual ? "Ver Manual de Instrucciones" : "Manual No Cargado"}
              </a>
              <button onClick={() => setIsOpen(false)} className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 text-[9px] uppercase tracking-widest transition-colors">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}