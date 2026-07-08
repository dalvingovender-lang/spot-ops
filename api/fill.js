export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' }); return; }

  const { transcript } = req.body;
  if (!transcript) { res.status(400).json({ error: 'No transcript provided' }); return; }

  const prompt = `You are extracting structured meeting notes from a Microsoft Teams transcript for the Spot Ops Banking & Telco Alignment meeting (Spot Connect Telco + Spot Money Banking).

Extract ONLY operational content. Ignore small talk, jokes, and meta-discussion about tools.

Return ONLY valid JSON — no explanation, no markdown fences, just the raw JSON object:
{
  "facilitator": "name of person who chaired the meeting",
  "telco_lead": "Spot Connect lead name",
  "banking_lead": "Spot Money lead name",
  "attendees": ["name1", "name2"],
  "uc_light": "g or a or r",
  "sm_light": "g or a or r",
  "cs_light": "g or a or r",
  "bc_light": "g or a or r",
  "pulse_notes": "2-3 sentence summary of platform concerns",
  "spotlights": [{"topic": "", "by": "Telco or Banking or Both", "context": "", "outcome": ""}],
  "esc_open": "bullet list of open escalations",
  "esc_unblock": "what is needed to resolve each",
  "telco_fwd": "upcoming changes for Spot Connect next 7 days",
  "bank_fwd": "upcoming changes for Spot Money next 7 days",
  "xskills": [{"what": "", "from": "", "to": "", "owner": "", "type": "Skill or Process or Tool", "status": "Planned or In progress"}],
  "actions": [{"text": "", "owner": "", "due": "YYYY-MM-DD or empty string"}]
}

Light colours: g=green all good, a=amber watch this, r=red needs attention.

Transcript:
${transcript.slice(0, 15000)}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Anthropic API error ' + response.status);
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse response');

    res.status(200).json(JSON.parse(match[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
