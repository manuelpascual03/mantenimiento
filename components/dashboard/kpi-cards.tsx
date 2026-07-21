"use client";

interface KPICardsProps {
  pendingCount?: number;
  disponibilidad?: number;
  totalMachines?: number;
  mttr?: number;
  mtbf?: number; 
  horasParadaAnual?: number;
  costoParadaAnual?: number;
}

export function KPICards({ 
  pendingCount = 12, 
  disponibilidad = 94.2, 
  totalMachines = 8,
  mttr = 0,
  mtbf = 0,
  horasParadaAnual = 0,
  costoParadaAnual = 0
}: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {/* CARD 1: DISPONIBILIDAD */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-500">% Disponibilidad</p>
        <p className="text-3xl font-bold text-emerald-400 mt-2">{disponibilidad}</p>
      </div>

      {/* CARD 2: OTs PENDIENTES */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-500">OTs Pendientes</p>
        <p className="text-3xl font-bold text-amber-400 mt-2">{pendingCount}</p>
      </div>

      {/* CARD 3: MÁQUINAS EN PLANTA */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Máquinas en Planta</p>
        <p className="text-3xl font-bold text-blue-400 mt-2">{totalMachines}</p>
      </div>

      {/* CARD 4: MTTR */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-500">MTTR (min)</p>
        <p className="text-3xl font-bold text-purple-400 mt-2">{mttr}</p>
      </div>

      {/* CARD 5: MTBF */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-500">MTBF (min)</p>
        <p className="text-3xl font-bold text-indigo-400 mt-2">{mtbf}</p>
      </div>

      {/* CARD 6: HORAS MAQUINA PARADA ANUAL (NUEVO REQUERIMIENTO PUNTO 4) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Parada Anual (hs)</p>
        <p className="text-3xl font-bold text-red-400 mt-2">{horasParadaAnual}</p>
      </div>
    </div>
  );
}