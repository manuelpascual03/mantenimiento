// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// @ts-ignore
serve(async (req: any) => {
  // Manejo de CORS para que funcione en la web localmente
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { descripcion, maquina, historial } = await req.json()
    
    // @ts-ignore
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('Falta GEMINI_API_KEY')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
      Sos un experto en mantenimiento de la empresa MiCRO. 
      El técnico reporta la falla: "${descripcion}" en la máquina: "${maquina}".
      Historial reciente: ${JSON.stringify(historial)}.
      
      Dá una respuesta técnica de máximo 3 pasos para que el operario revise. 
      Priorizá soluciones comunes para esta máquina. Responde en español y sé muy directo.
    `

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    return new Response(JSON.stringify({ response: text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: any) { // Acá agregamos : any para que no marque error.message
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    })
  }
})