"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNotificaciones } from "./useNotificaciones";

// ─── Íconos SVG inline (sin dependencias) ────────────────────────────────────

function IconoCampana({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function IconoCheck({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ─── Panel de notificaciones ──────────────────────────────────────────────────

interface PanelProps {
  notificaciones: any[];
  cargando: boolean;
  noLeidas: number;
  marcarLeida: (id: string) => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
  onClose: () => void;
}

function PanelNotificaciones({
  notificaciones,
  cargando,
  noLeidas,
  marcarLeida,
  marcarTodasLeidas,
  onClose,
}: PanelProps) {

  const handleMarcarLeida = async (id: string) => {
    await marcarLeida(id);
  };

  // Limitamos estrictamente a las últimas 5 notificaciones
  const notificacionesLimitadas = (notificaciones || []).slice(0, 5);

  return (
    <div
      className="
        absolute right-0 top-full mt-2 w-80 z-50
        bg-white border border-slate-200 rounded-2xl shadow-xl
        overflow-hidden
      "
      style={{ maxHeight: "420px" }}
    >
      {/* Cabecera del panel */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-bold text-slate-800">Notificaciones</span>
        {noLeidas > 0 && (
          <button
            onClick={marcarTodasLeidas}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <IconoCheck className="w-3 h-3" />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="overflow-y-auto" style={{ maxHeight: "340px" }}>
        {cargando ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
          </div>
        ) : notificacionesLimitadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <IconoCampana className="w-8 h-8 text-slate-300" />
            <p className="text-xs text-slate-400 font-medium">Sin notificaciones recientes</p>
          </div>
        ) : (
          notificacionesLimitadas.map((n) => (
            <button
              key={n.id}
              onClick={() => handleMarcarLeida(n.id)}
              className={`
                w-full text-left px-4 py-3 border-b border-slate-50
                hover:bg-slate-50 transition-colors flex items-start gap-3
                ${!n.leida ? "bg-emerald-50/60" : "bg-white"}
              `}
            >
              {/* Punto indicador */}
              <span
                className={`
                  mt-1.5 flex-shrink-0 w-2 h-2 rounded-full
                  ${!n.leida ? "bg-emerald-500" : "bg-transparent"}
                `}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold leading-tight ${!n.leida ? "text-slate-900" : "text-slate-500"}`}>
                  {n.titulo}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                  {n.mensaje}
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(n.fecha_creacion).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Botón campanita ──────────────────────────────────────────────────────────

function BotónCampana() {
  const [abierto, setAbierto] = useState(false);
  
  // UNIFICADO: Una única fuente de verdad compartida
  const { notificaciones, noLeidas, cargando, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  
  const ref = useRef<HTMLDivElement>(null);

  // Animar la campana cuando llega una nueva notificación
  const [animando, setAnimando] = useState(false);
  const prevNoLeidas = useRef(noLeidas);

  useEffect(() => {
    if (noLeidas > prevNoLeidas.current) {
      setAnimando(true);
      setTimeout(() => setAnimando(false), 600);
    }
    prevNoLeidas.current = noLeidas;
  }, [noLeidas]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 transition-all relative active:scale-95"
        aria-label="Notificaciones"
      >
        <IconoCampana
          className={`w-5 h-5 ${animando ? "animate-bounce" : ""}`}
        />

        {/* Badge de no leídas */}
        {noLeidas > 0 && (
          <span
            className="
              absolute -top-1 -right-1
              min-w-[18px] h-[18px] px-1
              bg-emerald-500 text-white
              text-[10px] font-black
              rounded-full flex items-center justify-center
              shadow-sm
            "
          >
            {noLeidas > 5 ? "5" : noLeidas}
          </span>
        )}
      </button>

      {/* Panel desplegable - Pasamos los estados unificados mediante Props */}
      {abierto && (
        <PanelNotificaciones 
          notificaciones={notificaciones}
          cargando={cargando}
          noLeidas={noLeidas}
          marcarLeida={marcarLeida}
          marcarTodasLeidas={marcarTodasLeidas}
          onClose={() => setAbierto(false)} 
        />
      )}
    </div>
  );
}

// ─── Header principal ─────────────────────────────────────────────────────────

export function Header({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { perfil, logout } = useAuth();
  const esAdmin = perfil?.rol === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shrink-0">
      <div className="h-[env(safe-area-inset-top)] w-full bg-white" />

      <div className="h-16 flex items-center justify-between px-6">
        {/* Botón hamburguesa */}
        <button
          onClick={onOpenMenu}
          className="p-2 hover:bg-slate-50 rounded-xl border border-slate-100 transition-all text-slate-600 active:scale-95"
        >
          <div className="space-y-1.5">
            <div className="w-5 h-0.5 bg-slate-600 rounded-full" />
            <div className="w-5 h-0.5 bg-slate-600 rounded-full" />
            <div className="w-5 h-0.5 bg-slate-600 rounded-full" />
          </div>
        </button>

        {/* Lado derecho */}
        <div className="flex items-center gap-5">
          {/* 🔔 Campanita discreta */}
          {esAdmin && <BotónCampana />}

          {/* Info del usuario */}
          <div className="text-right">
            <p className="text-slate-900 text-sm font-bold leading-tight">
              {perfil?.nombre_completo || "Usuario"}
            </p>
            <span className="text-[10px] text-emerald-600 font-black uppercase">
              {perfil?.rol}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="bg-slate-50 p-2 rounded-xl border border-slate-200 font-black text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            X
          </button>
        </div>
      </div>
    </header>
  );
}