import { Worker } from "bullmq";
import { createConnection, PREPARE_QUEUE, EMAIL_QUEUE, CONFIRM_QUEUE, AUTOMATION_QUEUE } from "@/lib/queue";
import { prepareCampaign, sendEmail, sendConfirmation, markMessageFailed, 
  finalizeCampaigns, markCampaignFailed } from "./processors";
import { automationTrigger, automationStep, sweepRuns } from "./automation";
import { startSesEventConsumer } from "./ses-events";

const stopSesEvents = startSesEventConsumer();
const rate = Number(process.env.SEND_RATE_PER_SECOND ?? 10);
const concurrency = Number(process.env.SEND_CONCURRENCY ?? 5);



const automationWorker = new Worker(
  AUTOMATION_QUEUE,
  (job) => (job.name === "trigger" ? automationTrigger(job) : automationStep(job)),
  { connection: createConnection(), concurrency, limiter: { max: rate, duration: 1000 } }
);
automationWorker.on("error", (e) => console.error("automation worker error", e));

const sweeper = setInterval(() => {
  sweepRuns().catch((e) => console.error("sweep failed", e));
}, 60_000);

const prepareWorker = new Worker(PREPARE_QUEUE, prepareCampaign, {
  connection: createConnection(),
  concurrency: 1,
});

const emailWorker = new Worker(EMAIL_QUEUE, sendEmail, {
  connection: createConnection(),
  concurrency,
  limiter: { max: rate, duration: 1000 }, // at most `rate` emails per second
});

const confirmWorker = new Worker(CONFIRM_QUEUE, sendConfirmation, {
  connection: createConnection(),
  concurrency: 3,
  limiter: { max: rate, duration: 1000 },
});

confirmWorker.on("error", (e) => console.error("confirm worker error", e));

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
  await Promise.all([prepareWorker.close(), emailWorker.close(), confirmWorker.close()]);
  stopSesEvents();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);