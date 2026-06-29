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
      const { blobs } = await list({ token, prefix: 'meetings/' });
      const meetings = await Promise.all(
        blobs.map(async b => {
          try {
            const r = await fetch(b.url);
            return await r.json();
          } catch(e) {
            return null;
          }
        })
      );
      const valid = meetings.filter(Boolean);
      valid.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      res.status(200).json(valid);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const meeting = req.body;
      if (!meeting || !meeting.id) {
        res.status(400).json({ error: 'Missing meeting id' });
        return;
      }
      // Delete any existing blobs for this meeting id first
      const { blobs } = await list({ token, prefix: 'meetings/' });
      const existing = blobs.filter(b => b.pathname.includes(meeting.id));
      if (existing.length > 0) {
        await Promise.all(existing.map(b => del(b.url, { token })));
      }
      // Save new blob
      await put(`meetings/${meeting.id}.json`, JSON.stringify(meeting), {
        access: 'public',
        token,
        contentType: 'application/json'
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
      const { blobs } = await list({ token, prefix: 'meetings/' });
      const toDelete = blobs.filter(b => b.pathname.includes(id));
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map(b => del(b.url, { token })));
      }
      res.status(200).json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
