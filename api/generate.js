export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, edad, gustos } = req.body;
  const script = `¡Ho ho ho! Hola ${nombre}, tienes ${edad} años. Me han dicho que te encantan ${gustos}. ¡Qué niño tan especial! Te traeré algo muy bonito esta Navidad.`;

  const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
  if (!HEYGEN_API_KEY) return res.status(500).json({ error: 'API Key no configurada' });

  try {
    console.log('=== DEBUG START ===');
    console.log('Script preview:', script.substring(0, 50) + '...');
    console.log('API Key preview:', HEYGEN_API_KEY.substring(0, 10) + '...');

    // BODY EXACTO DE DOCS V2 PARA TALKING PHOTO (tu Santa es photo, no avatar)
    const payload = {
      "video_inputs": [
        {
          "character": {
            "type": "talking_photo",  // ← CLAVE: Para Santa_Fireplace_Side_public
            "talking_photo_id": "Santa_Fireplace_Side_public"  // ← ID como photo
          },
          "voice": {
            "type": "text",
            "voice_id": "79f84ce83ec34e75b600deec4c5c9de6",  // TU VOZ
            "input_text": script,
            "speed": 1.0
          },
          "background": {
            "type": "color",
            "color": "#ffffff"  // Blanco simple; cambia a video URL si quieres
          }
        }
      ],
      "test": true,  // ← GRATIS para pruebas (sin créditos)
      "caption": false,
      "dimension": {
        "width": 720,  // Baja res para free tier
        "height": 1280
      },
      "aspect_ratio": "9:16"  // Vertical para móviles
    };

    console.log('Payload JSON:', JSON.stringify(payload, null, 2));

    const genRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const fullResponse = await genRes.text();
    console.log('HeyGen status:', genRes.status);
    console.log('HeyGen raw response (first 500 chars):', fullResponse.substring(0, 500) + '...');

    if (!genRes.ok) {
      let errorData = fullResponse;
      try {
        errorData = JSON.parse(fullResponse);
      } catch (e) {
        console.error('Parse error:', e);
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
      await new Promise(r => setTimeout(r, 5000));  // 5s para free tier
      const statusRes = await fetch(`https://api.heygen.com/v2/video/status/${videoId}`, {
        headers: { 'X-Api-Key': HEYGEN_API_KEY }
      });
      const statusFull = await statusRes.text();
      let statusData = statusFull;
      try {
        statusData = JSON.parse(statusFull);
      } catch (e) {
        console.error('Status parse error:', e);
      }
      console.log(`Polling ${i+1}: Status ${statusRes.status}, Data preview:`, JSON.stringify(statusData).substring(0, 200));
      if (statusData.data?.status === 'completed') {
        videoUrl = statusData.data.video_url;
        break;
      }
      if (statusData.data?.status === 'failed') {
        throw new Error('Fallo: ' + JSON.stringify(statusData.data));
      }
    }

    if (!videoUrl) throw new Error('Timeout (3 min)');
    console.log('=== SUCCESS URL ===', videoUrl);
    res.json({ video: videoUrl });
  } catch (err) {
    console.error('=== TOTAL ERROR ===', err.message);
    res.status(500).json({ error: err.message });
  }
}
