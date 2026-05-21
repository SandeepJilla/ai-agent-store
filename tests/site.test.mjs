import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only' });
const { document } = dom.window;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(document.title.includes('AgentMart'), 'title should include AgentMart');
assert(document.querySelector('h1')?.textContent.includes('Buy and sell AI agents'), 'hero headline missing');
assert(document.querySelectorAll('.agent-card').length >= 5, 'expected store to include at least five agent cards');
assert(document.querySelector('[data-agent="local-business-receptionist"]'), 'Local Business AI Receptionist listing missing');
assert(document.querySelector('#receptionist-demo'), 'interactive receptionist demo missing');
assert(document.querySelector('[data-channel="website-chat"]'), 'website chat channel missing');
assert(document.querySelector('[data-channel="whatsapp"]'), 'WhatsApp channel missing');
assert(document.querySelector('[data-channel="telegram"]'), 'Telegram channel missing');
assert(document.querySelector('[data-owner-summary]'), 'owner summary panel missing');
assert(document.querySelectorAll('a[href^="mailto:"]').length >= 3, 'expected email CTAs');
assert(document.querySelector('link[href="styles.css"]'), 'stylesheet link missing');
assert(document.querySelector('script[src="app.js"]'), 'script link missing');
assert(css.includes('@media (max-width: 920px)'), 'responsive breakpoint missing');
assert(css.includes('prefers-reduced-motion'), 'reduced motion handling missing');
assert(css.includes('.receptionist-demo'), 'receptionist CSS missing');

const script = new dom.window.Function(`${app}; return window.AgentMartReceptionist;`);
const receptionist = script();
assert(receptionist, 'AgentMartReceptionist API missing');

const hoursAnswer = receptionist.answer('Are you open on Saturday?');
assert(/Saturday/i.test(hoursAnswer.text) && /10:00 AM/i.test(hoursAnswer.text), 'hours answer should mention Saturday hours');

const serviceAnswer = receptionist.answer('How much is teeth whitening?');
assert(/teeth whitening/i.test(serviceAnswer.text) && /\$199/i.test(serviceAnswer.text), 'service pricing answer should mention whitening price');

const lead = receptionist.captureLead({ name: 'Ava Patel', phone: '555-1212', need: 'teeth whitening', channel: 'website chat' });
assert(lead.id && lead.name === 'Ava Patel', 'lead capture should return saved lead');

const bookingAnswer = receptionist.answer('I want to book teeth whitening tomorrow morning. My name is Ava Patel, phone 555-1212.');
assert(bookingAnswer.intent === 'booking' && /owner summary is ready/i.test(bookingAnswer.text), 'booking intent should capture lead through chat answer');

const booking = receptionist.bookAppointment({ name: 'Ava Patel', service: 'teeth whitening', preferredTime: 'Saturday morning', channel: 'WhatsApp' });
assert(booking.confirmed && /Saturday morning/i.test(booking.summary), 'booking should confirm requested appointment window');

const ownerSummary = receptionist.ownerSummary();
assert(/Ava Patel/i.test(ownerSummary) && /teeth whitening/i.test(ownerSummary) && /WhatsApp/i.test(ownerSummary), 'owner summary should include captured lead and booking details');

console.log('AgentMart receptionist checks passed');
