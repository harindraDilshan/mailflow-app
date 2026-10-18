import { Queue } from "bullmq";
import IORedis from "ioredis";

export const PREPARE_QUEUE = "prepare-campaign";
export const EMAIL_QUEUE = "send-email";

export function createConnection() {
  return new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null, // required by BullMQ workers
  });
}

// Keep one set of queues, even when Next.js reloads files in development.
const g = globalThis as unknown as { __queues?: { prepare: Queue; email: Queue } };

export function getQueues() {
  if (!g.__queues) {
    const connection = createConnection();
    g.__queues = {
      prepare: new Queue(PREPARE_QUEUE, { connection }),
      email: new Queue(EMAIL_QUEUE, { connection }),
    };
  }
  return g.__queues;
}