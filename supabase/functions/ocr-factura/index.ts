import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("No image provided");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Eres un extractor de datos de facturas de compra. Analiza la imagen de la factura y extrae los datos en formato JSON estricto. 
Debes devolver SOLO un JSON válido con esta estructura exacta, sin texto adicional:
{
  "numero_factura": "string",
  "fecha": "YYYY-MM-DD",
  "proveedor_nombre": "string",
  "productos": [
    {
      "descripcion": "string",
      "tipo": "cajas" o "zapatos",
      "modelo": "string",
      "talla": "string o null si es caja",
      "cantidad": number,
      "precio_unitario": number,
      "total": number
    }
  ]
}
Si no puedes identificar algún campo, usa "" para strings y 0 para números. El tipo debe ser "cajas" o "zapatos" según el producto.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrae los datos de esta factura de compra:" },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_invoice",
              description: "Extract invoice data from image",
              parameters: {
                type: "object",
                properties: {
                  numero_factura: { type: "string" },
                  fecha: { type: "string", description: "Date in YYYY-MM-DD format" },
                  proveedor_nombre: { type: "string" },
                  productos: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        descripcion: { type: "string" },
                        tipo: { type: "string", enum: ["cajas", "zapatos"] },
                        modelo: { type: "string" },
                        talla: { type: "string" },
                        cantidad: { type: "number" },
                        precio_unitario: { type: "number" },
                        total: { type: "number" }
                      },
                      required: ["descripcion", "tipo", "cantidad", "precio_unitario", "total"]
                    }
                  }
                },
                required: ["numero_factura", "fecha", "proveedor_nombre", "productos"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_invoice" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido, intenta más tarde." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error: " + t);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    let extracted;
    if (toolCall) {
      extracted = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback: try parsing content as JSON
      const content = data.choices?.[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No se pudieron extraer datos de la imagen");
      }
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
