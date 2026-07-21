"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

export function ViewTaskModal({ tarea }: { tarea: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const maquina = tarea.maquinas;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase border border-emerald-200 px-3 py-1 rounded-lg hover:bg-emerald-50 transition-all cursor-pointer"
      >
        Ver Detalles
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)}></div>
          
          <div className="relative bg-white border border-slate-200 rounded-[32px] p-8 w-full max-w-lg shadow-2xl">
            <header className="mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-emerald-600 font-black text-xs">OT #{tarea.numero_ot}</span>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                    {maquina?.nombre}
                  </h2>
                </div>
                <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded uppercase">
                  {maquina?.numero_maquina}
                </span>
              </div>
            </header>

            <div className="space-y-6">
              {/* UBICACIÓN Y DATOS TÉCNICOS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Sector</p>
                  <p className="text-sm font-bold text-slate-700">{maquina?.sector || "No especificado"}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Marca / Modelo</p>
                  <p className="text-sm font-bold text-slate-700">{maquina?.marca} - {maquina?.modelo}</p>
                </div>
              </div>

              {/* DESCRIPCIÓN DE LA TAREA */}
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Descripción de falla</p>
                <p className="text-sm text-slate-700 font-medium">{tarea.descripcion}</p>
              </div>

              {/* RECURSOS Y MANUALES */}
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual de la máquina</p>
                <div className="flex flex-col gap-2">
                  {maquina?.url_manual ? (
                    <a href={maquina.url_manual} target="_blank" className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 transition-colors group">
                      <span className="text-xs font-bold text-slate-600 uppercase">Manual de Usuario.pdf</span>
                      <span className="text-emerald-500 font-black text-xs group-hover:underline">ABRIR</span>
                    </a>
                  ) : (
                    <p className="text-[10px] text-slate-300 italic ml-1">No hay manuales cargados</p>
                  )}
                  
                  {maquina?.url_instructivo && (
                    <a href={maquina.url_instructivo} target="_blank" className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 transition-colors group">
                      <span className="text-xs font-bold text-slate-600 uppercase">Instructivo de Seguridad.pdf</span>
                      <span className="text-emerald-500 font-black text-xs group-hover:underline">ABRIR</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setIsOpen(false)}
              className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cerrar Vista
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}