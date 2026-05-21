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
assert(document.querySelectorAll('.agent-card').length >= 7, 'expected store to include at least seven agent cards');
assert(document.querySelector('[data-agent="local-business-receptionist"]'), 'Local Business AI Receptionist listing missing');
assert(document.querySelector('[data-agent="ai-research-report-agent"]'), 'AI Research/Report Agent listing missing');
assert(document.querySelector('[data-agent="small-business-customer-support-agent"]'), 'Small Business Customer Support Agent listing missing');
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
assert(document.querySelector('#research-demo'), 'interactive research agent demo missing');
assert(document.querySelector('[data-stack="langgraph"]'), 'LangGraph stack badge missing');
assert(document.querySelector('[data-research-step="search"]'), 'research search step missing');
assert(document.querySelector('[data-research-step="summarize"]'), 'research summarize step missing');
assert(document.querySelector('[data-research-step="report"]'), 'research report step missing');
assert(document.querySelector('[data-research-step="citations"]'), 'research citations step missing');
assert(document.querySelector('[data-export="pdf"]'), 'PDF export button missing');
assert(document.querySelector('[data-export="word"]'), 'Word export button missing');
assert(css.includes('.research-demo'), 'research CSS missing');
assert(document.querySelector('#support-demo'), 'interactive customer support agent demo missing');
assert(document.querySelector('[data-base="openai-cs-agents-demo"]'), 'OpenAI customer service agents demo base badge missing');
assert(document.querySelector('[data-backend="fastapi"]'), 'FastAPI backend badge missing');
assert(document.querySelector('[data-support-channel="website-chat"]'), 'support website chat channel missing');
assert(document.querySelector('[data-support-channel="email"]'), 'support email channel missing');
assert(document.querySelector('[data-support-channel="whatsapp"]'), 'support WhatsApp channel missing');
assert(document.querySelector('[data-support-channel="telegram"]'), 'support Telegram channel missing');
assert(document.querySelector('[data-support-output="ticket"]'), 'support ticket panel missing');
assert(document.querySelector('[data-support-output="summary"]'), 'support issue summary panel missing');
assert(css.includes('.support-demo'), 'support CSS missing');

const script = new dom.window.Function(`${app}; return { receptionist: window.AgentMartReceptionist, research: window.AgentMartResearchAgent, support: window.AgentMartSupportAgent };`);
const { receptionist, research, support } = script();
assert(receptionist, 'AgentMartReceptionist API missing');
assert(research, 'AgentMartResearchAgent API missing');
assert(support, 'AgentMartSupportAgent API missing');

const supportFaq = support.answerFromDocs('What is your return policy?');
assert(/30 days/i.test(supportFaq.answer) && supportFaq.source.includes('Return Policy'), 'support agent should answer FAQs from uploaded documents');

const escalation = support.answerFromDocs('I was charged twice and want a refund now');
assert(escalation.escalate === true && /human/i.test(escalation.answer), 'support agent should escalate billing-sensitive issues');

const ticket = support.createTicket({ name: 'Nora Lee', email: 'nora@example.com', issue: 'charged twice', channel: 'email' });
assert(ticket.id.startsWith('SUP-') && ticket.priority === 'high', 'support agent should create high-priority support ticket');

const issueSummary = support.summarizeIssue(ticket);
assert(/Nora Lee/i.test(issueSummary) && /charged twice/i.test(issueSummary) && /email/i.test(issueSummary), 'support agent should summarize customer issue');

const researchRun = research.runResearch('AI tools for small nonprofit fundraising');
assert(researchRun.stack === 'LangGraph', 'research agent should declare LangGraph stack');
assert(researchRun.sources.length >= 3, 'research agent should return multiple sources');
assert(researchRun.summary.includes('fundraising'), 'research summary should reflect topic');
assert(researchRun.report.sections.length >= 4, 'research report should contain structured sections');
assert(researchRun.citations.every((citation) => /https?:\/\//.test(citation.url)), 'citations should include URLs');

const pdfExport = research.exportReport(researchRun, 'pdf');
assert(pdfExport.fileName.endsWith('.pdf') && /PDF export queued/i.test(pdfExport.message), 'PDF export simulation missing');

const wordExport = research.exportReport(researchRun, 'word');
assert(wordExport.fileName.endsWith('.docx') && /Word export queued/i.test(wordExport.message), 'Word export simulation missing');

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
