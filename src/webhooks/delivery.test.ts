import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deliverWebhook } from "./delivery";

vi.mock("axios");

const mockedAxios = vi.mocked(axios, true);

describe("deliverWebhook", () => {
  beforeEach(() => {
    mockedAxios.post.mockReset();
  });

  it("retries failed webhook delivery and succeeds", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ status: 200 });

    await deliverWebhook(
      "https://example.com/webhook",
      { jobId: "job-1", status: "completed", result: { ok: true }, error: null },
      { maxRetries: 2, timeoutMs: 100, baseDelayMs: 1 }
    );

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it("does not throw after final webhook failure", async () => {
    mockedAxios.post.mockRejectedValue(new Error("network"));

    await expect(
      deliverWebhook(
        "https://example.com/webhook",
        { jobId: "job-1", status: "failed", result: null, error: "failed" },
        { maxRetries: 2, timeoutMs: 100, baseDelayMs: 1 }
      )
    ).resolves.toBeUndefined();

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });
});
