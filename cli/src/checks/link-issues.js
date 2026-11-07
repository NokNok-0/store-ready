import { formatPlaces, urlCheck } from '../project/links.js';

/**
 * One issue for a URL the checker found. Without --verify-urls it is always an info that says the URL
 * was not opened; with --verify-urls a failed fetch is an error.
 * @param {import('../project/load-project.js').Project} project
 * @param {import('../project/links.js').FoundLink} link
 * @param {{ label: string, platform: import('../issue.js').Platform, source: string, note?: string }} options
 * @returns {Omit<import('../issue.js').Issue, 'id'>}
 */
export function linkIssue(project, link, { label, platform, source, note }) {
  const result = urlCheck(project, link.url);
  const where = `Found in: ${formatPlaces(link.places)}.`;
  const file = link.places[0].replace(/ \(.*\)$/, '');
  if (!result) {
    return {
      severity: 'info',
      platform,
      message: `${label} found: ${link.url}. Not verified: open it and confirm it loads${note ? ` (${note})` : ''}. ${where}`,
      fix: 'Open the URL in a browser, signed out, and confirm it shows the published page (not a 404, a login page or a draft). Or run the check with --verify-urls.',
      source,
      file,
    };
  }
  if (result.ok) {
    return {
      severity: 'info',
      platform,
      message: `${label} ${link.url} answered HTTP ${result.status} (--verify-urls). Only the response code was checked, not what the page says. ${where}`,
      fix: 'Read the page once and confirm it is the current, published version.',
      source,
      file,
    };
  }
  const problem = result.status !== undefined ? `returned HTTP ${result.status}` : `could not be loaded (${result.error ?? 'network error'})`;
  return {
    severity: 'error',
    platform,
    message: `${label} ${link.url} ${problem} (--verify-urls)${note ? `; ${note}` : ''}. ${where}`,
    fix: 'Publish the page at that URL (public, no sign-in) or change the URL to one that loads, then check again.',
    source,
    file,
  };
}
