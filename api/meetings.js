import { list, put, del } from '@vercel/blob';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://dalvingovender-lang.github.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'false');

  if(req.method==='OPTIONS'){
    return res.status(200).end();
  }

  if(req.method==='GET'){
    try{
      const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
      const meetings = await Promise.all(blobs.map(async b => {
        const r = await fetch(b.url);
        return r.json();
      }));
      meetings.sort((a,b) => new Date(b.savedAt) - new Date(a.savedAt));
      return res.status(200).json(meetings);
    }catch(e){
      return res.status(500).json({error: e.message});
    }
  }

  if(req.method==='POST'){
    try{
      const meeting = req.body;
      await put(`meetings/${meeting.id}.json`, JSON.stringify(meeting), {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: 'application/json',
        allowOverwrite: true
      });
      return res.status(200).json({ success: true });
    }catch(e){
      return res.status(500).json({error: e.message});
    }
  }

  if(req.method==='DELETE'){
    try{
      const { id } = req.query;
      const { blobs } = await list({ token: process.env.BLOB_READ_WRITE_TOKEN });
      const blob = blobs.find(b => b.pathname === `meetings/${id}.json`);
      if(blob) await del(blob.url, { token: process.env.BLOB_READ_WRITE_TOKEN });
      return res.status(200).json({ success: true });
    }catch(e){
      return res.status(500).json({error: e.message});
    }
  }

  return res.status(405).json({error: 'Method not allowed'});
}
