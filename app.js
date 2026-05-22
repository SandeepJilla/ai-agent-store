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
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const debounce = (fn, delay = 180) => {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), delay);
  };
};

async function callAgentAPI(agent, action, payload) {
  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent, action, payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || `Agent API failed with HTTP ${response.status}`);
  return data.result;
}

function formatLLMResult(result) {
  if (!result) return 'No result returned.';
  const lines = [];
  if (result.answer) lines.push(result.answer);
  if (result.summary && result.summary !== result.answer) lines.push(`Summary: ${result.summary}`);
  if (result.artifact && Object.keys(result.artifact).length) lines.push(`Artifact:\n${JSON.stringify(result.artifact, null, 2)}`);
  if (Array.isArray(result.nextSteps) && result.nextSteps.length) lines.push(`Next steps:\n- ${result.nextSteps.join('\n- ')}`);
  if (result.disclaimer) lines.push(`Note: ${result.disclaimer}`);
  return lines.join('\n\n') || JSON.stringify(result, null, 2);
}


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
    <h3>${escapeHTML(run.report.title)}</h3>
    <p>${escapeHTML(run.summary)}</p>
    <ul>${run.report.sections.map((section) => `<li><b>${escapeHTML(section.heading)}:</b> ${escapeHTML(section.body)}</li>`).join('')}</ul>
    <cite>Citations: ${run.citations.map((citation) => `[${citation.id}] ${escapeHTML(citation.title)}`).join(' · ')}</cite>
  `;
}

function renderLiveSteps(container, steps, activeIndex = steps.length - 1) {
  if (!container) return;
  container.innerHTML = steps.map((step, index) => `<span class="live-step ${index <= activeIndex ? 'done' : ''}">${escapeHTML(step)}</span>`).join('');
}

function previewResearch(topic = '') {
  latestResearchRun = runResearch(topic);
  renderResearch(latestResearchRun);
  const status = document.querySelector('[data-research-status]');
  if (status) status.textContent = `Live preview: ${latestResearchRun.audience} report · ${latestResearchRun.sources.length} sources · ${latestResearchRun.report.sections.length} sections.`;
  renderLiveSteps(document.querySelector('[data-research-live-steps]'), ['Search queued', 'Sources found', 'Report drafted', 'Citations ready'], 0);
  return latestResearchRun;
}

let latestResearchRun = null;

document.querySelector('[data-run-research]')?.addEventListener('click', async () => {
  const topic = document.querySelector('[data-research-topic]')?.value || '';
  const status = document.querySelector('[data-research-status]');
  const steps = ['Calling OpenAI', 'Planning source search', 'Drafting report', 'Preparing citations'];
  const container = document.querySelector('[data-research-live-steps]');
  try {
    for (let index = 0; index < steps.length; index += 1) {
      renderLiveSteps(container, steps, index);
      if (status) status.textContent = `Production OpenAI run ${index + 1}/${steps.length}: ${steps[index]}…`;
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }
    const result = await callAgentAPI('research', 'run', { topic });
    latestResearchRun = result;
    const preview = document.querySelector('[data-report-preview]');
    if (preview) preview.innerHTML = `<span class="mono-label">OpenAI report output</span><h3>${escapeHTML(result.artifact?.title || `Research Report: ${topic}`)}</h3><pre>${escapeHTML(formatLLMResult(result))}</pre>`;
    if (status) status.textContent = `OpenAI research workflow complete using production API.`;
  } catch (error) {
    if (status) status.textContent = `OpenAI API error: ${error.message}`;
  }
});

document.querySelector('[data-research-topic]')?.addEventListener('input', debounce((event) => previewResearch(event.target.value), 120));
if (document.querySelector('[data-research-topic]')) previewResearch(document.querySelector('[data-research-topic]').value);

document.querySelectorAll('[data-export]').forEach((button) => {
  button.addEventListener('click', async () => {
    const status = document.querySelector('[data-research-status]');
    try {
      const topic = document.querySelector('[data-research-topic]')?.value || '';
      const result = await callAgentAPI('research', `export-${button.dataset.export}`, { topic, latestResearchRun });
      if (status) status.textContent = `OpenAI ${button.dataset.export.toUpperCase()} export plan ready: ${result.artifact?.fileName || 'report.' + button.dataset.export}`;
    } catch (error) {
      if (status) status.textContent = `OpenAI API error: ${error.message}`;
    }
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

document.querySelector('[data-run-support]')?.addEventListener('click', async () => {
  const message = document.querySelector('[data-support-question]')?.value || '';
  const answerOutput = document.querySelector('[data-support-answer]');
  const ticketOutput = document.querySelector('[data-ticket-output]');
  const summaryOutput = document.querySelector('[data-issue-summary]');
  if (answerOutput) answerOutput.textContent = 'Calling OpenAI support agent…';
  try {
    const result = await callAgentAPI('support', 'answer-and-ticket', { message });
    if (answerOutput) answerOutput.textContent = result.answer || formatLLMResult(result);
    if (ticketOutput) ticketOutput.textContent = JSON.stringify(result.artifact || {}, null, 2);
    if (summaryOutput) summaryOutput.textContent = result.summary || formatLLMResult(result);
  } catch (error) {
    if (answerOutput) answerOutput.textContent = `OpenAI API error: ${error.message}`;
  }
});

document.querySelector('[data-support-question]')?.addEventListener('input', debounce((event) => {
  const preview = answerFromDocs(event.target.value);
  const answerOutput = document.querySelector('[data-support-answer]');
  if (answerOutput) answerOutput.textContent = `${preview.answer} ${preview.escalate ? 'Ticket will be created on submit.' : 'No escalation needed yet.'}`;
}, 120));

document.querySelectorAll('[data-support-prompt]').forEach((button) => {
  button.addEventListener('click', async () => {
    const input = document.querySelector('[data-support-question]');
    if (input) input.value = button.dataset.supportPrompt;
    document.querySelector('[data-run-support]')?.click();
  });
});

const documentCorpus = [
  { title: 'Clinic Privacy Policy', citation: 'Clinic Privacy Policy §2.1', text: 'Patient records may only be accessed for a defined care or operations purpose using the minimum necessary standard.' },
  { title: 'Volunteer Handbook', citation: 'Volunteer Handbook p. 7', text: 'Volunteers cannot access patient records unless explicitly authorized, trained, and supervised.' },
  { title: 'HR Handbook', citation: 'HR Handbook §4.3', text: 'Employee files are confidential and retained under role-based access controls.' }
];

function askQuestion(question = '') {
  const text = normalize(question);
  const citations = documentCorpus.filter((doc) => /patient|clinic|volunteer|privacy|record/.test(text) ? /Clinic|Volunteer/.test(doc.title) : true).slice(0, 2);
  return {
    question,
    answer: `Based on uploaded policies, access should be denied unless the person has a documented role-based need and only the minimum necessary information is used. Volunteers need explicit authorization, training, and supervision before any record access.`,
    citations
  };
}

function generateSummary(documentName = 'clinic privacy policy') {
  return `Summary of ${documentName}: the policy defines who can access sensitive records, requires role-based controls, limits usage to minimum necessary information, and documents escalation steps for exceptions.`;
}

function compareDocuments(a = 'HR handbook', b = 'clinic privacy policy') {
  return {
    summary: `Key differences between ${a} and ${b}: one focuses on employee records and HR retention while the other focuses on patient privacy, care operations, and access restrictions.`,
    items: ['Different protected data classes', 'Different approval paths for exceptions', 'Different retention and audit requirements']
  };
}

function renderDocumentQA(question) {
  const answer = askQuestion(question);
  const compare = compareDocuments();
  const answerOutput = document.querySelector('[data-doc-answer]');
  const compareOutput = document.querySelector('[data-doc-compare]');
  if (answerOutput) answerOutput.textContent = `${answer.answer}\n\nCitations:\n${answer.citations.map((c) => `- ${c.citation}: ${c.text}`).join('\n')}`;
  if (compareOutput) compareOutput.textContent = `${generateSummary('clinic privacy policy')}\n\n${compare.summary}\n- ${compare.items.join('\n- ')}`;
  return { answer, compare };
}

document.querySelector('[data-run-doc]')?.addEventListener('click', async () => {
  const question = document.querySelector('[data-doc-question]')?.value || '';
  const answerOutput = document.querySelector('[data-doc-answer]');
  if (answerOutput) answerOutput.textContent = 'Calling OpenAI document agent…';
  try {
    const result = await callAgentAPI('document', 'ask', { question });
    if (answerOutput) answerOutput.textContent = formatLLMResult(result);
  } catch (error) {
    if (answerOutput) answerOutput.textContent = `OpenAI API error: ${error.message}`;
  }
});
document.querySelector('[data-compare-docs]')?.addEventListener('click', async () => {
  const question = document.querySelector('[data-doc-question]')?.value || '';
  const compareOutput = document.querySelector('[data-doc-compare]');
  if (compareOutput) compareOutput.textContent = 'Calling OpenAI document comparison agent…';
  try {
    const result = await callAgentAPI('document', 'compare', { question });
    if (compareOutput) compareOutput.textContent = formatLLMResult(result);
  } catch (error) {
    if (compareOutput) compareOutput.textContent = `OpenAI API error: ${error.message}`;
  }
});
document.querySelector('[data-doc-question]')?.addEventListener('input', debounce((event) => renderDocumentQA(event.target.value), 120));
if (document.querySelector('[data-doc-question]')) renderDocumentQA(document.querySelector('[data-doc-question]').value);

const sampleEmails = [
  { from: 'client@acme.co', subject: 'Proposal follow up', category: 'urgent', body: 'Can you send updated pricing by Friday?' },
  { from: 'billing@vendor.com', subject: 'Invoice #1842', category: 'finance', body: 'Attached invoice for $842 due next week.' },
  { from: 'events@local.org', subject: 'Receipt for registration', category: 'finance', body: 'Receipt total $129.' }
];

function parseInbox(raw = '') {
  if (!raw.trim()) return sampleEmails;
  return raw.split('\n').map((line) => {
    const [from = 'unknown@example.com', subject = 'No subject', category = 'normal', ...bodyParts] = line.split('|').map((part) => part.trim());
    const body = bodyParts.join(' | ') || line;
    const inferredCategory = /invoice|receipt|paid|due|\$\d+/i.test(`${subject} ${body}`) ? 'finance' : /urgent|asap|friday|today|client/i.test(`${subject} ${body}`) ? 'urgent' : category || 'normal';
    return { from, subject, category: category === 'normal' ? inferredCategory : category, body };
  }).filter((email) => email.subject);
}

function extractMoney(text = '') {
  return text.match(/\$[0-9][0-9,]*(?:\.\d{2})?/)?.[0];
}

function summarizeUnread(inbox = sampleEmails) {
  const emails = Array.isArray(inbox) ? inbox : parseInbox(inbox);
  const important = emails.filter((email) => ['urgent', 'finance'].includes(email.category) || /urgent|invoice|receipt|due|pricing/i.test(`${email.subject} ${email.body}`));
  const extracted = emails.flatMap((email) => {
    const amount = extractMoney(`${email.subject} ${email.body}`);
    if (!amount && !/invoice|receipt/i.test(`${email.subject} ${email.body}`)) return [];
    return [{ type: /receipt/i.test(`${email.subject} ${email.body}`) ? 'receipt' : 'invoice', vendor: email.from.split('@')[0] || 'Vendor', amount: amount || 'amount not found', due: /next week/i.test(email.body) ? 'next week' : 'not specified' }];
  });
  return {
    total: emails.length,
    important,
    extracted,
    summary: `${emails.length} unread emails: ${important.filter((email) => email.category === 'urgent').length} urgent, ${important.filter((email) => email.category === 'finance').length} finance, ${Math.max(0, emails.length - important.length)} normal. Recommended action: reply to urgent clients, save finance records, and set reminders.`
  };
}

function draftReply(context = 'client follow up') {
  const cleanContext = String(context || 'client follow up').slice(0, 90);
  return { body: `Thanks for the note — I’ll send the updated pricing and next steps today. Appreciate the follow-up.`, reminder: `Create follow up reminder for ${cleanContext} tomorrow at 9 AM.` };
}

function categorizeEmails(inbox = sampleEmails) {
  return (Array.isArray(inbox) ? inbox : parseInbox(inbox)).reduce((counts, email) => ({ ...counts, [email.category]: (counts[email.category] || 0) + 1 }), { urgent: 0, finance: 0, normal: 0 });
}

function renderEmailAssistant() {
  const inboxText = document.querySelector('[data-email-inbox]')?.value || '';
  const emails = parseInbox(inboxText);
  const digest = summarizeUnread(emails);
  const firstUrgent = digest.important.find((email) => email.category === 'urgent') || emails[0];
  const reply = draftReply(firstUrgent?.subject || 'client follow up');
  const summaryOutput = document.querySelector('[data-email-summary]');
  const replyOutput = document.querySelector('[data-email-reply]');
  if (summaryOutput) summaryOutput.textContent = `${digest.summary}\n\nImportant:\n${digest.important.map((e) => `- ${e.subject} (${e.category}) from ${e.from}`).join('\n') || '- None'}\n\nExtracted: ${digest.extracted.map((x) => `${x.type} ${x.amount}`).join(', ') || 'none'}`;
  if (replyOutput) replyOutput.textContent = `${reply.body}\n\nReminder: ${reply.reminder}`;
  return { digest, reply, emails };
}

document.querySelector('[data-run-email]')?.addEventListener('click', async () => {
  const inboxText = document.querySelector('[data-email-inbox]')?.value || '';
  const summaryOutput = document.querySelector('[data-email-summary]');
  if (summaryOutput) summaryOutput.textContent = 'Calling OpenAI email assistant…';
  try {
    const result = await callAgentAPI('email', 'summarize', { inboxText });
    if (summaryOutput) summaryOutput.textContent = formatLLMResult(result);
  } catch (error) {
    if (summaryOutput) summaryOutput.textContent = `OpenAI API error: ${error.message}`;
  }
});
document.querySelector('[data-draft-email]')?.addEventListener('click', async () => {
  const inboxText = document.querySelector('[data-email-inbox]')?.value || '';
  const replyOutput = document.querySelector('[data-email-reply]');
  if (replyOutput) replyOutput.textContent = 'Calling OpenAI reply drafter…';
  try {
    const result = await callAgentAPI('email', 'draft-reply', { inboxText });
    if (replyOutput) replyOutput.textContent = formatLLMResult(result);
  } catch (error) {
    if (replyOutput) replyOutput.textContent = `OpenAI API error: ${error.message}`;
  }
});
document.querySelector('[data-email-inbox]')?.addEventListener('input', debounce(renderEmailAssistant, 120));
if (document.querySelector('[data-email-inbox]')) renderEmailAssistant();

const schedulingState = { appointments: [] };
function parseSchedulingRequest(request = '') {
  const text = String(request || '');
  const nameMatch = text.match(/(?:for|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  const channel = /whatsapp/i.test(text) ? 'WhatsApp' : /sms|text/i.test(text) ? 'SMS' : /email/i.test(text) ? 'Email' : 'phone';
  const preferredTime = /wednesday/i.test(text) ? 'Wednesday morning' : /tuesday/i.test(text) ? 'Tuesday afternoon' : /tomorrow/i.test(text) ? 'tomorrow morning' : 'next available opening';
  const service = /hvac/i.test(text) ? 'HVAC repair' : /hair|salon/i.test(text) ? 'salon appointment' : /consult/i.test(text) ? 'consultation' : /cleaning/i.test(text) ? 'cleaning' : 'appointment';
  return { name: nameMatch?.[1] || 'Customer', service, preferredTime, channel };
}
function checkAvailability(preferredTime = 'Tuesday afternoon') {
  const text = normalize(preferredTime);
  if (text.includes('wednesday')) return { available: true, slot: 'Wednesday 10:00 AM', calendar: 'Google Calendar' };
  if (text.includes('tomorrow')) return { available: true, slot: 'Tomorrow 9:30 AM', calendar: 'Google Calendar' };
  return { available: true, slot: 'Tuesday 2:30 PM', calendar: 'Google Calendar' };
}
function bookSchedulingAppointment({ name, service, preferredTime, channel }) {
  const availability = checkAvailability(preferredTime);
  const appointment = { id: `APT-${String(schedulingState.appointments.length + 501).padStart(4, '0')}`, name: name || 'Customer', service: service || 'consultation', slot: availability.slot, channel: channel || 'WhatsApp', confirmed: true };
  appointment.reminder = `Reminder scheduled via ${appointment.channel}: ${appointment.service} for ${appointment.name} at ${appointment.slot}.`;
  schedulingState.appointments.push(appointment);
  return appointment;
}
function rescheduleAppointment(id, preferredTime = 'Wednesday morning') {
  const appointment = schedulingState.appointments.find((item) => item.id === id) || schedulingState.appointments.at(-1) || bookSchedulingAppointment({});
  appointment.slot = checkAvailability(preferredTime).slot;
  appointment.reminder = `Updated reminder via ${appointment.channel}: ${appointment.service} moved to ${appointment.slot}.`;
  return appointment;
}
function renderScheduling(reschedule = false) {
  const request = document.querySelector('[data-schedule-request]')?.value || 'Book HVAC repair for Ravi Shah on Tuesday afternoon via WhatsApp.';
  const parsed = parseSchedulingRequest(request);
  const appointment = reschedule ? rescheduleAppointment(null, 'Wednesday morning') : bookSchedulingAppointment(parsed);
  const bookingOutput = document.querySelector('[data-scheduling-booking]');
  const reminderOutput = document.querySelector('[data-scheduling-reminder]');
  if (bookingOutput) bookingOutput.textContent = `${appointment.id}\n${appointment.name} · ${appointment.service}\nSlot: ${appointment.slot}\nConfirmed: ${appointment.confirmed}\nCalendar: Google Calendar`;
  if (reminderOutput) reminderOutput.textContent = appointment.reminder;
  return appointment;
}
function previewScheduling() {
  const request = document.querySelector('[data-schedule-request]')?.value || '';
  const parsed = parseSchedulingRequest(request);
  const availability = checkAvailability(parsed.preferredTime);
  const bookingOutput = document.querySelector('[data-scheduling-booking]');
  if (bookingOutput) bookingOutput.textContent = `Parsed request\n${parsed.name} · ${parsed.service}\nAvailable slot: ${availability.slot}\nChannel: ${parsed.channel}`;
  const reminderOutput = document.querySelector('[data-scheduling-reminder]');
  if (reminderOutput) reminderOutput.textContent = `Reminder preview via ${parsed.channel}: ${parsed.service} for ${parsed.name} at ${availability.slot}.`;
}

document.querySelector('[data-run-scheduling]')?.addEventListener('click', async () => {
  const request = document.querySelector('[data-schedule-request]')?.value || '';
  const bookingOutput = document.querySelector('[data-scheduling-booking]');
  const reminderOutput = document.querySelector('[data-scheduling-reminder]');
  if (bookingOutput) bookingOutput.textContent = 'Calling OpenAI scheduling agent…';
  try {
    const result = await callAgentAPI('scheduling', 'book', { request });
    if (bookingOutput) bookingOutput.textContent = JSON.stringify(result.artifact || result, null, 2);
    if (reminderOutput) reminderOutput.textContent = result.summary || formatLLMResult(result);
  } catch (error) {
    if (bookingOutput) bookingOutput.textContent = `OpenAI API error: ${error.message}`;
  }
});
document.querySelector('[data-reschedule]')?.addEventListener('click', async () => {
  const request = document.querySelector('[data-schedule-request]')?.value || '';
  const reminderOutput = document.querySelector('[data-scheduling-reminder]');
  if (reminderOutput) reminderOutput.textContent = 'Calling OpenAI rescheduling agent…';
  try {
    const result = await callAgentAPI('scheduling', 'reschedule', { request, newTime: 'Wednesday morning' });
    if (reminderOutput) reminderOutput.textContent = formatLLMResult(result);
  } catch (error) {
    if (reminderOutput) reminderOutput.textContent = `OpenAI API error: ${error.message}`;
  }
});
document.querySelector('[data-schedule-request]')?.addEventListener('input', debounce(previewScheduling, 120));
if (document.querySelector('[data-schedule-request]')) previewScheduling();

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

async function sendChatMessage(message) {
  const log = document.querySelector('[data-chat-log]');
  if (!log || !message.trim()) return;
  appendBubble(log, message, 'user');
  appendBubble(log, 'Calling OpenAI receptionist…', 'bot');
  const pending = log.lastElementChild;
  try {
    const result = await callAgentAPI('receptionist', 'chat', { message, businessProfile });
    pending.textContent = result.answer || formatLLMResult(result);
    const output = document.querySelector('[data-summary-output]');
    if (output) output.textContent = result.summary || JSON.stringify(result.artifact || {}, null, 2) || 'No owner handoff returned.';
  } catch (error) {
    pending.textContent = `OpenAI API error: ${error.message}`;
  }
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
window.AgentMartResearchAgent = { runResearch, exportReport, renderResearch, previewResearch };
window.AgentMartSupportAgent = { answerFromDocs, createTicket, summarizeIssue, runSupportWorkflow, renderSupportWorkflow, state: supportState };
window.AgentMartDocumentQAAgent = { askQuestion, generateSummary, compareDocuments, renderDocumentQA };
window.AgentMartEmailAssistantAgent = { parseInbox, summarizeUnread, draftReply, categorizeEmails, renderEmailAssistant };
window.AgentMartSchedulingAgent = { parseSchedulingRequest, checkAvailability, bookAppointment: bookSchedulingAppointment, rescheduleAppointment, renderScheduling, previewScheduling, state: schedulingState };
