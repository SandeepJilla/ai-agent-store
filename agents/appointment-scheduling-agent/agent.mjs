const state = { appointments: [] };
const normalize = (text = '') => text.toLowerCase();

export function parseSchedulingRequest(request = '') {
  const text = String(request || '');
  const nameMatch = text.match(/(?:for|name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
  const channel = /whatsapp/i.test(text) ? 'WhatsApp' : /sms|text/i.test(text) ? 'SMS' : /email/i.test(text) ? 'Email' : 'phone';
  const preferredTime = /wednesday/i.test(text) ? 'Wednesday morning' : /tuesday/i.test(text) ? 'Tuesday afternoon' : /tomorrow/i.test(text) ? 'tomorrow morning' : 'next available opening';
  const service = /hvac/i.test(text) ? 'HVAC repair' : /hair|salon/i.test(text) ? 'salon appointment' : /consult/i.test(text) ? 'consultation' : /cleaning/i.test(text) ? 'cleaning' : 'appointment';
  return { name: nameMatch?.[1] || 'Customer', service, preferredTime, channel };
}

export function checkAvailability(preferredTime = 'Tuesday afternoon') {
  const text = normalize(preferredTime);
  if (text.includes('wednesday')) return { available: true, slot: 'Wednesday 10:00 AM', calendar: 'Google Calendar' };
  if (text.includes('tomorrow')) return { available: true, slot: 'Tomorrow 9:30 AM', calendar: 'Google Calendar' };
  return { available: true, slot: 'Tuesday 2:30 PM', calendar: 'Google Calendar' };
}

export function bookAppointment({ name, service, preferredTime, channel } = {}) {
  const availability = checkAvailability(preferredTime);
  const appointment = { id: `APT-${String(state.appointments.length + 501).padStart(4, '0')}`, name: name || 'Customer', service: service || 'consultation', slot: availability.slot, channel: channel || 'WhatsApp', confirmed: true };
  appointment.reminder = `Reminder scheduled via ${appointment.channel}: ${appointment.service} for ${appointment.name} at ${appointment.slot}.`;
  state.appointments.push(appointment);
  return appointment;
}

export function rescheduleAppointment(id, preferredTime = 'Wednesday morning') {
  const appointment = state.appointments.find((item) => item.id === id) || state.appointments.at(-1) || bookAppointment({});
  appointment.slot = checkAvailability(preferredTime).slot;
  appointment.reminder = `Updated reminder via ${appointment.channel}: ${appointment.service} moved to ${appointment.slot}.`;
  return appointment;
}

export default { state, parseSchedulingRequest, checkAvailability, bookAppointment, rescheduleAppointment };
