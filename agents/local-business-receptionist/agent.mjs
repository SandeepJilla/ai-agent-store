export const businessProfile = {
  name: 'BrightSmile Dental Studio',
  hours: 'Monday to Friday 8:00 AM–6:00 PM, Saturday 10:00 AM–2:00 PM, closed Sunday',
  services: [
    { name: 'dental cleaning', price: '$99', note: 'routine cleaning and exam' },
    { name: 'teeth whitening', price: '$199', note: 'in-office whitening appointment' },
    { name: 'Invisalign consult', price: 'free', note: '15-minute fit consultation' },
    { name: 'emergency dental visit', price: 'from $125', note: 'same-day pain or chipped tooth evaluation' }
  ]
};

const state = { leads: [], bookings: [] };
const normalize = (text = '') => text.toLowerCase();

export function extractName(message = '') {
  const match = message.match(/(?:my name is|i am|i'm)\s+([a-z][a-z\s.'-]{1,40})(?:,|\.|\sphone|\s\d|$)/i);
  return match ? match[1].trim().replace(/\b\w/g, (c) => c.toUpperCase()) : 'New website visitor';
}

export function extractPhone(message = '') {
  const match = message.match(/(?:\+?1[-.\s]?)?(?:(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4})/);
  return match ? match[0] : 'not provided';
}

export function detectService(message = '') {
  const text = normalize(message);
  return businessProfile.services.find((service) => text.includes(service.name.toLowerCase()) || text.includes(service.name.toLowerCase().split(' ')[0])) || businessProfile.services[0];
}

export function captureLead({ name, phone, need, channel } = {}) {
  const lead = {
    id: `lead-${String(state.leads.length + 1).padStart(3, '0')}`,
    name: name || 'New website visitor',
    phone: phone || 'not provided',
    need: need || 'general inquiry',
    channel: channel || 'website chat',
    createdAt: new Date().toISOString()
  };
  state.leads.push(lead);
  return lead;
}

export function bookAppointment({ name, service, preferredTime, channel } = {}) {
  const booking = {
    confirmed: true,
    name: name || 'New website visitor',
    service: service || 'consultation',
    preferredTime: preferredTime || 'next available opening',
    channel: channel || 'website chat'
  };
  booking.summary = `${booking.name} requested ${booking.service} for ${booking.preferredTime} via ${booking.channel}`;
  state.bookings.push(booking);
  return booking;
}

export function answer(message = '') {
  const text = normalize(message);
  if (/book|appointment|schedule|reserve|tomorrow|morning|afternoon/.test(text)) {
    const service = detectService(message);
    const lead = captureLead({ name: extractName(message), phone: extractPhone(message), need: service.name, channel: text.includes('whatsapp') ? 'WhatsApp' : 'website chat' });
    const booking = bookAppointment({ name: lead.name, service: service.name, preferredTime: /tomorrow/i.test(message) ? 'tomorrow morning' : 'next available opening', channel: lead.channel });
    return { intent: 'booking', text: `Captured ${lead.name}'s request for ${service.name}. ${booking.summary}. Owner summary is ready.` };
  }
  if (/hour|open|close|saturday|sunday|today/.test(text)) return { intent: 'hours', text: `${businessProfile.name} is open ${businessProfile.hours}.` };
  if (/price|cost|whitening|cleaning|invisalign|emergency|service/.test(text)) {
    const service = detectService(message);
    return { intent: 'pricing', text: `${service.name} is ${service.price}.` };
  }
  return { intent: 'general', text: 'I can answer hours, services, pricing, and booking questions, then hand off qualified leads.' };
}

export function ownerSummary() {
  const latestLead = state.leads.at(-1);
  const latestBooking = state.bookings.at(-1);
  if (!latestLead && !latestBooking) return 'No qualified leads yet.';
  return [
    'New Local Business AI Receptionist summary',
    `Business: ${businessProfile.name}`,
    latestLead ? `Lead: ${latestLead.name} · ${latestLead.phone} · ${latestLead.need}` : 'Lead: none captured',
    latestBooking ? `Appointment request: ${latestBooking.summary}` : 'Appointment request: not booked yet',
    latestLead ? `Source channel: ${latestLead.channel}` : 'Source channel: unknown',
    'Recommended next step: confirm availability and send intake forms.'
  ].join('\n');
}

export const receptionistAgent = { businessProfile, state, answer, captureLead, bookAppointment, ownerSummary, extractName, extractPhone, detectService };
export default receptionistAgent;
