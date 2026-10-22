import { createHash } from "crypto";
import { getQueues } from "@/lib/queue";

export type TriggerType = "list_joined" | "tag_added";

export async function fireTrigger(accountId: string, contactId: string, type: TriggerType, value: string) {
  try {
    const id = createHash("sha1").update(`${accountId}:${contactId}:${type}:${value}`).digest("hex").slice(0, 32);
    await getQueues().automation.add(
      "trigger",
      { accountId, contactId, type, value },
      {
        jobId: `t${id}`, // the same trigger cannot be queued twice
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      }
    );
  } catch (e) {
    console.error("Could not queue automation trigger", e);
  }
}

export async function fireContactTriggers(
  accountId: string,
  contactId: string,
  listIds: string[],
  tags: string[]
) {
  await Promise.all([
    ...listIds.map((l) => fireTrigger(accountId, contactId, "list_joined", l)),
    ...tags.map((t) => fireTrigger(accountId, contactId, "tag_added", t)),
  ]);
}