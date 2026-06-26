export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { put, list, del } = await import('@vercel/blob');
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (req.method === 'GET') {
    try {
      const { blobs } = await list({ token });
      const meetings = await Promise.all(
        blobs.map(async b => {
          const r = await fetch(b.url);
          return r.json();
        })
      );
      meetings.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      res.status(200).json(meetings);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const meeting = req.body;
      await put(`meetings/${meeting.id}.json`, JSON.stringify(meeting), {
        access: 'public',
        token,
        contentType: 'application/json',
        allowOverwrite: true
      });
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      const { blobs } = await list({ token });
      const blob = blobs.find(b => b.pathname === `meetings/${id}.json`);
      if (blob) await del(blob.url, { token });
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
