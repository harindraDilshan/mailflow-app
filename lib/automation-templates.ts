import type { Step } from "./automation-rules";

export const WELCOME_SERIES: Step[] = [
  {
    type: "email",
    subject: "Welcome! Here is what to expect",
    html:
      "<h1>Welcome, {{name}}!</h1>" +
      "<p>Thanks for joining us. In the next days we will send you a few short emails with our best tips.</p>",
  },
  { type: "wait", amount: 2, unit: "days" },
  {
    type: "email",
    subject: "Three tips to get started",
    html:
      "<h1>Hi {{name}}, three quick tips</h1>" +
      "<ol><li>Tip one</li><li>Tip two</li><li>Tip three</li></ol>" +
      '<p><a href="https://www.exlorian.com">Visit our website</a></p>',
  },
  { type: "wait", amount: 3, unit: "days" },
  {
    type: "email",
    subject: "Something special for you",
    html: "<h1>{{name}}, a small thank you</h1><p>Here is a special offer, just for new subscribers.</p>",
  },
];