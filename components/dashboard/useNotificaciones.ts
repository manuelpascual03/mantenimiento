"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

// Usamos estrictamente la interfaz nativa que espera tu header
export interface Notificacion {
  id: string;
  tipo: 'nueva_ot' | 'preventivo_cercano' | 'stock_critico';
  titulo: string;
  mensaje: string;
  leida: boolean; // Mantenido 100% en femenino como querés
  referencia_id?: string | null;
  fecha_creacion: string;
}

export function useNotificaciones() {
  const { perfil } = useAuth();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const esAdmin = perfil?.rol === 'admin';
  
  // Cuenta de manera reactiva y exacta las notificaciones pendientes
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  // ── 1. Cargar notificaciones existentes al montar ──────────────────────────
  const cargarNotificaciones = useCallback(async () => {
    if (!esAdmin) {
      setNotificaciones([]);
      setCargando(false);
      return;
    }
    
    setCargando(true);
    const tresDiasAtras = new Date();
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);

    try {
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .gte("fecha_creacion", tresDiasAtras.toISOString())
        .order("fecha_creacion", { ascending: false })
        .limit(5);

      if (!error && data) {
        // Mapeamos el campo de la BD a la propiedad 'leida' de tu frontend
        const mapeadas: Notificacion[] = data.map((n: any) => ({
          id: n.id,
          tipo: n.tipo,
          titulo: n.titulo,
          mensaje: n.mensaje,
          leida: n.leido !== undefined ? !!n.leido : !!n.leida,
          referencia_id: n.referencia_id,
          fecha_creacion: n.fecha_creacion
        }));
        setNotificaciones(mapeadas);
      }
    } catch (err) {
      console.error("Error cargando notificaciones:", err);
    } finally {
      setCargando(false);
    }
  }, [esAdmin]);

  useEffect(() => {
    cargarNotificaciones();
  }, [cargarNotificaciones]);

  // ── 2. Escuchar nuevas notificaciones en tiempo real ───────────────────────
  useEffect(() => {
    if (!esAdmin) return;

    const canal = supabase
      .channel("notificaciones-globales-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificaciones" },
        (payload) => {
          // Si el evento es un UPDATE provocado por marcar como leída, NO recargamos de la BD
          // para evitar que datos viejos pisen la animación y el estado optimista local.
          if (payload.eventType === "UPDATE") return;

          // Si es un INSERT (Nueva OT, Stock, Preventivo), recargamos la lista completa
          cargarNotificaciones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [esAdmin, cargarNotificaciones]);

  // ── 3. Marcar una notificación como leída ──────────────────────────────────
  const marcarLeida = useCallback(async (id: string) => {
    // Forzamos el cambio local al instante. Al pasar a true, !n.leida es false y el número baja
    setNotificaciones((prev) => 
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );

    try {
      // Impactamos la base de datos de fondo de forma silenciosa
      await supabase
        .from("notificaciones")
        .update({ leido: true })
        .eq("id", id);
    } catch (err) {
      console.error("Error al marcar leída en Supabase:", err);
    }
  }, []);

  // ── 4. Marcar todas como leídas ────────────────────────────────────────────
  const marcarTodasLeidas = useCallback(async () => {
    if (notificaciones.length === 0) return;
    
    const idsAMarcar = notificaciones.map((n) => n.id);

    // Ponemos todas las visibles en leída: true en caliente. noLeidas pasa a 0 y la burbuja desaparece
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));

    try {
      await supabase
        .from("notificaciones")
        .update({ leido: true })
        .in("id", idsAMarcar);
    } catch (err) {
      console.error("Error al marcar todas como leídas en Supabase:", err);
    }
  }, [notificaciones]);

  return { 
    notificaciones, 
    noLeidas, 
    cargando, 
    marcarLeida, 
    marcarTodasLeidas 
  };
}