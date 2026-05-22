# Agent source modules

This directory contains the actual runnable JavaScript code for each AgentMart demo agent. The live storefront is static, so the production page wires browser versions of these workflows through `app.js`; these modules make the underlying agent logic easy to inspect, test, and reuse.

## Agents

- `local-business-receptionist/` — chat intake, lead capture, booking request, owner handoff.
- `research-report-agent/` — LangGraph-style research workflow, citations, report export.
- `customer-support-agent/` — doc-grounded FAQ answers, escalation detection, ticket creation.
- `document-qa-compliance-agent/` — document retrieval, cited compliance answers, comparison.
- `email-assistant-agent/` — inbox parsing, priority categorization, invoice extraction, reply drafts.
- `appointment-scheduling-agent/` — request parsing, availability, booking, reminders, reschedule.

## Run tests

```bash
npm test
```
