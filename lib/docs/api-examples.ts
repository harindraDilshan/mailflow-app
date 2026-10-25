import { buildEmbedSnippet } from "@/lib/embed";

export function getApiExamples(appUrl: string) {
  const base = appUrl.replace(/\/$/, "");

  return {
    curlSecret: `curl -X POST "${base}/api/v1/subscribe" \\
  -H "Authorization: Bearer YOUR_SECRET_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "subscriber@example.com",
    "name": "Alex Smith",
    "tags": ["newsletter", "checkout"],
    "listIds": ["LIST_ID"]
  }'`,

    curlPublic: `curl -X POST "${base}/api/v1/subscribe" \\
  -H "Origin: https://www.example.com" \\
  -H "Content-Type: application/json" \\
  -d '{
    "key": "YOUR_PUBLIC_KEY",
    "email": "subscriber@example.com",
    "name": "Alex Smith"
  }'`,

    curlLists: `curl -X GET "${base}/api/v1/lists" \\
  -H "Authorization: Bearer YOUR_SECRET_KEY"`,

    jsBrowser: `// Run this in the browser on an allowed website:
fetch("${base}/api/v1/subscribe", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    key: "YOUR_PUBLIC_KEY",
    email: "subscriber@example.com",
    name: "Alex Smith"
  })
})
  .then((res) => res.json())
  .then((data) => {
    if (data.error) {
      console.error("Subscription error:", data.error.message);
    } else {
      console.log("Success:", data.message);
    }
  })
  .catch((err) => console.error("Network error:", err));`,

    nodeServer: `// Node.js 18+ (Fetch API)
async function addSubscriber() {
  const response = await fetch("${base}/api/v1/subscribe", {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_SECRET_KEY",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "subscriber@example.com",
      name: "Alex Smith",
      tags: ["api-signup"],
      listIds: ["LIST_ID"]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error.message);
  }
  return data;
}`,

    pythonServer: `import requests

url = "${base}/api/v1/subscribe"
headers = {
    "Authorization": "Bearer YOUR_SECRET_KEY",
    "Content-Type": "application/json"
}
payload = {
    "email": "subscriber@example.com",
    "name": "Alex Smith",
    "tags": ["python-backend"],
    "listIds": ["LIST_ID"]
}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

if response.status_code == 200:
    print("Success:", data["message"])
else:
    print("Error:", data["error"]["code"], "-", data["error"]["message"])`,

    phpServer: `<?php
$ch = curl_init("${base}/api/v1/subscribe");

$payload = json_encode([
    "email" => "subscriber@example.com",
    "name" => "Alex Smith",
    "tags" => ["php-customer"],
    "listIds" => ["LIST_ID"]
]);

curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer YOUR_SECRET_KEY",
    "Content-Type: application/json"
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);
if ($httpCode === 200) {
    echo "Success: " . $data["message"] . "\\n";
} else {
    echo "Error: " . $data["error"]["message"] . "\\n";
}`,

    embedSnippet: buildEmbedSnippet(base, "YOUR_PUBLIC_KEY"),

    retrySnippet: `async function subscribeWithRetry(payload, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await fetch("${base}/api/v1/subscribe", {
      method: "POST",
      headers: {
        "Authorization": "Bearer YOUR_SECRET_KEY",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.status === 429) {
      const waitSeconds = parseInt(res.headers.get("Retry-After") || "5", 10);
      console.warn(\`Rate limited. Waiting \${waitSeconds} seconds before attempt \${attempt}...\`);
      await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
      continue;
    }

    return res.json();
  }
  throw new Error("Maximum retry attempts reached.");
}`,

    subscribeSuccess: `{
  "status": "pending_confirmation",
  "message": "Check your email to confirm your subscription."
}`,

    listsSuccess: `{
  "lists": [
    {
      "id": "673f8a9e001a2b3c4d5e",
      "name": "Weekly Newsletter"
    },
    {
      "id": "673f8aa5002b3c4d5e6f",
      "name": "Product Announcements"
    }
  ]
}`,

    errorSample: `{
  "error": {
    "code": "invalid_email",
    "message": "Enter a valid email address.",
    "requestId": "req_8f14a6b29c0d3e5f"
  }
}`,
  };
}
