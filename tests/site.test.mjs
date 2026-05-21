import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const dom = new JSDOM(html);
const { document } = dom.window;

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(document.title.includes('AgentMart'), 'title should include AgentMart');
assert(document.querySelector('h1')?.textContent.includes('Buy and sell AI agents'), 'hero headline missing');
assert(document.querySelectorAll('.agent-card').length === 4, 'expected four agent cards');
assert(document.querySelectorAll('a[href^="mailto:"]').length >= 3, 'expected email CTAs');
assert(document.querySelector('link[href="styles.css"]'), 'stylesheet link missing');
assert(document.querySelector('script[src="app.js"]'), 'script link missing');
assert(css.includes('@media (max-width: 920px)'), 'responsive breakpoint missing');
assert(css.includes('prefers-reduced-motion'), 'reduced motion handling missing');

console.log('AgentMart static checks passed');
