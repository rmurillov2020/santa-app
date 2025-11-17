export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  // DEBUG: PROBAR SI LA VARIABLE LLEGA
  console.log('=== DEBUG ENV VAR ===');
  console.log('HEYGEN_API_KEY preview:', process.env.HEYGEN_API_KEY ? process.env.HEYGEN_API_KEY.substring(0, 10) + '...' : 'VACÍA/UNDEFINED');
  console.log('Todos los env vars disponibles:', Object.keys(process.env).filter(key => key.includes('HEYGEN')));  // Solo las de HeyGen

  const { nombre, edad, gustos } = req.body;
  const script = `¡Ho ho ho! Hola ${nombre}, tienes ${edad} años. Me han dicho que te encantan ${gustos}. ¡Qué niño tan especial! Te traeré algo muy bonito esta Navidad.`;

  const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
  if (!HEYGEN_API_KEY) {
    console.error('ERROR: API Key está vacía!');
    return res.status(500).json({ error: 'API Key no configurada en Vercel' });
  }

  // Resto del código (usa el de tu versión anterior, con stock avatar para probar)
  try {
    console.log('Iniciando HeyGen con clave OK...');

    const payload = {
      "video_inputs": [
        {
          "character": {
            "type": "avatar",
            "avatar_id": "Angela-inblackskirt-20220820"  // Stock free para probar
          },
          "voice": {
            "type": "text",
            "voice_id": "1bd001e7e50f421d891986aad5158bc8",  // Español stock
            "input_text": script
          }
        }
      ],
      "test": true,  // Gratis para pruebas
      "dimension": {
        "width": 720,
        "height": 480
      }
    };

    const genRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('HeyGen status:', genRes.status);

    if (!genRes.ok) {
      const err = await genRes.text();
      console.error('HeyGen error:', err);
      throw new Error(`HeyGen ${genRes.status}: ${err}`);
    }

    const genData = await genRes.json();
    const videoId = genData.data?.video_id;
    if (!videoId) throw new Error('No video_id');

    // Polling (simplificado)
    let videoUrl = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await fetch(`https://api.heygen.com/v2/video/status/${videoId}`, {
        headers: { 'X-Api-Key': HEYGEN_API_KEY }
      });
      const status = await statusRes.json();
      if (status.data?.status === 'completed') {
        videoUrl = status.data.video_url;
        break;
      }
      if (status.data?.status === 'failed') throw new Error('Fallo en HeyGen');
    }

    if (!videoUrl) throw new Error('Timeout');
    res.json({ video: videoUrl });
  } catch (err) {
    console.error('Error total:', err.message);
    res.status(500).json({ error: err.message });
  }
}
