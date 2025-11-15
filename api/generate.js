export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, edad, gustos } = req.body;
  const script = `¡Ho ho ho! Hola ${nombre}, tienes ${edad} años. Me han dicho que te encantan ${gustos}. ¡Qué niño tan especial! Te traeré algo muy bonito esta Navidad.`;

  const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
  if (!HEYGEN_API_KEY) return res.status(500).json({ error: 'API Key no configurada' });

  try {
    console.log('=== DEBUG INICIO ===');
    console.log('Script preview:', script.substring(0, 50) + '...');
    console.log('API Key:', HEYGEN_API_KEY.substring(0, 10) + '...');  // Oculta por seguridad

    // BODY EXACTO DE DOCS V2 (con avatar_style y dimension fuera del array)
    const payload = {
      "video_inputs": [
        {
          "character": {
            "type": "avatar",
            "avatar_id": "Santa_Fireplace_Side_public",  // TU SANTA
            "avatar_style": "normal"
          },
          "voice": {
            "type": "text",
            "voice_id": "1bd001e7e50f421d891986aad5158bc8",  // TU VOZ (cambia si falla)
            "input_text": script,
            "speed": 1.0
          }
        }
      ],
      "test": true,  // TRUE para pruebas rápidas (sin costo)
      "caption": false,
      "aspect_ratio": "16:9",
      "dimension": {
        "width": 1280,
        "height": 720
      },
      "background": "default"  // Cambia a "christmas_tree" si existe
    };

    console.log('Payload enviado:', JSON.stringify(payload, null, 2));  // DEBUG COMPLETO

    const genRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const fullResponse = await genRes.text();  // Captura TODO
    console.log('HeyGen raw response:', fullResponse);  // DEBUG CRUCIAL
    console.log('Status:', genRes.status);

    if (!genRes.ok) {
      let errorData;
      try {
        errorData = JSON.parse(fullResponse);
      } catch {
        errorData = { message: fullResponse };
      }
      console.error('HeyGen error parsed:', errorData);
      throw new Error(`HeyGen ${genRes.status}: ${JSON.stringify(errorData)}`);
    }

    const genData = JSON.parse(fullResponse);
    console.log('HeyGen data:', genData);
    const videoId = genData.data?.video_id;
    if (!videoId) throw new Error('No video_id: ' + JSON.stringify(genData));

    console.log('Video ID:', videoId);

    // POLLING CON DEBUG
    let videoUrl = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 5000));
      const statusRes = await fetch(`https://api.heygen.com/v2/video/status/${videoId}`, {
        headers: { 'X-Api-Key': HEYGEN_API_KEY }
      });
      const statusFull = await statusRes.text();
      let statusData;
      try {
        statusData = JSON.parse(statusFull);
      } catch {
        statusData = { message: statusFull };
      }
      console.log(`Polling ${i+1}: Status ${statusRes.status}, Data:`, statusData);
      if (statusData.data?.status === 'completed') {
        videoUrl = statusData.data.video_url;
        break;
      }
      if (statusData.data?.status === 'failed') {
        throw new Error('Fallo: ' + JSON.stringify(statusData.data));
      }
    }

    if (!videoUrl) throw new Error('Timeout (3 min)');
    console.log('=== DEBUG FIN: URL ===', videoUrl);
    res.json({ video: videoUrl });
  } catch (err) {
    console.error('=== ERROR TOTAL ===', err.message);
    res.status(500).json({ error: err.message });
  }
}
