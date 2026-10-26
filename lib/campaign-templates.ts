// Starter content for the campaign editor. Tables and inline styles, because many
// email apps (Outlook, Gmail) ignore <style> blocks and modern CSS layout.

export type CampaignTemplate = { id: string; name: string; description: string; html: string };

const card = (inner: string) => `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:8px;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
${inner}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const button = (label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:6px;background:#18181b;">` +
  `<a href="https://example.com" style="display:inline-block;padding:12px 22px;font-size:15px;color:#ffffff;text-decoration:none;font-weight:bold;">${label}</a>` +
  `</td></tr></table>`;

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "plain",
    name: "Plain letter",
    description: "Looks like a personal email. Good for short updates.",
    html: `<p>Hi {{name}},</p>
<p>Write your message here. Keep it short and personal.</p>
<p>Thanks,<br>The team</p>`,
  },
  {
    id: "newsletter",
    name: "Newsletter",
    description: "A heading, an intro, and two stories with links.",
    html: card(`          <tr>
            <td style="padding:28px 32px 8px;">
              <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#71717a;">Monthly newsletter</p>
              <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;">What is new this month</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px;font-size:15px;line-height:1.6;">
              <p>Hi {{name}},</p>
              <p>Here is a short summary of what happened this month.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px;font-size:15px;line-height:1.6;border-top:1px solid #e4e4e7;">
              <h2 style="margin:16px 0 4px;font-size:18px;">First story</h2>
              <p style="margin:0 0 8px;">One or two sentences about the story.</p>
              <a href="https://example.com" style="color:#2563eb;">Read more</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;font-size:15px;line-height:1.6;border-top:1px solid #e4e4e7;">
              <h2 style="margin:16px 0 4px;font-size:18px;">Second story</h2>
              <p style="margin:0 0 8px;">One or two sentences about the story.</p>
              <a href="https://example.com" style="color:#2563eb;">Read more</a>
            </td>
          </tr>`),
  },
  {
    id: "announcement",
    name: "Announcement",
    description: "One big message with one button. Good for launches and offers.",
    html: card(`          <tr>
            <td style="padding:36px 32px 12px;text-align:center;">
              <h1 style="margin:0;font-size:28px;line-height:1.25;">Something new is here</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px;text-align:center;font-size:16px;line-height:1.6;color:#3f3f46;">
              <p>Hi {{name}}, tell your readers what is new and why it matters to them.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 36px;">
              ${button("See what is new")}
            </td>
          </tr>`),
  },
];
