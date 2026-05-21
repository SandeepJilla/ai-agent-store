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
