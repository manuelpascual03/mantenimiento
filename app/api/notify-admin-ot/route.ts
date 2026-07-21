import nodemailer from 'nodemailer';
import { supabase } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const { numero_ot, maquina_nombre, descripcion, prioridad } = await req.json();

    // 1. Buscamos los destinatarios reales en la tabla perfiles (vía RPC)
    const { data: admins, error: dbError } = await supabase.rpc('obtener_emails_admins');
    
    if (dbError || !admins || admins.length === 0) {
      console.error("No hay administradores configurados en la DB.");
      return new Response("No hay destinatarios", { status: 404 });
    }

    const emails = admins.map((a: any) => a.email);

    // 2. Configuramos el transporte de Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 3. Enviamos el mail a toda la lista de admins
    await transporter.sendMail({
      from: `"Mantenimiento" <${process.env.SMTP_USER}>`,
      to: emails.join(', '), // Esto enviará a todos los @micro.com.ar registrados
      subject: `NUEVA OT #${numero_ot} - ${maquina_nombre}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #059669;">Nueva Orden de Trabajo Generada</h2>
          <p><strong>Número de OT:</strong> #${numero_ot}</p>
          <p><strong>Equipo:</strong> ${maquina_nombre}</p>
          <p><strong>Prioridad:</strong> <span style="color: red;">${prioridad.toUpperCase()}</span></p>
          <hr />
          <p><strong>Descripción:</strong></p>
          <p style="background: #f9fafb; padding: 15px; border-radius: 5px;">${descripcion}</p>
          <br />
          <p style="font-size: 11px; color: #999;">Aviso automático de SGM para personal de MiCRO.</p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err: any) {
    console.error("Error enviando notificación:", err.message);
    return new Response(err.message, { status: 500 });
  }
}