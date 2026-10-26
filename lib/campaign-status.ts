export const CAMPAIGN_STATUSES = ["draft", "scheduled", "queued", "sending", "sent", "failed"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const CAMPAIGN_STATUS_META: Record<CampaignStatus, { label: string; description: string }> = {
  draft: { label: "Draft", description: "Not sent yet. You can still change it." },
  scheduled: { label: "Scheduled", description: "Sends at the scheduled time. Cancel the schedule to change it." },
  queued: { label: "Preparing", description: "Mailflow is building the list of recipients." },
  sending: { label: "Sending", description: "Emails are going out now." },
  sent: { label: "Sent", description: "Every email was handled." },
  failed: { label: "Failed", description: "Sending could not start. Duplicate the campaign to try again." },
};

export const campaignStatusMeta = (status: string) =>
  CAMPAIGN_STATUS_META[status as CampaignStatus] ?? { label: status, description: "" };

// The tabs on the campaigns screen. "Sending" groups the two in-progress statuses.
export const CAMPAIGN_TABS = ["all", "draft", "scheduled", "sending", "sent", "failed"] as const;
export type CampaignTab = (typeof CAMPAIGN_TABS)[number];

export const CAMPAIGN_TAB_LABEL: Record<CampaignTab, string> = {
  all: "All",
  draft: "Drafts",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
};

export const TAB_STATUSES: Record<CampaignTab, CampaignStatus[] | null> = {
  all: null,
  draft: ["draft"],
  scheduled: ["scheduled"],
  sending: ["queued", "sending"],
  sent: ["sent"],
  failed: ["failed"],
};

// What each status allows. The server actions and the screens use the same rules.
export const canEditCampaign = (status: string) => status === "draft";
export const isSendingStatus = (status: string) => status === "queued" || status === "sending";
// A campaign that is sending cannot be deleted: the worker still needs it.
export const canDeleteCampaign = (status: string) => !isSendingStatus(status);
export const hasReport = (status: string) => status !== "draft" && status !== "scheduled";
