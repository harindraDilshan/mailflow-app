// Code samples for the API docs, the API keys page, and the sign-up form page.
// `listId` and `key` are the user's own values when known, so samples can run as they are.

export type SampleContext = { base: string; listId: string; key?: string };

const SECRET = "YOUR_SECRET_KEY";
const PUBLIC = "YOUR_PUBLIC_KEY";

/** POST /api/v1/subscribe from a server, with a secret key. */
export function subscribeSamples({ base, listId, key = SECRET }: SampleContext) {
  const url = `${base}/api/v1/subscribe`;
  return [
    {
      label: "cURL",
      code: `curl -X POST ${url} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "jane@example.com",
    "name": "Jane Smith",
    "tags": ["checkout"],
    "listIds": ["${listId}"]
  }'`,
    },
    {
      label: "Node.js",
      code: `// Node.js 18 or newer. Keep the key in an environment variable.
const res = await fetch("${url}", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.MAILFLOW_SECRET_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "jane@example.com",
    name: "Jane Smith",
    tags: ["checkout"],
    listIds: ["${listId}"],
  }),
});

const data = await res.json();
if (!res.ok) throw new Error(data.error.message);
console.log(data.status); // "pending_confirmation"`,
    },
    {
      label: "Python",
      code: `import os
import requests

res = requests.post(
    "${url}",
    headers={"Authorization": f"Bearer {os.environ['MAILFLOW_SECRET_KEY']}"},
    json={
        "email": "jane@example.com",
        "name": "Jane Smith",
        "tags": ["checkout"],
        "listIds": ["${listId}"],
    },
    timeout=10,
)
res.raise_for_status()
print(res.json()["status"])  # "pending_confirmation"`,
    },
    {
      label: "PHP",
      code: `<?php
$ch = curl_init("${url}");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . getenv("MAILFLOW_SECRET_KEY"),
        "Content-Type: application/json",
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "email" => "jane@example.com",
        "name" => "Jane Smith",
        "tags" => ["checkout"],
        "listIds" => ["${listId}"],
    ]),
]);
$data = json_decode(curl_exec($ch), true);
echo $data["status"]; // "pending_confirmation"`,
    },
  ];
}

/** POST /api/v1/subscribe from a browser, with a public key (your own form code). */
export function browserSubscribeSamples({ base }: { base: string }) {
  return [
    {
      label: "JavaScript",
      code: `// On a website that is allowed for the public key.
const res = await fetch("${base}/api/v1/subscribe", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    key: "${PUBLIC}",
    email: form.email.value,
    name: form.name.value,
  }),
});
const data = await res.json();
message.textContent = data.error ? data.error.message : "Check your inbox to confirm.";`,
    },
    {
      label: "React",
      code: `function SignupForm() {
  const [message, setMessage] = useState("");

  async function onSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("${base}/api/v1/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "${PUBLIC}", email: form.get("email") }),
    });
    const data = await res.json();
    setMessage(data.error ? data.error.message : "Check your inbox to confirm.");
  }

  return (
    <form onSubmit={onSubmit}>
      <input name="email" type="email" required placeholder="Your email" />
      <button type="submit">Subscribe</button>
      <p role="status">{message}</p>
    </form>
  );
}`,
    },
  ];
}

/** GET /api/v1/lists. */
export function listsSamples({ base, key = SECRET }: SampleContext) {
  const url = `${base}/api/v1/lists`;
  return [
    { label: "cURL", code: `curl ${url} \\\n  -H "Authorization: Bearer ${key}"` },
    {
      label: "Node.js",
      code: `const res = await fetch("${url}", {
  headers: { Authorization: \`Bearer \${process.env.MAILFLOW_SECRET_KEY}\` },
});
const { lists } = await res.json();`,
    },
    {
      label: "Python",
      code: `import os, requests

res = requests.get("${url}", headers={"Authorization": f"Bearer {os.environ['MAILFLOW_SECRET_KEY']}"}, timeout=10)
lists = res.json()["lists"]`,
    },
    {
      label: "PHP",
      code: `<?php
$ch = curl_init("${url}");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ["Authorization: Bearer " . getenv("MAILFLOW_SECRET_KEY")],
]);
$lists = json_decode(curl_exec($ch), true)["lists"];`,
    },
  ];
}

export const SUBSCRIBE_RESPONSE = `{
  "status": "pending_confirmation",
  "message": "Check your email to confirm your subscription."
}`;

export const LISTS_RESPONSE = `{
  "lists": [
    { "id": "665f1c2a0012ab34cd56", "name": "Newsletter" },
    { "id": "665f1c4b0034ef56ab78", "name": "Product updates" }
  ]
}`;

export const ERROR_RESPONSE = `{
  "error": {
    "code": "invalid_email",
    "message": "Enter a valid email address.",
    "requestId": "req_3f9a1c7e5b2d4f60"
  }
}`;
