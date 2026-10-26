import Link from "next/link";
import { ArrowRight, Code2, Link2, Terminal } from "lucide-react";
import { CodeBlock } from "@/components/docs/code-block";
import { C, Callout, DocPageBody, DocTitle, H2, P, PrevNext } from "@/components/docs/doc-ui";

export const metadata = { title: "Introduction" };

const WAYS = [
  {
    icon: Link2,
    title: "Share a link",
    who: "No code",
    text: "Turn on the hosted sign-up page of a list and share its link or QR code.",
    href: "/contacts/forms",
    cta: "Open sign-up forms",
  },
  {
    icon: Code2,
    title: "Embed a form on your website",
    who: "Copy and paste",
    text: "Copy a small piece of HTML into WordPress, Webflow, Wix, or your own site.",
    href: "/docs/api/guides/website-form",
    cta: "Read the guide",
  },
  {
    icon: Terminal,
    title: "Call the API from your server",
    who: "For developers",
    text: "Add people from your shop, app, or CRM with one HTTP request and a server key.",
    href: "/docs/api/guides/server",
    cta: "Read the guide",
  },
];

export default function IntroductionPage() {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  return (
    <DocPageBody>
      <DocTitle
        eyebrow="Get started"
        title="Mailflow API"
        lead="Add subscribers to your lists from your website or your server. Mailflow sends each new subscriber a confirmation email, and adds them to your list after they click the link."
      />

      <H2 id="choose">Choose how to collect sign-ups</H2>
      <div className="grid gap-3 md:grid-cols-3">
        {WAYS.map((w) => (
          <Link key={w.title} href={w.href} className="group flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:border-foreground/30 hover:bg-muted/40">
            <w.icon className="size-5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase">{w.who}</span>
            <span className="text-sm font-semibold">{w.title}</span>
            <span className="flex-1 text-xs text-muted-foreground">{w.text}</span>
            <span className="flex items-center gap-1 text-xs font-medium">
              {w.cta}
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
      <P>Not sure? Start with the link or the embed code: they need no programming, and you can change later.</P>

      <H2 id="how">How a sign-up works</H2>
      <ol className="grid gap-3 sm:grid-cols-4">
        {[
          ["A person signs up", "With your form, your link, or your server."],
          ["Mailflow saves them as pending", "Pending contacts get no campaigns."],
          ["They get a confirmation email", "From the sender that you set for the list."],
          ["They click the link", "Now they are active and get your emails."],
        ].map(([title, text], i) => (
          <li key={title} className="rounded-lg border border-border p-3">
            <span className="text-[11px] font-medium text-muted-foreground">Step {i + 1}</span>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{text}</p>
          </li>
        ))}
      </ol>
      <Callout title="Why the confirmation email (double opt-in)?">
        It keeps fake and mistyped addresses off your list, and it proves that each person asked for your emails. Inbox
        providers trust senders with clean lists, so more of your emails reach the inbox.
      </Callout>

      <H2 id="base-url">Base URL</H2>
      <P>Every API request goes to this address. Send and receive JSON.</P>
      <CodeBlock code={`${base}/api/v1`} language="text" />

      <H2 id="what">What the API can do</H2>
      <div className="overflow-hidden rounded-lg border border-border text-sm">
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-3">
          <C>POST /subscribe</C>
          <span className="text-muted-foreground">Add a person to one or more of your lists.</span>
          <C>GET /lists</C>
          <span className="text-muted-foreground">Get the names and IDs of your lists.</span>
        </div>
      </div>
      <P>
        To send campaigns, build automations, or export contacts, use the Mailflow dashboard. The API is for collecting
        sign-ups.
      </P>

      <PrevNext href="/docs/api" />
    </DocPageBody>
  );
}
