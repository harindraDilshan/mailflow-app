import { Queue } from "bullmq";
import IORedis from "ioredis";

export const PREPARE_QUEUE = "prepare-campaign";
export const EMAIL_QUEUE = "send-email";
export const CONFIRM_QUEUE = "confirm-email";
export const AUTOMATION_QUEUE = "automation";

export function createConnection() {
  const url = (process.env.REDIS_URL ?? "redis://127.0.0.1:6379").replace(
    "redis://localhost",
    "redis://127.0.0.1"
  );
  return new IORedis(url, {
    maxRetriesPerRequest: null, // required by BullMQ workers
  });
}

type Queues = { prepare: Queue; email: Queue; confirm: Queue; automation: Queue };
const g = globalThis as unknown as { __queues?: Queues };

export function getQueues(): Queues {
  if (!g.__queues) {
    const connection = createConnection();
    g.__queues = {
      prepare: new Queue(PREPARE_QUEUE, { connection }),
      email: new Queue(EMAIL_QUEUE, { connection }),
      confirm: new Queue(CONFIRM_QUEUE, { connection }),
      automation: new Queue(AUTOMATION_QUEUE, { connection }),
    };
  }
  return g.__queues;
}
