export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, edad, gustos } = req.body;
  const script = `¡Ho ho ho! Hola ${nombre}, tienes ${edad} años. Me han dicho que te encantan ${gustos}. ¡Qué niño tan especial! Te traeré algo muy bonito esta Navidad.`;

  const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
  if (!HEYGEN_API_KEY) return res.status(500).json({ error: 'API Key no configurada en Vercel' });

  try {
    // 1. Generar vídeo
    const genRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        avatar_name: "Santa Claus",
        voice_id: "1bd001e7e50f421d891986a3a55c5a0d",
        script,
        background: "christmas_tree"
      })
    });

    const genData = await genRes.json();
    if (!genData.data?.video_id) throw new Error('No video_id');

    // 2. Polling
    let videoUrl = null;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await fetch(`https://api.heygen.com/v2/video/status/${genData.data.video_id}`, {
        headers: { 'X-Api-Key': HEYGEN_API_KEY }
      });
      const status = await statusRes.json();
      if (status.data?.status === 'completed') {
        videoUrl = status.data.video_url;
        break;
      }
    }

    if (!videoUrl) throw new Error('Timeout');
    res.json({ video: videoUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
