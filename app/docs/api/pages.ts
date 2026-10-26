// The docs pages, in reading order. The side menu and the "Previous / Next" links use this list.
export const DOC_PAGES = [
  { href: "/docs/api", title: "Introduction", group: "Get started" },
  { href: "/docs/api/quickstart", title: "Quickstart", group: "Get started" },
  { href: "/docs/api/authentication", title: "API keys and authentication", group: "Get started" },
  { href: "/docs/api/guides/website-form", title: "Collect sign-ups on your website", group: "Guides" },
  { href: "/docs/api/guides/server", title: "Add contacts from your server", group: "Guides" },
  { href: "/docs/api/reference/subscribe", title: "Add a contact", group: "API reference", method: "POST" },
  { href: "/docs/api/reference/lists", title: "Get your lists", group: "API reference", method: "GET" },
  { href: "/docs/api/errors", title: "Errors and rate limits", group: "API reference" },
] as const;

export type DocPage = (typeof DOC_PAGES)[number];
