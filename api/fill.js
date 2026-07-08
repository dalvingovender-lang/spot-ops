export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) { res.status(500).json({ error: 'GROQ_API_KEY not configured' }); return; }

  const { transcript } = req.body;
  if (!transcript) { res.status(400).json({ error: 'No transcript provided' }); return; }

  const prompt = `You are extracting structured meeting notes from a Microsoft Teams transcript for the Spot Ops Banking & Telco Alignment meeting.

Extract ONLY operational content. Ignore small talk, jokes, and meta-discussion.

Return ONLY valid JSON — no explanation, no markdown, just the JSON object:
{
  "facilitator": "name of person who chaired the meeting",
  "telco_lead": "Spot Connect lead name",
  "banking_lead": "Spot Money lead name",
  "attendees": ["name1", "name2"],
  "uc_light": "g",
  "sm_light": "g",
  "cs_light": "g",
  "bc_light": "g",
  "pulse_notes": "2-3 sentence summary of platform concerns",
  "spotlights": [{"topic": "", "by": "Telco or Banking or Both", "context": "", "outcome": ""}],
  "esc_open": "bullet list of open escalations",
  "esc_unblock": "what is needed to resolve each",
  "telco_fwd": "upcoming changes for Spot Connect next 7 days",
  "bank_fwd": "upcoming changes for Spot Money next 7 days",
  "xskills": [{"what": "", "from": "", "to": "", "owner": "", "type": "Skill or Process or Tool", "status": "Planned or In progress"}],
  "actions": [{"text": "", "owner": "", "due": "YYYY-MM-DD or empty string"}]
}

Light values: g=green all good, a=amber watch this, r=red needs attention

Transcript:
${transcript.slice(0, 12000)}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Groq API error ' + response.status);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse response');

    res.status(200).json(JSON.parse(match[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
