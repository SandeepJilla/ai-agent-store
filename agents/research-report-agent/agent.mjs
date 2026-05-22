const slugify = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'research-report';

export function runResearch(topic = 'AI tools for small nonprofit fundraising') {
  const cleanTopic = topic.trim() || 'AI tools for small nonprofit fundraising';
  const topicLower = cleanTopic.toLowerCase();
  const audience = /student|college|school/.test(topicLower) ? 'students' : /nonprofit|fundraising/.test(topicLower) ? 'nonprofits' : /business|owner|market/.test(topicLower) ? 'business owners' : 'analysts';
  const sources = [
    { title: 'Industry overview and adoption patterns', url: `https://example.org/research/${slugify(cleanTopic)}-overview`, summary: `Market context and adoption drivers around ${cleanTopic}.` },
    { title: 'Practitioner implementation guide', url: `https://example.org/guides/${slugify(cleanTopic)}-implementation`, summary: `Workflow design, staffing, tool selection, and rollout steps for ${audience}.` },
    { title: 'Case studies and measurable outcomes', url: `https://example.org/cases/${slugify(cleanTopic)}-outcomes`, summary: `Expected impact, costs, and success metrics for ${cleanTopic}.` }
  ];
  const summary = `Research summary for ${cleanTopic}: ${audience} should prioritize narrow use cases, source quality, privacy review, and measurable outcomes before scaling.`;
  const report = {
    title: `Research Report: ${cleanTopic}`,
    sections: [
      { heading: 'Executive summary', body: summary },
      { heading: 'Key findings', body: 'Focused workflows outperform broad chatbots when paired with human review.' },
      { heading: 'Recommended workflow', body: 'Use LangGraph nodes for search, source scoring, summarization, report drafting, citation validation, and export.' },
      { heading: 'Risks and caveats', body: 'Watch for stale sources, hallucinated citations, private data exposure, and over-generalized recommendations.' }
    ]
  };
  return { stack: 'LangGraph', topic: cleanTopic, audience, sources, summary, report, citations: sources.map((source, i) => ({ id: i + 1, title: source.title, url: source.url })) };
}

export function exportReport(run, format = 'pdf') {
  const ext = format === 'word' ? 'docx' : 'pdf';
  const label = format === 'word' ? 'Word' : 'PDF';
  return { fileName: `${slugify(run?.topic || 'research-report')}.${ext}`, message: `${label} export queued with ${run?.citations?.length || 0} citations and ${run?.report?.sections?.length || 0} report sections.` };
}

export async function runWorkflow(topic, onStep = () => {}) {
  const steps = ['search', 'summarize', 'report', 'citations'];
  for (const step of steps) onStep(step);
  const run = runResearch(topic);
  return { steps, run };
}

export default { runResearch, exportReport, runWorkflow };
