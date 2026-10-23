import axios from "axios";
import { config } from "../config/env";
import type { WebhookPayload } from "../types";

export interface WebhookDeliveryOptions {
  maxRetries: number;
  timeoutMs: number;
  baseDelayMs: number;
}

const sleep = async (ms: number): Promise<void> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

export const deliverWebhook = async (
  callbackUrl: string,
  payload: WebhookPayload,
  options: WebhookDeliveryOptions = {
    maxRetries: config.webhookMaxRetries,
    timeoutMs: config.webhookTimeoutMs,
    baseDelayMs: 500
  }
): Promise<void> => {
  const attempts = Math.max(1, options.maxRetries);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await axios.post(callbackUrl, payload, { timeout: options.timeoutMs });
      console.info(`Webhook delivered for job ${payload.jobId} on attempt ${attempt}`);
      return;
    } catch (error: unknown) {
      console.error(`Webhook delivery failed for job ${payload.jobId} on attempt ${attempt}: ${errorMessage(error)}`);
      if (attempt < attempts) {
        await sleep(options.baseDelayMs * 2 ** (attempt - 1));
      }
    }
  }
};

