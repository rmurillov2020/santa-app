export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, edad, gustos } = req.body;
  const script = `¡Ho ho ho! Hola ${nombre}, tienes ${edad} años. Me han dicho que te encantan ${gustos}. ¡Qué niño tan especial! Este año te portaste muy bien, así que te traeré algo muy bonito. ¡Nos vemos en Navidad!`;

  const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
  if (!HEYGEN_API_KEY) return res.status(500).json({ error: 'API Key no configurada' });

  try {
    console.log('Iniciando HeyGen v2 con script:', script.substring(0, 50) + '...');

    // BODY CORREGIDO PARA V2: video_inputs array
    const genRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        "video_inputs": [
          {
            "character": {
              "type": "avatar",
              "avatar_id": "Santa_Fireplace_Side_public"  // TU ID
            },
            "voice": {
              "type": "text",
              "voice_id": "79f84ce83ec34e75b600deec4c5c9de6",  // TU VOZ
              "input_text": script
            },
            "dimension": {
              "width": 1280,
              "height": 720
            }
          }
        ],
        "test": false,
        "aspect_ratio": "16:9",
        "background": "christmas_tree"  // O "default" si falla
      })
    });

    console.log('HeyGen status:', genRes.status, genRes.statusText);  // DEBUG

    if (!genRes.ok) {
      const errText = await genRes.text();
      console.error('HeyGen full error:', errText);  // DEBUG
      throw new Error(`HeyGen ${genRes.status}: ${errText}`);
    }

    const genData = await genRes.json();
    console.log('HeyGen data:', genData);  // DEBUG
    const videoId = genData.data?.video_id;
    if (!videoId) throw new Error('No video_id recibido: ' + JSON.stringify(genData));

    // POLLING MEJORADO
    let videoUrl = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 5000));  // 5s para evitar throttling
      const statusRes = await fetch(`https://api.heygen.com/v2/video/status/${videoId}`, {
        headers: { 'X-Api-Key': HEYGEN_API_KEY }
      });
      const status = await statusRes.json();
      console.log(`Polling ${i+1}: ${status.data?.status}`);  // DEBUG
      if (status.data?.status === 'completed') {
        videoUrl = status.data.video_url;
        break;
      }
      if (status.data?.status === 'failed') {
        console.error('Failed details:', status.data);
        throw new Error('Generación falló: ' + JSON.stringify(status.data));
      }
      if (status.data?.status === 'pending') console.log('Esperando en cola...');
    }

    if (!videoUrl) throw new Error('Timeout: Vídeo no completado en 3 min');
    res.json({ video: videoUrl });
  } catch (err) {
    console.error('Error total:', err.message);
    res.status(500).json({ error: err.message });
  }
}
