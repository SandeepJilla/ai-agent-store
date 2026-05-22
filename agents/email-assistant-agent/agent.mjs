export const sampleEmails = [
  { from: 'client@acme.co', subject: 'Proposal follow up', category: 'urgent', body: 'Can you send updated pricing by Friday?' },
  { from: 'billing@vendor.com', subject: 'Invoice #1842', category: 'finance', body: 'Attached invoice for $842 due next week.' },
  { from: 'events@local.org', subject: 'Receipt for registration', category: 'finance', body: 'Receipt total $129.' }
];

export function parseInbox(raw = '') {
  if (!raw.trim()) return sampleEmails;
  return raw.split('\n').map((line) => {
    const [from = 'unknown@example.com', subject = 'No subject', category = 'normal', ...bodyParts] = line.split('|').map((part) => part.trim());
    const body = bodyParts.join(' | ') || line;
    const inferredCategory = /invoice|receipt|paid|due|\$\d+/i.test(`${subject} ${body}`) ? 'finance' : /urgent|asap|friday|today|client/i.test(`${subject} ${body}`) ? 'urgent' : category || 'normal';
    return { from, subject, category: category === 'normal' ? inferredCategory : category, body };
  }).filter((email) => email.subject);
}

export const extractMoney = (text = '') => text.match(/\$[0-9][0-9,]*(?:\.\d{2})?/)?.[0];

export function summarizeUnread(inbox = sampleEmails) {
  const emails = Array.isArray(inbox) ? inbox : parseInbox(inbox);
  const important = emails.filter((email) => ['urgent', 'finance'].includes(email.category) || /urgent|invoice|receipt|due|pricing/i.test(`${email.subject} ${email.body}`));
  const extracted = emails.flatMap((email) => {
    const amount = extractMoney(`${email.subject} ${email.body}`);
    if (!amount && !/invoice|receipt/i.test(`${email.subject} ${email.body}`)) return [];
    return [{ type: /receipt/i.test(`${email.subject} ${email.body}`) ? 'receipt' : 'invoice', vendor: email.from.split('@')[0] || 'Vendor', amount: amount || 'amount not found', due: /next week/i.test(email.body) ? 'next week' : 'not specified' }];
  });
  return { total: emails.length, important, extracted, summary: `${emails.length} unread emails: ${important.filter(e => e.category === 'urgent').length} urgent, ${important.filter(e => e.category === 'finance').length} finance.` };
}

export function draftReply(context = 'client follow up') {
  return { body: 'Thanks for the note — I’ll send the updated pricing and next steps today. Appreciate the follow-up.', reminder: `Create follow up reminder for ${String(context).slice(0, 90)} tomorrow at 9 AM.` };
}

export function categorizeEmails(inbox = sampleEmails) {
  return (Array.isArray(inbox) ? inbox : parseInbox(inbox)).reduce((counts, email) => ({ ...counts, [email.category]: (counts[email.category] || 0) + 1 }), { urgent: 0, finance: 0, normal: 0 });
}

export default { sampleEmails, parseInbox, extractMoney, summarizeUnread, draftReply, categorizeEmails };
