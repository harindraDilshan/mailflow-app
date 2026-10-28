// The built-in templates of the gallery. Each one is a block design (lib/email-design.ts),
// so people can change it in the visual editor. The links go to example.com on purpose:
// the campaign review asks people to change them before they send.

import { DEFAULT_SETTINGS, SAMPLE_ADDRESS, newBlock, type Block, type BlockType, type DesignSettings, type EmailDesign } from "@/lib/email-design";

export const TEMPLATE_CATEGORIES = [
  { id: "welcome", label: "Welcome" },
  { id: "newsletter", label: "Newsletter" },
  { id: "promotion", label: "Promotion" },
  { id: "announcement", label: "Announcement" },
  { id: "event", label: "Event" },
  { id: "follow-up", label: "Follow-up" },
  { id: "basic", label: "Basic" },
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number]["id"];

export const categoryLabel = (id: string) => TEMPLATE_CATEGORIES.find((c) => c.id === id)?.label ?? "Other";

export type GalleryTemplate = {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  subject: string;
  previewText: string;
  design: EmailDesign;
};

// A block with the defaults of its type, and the given changes.
type Changes = { [K in BlockType]: Partial<Omit<Extract<Block, { type: K }>, "id" | "type">> };
const block = <T extends BlockType>(type: T, changes: Changes[T] = {}) => ({ ...newBlock(type), ...changes }) as Block;

// Fixed block IDs: the server and the browser must render the same HTML.
function design(id: string, settings: Partial<DesignSettings>, blocks: Block[]): EmailDesign {
  return {
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    blocks: blocks.map((b, i) => ({ ...b, id: `${id}-${i}` })),
  };
}

const footer = (company = "Your company") =>
  block("footer", {
    text: `You get this email because you signed up at ${company}.\n${company} · ${SAMPLE_ADDRESS}`,
  });

const T: GalleryTemplate[] = [
  {
    id: "welcome",
    name: "Welcome",
    category: "welcome",
    description: "Say hello to new subscribers and show them where to start.",
    subject: "Welcome to the club, {{name}}",
    previewText: "Here is how to get the most out of your membership.",
    design: design("welcome", { buttonColor: "#4f46e5", linkColor: "#4f46e5", background: "#eef2ff" }, [
      block("header", { text: "Your brand", background: "#4f46e5" }),
      block("heading", { text: "Welcome aboard, {{name}}!", align: "center" }),
      block("text", {
        text: "We are very happy that you are here. Every week, we send you **one short email** with ideas that you can use at once.",
        align: "center",
      }),
      block("button", { label: "Get started", href: "https://example.com/start" }),
      block("divider"),
      block("heading", { text: "Three things to do first", size: "medium" }),
      block("text", {
        text: "**1. Complete your profile.** It takes two minutes.\n**2. Read our best guide.** People love it.\n**3. Reply to this email.** Tell us what you need. A real person reads every reply.",
      }),
      footer(),
    ]),
  },
  {
    id: "newsletter",
    name: "Monthly newsletter",
    category: "newsletter",
    description: "An intro and two stories with pictures and links.",
    subject: "What is new this month",
    previewText: "Our best stories, in two minutes.",
    design: design("newsletter", {}, [
      block("header", { text: "The Monthly", align: "left" }),
      block("heading", { text: "What is new this month" }),
      block("text", { text: "Hi {{name}},\n\nHere is a short summary of what happened this month. Grab a coffee: it takes two minutes." }),
      block("image", { alt: "A picture for the first story", href: "https://example.com/story-1" }),
      block("heading", { text: "First story", size: "medium" }),
      block("text", { text: "One or two sentences about the story. Tell readers why it matters to them.\n\n[Read the full story](https://example.com/story-1)" }),
      block("divider"),
      block("heading", { text: "Second story", size: "medium" }),
      block("text", { text: "One or two sentences about the story.\n\n[Read the full story](https://example.com/story-2)" }),
      block("spacer", { height: 16 }),
      footer(),
    ]),
  },
  {
    id: "announcement",
    name: "Product launch",
    category: "announcement",
    description: "One big message, a picture, and one clear button.",
    subject: "Something new is here",
    previewText: "Be one of the first to try it.",
    design: design("announcement", { buttonColor: "#7c3aed", linkColor: "#7c3aed", background: "#f5f3ff" }, [
      block("spacer", { height: 16 }),
      block("heading", { text: "Meet the new Product X", align: "center" }),
      block("text", { text: "Hi {{name}}, it is faster, simpler, and made for the way you work.", align: "center" }),
      block("image", { alt: "A picture of the new product" }),
      block("button", { label: "See what is new", href: "https://example.com/launch" }),
      block("text", { text: "*Available today for all customers.*", align: "center" }),
      footer(),
    ]),
  },
  {
    id: "sale",
    name: "Sale",
    category: "promotion",
    description: "A discount with a code, a deadline, and a strong button.",
    subject: "25% off everything, this weekend only",
    previewText: "Use the code SAVE25 before Sunday.",
    design: design("sale", { buttonColor: "#dc2626", linkColor: "#dc2626", background: "#fef2f2" }, [
      block("header", { text: "Your shop", background: "#dc2626" }),
      block("heading", { text: "25% off everything", align: "center" }),
      block("text", { text: "This weekend only. Use the code **SAVE25** at checkout.", align: "center" }),
      block("button", { label: "Shop the sale", href: "https://example.com/sale" }),
      block("text", { text: "The offer ends on Sunday at midnight.", align: "center" }),
      block("divider"),
      block("text", { text: "Questions? Reply to this email. We are here to help.", align: "center" }),
      footer("Your shop"),
    ]),
  },
  {
    id: "event",
    name: "Event invitation",
    category: "event",
    description: "Invite people with the date, the time, the place, and a sign-up button.",
    subject: "You are invited: Spring meetup",
    previewText: "Join us on 12 May. Seats are limited.",
    design: design("event", { buttonColor: "#0d9488", linkColor: "#0d9488", background: "#f0fdfa" }, [
      block("header", { text: "Your brand", background: "#0d9488" }),
      block("heading", { text: "You are invited, {{name}}" }),
      block("text", { text: "Join us for an evening of short talks, good food, and people who love what they do." }),
      block("text", { text: "**Date:** Tuesday, 12 May\n**Time:** 18:00 to 21:00\n**Place:** Main Hall, Street 1, City" }),
      block("button", { label: "Save my seat", href: "https://example.com/event", align: "left" }),
      block("text", { text: "Seats are limited. Can you not come? [Watch the recording later](https://example.com/recording)." }),
      footer(),
    ]),
  },
  {
    id: "thank-you",
    name: "Thank you",
    category: "follow-up",
    description: "Thank customers after an order and ask for a review.",
    subject: "Thank you, {{name}}",
    previewText: "Your support means a lot to us.",
    design: design("thank-you", { buttonColor: "#059669", linkColor: "#059669", background: "#ecfdf5" }, [
      block("spacer", { height: 16 }),
      block("heading", { text: "Thank you, {{name}}!", align: "center" }),
      block("text", {
        text: "Thank you for your order. People like you make our work possible.\n\nDo you like what you got? A short review helps other people find us.",
        align: "center",
      }),
      block("button", { label: "Write a review", href: "https://example.com/review" }),
      block("text", { text: "It takes less than a minute.", align: "center" }),
      footer(),
    ]),
  },
  {
    id: "feedback",
    name: "Feedback survey",
    category: "follow-up",
    description: "Ask a short question and send people to a survey.",
    subject: "Can you help us with 2 minutes?",
    previewText: "Three short questions. Your answers make us better.",
    design: design("feedback", { buttonColor: "#0284c7", linkColor: "#0284c7" }, [
      block("header", { text: "Your brand", background: "#0284c7", align: "left" }),
      block("heading", { text: "How are we doing?" }),
      block("text", {
        text: "Hi {{name}},\n\nWe want to make our product better for you. Can you answer **three short questions**? It takes about two minutes.",
      }),
      block("button", { label: "Start the survey", href: "https://example.com/survey", align: "left" }),
      block("text", { text: "Thank you for your help,\nThe team" }),
      footer(),
    ]),
  },
  {
    id: "win-back",
    name: "We miss you",
    category: "follow-up",
    description: "Bring back subscribers who have not opened your emails for a long time.",
    subject: "We miss you, {{name}}",
    previewText: "Here is what you missed, and a small gift.",
    design: design("win-back", { buttonColor: "#d97706", linkColor: "#b45309", background: "#fffbeb" }, [
      block("spacer", { height: 16 }),
      block("heading", { text: "It has been a while, {{name}}", align: "center" }),
      block("text", {
        text: "We have made many changes since your last visit. Come back and see what is new: here is **15% off** your next order.",
        align: "center",
      }),
      block("button", { label: "See what is new", href: "https://example.com/new" }),
      block("text", { text: "Do you not want our emails anymore? You can unsubscribe with the link below.", align: "center" }),
      footer(),
    ]),
  },
  {
    id: "update",
    name: "Company update",
    category: "announcement",
    description: "Share important news in a clear, calm way.",
    subject: "An update from our team",
    previewText: "What changes, and what it means for you.",
    design: design("update", { font: "system" }, [
      block("header", { text: "Your company", align: "left" }),
      block("heading", { text: "An important update", size: "medium" }),
      block("text", {
        text: "Hi {{name}},\n\nWe want to tell you about a change that starts on **1 June**.\n\n**What changes:** one or two sentences.\n**What you must do:** nothing. Or one clear step.\n\nYou can [read the details here](https://example.com/update).",
      }),
      block("text", { text: "Thank you,\nThe team" }),
      footer(),
    ]),
  },
  {
    id: "plain",
    name: "Plain letter",
    category: "basic",
    description: "Looks like a personal email. Good for short, direct messages.",
    subject: "A quick note",
    previewText: "",
    design: design("plain", { background: "#ffffff", font: "system" }, [
      block("text", { text: "Hi {{name}},\n\nWrite your message here. Keep it short and personal, like an email to a friend.\n\nThanks,\nYour name" }),
      footer(),
    ]),
  },
];

export const GALLERY_TEMPLATES: readonly GalleryTemplate[] = T;

export const getGalleryTemplate = (id: string) => T.find((t) => t.id === id) ?? null;
