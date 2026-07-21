import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const hoy = new Date();
    const dosSemanasDespues = new Date();
    dosSemanasDespues.setDate(hoy.getDate() + 14);

    // 1. Buscamos en 'maquinas' los preventivos cercanos
    const { data: proximosPreventivos, error: errPrev } = await supabase
      .from('maquinas') // TABLA CORRECTA
      .select(`
        id,
        nombre,
        proximo_preventivo,
        maquina_repuestos (
          cantidad_necesaria,
          repuestos (
            nombre,
            stock_actual
          )
        )
      `)
      .gte('proximo_preventivo', hoy.toISOString().split('T')[0])
      .lte('proximo_preventivo', dosSemanasDespues.toISOString().split('T')[0]);

    if (errPrev) throw errPrev;

    // 2. Lógica de comparación de stock
    const faltantes: any[] = [];
    
    proximosPreventivos?.forEach(maquina => {
      maquina.maquina_repuestos.forEach((rel: any) => {
        const stockActual = rel.repuestos?.stock_actual || 0;
        const necesaria = rel.cantidad_necesaria;

        if (stockActual < necesaria) {
          faltantes.push({
            maquina: maquina.nombre,
            repuesto: rel.repuestos?.nombre,
            necesario: necesaria,
            disponible: stockActual,
            fecha: maquina.proximo_preventivo
          });
        }
      });
    });

    if (faltantes.length === 0) {
      return new Response("Stock OK", { status: 200 });
    }

    // 3. Obtener correos de admins (Usando tu función SQL)
    const { data: admins } = await supabase.rpc('obtener_emails_admins');
    const emails = admins?.map((a: any) => a.email).join(', ') || 'tu-email@ejemplo.com';

    // 4. Envío de Nodemailer (Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const listaHtml = faltantes.map(f => `
      <li>
        <strong>${f.maquina}</strong>: Falta ${f.repuesto} 
        (Necesario: ${f.necesario} | En Stock: ${f.disponible})
        <br><small>Mantenimiento programado: ${f.fecha}</small>
      </li>
    `).join('');

    await transporter.sendMail({
      from: `"Mantenimiento - Stock" <${process.env.SMTP_USER}>`,
      to: emails,
      subject: `ALERTA DE STOCK: Preventivos Próximos`,
      html: `
        <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #b91c1c;">Faltante de Repuestos Detectado</h2>
          <p>Los siguientes activos tienen mantenimientos programados en los próximos 14 días y no cuentan con stock suficiente:</p>
          <ul>${listaHtml}</ul>
          <p>Se recomienda gestionar la compra a la brevedad.</p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}