import { list, put, del } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();

  if(req.method==='GET'){
    const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
    const meetings = await Promise.all(blobs.map(async b => {
      const r = await fetch(b.url);
      return r.json();
    }));
    meetings.sort((a,b) => new Date(b.savedAt) - new Date(a.savedAt));
    return res.status(200).json(meetings);
  }

  if(req.method==='POST'){
    const meeting = req.body;
    await put(`meetings/${meeting.id}.json`, JSON.stringify(meeting), {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: 'application/json'
    });
    return res.status(200).json({ success: true });
  }

  if(req.method==='DELETE'){
    const { id } = req.query;
    const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
    const blob = blobs.find(b => b.pathname === `meetings/${id}.json`);
    if(blob) await del(blob.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return res.status(200).json({ success: true });
  }
}
