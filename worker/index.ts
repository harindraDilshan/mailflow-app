import { Worker } from "bullmq";
import { createConnection, PREPARE_QUEUE, EMAIL_QUEUE } from "@/lib/queue";
import {
  prepareCampaign, sendEmail, markMessageFailed, finalizeCampaigns, markCampaignFailed,
} from "./processors";

const rate = Number(process.env.SEND_RATE_PER_SECOND ?? 10);
const concurrency = Number(process.env.SEND_CONCURRENCY ?? 5);

const prepareWorker = new Worker(PREPARE_QUEUE, prepareCampaign, {
  connection: createConnection(),
  concurrency: 1,
});

const emailWorker = new Worker(EMAIL_QUEUE, sendEmail, {
  connection: createConnection(),
  concurrency,
  limiter: { max: rate, duration: 1000 }, // at most `rate` emails per second
});

// After the last retry, record the failure.
emailWorker.on("failed", async (job, err) => {
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await markMessageFailed(job.data.messageId, err.message, job.attemptsMade);
  }
});
prepareWorker.on("failed", async (job) => {
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await markCampaignFailed(job.data.campaignId);
  }
});

emailWorker.on("drained", () => {
  finalizeCampaigns().catch((e) => console.error("finalize failed", e));
});
emailWorker.on("error", (e) => console.error("email worker error", e));
prepareWorker.on("error", (e) => console.error("prepare worker error", e));

console.log(`Worker running. Sending up to ${rate} emails/second, ${concurrency} at a time.`);

async function shutdown() {
  console.log("Stopping... waiting for current jobs to finish.");
  await Promise.all([prepareWorker.close(), emailWorker.close()]);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);