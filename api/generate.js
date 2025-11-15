export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, edad, gustos } = req.body;
  const script = `¡Ho ho ho! Hola ${nombre}, tienes ${edad} años. Me han dicho que te encantan ${gustos}. ¡Qué niño tan especial! Este año te portaste muy bien, así que te traeré algo muy bonito. ¡Nos vemos en Navidad!`;

  const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
  if (!HEYGEN_API_KEY) return res.status(500).json({ error: 'API Key no configurada' });

  try {
    // GENERAR VÍDEO CON TUS DATOS
    const genRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        avatar_id: "Santa_Fireplace_Side_public",  // TU SANTA REAL
        voice_id: "79f84ce83ec34e75b600deec4c5c9de6",  // TU VOZ EN ESPAÑOL
        script: script,
        background: "christmas_tree",
        test: false
      })
    });

    if (!genRes.ok) {
      const err = await genRes.text();
      console.error('HeyGen Error:', err);
      throw new Error(`HeyGen ${genRes.status}: ${err}`);
    }

    const genData = await genRes.json();
    const videoId = genData.data?.video_id;
    if (!videoId) throw new Error('No video_id');

    // POLLING
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
    res.status(500).json({ error: err.message });
  }
}
