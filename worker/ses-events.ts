import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { recordOnce } from "@/lib/events";

type SesEvent = {
  eventType?: string;
  notificationType?: string;
  mail?: { tags?: Record<string, string[]> };
  bounce?: { bounceType?: string };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function handleEvent(evt: SesEvent) {
  const mid = evt.mail?.tags?.mid?.[0];
  if (!mid) return; // not a message of the platform
  const type = evt.eventType ?? evt.notificationType;

  if (type === "Delivery") await recordOnce(mid, "delivered");
  else if (type === "Bounce" && evt.bounce?.bounceType === "Permanent") await recordOnce(mid, "bounce");
  else if (type === "Complaint") await recordOnce(mid, "complaint");
}

export function startSesEventConsumer() {
  const queueUrl = process.env.SES_EVENTS_QUEUE_URL;
  const urlRegion = queueUrl?.match(/sqs\.([a-z0-9-]+)\.amazonaws\.com/)?.[1];
  if (urlRegion && urlRegion !== process.env.AWS_REGION) {
    console.error(
      `SES events are off. The queue is in ${urlRegion}, but AWS_REGION is ${process.env.AWS_REGION}.`
    );
    return () => {};
  }
  if (!queueUrl) {
    console.log("SES events are off. SES_EVENTS_QUEUE_URL is not set.");
    return () => {};
  }

  const sqs = new SQSClient({ region: process.env.AWS_REGION });
  let running = true;

  (async () => {
    console.log("SES event consumer started.");
    while (running) {
      try {
        const res = await sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20,
            VisibilityTimeout: 60,
          })
        );
        for (const m of res.Messages ?? []) {
          try {
            const body = JSON.parse(m.Body ?? "{}");
            const evt: SesEvent = body.Message ? JSON.parse(body.Message) : body; // with or without SNS envelope
            await handleEvent(evt);
            await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: m.ReceiptHandle }));
          } catch (e) {
            console.error("SES event failed. It stays in the queue.", e);
          }
        }
      } catch (e) {
        console.error("SES queue error", e);
        await sleep(5000);
      }
    }
  })();

  return () => {
    running = false;
  };
}