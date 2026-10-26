import { docsContextBase } from "../../base";
import { LISTS_RESPONSE, listsSamples } from "@/lib/docs/api-examples";
import { CodeBlock } from "@/components/docs/code-block";
import { CodeTabs } from "@/components/docs/code-tabs";
import { C, DocPageBody, DocTitle, Endpoint, H2, P, PrevNext } from "@/components/docs/doc-ui";

export const metadata = { title: "Get your lists" };

export default function ListsReference() {
  const base = docsContextBase();
  return (
    <DocPageBody>
      <DocTitle eyebrow="API reference" title="Get your lists" lead="Returns the name and the ID of each of your lists. Use the IDs in “Add a contact”." />
      <Endpoint method="GET" path="/api/v1/lists" />

      <H2 id="auth">Authentication</H2>
      <P>
        A <b>server key</b> only. Mailflow refuses requests from a browser (with an <C>Origin</C> header), and website form
        keys.
      </P>

      <H2 id="example">Example</H2>
      <CodeTabs samples={listsSamples({ base, listId: "" })} />

      <H2 id="response">Response</H2>
      <CodeBlock code={LISTS_RESPONSE} language="json" />
      <P>The lists come in the order that you made them, at most 100.</P>

      <PrevNext href="/docs/api/reference/lists" />
    </DocPageBody>
  );
}
