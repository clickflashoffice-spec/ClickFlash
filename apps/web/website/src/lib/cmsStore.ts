/**
 * Shared in-memory CMS page store used by the pages API route and the dynamic
 * page renderer. Extracted into its own module so it can be imported by both
 * without breaking Next.js route-handler export constraints.
 */

export interface CmsPage {
  title: string;
  slug: string;
  content: string;
  status: string;
  createdAt: string;
}

export const pagesStore = new Map<string, CmsPage>();
