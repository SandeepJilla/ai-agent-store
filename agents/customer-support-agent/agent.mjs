export const supportDocs = [
  { title: 'Return Policy FAQ', keywords: ['return', 'refund', 'exchange'], answer: 'Customers can return eligible items within 30 days with receipt or order number. Refunds go back to the original payment method after inspection.' },
  { title: 'Shipping FAQ', keywords: ['shipping', 'delivery', 'tracking'], answer: 'Standard shipping takes 3–5 business days. Customers receive tracking by email once the order ships.' },
  { title: 'Warranty and Setup Guide', keywords: ['warranty', 'setup', 'broken', 'repair'], answer: 'Most products include a 1-year limited warranty. The agent can collect photos, order number, and symptoms before routing to support.' }
];

const state = { tickets: [] };
const normalize = (text = '') => text.toLowerCase();
const extractEmail = (message = '') => message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || 'not provided';
const extractName = (message = '') => message.match(/(?:my name is|i am|i'm)\s+([a-z][a-z\s.'-]{1,40})(?:,|\.|\semail|$)/i)?.[1]?.trim().replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown customer';

export function answerFromDocs(question = '') {
  const text = normalize(question);
  const matchedDoc = supportDocs.find((doc) => doc.keywords.some((keyword) => text.includes(keyword))) || supportDocs[0];
  const escalate = /charged twice|chargeback|refund now|angry|lawsuit|cancel|billing|medical|legal|urgent/.test(text);
  const answer = escalate ? `Billing-sensitive issue detected. Create a support ticket and escalate to a human. Suggested reference: ${matchedDoc.title}.` : `${matchedDoc.answer} Source: ${matchedDoc.title}.`;
  return { answer, source: matchedDoc.title, escalate };
}

export function createTicket({ name, email, issue, channel } = {}) {
  const priority = /charged twice|billing|refund|angry|urgent|broken/.test(normalize(issue)) ? 'high' : 'normal';
  const ticket = { id: `SUP-${String(state.tickets.length + 101).padStart(4, '0')}`, name: name || 'Unknown customer', email: email || 'not provided', issue: issue || 'General support question', channel: channel || 'website chat', priority, status: priority === 'high' ? 'Escalated to human' : 'Queued for support team' };
  state.tickets.push(ticket);
  return ticket;
}

export function summarizeIssue(ticket) {
  return [`Ticket ${ticket.id} · ${ticket.priority.toUpperCase()} priority`, `Customer: ${ticket.name} (${ticket.email})`, `Channel: ${ticket.channel}`, `Issue: ${ticket.issue}`, `Status: ${ticket.status}`, 'Suggested next step: human support should verify account/order details and resolve according to policy.'].join('\n');
}

export function runSupportWorkflow(message, channel = 'website chat') {
  const response = answerFromDocs(message);
  const ticket = createTicket({ name: extractName(message), email: extractEmail(message), issue: message, channel });
  return { response, ticket, summary: summarizeIssue(ticket) };
}

export default { supportDocs, state, answerFromDocs, createTicket, summarizeIssue, runSupportWorkflow };
