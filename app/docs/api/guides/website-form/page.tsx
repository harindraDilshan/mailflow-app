import Link from "next/link";
import { docsContextBase } from "../../base";
import { browserSubscribeSamples } from "@/lib/docs/api-examples";
import { CodeTabs } from "@/components/docs/code-tabs";
import { C, Callout, DocPageBody, DocTitle, H2, P, PrevNext } from "@/components/docs/doc-ui";

export const metadata = { title: "Collect sign-ups on your website" };

const PROBLEMS = [
  ["origin_not_allowed", "The address of your website is not in the list of the key. Add it on the sign-up form page (“Change websites”). Check www and https."],
  ["invalid_key", "The key is wrong or revoked. Copy the embed code again from the sign-up form page."],
  ["list_not_configured", "The list has no confirmation email sender. Set it in the “Confirmation email” tab."],
  ["No confirmation email", "Look in the spam folder. One address gets at most 3 confirmation emails per hour."],
];

export default function WebsiteFormGuide() {
  const base = docsContextBase();
  return (
    <DocPageBody>
      <DocTitle
        eyebrow="Guides"
        title="Collect sign-ups on your website"
        lead="Three ways, from no code at all to your own form. All of them send the confirmation email, and show the new people in your contacts."
      />

      <H2 id="link">1. Share a link (no code)</H2>
      <P>
        Every list has a hosted sign-up page. Open <b>Sign-up forms</b>, choose the list, and turn on <b>Share a link</b>.
        Put the link in your social profiles or your email signature, or print its QR code.
      </P>

      <H2 id="embed">2. Paste the embed code</H2>
      <P>
        On the sign-up form page of the list, open <b>Embed on website</b>. Enter the address of your website, and Mailflow
        makes the code. Copy it into your website, for example in a <b>Custom HTML</b> block in WordPress, Webflow, Wix, or
        Squarespace.
      </P>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>It uses the design of your form: title, button text, color, and the name field.</li>
        <li>With JavaScript, it shows your success message on the same page.</li>
        <li>Without JavaScript, it still works: the browser opens a Mailflow thank-you page.</li>
        <li>It has a hidden field that catches spam bots (<C>hp_field</C>). Keep it.</li>
      </ul>
      <Callout tone="tip">
        Test it with your own email address. Then open the sign-up form page: you show in <b>Recent sign-ups</b>.
      </Callout>

      <H2 id="custom">3. Write your own form code</H2>
      <P>
        Want your own design or a pop-up? Send the sign-up from the browser with the <b>website form key</b> of the list (it
        starts with <C>pk_live_</C>; it is in the embed code). Send <C>Content-Type: application/json</C>.
      </P>
      <CodeTabs samples={browserSubscribeSamples({ base })} />
      <P>
        Mailflow answers with <C>{`{ "status": "pending_confirmation", "message": "…" }`}</C>, or with{" "}
        <C>{`{ "error": { "code", "message" } }`}</C>. The <C>message</C> is ready to show to the person. See{" "}
        <Link href="/docs/api/reference/subscribe" className="underline underline-offset-2">Add a contact</Link> for all fields.
      </P>
      <Callout title="Why does it say pending, also for people who are already on the list?">
        So that nobody can use your form to find out who is on your list. Your server, with a server key, gets the real
        answer (<C>already_subscribed</C>).
      </Callout>

      <H2 id="problems">If it does not work</H2>
      <div className="divide-y divide-border rounded-lg border border-border text-sm">
        {PROBLEMS.map(([code, fix]) => (
          <div key={code} className="grid gap-1 p-3 sm:grid-cols-[12rem_1fr]">
            <C>{code}</C>
            <span className="text-muted-foreground">{fix}</span>
          </div>
        ))}
      </div>

      <PrevNext href="/docs/api/guides/website-form" />
    </DocPageBody>
  );
}
