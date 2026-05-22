const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' }
});

const agentPrompts = {
  receptionist: `You are a production AI receptionist for BrightSmile Dental Studio. Services: dental cleaning from $99, teeth whitening $199, Invisalign consult free, emergency visits from $125. Hours: Mon-Fri 8 AM-6 PM, Sat 10 AM-2 PM, closed Sunday. Answer customer questions, capture booking details, and produce an owner handoff summary. Never claim the appointment is truly on an external calendar; say it is ready for owner confirmation.`,
  research: `You are a production AI research/report agent. Create concise research output with source-search plan, key findings, report sections, citations/search targets, caveats, and export metadata. If live browsing is unavailable, clearly label citations as recommended source targets/search URLs rather than verified fetched pages.`,
  support: `You are a production small-business customer support agent. Answer from policy context, detect escalation-sensitive issues, create ticket fields, priority, status, and team summary. Be empathetic and concise.`,
  document: `You are a production document Q&A/compliance agent. Answer only from the provided policy corpus. Include cited snippets, confidence, and document comparison when useful. If evidence is insufficient, say what document is missing.`,
  email: `You are a production email assistant. Parse unread email text, categorize priority, extract invoices/receipts, draft replies, and create reminder suggestions. Never send email; output drafts for approval.`,
  scheduling: `You are a production scheduling agent. Parse appointment requests, infer service/name/channel/preferred time, check a sample availability model, and output booking-ready details plus reminder copy. Never claim a real calendar write happened; say ready to write to Google Calendar once connected.`
};

const contextByAgent = {
  document: `Policy corpus:\n- Clinic Privacy Policy §2.1: Patient records may only be accessed for a defined care or operations purpose using the minimum necessary standard.\n- Volunteer Handbook p.7: Volunteers cannot access patient records unless explicitly authorized, trained, and supervised.\n- HR Handbook §4.3: Employee files are confidential and retained under role-based access controls.`,
  support: `Support docs:\n- Return Policy FAQ: eligible items can be returned within 30 days with receipt/order number. Refunds go to original payment method after inspection.\n- Shipping FAQ: standard shipping is 3-5 business days.\n- Warranty Guide: most products include 1-year limited warranty; collect photos, order number, symptoms.`,
  email: `Inbox format may be one email per line: from | subject | category | body.`,
  scheduling: `Sample availability: Tuesday 2:30 PM, Wednesday 10:00 AM, Tomorrow 9:30 AM. Channels supported: WhatsApp, SMS, Email, phone.`
};

async function callOpenAI(env, agent, action, payload) {
  if (!env.OPENAI_API_KEY) {
    return { error: 'OPENAI_API_KEY is not configured for this Cloudflare Pages Function.' };
  }

  const system = `${agentPrompts[agent] || agentPrompts.support}\n\nReturn ONLY valid JSON. Use this shape when possible: {"agent":"${agent}","action":"${action}","answer":"...","artifact":{},"summary":"...","nextSteps":[],"disclaimer":"..."}.`;
  const user = JSON.stringify({ agent, action, payload, context: contextByAgent[agent] || '' }, null, 2);

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || MODEL,
      temperature: 0.35,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: data?.error?.message || `OpenAI request failed with HTTP ${response.status}` };
  }

  const content = data?.choices?.[0]?.message?.content || '{}';
  try {
    return JSON.parse(content);
  } catch (error) {
    return { agent, action, answer: content, artifact: {}, summary: content, nextSteps: [] };
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const agent = String(body.agent || '').toLowerCase();
    const action = String(body.action || 'run').toLowerCase();
    if (!agent || !agentPrompts[agent]) return json({ error: 'Unknown or missing agent.' }, 400);
    const result = await callOpenAI(env, agent, action, body.payload || {});
    if (result.error) return json(result, 502);
    return json({ ok: true, provider: 'openai', model: env.OPENAI_MODEL || MODEL, result });
  } catch (error) {
    return json({ error: error.message || 'Unexpected server error' }, 500);
  }
}
