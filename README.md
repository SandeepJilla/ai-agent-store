# AgentMart — AI Agent Store

A premium static storefront for sellable AI agent demos. The live site shows six realtime, in-browser product demos and this repository now includes the standalone source code for each agent workflow.

**Live site:** https://ai-agent-store-285.pages.dev

## Repository structure

```text
index.html                  # Storefront markup
styles.css                  # Apple-inspired visual design
app.js                      # Browser wiring for the realtime demos
agents/                     # Actual standalone source code for each demo agent
  local-business-receptionist/agent.mjs
  research-report-agent/agent.mjs
  customer-support-agent/agent.mjs
  document-qa-compliance-agent/agent.mjs
  email-assistant-agent/agent.mjs
  appointment-scheduling-agent/agent.mjs
tests/site.test.mjs         # Storefront + standalone agent module tests
```

## Agent source modules

- **Local Business AI Receptionist** — live chat, lead capture, appointment request, owner handoff.
- **AI Research/Report Agent** — LangGraph-style research flow, citations, report sections, export metadata.
- **Small Business Customer Support Agent** — FAQ retrieval, escalation detection, ticket creation, issue summary.
- **Document Q&A / Compliance Agent** — document retrieval, cited answers, summaries, policy comparison.
- **Email Assistant Agent** — inbox parsing, urgency categorization, invoice/receipt extraction, reply drafts.
- **Appointment Booking / Scheduling Agent** — request parsing, availability check, booking, reminders, reschedule.

## Local preview

```bash
npm install
npm test
python3 -m http.server 4174
```

Then open `http://127.0.0.1:4174`.

## Deploy

This is a static site. Deploy the folder root to Cloudflare Pages, GitHub Pages, Netlify, or Vercel.

The current Cloudflare Pages deployment is managed from this repo and published at:

```text
https://ai-agent-store-285.pages.dev
```

## Note

The demos are frontend-safe simulations meant to prove workflow behavior and buyer value. Production versions would connect these modules to real APIs such as Gmail, Google Calendar, Twilio/WhatsApp, document upload/vector search, ticketing systems, and payment/onboarding flows.
