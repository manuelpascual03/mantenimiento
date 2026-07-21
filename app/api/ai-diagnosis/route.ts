import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Falta API Key' }, { status: 500 });

    const isAdminReport = body.maquina === "Dashboard Global";

    // PROMPT DINÁMICO SEGÚN EL ROL [cite: 2026-02-27]
    const prompt = isAdminReport 
      ? `Sos un Consultor de Gestión de Activos Senior. 
         Analizá estos KPIs de la planta MiCRO: ${JSON.stringify(body.historial)}.
         Redactá un resumen ejecutivo de 2 párrafos sobre la salud de la planta. 
         Identificá la métrica más crítica y sugerí una acción estratégica. 
         Sé profesional, breve y directo. No hagas mención sobre el prompt, solamente 
         responde con el resumen. No hagas referencia al nombre de la planta o digas entendido, o similares.
         No uses negrita o formatos de texto extraños, solamente hace los parrafos o lista correspondientes.`
      : `Sos un experto en mantenimiento industrial de MiCRO. 
         Falla: "${body.descripcion}" en la máquina: "${body.maquina}".
         Historial: ${JSON.stringify(body.historial || [])}.
         Dá 3 pasos técnicos cortos para el operario. No contestes al prompt en si, solamente 
         lista los pasos. No hagas referencia al nombre de la planta o digas entendido, o similares. 
         Sé profesional, breve y directo.
         No uses negrita o formatos de texto extraños, solamente hace los parrafos o lista correspondientes.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    return NextResponse.json({ response: text });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}