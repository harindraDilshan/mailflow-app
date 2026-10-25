import { Suspense } from "react";
import Link from "next/link";
import { getLoggedInUser } from "@/lib/auth";
import { listOwnedLists } from "@/lib/contacts";
import { getApiExamples } from "@/lib/docs/api-examples";
import { CodeBlock } from "@/components/docs/code-block";
import { CopyButton } from "@/components/copy-button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";

export const metadata = {
  title: "Developer API Documentation — Mailflow",
  description: "Official developer API documentation for Mailflow subscriber collection and integration.",
};

const SECTIONS = [
  { id: "overview", label: "1. Overview" },
  { id: "three-ways", label: "2. The Three Ways" },
  { id: "signup-flow", label: "3. How a Sign-Up Flows" },
  { id: "api-keys", label: "4. API Keys" },
  { id: "quick-start", label: "5. Quick Start" },
  { id: "authentication", label: "6. Authentication" },
  { id: "endpoints", label: "7. Endpoint Reference" },
  { id: "code-examples", label: "8. Code Examples" },
  { id: "embed-form", label: "9. Embed Form" },
  { id: "cors", label: "10. Allowed Websites and CORS" },
  { id: "errors", label: "11. Error Reference" },
  { id: "rate-limits", label: "12. Rate Limits" },
  { id: "use-cases", label: "13. Real Examples" },
  { id: "special-cases", label: "14. Special Cases" },
  { id: "security", label: "15. Security Tips" },
  { id: "testing", label: "16. Local Testing" },
  { id: "feature-status", label: "17. Feature Status" },
  { id: "faq", label: "18. FAQ" },
];

export default function ApiDocsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6 text-xs text-muted-foreground">
          Loading documentation...
        </div>
      }
    >
      <ApiDocsContent />
    </Suspense>
  );
}

async function ApiDocsContent() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const examples = getApiExamples(appUrl);

  const user = await getLoggedInUser();
  let userLists: { id: string; name: string }[] = [];
  if (user) {
    try {
      const lists = await listOwnedLists(user.$id);
      userLists = lists.map((l) => ({ id: l.$id, name: l.name }));
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-sm">
              <span className="rounded bg-primary px-2 py-0.5 font-mono text-xs text-primary-foreground">API</span>
              <span>Mailflow Developer Documentation</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {user ? (
              <Link href="/developers" className="text-muted-foreground hover:text-foreground">
                Manage Keys →
              </Link>
            ) : (
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Log In →
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Navigation Sidebar (Table of Contents) */}
        <aside className="w-full shrink-0 border-b border-border p-4 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:w-64 lg:overflow-y-auto lg:border-b-0 lg:border-r lg:p-6">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Table of Contents
          </div>
          <nav className="flex flex-wrap gap-1 lg:flex-col lg:space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </nav>

          {/* User lists box (visible only when logged in) */}
          {user && (
            <div className="mt-8 rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <div className="font-semibold text-foreground">Your Lists</div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Use these IDs in your API calls:
              </p>
              {userLists.length === 0 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">No lists found.</p>
              ) : (
                <div className="mt-2 space-y-1.5 font-mono text-[11px]">
                  {userLists.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-1 rounded bg-background p-1 border border-border/50">
                      <span className="truncate max-w-[120px] font-sans text-xs">{l.name}</span>
                      <CopyButton text={l.id} />
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 border-t border-border/50 pt-2 text-[11px]">
                <Link href="/developers" className="text-primary hover:underline">
                  Open Developers Page →
                </Link>
              </div>
            </div>
          )}
        </aside>

        {/* Content Body */}
        <main className="min-w-0 flex-1 px-4 py-8 md:px-10 lg:py-12 space-y-16">
          {/* Section 1: Overview */}
          <section id="overview" className="scroll-mt-20 space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Developer API Reference (v1)
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This API collects new subscribers for your email lists.
              It handles double opt-in verification.
              It does not send broadcast marketing campaigns.
              You create and dispatch marketing campaigns from the Mailflow dashboard.
            </p>
            <div className="rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground space-y-1">
              <div><b>Base URL:</b> <code className="font-mono text-foreground">{appUrl}/api/v1</code></div>
              <div><b>Protocol:</b> HTTPS (or HTTP for local testing)</div>
              <div><b>Data Format:</b> JSON (<code className="font-mono">application/json</code>) and Form Data</div>
            </div>
          </section>

          {/* Section 2: The Three Ways */}
          <section id="three-ways" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">2. The Three Ways to Collect Subscribers</h2>
            <p className="text-sm text-muted-foreground">
              Choose the method that matches your system:
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-3">Method</th>
                    <th className="p-3">Skill Level</th>
                    <th className="p-3">Where It Runs</th>
                    <th className="p-3">When to Use</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 font-semibold text-foreground">Hosted Link</td>
                    <td className="p-3">No code</td>
                    <td className="p-3">Mailflow servers</td>
                    <td className="p-3">Social media bios, direct links, or when you have no website.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-foreground">Embed Form</td>
                    <td className="p-3">Copy & paste</td>
                    <td className="p-3">Your website HTML</td>
                    <td className="p-3">Static sites, WordPress, Webflow, or blogs. Works with or without JavaScript.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-foreground">HTTP API</td>
                    <td className="p-3">Developer</td>
                    <td className="p-3">Your web app or backend</td>
                    <td className="p-3">Custom checkouts, mobile applications, or custom pop-ups.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 3: How a Sign-Up Flows */}
          <section id="signup-flow" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">3. How a Sign-Up Flows</h2>
            <p className="text-sm text-muted-foreground">
              Every subscriber must complete double opt-in.
              This prevents spam, invalid email records, and delivery complaints.
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-xs text-muted-foreground">
              <li><b>Visitor enters data:</b> The user submits an email address on your form or site.</li>
              <li><b>Request is validated:</b> Mailflow verifies the API key, rate limits, and origin.</li>
              <li><b>Pending state saved:</b> Mailflow stores the contact with status <code className="font-mono">pending</code>.</li>
              <li><b>Confirmation email queued:</b> A background worker prepares the verification email.</li>
              <li><b>Visitor clicks link:</b> The email contains a secure token valid for 48 hours.</li>
              <li><b>Status changes to active:</b> The visitor clicks the confirmation button. Mailflow sets status to <code className="font-mono">active</code>.</li>
              <li><b>Campaigns start:</b> Only contacts with status <code className="font-mono">active</code> receive marketing emails.</li>
            </ol>
          </section>

          {/* Section 4: API Keys */}
          <section id="api-keys" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">4. API Keys</h2>
            <p className="text-sm text-muted-foreground">
              Mailflow uses two types of API keys. Never mix their purposes:
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-3">Property</th>
                    <th className="p-3">Public Key (<code className="font-mono">pk_live_...</code>)</th>
                    <th className="p-3">Secret Key (<code className="font-mono">sk_live_...</code>)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 font-medium text-foreground">Where to use</td>
                    <td className="p-3">Client-side HTML, frontend JavaScript, mobile web.</td>
                    <td className="p-3">Server-side code only (Node.js, Python, PHP, Ruby, Go).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Scope</td>
                    <td className="p-3">Tied to one specific list.</td>
                    <td className="p-3">Access to all lists owned by your account.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Tags Allowed</td>
                    <td className="p-3">No. Visitors cannot tag themselves.</td>
                    <td className="p-3">Yes. Backends can assign segmentation tags.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Origin Protection</td>
                    <td className="p-3">Required. Must match an allowed website.</td>
                    <td className="p-3">Refused if sent with an Origin header from a browser.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Visibility</td>
                    <td className="p-3">Stored in plain text; displayed in embed snippets.</td>
                    <td className="p-3">Shown once upon creation. Never stored in plain text.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive">
              <ShieldAlert className="size-4 shrink-0 mt-0.5" />
              <div>
                <b>Important security rule:</b> Never put a secret key in frontend code, public repositories, or mobile app bundles.
                If you leak a secret key, revoke it immediately in the Developers dashboard.
              </div>
            </div>
          </section>

          {/* Section 5: Quick Start */}
          <section id="quick-start" className="scroll-mt-20 space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">5. Quick Start (5 Minutes)</h2>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">A. Use the Hosted Page</h3>
              <p className="text-xs text-muted-foreground">
                1. Open <b>Audience → Lists</b> and select <b>Hosted Form</b>.
                2. Set sender name and sender email.
                3. Switch the hosted page to active.
                4. Copy the link: <code className="font-mono">{appUrl}/s/LIST_ID</code>.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">B. Paste the Embed Snippet</h3>
              <p className="text-xs text-muted-foreground">
                Generate a public key for your list in <b>API & Developers</b>.
                Add your website domain (for example, <code className="font-mono">https://www.example.com</code>).
                Copy the HTML snippet below and paste it into your page:
              </p>
              <CodeBlock code={examples.embedSnippet} language="html" />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">C. Send your first API call</h3>
              <p className="text-xs text-muted-foreground">
                Run this cURL command from your terminal:
              </p>
              <CodeBlock code={examples.curlSecret} language="bash" />
            </div>
          </section>

          {/* Section 6: Authentication */}
          <section id="authentication" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">6. Authentication</h2>
            <p className="text-sm text-muted-foreground">
              You can deliver your API key in three ways:
            </p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div>1. <b>Bearer Token (Recommended for servers):</b> <code className="font-mono text-foreground">Authorization: Bearer sk_live_...</code></div>
              <div>2. <b>Header:</b> <code className="font-mono text-foreground">X-Api-Key: sk_live_...</code></div>
              <div>3. <b>JSON Body / Form field:</b> <code className="font-mono text-foreground">{`{"key": "pk_live_..."}`}</code> (Standard for public keys)</div>
            </div>
            <p className="text-xs text-muted-foreground">
              The API validates the key format with a regular expression before checking the database.
            </p>
          </section>

          {/* Section 7: Endpoint Reference */}
          <section id="endpoints" className="scroll-mt-20 space-y-8">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">7. Endpoint Reference</h2>

            {/* POST /api/v1/subscribe */}
            <div className="space-y-3 rounded-xl border border-border p-4 md:p-6 bg-card">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="font-mono text-xs">POST</Badge>
                <code className="text-sm font-bold text-foreground">/api/v1/subscribe</code>
              </div>
              <p className="text-xs text-muted-foreground">
                Subscribes an email address to one or more lists.
                Accepts public keys (from allowed browser origins) and secret keys (from servers).
              </p>

              <div className="pt-2">
                <div className="text-xs font-semibold text-foreground mb-2">Request Body Fields</div>
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="p-2">Field</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Required</th>
                        <th className="p-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-2 font-mono">email</td>
                        <td className="p-2">string</td>
                        <td className="p-2">Yes</td>
                        <td className="p-2">Subscriber email. Normalized to lower case.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">name</td>
                        <td className="p-2">string</td>
                        <td className="p-2">No</td>
                        <td className="p-2">Full name of the contact (maximum 200 characters).</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">key</td>
                        <td className="p-2">string</td>
                        <td className="p-2">Conditional</td>
                        <td className="p-2">API key if not supplied via header.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">listIds</td>
                        <td className="p-2">array of strings</td>
                        <td className="p-2">Secret keys only</td>
                        <td className="p-2">1 to 5 list IDs owned by your account. Ignored for public keys.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">tags</td>
                        <td className="p-2">array of strings</td>
                        <td className="p-2">No</td>
                        <td className="p-2">Tags to assign. Only accepted with secret keys. Ignored for public keys.</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">hp_field</td>
                        <td className="p-2">string</td>
                        <td className="p-2">No</td>
                        <td className="p-2">Honeypot trap. If filled, request succeeds without saving.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-2">
                <div className="text-xs font-semibold text-foreground mb-1">Success Response (200 OK)</div>
                <CodeBlock code={examples.subscribeSuccess} language="json" />
              </div>
            </div>

            {/* GET /api/v1/lists */}
            <div className="space-y-3 rounded-xl border border-border p-4 md:p-6 bg-card">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-xs">GET</Badge>
                <code className="text-sm font-bold text-foreground">/api/v1/lists</code>
              </div>
              <p className="text-xs text-muted-foreground">
                Returns all active subscriber lists for your account. Requires a secret key.
                Browser requests containing an <code className="font-mono">Origin</code> header are refused.
              </p>
              <div className="pt-2">
                <div className="text-xs font-semibold text-foreground mb-1">Success Response (200 OK)</div>
                <CodeBlock code={examples.listsSuccess} language="json" />
              </div>
            </div>
          </section>

          {/* Section 8: Code Examples */}
          <section id="code-examples" className="scroll-mt-20 space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">8. Code Examples</h2>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground">cURL (Server)</h3>
              <CodeBlock code={examples.curlSecret} language="bash" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground">JavaScript (Browser fetch)</h3>
              <CodeBlock code={examples.jsBrowser} language="javascript" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground">Node.js (Server)</h3>
              <CodeBlock code={examples.nodeServer} language="javascript" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground">Python (requests)</h3>
              <CodeBlock code={examples.pythonServer} language="python" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground">PHP (cURL)</h3>
              <CodeBlock code={examples.phpServer} language="php" />
            </div>
          </section>

          {/* Section 9: Embed Form */}
          <section id="embed-form" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">9. Embed Form Architecture</h2>
            <p className="text-sm text-muted-foreground">
              The embed form works in two modes:
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-xs text-muted-foreground">
              <li><b>Without JavaScript:</b> The browser submits native form-encoded data. Mailflow returns an HTTP 303 redirect to the thank-you landing page.</li>
              <li><b>With JavaScript:</b> The helper script intercepts the submission, sends JSON via <code className="font-mono">fetch</code>, and updates the status message in place.</li>
              <li><b>Honeypot:</b> The field <code className="font-mono">hp_field</code> is positioned off-screen. Automated spam bots fill this field. Mailflow returns success but discards bot entries.</li>
            </ul>
          </section>

          {/* Section 10: Allowed Websites and CORS */}
          <section id="cors" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">10. Allowed Websites and CORS</h2>
            <p className="text-sm text-muted-foreground">
              Browsers enforce Cross-Origin Resource Sharing (CORS).
              When a webpage makes a request to Mailflow, the browser sends an <code className="font-mono">Origin</code> header.
            </p>
            <div className="rounded-lg border border-border p-4 text-xs text-muted-foreground space-y-2">
              <div className="font-semibold text-foreground">CORS Troubleshooting Checklist:</div>
              <div>1. <b>Exact domain match:</b> <code className="font-mono">https://example.com</code> and <code className="font-mono">https://www.example.com</code> are different origins. Add both if needed.</div>
              <div>2. <b>Protocol required:</b> Include the scheme: <code className="font-mono">https://</code> (or <code className="font-mono">http://</code> for local dev).</div>
              <div>3. <b>No path:</b> Do not include paths or trailing slashes (write <code className="font-mono">https://example.com</code>, not <code className="font-mono">https://example.com/</code>).</div>
              <div>4. <b>Public key only:</b> Never make browser calls using secret keys.</div>
            </div>
          </section>

          {/* Section 11: Errors */}
          <section id="errors" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">11. Error Reference</h2>
            <p className="text-sm text-muted-foreground">
              All error responses return uniform JSON with an error code and a tracking request ID:
            </p>
            <CodeBlock code={examples.errorSample} language="json" />

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-2.5">HTTP</th>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Meaning</th>
                    <th className="p-2.5">Action to Take</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-2.5 font-mono">400</td>
                    <td className="p-2.5 font-mono">invalid_request</td>
                    <td className="p-2.5">Request body could not be parsed.</td>
                    <td className="p-2.5">Send valid JSON or form data.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">400</td>
                    <td className="p-2.5 font-mono">invalid_email</td>
                    <td className="p-2.5">Email syntax is invalid.</td>
                    <td className="p-2.5">Prompt the visitor for a correct address.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">400</td>
                    <td className="p-2.5 font-mono">list_not_found</td>
                    <td className="p-2.5">List ID does not exist or belongs to another account.</td>
                    <td className="p-2.5">Check list ID in the Mailflow dashboard.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">400</td>
                    <td className="p-2.5 font-mono">list_not_configured</td>
                    <td className="p-2.5">List has no sender email configured.</td>
                    <td className="p-2.5">Set a confirmation sender in list settings.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">401</td>
                    <td className="p-2.5 font-mono">invalid_key</td>
                    <td className="p-2.5">API key is missing, invalid, or revoked.</td>
                    <td className="p-2.5">Verify your key in the Developers dashboard.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">403</td>
                    <td className="p-2.5 font-mono">origin_not_allowed</td>
                    <td className="p-2.5">Browser origin not in key's allowed websites.</td>
                    <td className="p-2.5">Add your website origin to the public key.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">403</td>
                    <td className="p-2.5 font-mono">secret_key_in_browser</td>
                    <td className="p-2.5">Secret key used from a browser.</td>
                    <td className="p-2.5">Switch to a public key or call from server.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">403</td>
                    <td className="p-2.5 font-mono">contact_limit_reached</td>
                    <td className="p-2.5">Account has reached its contact plan limit.</td>
                    <td className="p-2.5">Archive contacts or upgrade plan.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">429</td>
                    <td className="p-2.5 font-mono">rate_limited</td>
                    <td className="p-2.5">Rate limit exceeded.</td>
                    <td className="p-2.5">Read <code className="font-mono">Retry-After</code> and wait.</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-mono">500</td>
                    <td className="p-2.5 font-mono">server_error</td>
                    <td className="p-2.5">Internal server error.</td>
                    <td className="p-2.5">Contact support with the <code className="font-mono">requestId</code>.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 12: Rate Limits */}
          <section id="rate-limits" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">12. Rate Limits</h2>
            <p className="text-sm text-muted-foreground">
              Rate limits protect platform deliverability and resource availability:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li><b>By IP address:</b> 20 requests per minute.</li>
              <li><b>By Public Key:</b> 60 requests per minute.</li>
              <li><b>By Secret Key:</b> 300 requests per minute.</li>
              <li><b>By Recipient Email:</b> Maximum 3 confirmation emails per hour across all lists.</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              When rate limited, the response header <code className="font-mono text-foreground">Retry-After</code> contains the number of seconds to wait.
            </p>
            <div className="pt-2">
              <div className="text-xs font-semibold text-foreground mb-1">Retry Example (JavaScript)</div>
              <CodeBlock code={examples.retrySnippet} language="javascript" />
            </div>
          </section>

          {/* Section 13: Real Examples */}
          <section id="use-cases" className="scroll-mt-20 space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">13. Real Examples</h2>

            <div className="space-y-1 text-xs">
              <div className="font-semibold text-foreground">1. Hand-made Soap Seller (No website)</div>
              <p className="text-muted-foreground">
                The seller enables the hosted subscribe page for their list and adds the link to their Instagram bio.
                Followers open the page, enter their email, and receive a confirmation email. No code required.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <div className="font-semibold text-foreground">2. Local Bakery (Simple HTML site)</div>
              <p className="text-muted-foreground">
                The bakery pastes the embed snippet into their footer.
                Even if their site has no JavaScript, the standard HTML form submits and redirects to the thank-you page.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <div className="font-semibold text-foreground">3. E-Commerce Store (Checkout integration)</div>
              <p className="text-muted-foreground">
                When a customer checks "Keep me updated" during checkout, the store's Node.js backend calls
                <code className="font-mono"> POST /api/v1/subscribe</code> using a secret key, passing the customer's email and the tag <code className="font-mono">customer</code>.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <div className="font-semibold text-foreground">4. Travel Blog (Custom modal pop-up)</div>
              <p className="text-muted-foreground">
                The blogger designs a custom newsletter pop-up using React.
                The component uses a public key and sends JSON with <code className="font-mono">fetch</code>.
                The pop-up shows the success message without reloading the page.
              </p>
            </div>

            <div className="space-y-1 text-xs">
              <div className="font-semibold text-foreground">5. Mobile Application (Native client)</div>
              <p className="text-muted-foreground">
                The mobile app sends the user's opt-in choice to its own backend server.
                The backend calls Mailflow using a secret key.
                The secret key is never embedded in the iOS or Android binary.
              </p>
            </div>
          </section>

          {/* Section 14: Special Cases */}
          <section id="special-cases" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">14. What Happens in Special Cases</h2>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div>• <b>Already active subscriber:</b> Public keys and the hosted page return <code className="font-mono">pending_confirmation</code> so visitors cannot query who is subscribed. Secret keys receive <code className="font-mono">already_subscribed</code>.</div>
              <div>• <b>Unconfirmed subscriber signs up again:</b> Mailflow adds the new list to their profile. If the previous confirmation email is older than 10 minutes, a new confirmation email is queued.</div>
              <div>• <b>Unsubscribed or complained contact:</b> The API returns <code className="font-mono">pending_confirmation</code>. The system does not alter the record and does not send emails.</div>
              <div>• <b>Concurrent requests:</b> If two requests arrive at the same instant, the database uniqueness constraint triggers a 409 conflict, which Mailflow treats as success.</div>
              <div>• <b>Stolen public key:</b> Because public keys are restricted to allowed origins, requests from unapproved domains are rejected with HTTP 403.</div>
              <div>• <b>Leaked secret key:</b> Revoke the key immediately from the Developers dashboard. Revocation takes effect instantly.</div>
            </div>
          </section>

          {/* Section 15: Security Tips */}
          <section id="security" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">15. Security Best Practices</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-xs text-muted-foreground">
              <li><b>Store secret keys securely:</b> Store secret keys in environment variables or vault services. Never commit them to version control.</li>
              <li><b>Use HTTPS in production:</b> Mailflow requires encrypted transport for all API calls in production environments.</li>
              <li><b>Do not trust client input:</b> Always validate email formats and sanitize data before sending it to the server.</li>
              <li><b>Respect privacy regulations:</b> Inform your subscribers that confirmation links, open rates, and click rates are tracked.</li>
            </ul>
          </section>

          {/* Section 16: Local Testing */}
          <section id="testing" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">16. Local Testing and Development</h2>
            <p className="text-sm text-muted-foreground">
              Follow this procedure to test your integration locally:
            </p>
            <div className="rounded-lg border border-border p-4 text-xs text-muted-foreground space-y-2">
              <div>1. <b>Start local inbox:</b> Start MailHog with Docker (<code className="font-mono">docker compose up -d mailhog</code>). Web UI at <code className="font-mono">http://localhost:8025</code>.</div>
              <div>2. <b>Configure allowed origin:</b> When creating a public key, enter <code className="font-mono">http://localhost:3000</code> or your frontend development server port (e.g. <code className="font-mono">http://localhost:5500</code>).</div>
              <div>3. <b>Send test request:</b> Submit your test email. Verify that HTTP 200 is returned.</div>
              <div>4. <b>Inspect MailHog inbox:</b> Open MailHog, click the confirmation email, and click <b>Yes, subscribe me</b>.</div>
              <div>5. <b>Confirm in dashboard:</b> Verify that the contact status shifts from <code className="font-mono">pending</code> to <code className="font-mono">active</code> in Mailflow.</div>
            </div>
          </section>

          {/* Section 17: Feature Status */}
          <section id="feature-status" className="scroll-mt-20 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">17. Status of Features</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-3">Feature</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 font-medium text-foreground">Subscribe API (POST /api/v1/subscribe)</td>
                    <td className="p-3"><Badge variant="default" className="text-[10px]">Built</Badge></td>
                    <td className="p-3">Production ready with public and secret key support.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Lists API (GET /api/v1/lists)</td>
                    <td className="p-3"><Badge variant="default" className="text-[10px]">Built</Badge></td>
                    <td className="p-3">Available with secret key authentication.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Hosted Subscribe Page</td>
                    <td className="p-3"><Badge variant="default" className="text-[10px]">Built</Badge></td>
                    <td className="p-3">Available per list at /s/[listId].</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Embed HTML Form</td>
                    <td className="p-3"><Badge variant="default" className="text-[10px]">Built</Badge></td>
                    <td className="p-3">Generates accessible HTML snippet with JS enhancement.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Contacts Management API (CRUD)</td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px]">Planned</Badge></td>
                    <td className="p-3">Scheduled for future developer release.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Outbound Webhooks</td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px]">Planned</Badge></td>
                    <td className="p-3">Will support subscribe, unsubscribe, and delivery events.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-foreground">Test Mode API Keys</td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px]">Planned</Badge></td>
                    <td className="p-3">Sandboxed keys for simulation.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 18: FAQ */}
          <section id="faq" className="scroll-mt-20 space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">18. Frequently Asked Questions</h2>
            <div className="space-y-4 text-xs">
              <div>
                <div className="font-semibold text-foreground">Q1: Can I use this API to send marketing campaigns?</div>
                <div className="text-muted-foreground mt-0.5">
                  No. This API only collects subscribers and sends double opt-in confirmation emails. Marketing broadcasts are created in the Mailflow dashboard.
                </div>
              </div>

              <div>
                <div className="font-semibold text-foreground">Q2: Why do contacts start in the pending state?</div>
                <div className="text-muted-foreground mt-0.5">
                  Mailflow requires double opt-in verification. A contact remains pending until the subscriber clicks the link in their confirmation email.
                </div>
              </div>

              <div>
                <div className="font-semibold text-foreground">Q3: How long is a confirmation link valid?</div>
                <div className="text-muted-foreground mt-0.5">
                  Confirmation tokens expire 48 hours after generation.
                </div>
              </div>

              <div>
                <div className="font-semibold text-foreground">Q4: Can I disable double opt-in?</div>
                <div className="text-muted-foreground mt-0.5">
                  No. Double opt-in is mandatory across all subscribe endpoints to protect sending domain reputations.
                </div>
              </div>

              <div>
                <div className="font-semibold text-foreground">Q5: Why did I receive a 403 origin_not_allowed error?</div>
                <div className="text-muted-foreground mt-0.5">
                  Your public key does not have your website origin listed. Add your exact protocol and domain in the Developers dashboard.
                </div>
              </div>

              <div>
                <div className="font-semibold text-foreground">Q6: Can I assign tags with a public key?</div>
                <div className="text-muted-foreground mt-0.5">
                  No. Tags submitted with public keys are ignored. Only server-side calls with secret keys can assign tags.
                </div>
              </div>

              <div>
                <div className="font-semibold text-foreground">Q7: What happens if an active subscriber signs up again?</div>
                <div className="text-muted-foreground mt-0.5">
                  Public keys receive a generic pending response to prevent subscriber enumeration. Secret keys receive an already_subscribed status.
                </div>
              </div>

              <div>
                <div className="font-semibold text-foreground">Q8: How many active API keys can I have?</div>
                <div className="text-muted-foreground mt-0.5">
                  Each account can have up to 10 active keys at one time. Revoke an unused key if you reach this limit.
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
