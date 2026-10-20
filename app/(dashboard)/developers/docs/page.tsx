export default function DocsPage() {
  const app = process.env.NEXT_PUBLIC_APP_URL;
  const pre = "overflow-x-auto rounded bg-gray-50 p-3 text-xs";

  return (
    <div className="max-w-3xl space-y-6 text-sm">
      <h1 className="text-2xl font-semibold">API docs (v1)</h1>
      <p>
        Base address: <code>{app}/api/v1</code>. Use <b>public keys</b> in web pages and <b>secret keys</b> only
        on your server. Everyone who signs up gets a confirmation email before they receive campaigns.
      </p>

      <h2 className="text-lg font-medium">Subscribe someone: POST /subscribe</h2>
      <p>Server (secret key). You choose the lists and may add tags:</p>
      <pre className={pre}>{`curl -X POST ${app}/api/v1/subscribe \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"email":"jane@example.com","name":"Jane","tags":["website"],"listIds":["LIST_ID"]}'`}</pre>
      <p>Browser (public key). The list comes from the key. Your website must be in the key's allowed websites:</p>
      <pre className={pre}>{`fetch("${app}/api/v1/subscribe", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ key: "pk_live_...", email: "jane@example.com", name: "Jane" })
}).then(r => r.json()).then(console.log);`}</pre>
      <p>Python (server):</p>
      <pre className={pre}>{`import requests
r = requests.post("${app}/api/v1/subscribe",
    headers={"Authorization": "Bearer sk_live_..."},
    json={"email": "jane@example.com", "listIds": ["LIST_ID"]})
print(r.json())`}</pre>
      <p>Success (HTTP 200):</p>
      <pre className={pre}>{`{ "status": "pending_confirmation", "message": "Check your email to confirm your subscription." }`}</pre>
      <p><code>status</code> is <code>pending_confirmation</code> or <code>already_subscribed</code>. People who unsubscribed earlier also get <code>pending_confirmation</code>, but they are not re-added.</p>

      <h2 className="text-lg font-medium">Get your lists: GET /lists (secret key)</h2>
      <pre className={pre}>{`curl ${app}/api/v1/lists -H "Authorization: Bearer sk_live_..."`}</pre>

      <h2 className="text-lg font-medium">Errors</h2>
      <p>Every error has the same shape, with a request ID you can send to support:</p>
      <pre className={pre}>{`{ "error": { "code": "invalid_email", "message": "Enter a valid email address.", "requestId": "req_ab12cd34" } }`}</pre>
      <table className="w-full border text-left">
        <thead><tr className="bg-gray-50"><th className="p-2">HTTP</th><th className="p-2">code</th><th className="p-2">Meaning</th></tr></thead>
        <tbody>
          {[
            ["400", "invalid_email", "The email address is not valid"],
            ["400", "list_not_found", "listIds missing, or a list is not yours"],
            ["400", "list_not_configured", "The list has no confirmation sender yet"],
            ["401", "invalid_key", "Key missing, wrong, or revoked"],
            ["403", "origin_not_allowed", "Public key used from a website that is not allowed"],
            ["403", "secret_key_in_browser", "A secret key was used from a browser"],
            ["403", "contact_limit_reached", "The account reached its contact limit"],
            ["429", "rate_limited", "Too many requests. See the Retry-After header"],
          ].map(([h, c, m]) => (
            <tr key={c} className="border-t"><td className="p-2">{h}</td><td className="p-2"><code>{c}</code></td><td className="p-2">{m}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}