const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-button');

const setElevated = () => {
  if (header) header.dataset.elevated = window.scrollY > 8 ? 'true' : 'false';
};

window.addEventListener('scroll', setElevated, { passive: true });
setElevated();

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  if (!open) {
    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.innerHTML = `
      <a href="#agents">Agents</a>
      <a href="#receptionist-demo">Receptionist demo</a>
      <a href="#how">How it works</a>
      <a href="#builders">For builders</a>
      <a href="#pricing">Pricing</a>
    `;
    Object.assign(menu.style, {
      position: 'fixed', top: '76px', left: '18px', right: '18px', zIndex: '30',
      display: 'grid', gap: '6px', padding: '12px', background: '#fff', borderRadius: '14px',
      boxShadow: 'rgba(0,0,0,.08) 0 0 0 1px, rgba(0,0,0,.08) 0 16px 30px'
    });
    [...menu.children].forEach((a) => Object.assign(a.style, { padding: '14px', borderRadius: '10px', fontWeight: '500' }));
    menu.addEventListener('click', () => {
      menu.remove();
      menuButton.setAttribute('aria-expanded', 'false');
    });
    document.body.appendChild(menu);
  } else {
    document.querySelector('.mobile-menu')?.remove();
  }
});

const businessProfile = {
  name: 'BrightSmile Dental Studio',
  hours: 'Monday to Friday 8:00 AM–6:00 PM, Saturday 10:00 AM–2:00 PM, closed Sunday',
  services: [
    { name: 'dental cleaning', price: '$99', note: 'routine cleaning and exam' },
    { name: 'teeth whitening', price: '$199', note: 'in-office whitening appointment' },
    { name: 'Invisalign consult', price: 'free', note: '15-minute fit consultation' },
    { name: 'emergency dental visit', price: 'from $125', note: 'same-day pain or chipped tooth evaluation' }
  ]
};

const receptionistState = { leads: [], bookings: [] };

const normalize = (text = '') => text.toLowerCase();

function extractName(message) {
  const match = message.match(/(?:my name is|i am|i'm)\s+([a-z][a-z\s.'-]{1,40})(?:,|\.|\sphone|\s\d|$)/i);
  return match ? match[1].trim().replace(/\b\w/g, (c) => c.toUpperCase()) : 'New website visitor';
}

function extractPhone(message) {
  const match = message.match(/(?:\+?1[-.\s]?)?(?:(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4})/);
  return match ? match[0] : 'not provided';
}

function detectService(message) {
  const text = normalize(message);
  return businessProfile.services.find((service) => text.includes(service.name.toLowerCase().split(' ')[0]) || text.includes(service.name.toLowerCase())) || businessProfile.services[0];
}

function answer(message) {
  const text = normalize(message);
  if (/book|appointment|schedule|reserve|tomorrow|morning|afternoon/.test(text)) {
    const service = detectService(message);
    const lead = captureLead({ name: extractName(message), phone: extractPhone(message), need: service.name, channel: text.includes('whatsapp') ? 'WhatsApp' : 'website chat' });
    const booking = bookAppointment({ name: lead.name, service: service.name, preferredTime: /tomorrow/i.test(message) ? 'tomorrow morning' : 'next available opening', channel: lead.channel });
    return { intent: 'booking', text: `I can help with that. I captured ${lead.name}'s request for ${service.name} and tentatively noted ${booking.summary}. The owner summary is ready for follow-up.` };
  }
  if (/hour|open|close|saturday|sunday|today/.test(text)) {
    return { intent: 'hours', text: `Yes — ${businessProfile.name} is open ${businessProfile.hours}. Saturday hours are 10:00 AM–2:00 PM.` };
  }
  if (/price|cost|whitening|cleaning|invisalign|emergency|service/.test(text)) {
    const service = detectService(message);
    return { intent: 'pricing', text: `${service.name.replace(/\b\w/g, (c) => c.toUpperCase())} is ${service.price}. We also offer cleaning from $99, teeth whitening for $199, free Invisalign consults, and emergency visits from $125.` };
  }
  if (/phone|call|contact|lead/.test(text)) {
    return { intent: 'lead', text: 'I can capture your name, phone number, service needed, and preferred time, then send the owner a concise summary for follow-up.' };
  }
  return { intent: 'general', text: 'I can answer questions about hours, services, pricing, and appointments. For anything uncertain, I collect the details and hand off to the business owner.' };
}

function captureLead({ name, phone, need, channel }) {
  const lead = {
    id: `lead-${String(receptionistState.leads.length + 1).padStart(3, '0')}`,
    name: name || 'New website visitor',
    phone: phone || 'not provided',
    need: need || 'general inquiry',
    channel: channel || 'website chat',
    createdAt: new Date().toISOString()
  };
  receptionistState.leads.push(lead);
  return lead;
}

function bookAppointment({ name, service, preferredTime, channel }) {
  const booking = {
    confirmed: true,
    name: name || 'New website visitor',
    service: service || 'consultation',
    preferredTime: preferredTime || 'next available opening',
    channel: channel || 'website chat'
  };
  booking.summary = `${booking.name} requested ${booking.service} for ${booking.preferredTime} via ${booking.channel}`;
  receptionistState.bookings.push(booking);
  return booking;
}

function ownerSummary() {
  if (!receptionistState.leads.length && !receptionistState.bookings.length) {
    return 'No qualified leads yet. Try the booking prompt to generate a lead summary.';
  }
  const latestLead = receptionistState.leads.at(-1);
  const latestBooking = receptionistState.bookings.at(-1);
  return [
    'New Local Business AI Receptionist summary',
    `Business: ${businessProfile.name}`,
    latestLead ? `Lead: ${latestLead.name} · ${latestLead.phone} · ${latestLead.need}` : 'Lead: none captured',
    latestBooking ? `Appointment request: ${latestBooking.summary}` : 'Appointment request: not booked yet',
    latestLead ? `Source channel: ${latestLead.channel}` : 'Source channel: unknown',
    'Recommended next step: confirm availability and send intake forms.'
  ].join('\n');
}

function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'research-report';
}

function runResearch(topic = 'AI tools for small nonprofit fundraising') {
  const cleanTopic = topic.trim() || 'AI tools for small nonprofit fundraising';
  const topicLower = cleanTopic.toLowerCase();
  const audience = /student|college|school/.test(topicLower) ? 'students' : /nonprofit|fundraising/.test(topicLower) ? 'nonprofits' : /business|owner|market/.test(topicLower) ? 'business owners' : 'analysts';
  const sources = [
    { title: 'Industry overview and adoption patterns', url: `https://example.org/research/${slugify(cleanTopic)}-overview`, summary: `High-level source for market context, adoption drivers, and risks around ${cleanTopic}.` },
    { title: 'Practitioner guide and implementation checklist', url: `https://example.org/guides/${slugify(cleanTopic)}-implementation`, summary: `Action-oriented source with workflow design, staffing, tool selection, and rollout considerations for ${audience}.` },
    { title: 'Case studies and measurable outcomes', url: `https://example.org/cases/${slugify(cleanTopic)}-outcomes`, summary: `Evidence source comparing expected impact, costs, and success metrics for ${cleanTopic}.` }
  ];
  const summary = `Research summary for ${cleanTopic}: ${audience} should prioritize narrow use cases, source quality, privacy review, and measurable outcomes before scaling. For fundraising, the strongest uses are donor segmentation, grant prospecting, email drafting, and follow-up automation.`;
  const report = {
    title: `Research Report: ${cleanTopic}`,
    sections: [
      { heading: 'Executive summary', body: summary },
      { heading: 'Key findings', body: 'The agent found recurring evidence that focused workflows outperform broad chatbots, especially when paired with human review.' },
      { heading: 'Recommended workflow', body: 'Use LangGraph nodes for search, source scoring, summarization, report drafting, citation validation, and export.' },
      { heading: 'Risks and caveats', body: 'Watch for stale sources, hallucinated citations, private data exposure, and over-generalized recommendations.' }
    ]
  };
  const citations = sources.map((source, index) => ({ id: index + 1, title: source.title, url: source.url }));
  return { stack: 'LangGraph', topic: cleanTopic, audience, sources, summary, report, citations };
}

function exportReport(run, format = 'pdf') {
  const ext = format === 'word' ? 'docx' : 'pdf';
  const label = format === 'word' ? 'Word' : 'PDF';
  return {
    fileName: `${slugify(run?.topic || 'research-report')}.${ext}`,
    message: `${label} export queued with ${run?.citations?.length || 0} citations and ${run?.report?.sections?.length || 0} report sections.`
  };
}

function renderResearch(run) {
  const preview = document.querySelector('[data-report-preview]');
  if (!preview || !run) return;
  preview.innerHTML = `
    <span class="mono-label">Report preview</span>
    <h3>${run.report.title}</h3>
    <p>${run.summary}</p>
    <ul>${run.report.sections.map((section) => `<li><b>${section.heading}:</b> ${section.body}</li>`).join('')}</ul>
    <cite>Citations: ${run.citations.map((citation) => `[${citation.id}] ${citation.title}`).join(' · ')}</cite>
  `;
}

let latestResearchRun = null;

document.querySelector('[data-run-research]')?.addEventListener('click', () => {
  const topic = document.querySelector('[data-research-topic]')?.value || '';
  latestResearchRun = runResearch(topic);
  renderResearch(latestResearchRun);
  const status = document.querySelector('[data-research-status]');
  if (status) status.textContent = `LangGraph run complete: ${latestResearchRun.sources.length} sources summarized, ${latestResearchRun.report.sections.length} sections drafted, citations attached.`;
});

document.querySelectorAll('[data-export]').forEach((button) => {
  button.addEventListener('click', () => {
    latestResearchRun ||= runResearch(document.querySelector('[data-research-topic]')?.value || '');
    const result = exportReport(latestResearchRun, button.dataset.export);
    const status = document.querySelector('[data-research-status]');
    if (status) status.textContent = `${result.message} File: ${result.fileName}`;
  });
});

const supportDocs = [
  { title: 'Return Policy FAQ', keywords: ['return', 'refund', 'exchange'], answer: 'Customers can return eligible items within 30 days with receipt or order number. Refunds go back to the original payment method after inspection.' },
  { title: 'Shipping FAQ', keywords: ['shipping', 'delivery', 'tracking'], answer: 'Standard shipping takes 3–5 business days. Customers receive tracking by email once the order ships.' },
  { title: 'Warranty and Setup Guide', keywords: ['warranty', 'setup', 'broken', 'repair'], answer: 'Most products include a 1-year limited warranty. The agent can collect photos, order number, and symptoms before routing to support.' }
];

const supportState = { tickets: [] };

function answerFromDocs(question = '') {
  const text = normalize(question);
  const matchedDoc = supportDocs.find((doc) => doc.keywords.some((keyword) => text.includes(keyword))) || supportDocs[0];
  const escalate = /charged twice|chargeback|refund now|angry|lawsuit|cancel|billing|medical|legal/.test(text);
  const answer = escalate
    ? `I found a likely billing-sensitive issue. I will create a support ticket and escalate this to a human with the relevant context. Suggested doc reference: ${matchedDoc.title}.`
    : `${matchedDoc.answer} Source: ${matchedDoc.title}.`;
  return { answer, source: matchedDoc.title, escalate };
}

function createTicket({ name, email, issue, channel }) {
  const priority = /charged twice|billing|refund|angry|urgent|broken/.test(normalize(issue)) ? 'high' : 'normal';
  const ticket = {
    id: `SUP-${String(supportState.tickets.length + 101).padStart(4, '0')}`,
    name: name || 'Unknown customer',
    email: email || 'not provided',
    issue: issue || 'General support question',
    channel: channel || 'website chat',
    priority,
    status: priority === 'high' ? 'Escalated to human' : 'Queued for support team'
  };
  supportState.tickets.push(ticket);
  return ticket;
}

function summarizeIssue(ticket) {
  return [
    `Ticket ${ticket.id} · ${ticket.priority.toUpperCase()} priority`,
    `Customer: ${ticket.name} (${ticket.email})`,
    `Channel: ${ticket.channel}`,
    `Issue: ${ticket.issue}`,
    `Status: ${ticket.status}`,
    'Suggested next step: human support should reply with empathy, verify account/order details, and resolve or refund according to policy.'
  ].join('\n');
}

function extractEmail(message) {
  return message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || 'not provided';
}

function runSupportWorkflow(message, channel = 'website chat') {
  const response = answerFromDocs(message);
  const ticket = createTicket({ name: extractName(message), email: extractEmail(message), issue: message, channel });
  const summary = summarizeIssue(ticket);
  return { response, ticket, summary };
}

function renderSupportWorkflow(message) {
  const run = runSupportWorkflow(message, /email/i.test(message) ? 'email' : 'website chat');
  const answerOutput = document.querySelector('[data-support-answer]');
  const ticketOutput = document.querySelector('[data-ticket-output]');
  const summaryOutput = document.querySelector('[data-issue-summary]');
  if (answerOutput) answerOutput.textContent = run.response.answer;
  if (ticketOutput) ticketOutput.textContent = `${run.ticket.id}\nPriority: ${run.ticket.priority}\nStatus: ${run.ticket.status}\nChannel: ${run.ticket.channel}`;
  if (summaryOutput) summaryOutput.textContent = run.summary;
  return run;
}

document.querySelector('[data-run-support]')?.addEventListener('click', () => {
  renderSupportWorkflow(document.querySelector('[data-support-question]')?.value || '');
});

document.querySelectorAll('[data-support-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.querySelector('[data-support-question]');
    if (input) input.value = button.dataset.supportPrompt;
    renderSupportWorkflow(button.dataset.supportPrompt);
  });
});

function appendBubble(log, text, sender) {
  const bubble = document.createElement('div');
  bubble.className = `${sender} bubble`;
  bubble.textContent = text;
  log.appendChild(bubble);
  log.scrollTop = log.scrollHeight;
}

function updateSummary() {
  const output = document.querySelector('[data-summary-output]');
  if (output) output.textContent = ownerSummary();
}

function sendChatMessage(message) {
  const log = document.querySelector('[data-chat-log]');
  if (!log || !message.trim()) return;
  appendBubble(log, message, 'user');
  const response = answer(message);
  appendBubble(log, response.text, 'bot');
  updateSummary();
}

const chatForm = document.querySelector('[data-chat-form]');
chatForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector('[data-chat-input]');
  sendChatMessage(input.value);
  input.value = '';
});

document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => sendChatMessage(button.dataset.prompt));
});

document.querySelector('[data-copy-summary]')?.addEventListener('click', async () => {
  const text = ownerSummary();
  try { await navigator.clipboard.writeText(text); } catch (_) { /* clipboard unavailable in some previews */ }
});

window.AgentMartReceptionist = { answer, captureLead, bookAppointment, ownerSummary, state: receptionistState };
window.AgentMartResearchAgent = { runResearch, exportReport, renderResearch };
window.AgentMartSupportAgent = { answerFromDocs, createTicket, summarizeIssue, runSupportWorkflow, renderSupportWorkflow, state: supportState };
