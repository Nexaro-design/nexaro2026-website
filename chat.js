// /api/chat.js
// Vercel Serverless Function — secure backend for the Nexaro Global AI chatbot.
//
// WHY THIS FILE EXISTS:
// The browser (index.html) can NEVER safely hold a real Anthropic API key —
// anyone could view-source and steal it. This function runs on Vercel's
// server, not in the visitor's browser, so the key stays private. The
// frontend calls this same-origin endpoint ("/api/chat"); this function
// calls the real Anthropic API using the key stored in Vercel's encrypted
// environment variables, and returns only the answer text to the browser.

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Basic input validation
  const { message } = req.body || {};
  if (!message || typeof message !== 'string' || message.length > 500) {
    return res.status(400).json({ error: 'Invalid or missing message (max 500 characters).' });
  }

  // The API key lives ONLY here, as a Vercel environment variable —
  // never in any file the browser can see.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server not configured. Missing ANTHROPIC_API_KEY.' });
  }

  const SYSTEM_CONTEXT = `You are the AI assistant embedded on the Nexaro Global Pty Ltd website. Nexaro Global is an IT Delivery & Digital Transformation Advisory firm founded by Lokesh Kumar Upadhyay, based in Strathfield, NSW, Australia.

Services:
1. Digital Transformation Advisory - end-to-end scoping and delivery leadership for website, platform, and process modernisation, from current-state audit through to rollout.
2. Cloud & Payments Modernisation - cards and payments platform uplift, AWS cloud migration, and legacy system transition for financial services and regulated industries.
3. IT Delivery Leadership - interim Business Analyst, Scrum Master, Product Owner, or Service Delivery Manager capacity, embedded directly into client programmes.
4. Business Case & Governance - ROI modelling, stakeholder alignment, and program governance frameworks.

Founder background: 29 years total experience - 20+ years in IT delivery across financial services (cards, payments, cloud migration, regulatory programmes), plus 8 years in Sales & Marketing in Medical/Pharmaceuticals earlier in career.

Approach: 4 steps - Current-State Assessment, Business Case & Options, Delivery Planning, Hands-On Delivery. No work starts without a costed, approvable business case.

Contact: +61 481 825 576, lok0781@outlook.com, LinkedIn (linkedin.com/in/lokesh-kumar-upadhyay-25851921).

Answer visitor questions helpfully and specifically using ONLY the information above. Keep answers to 2-4 sentences, friendly but professional. If asked something outside this scope (pricing specifics, availability, anything not listed above), say that's best discussed directly with Lokesh via the contact details, rather than guessing.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: SYSTEM_CONTEXT,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', errText);
      return res.status(502).json({ error: 'Upstream AI service error.' });
    }

    const data = await response.json();
    const textBlocks = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text);
    const reply = textBlocks.join('\n').trim() || "Sorry, I couldn't process that just now.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Serverless function error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
