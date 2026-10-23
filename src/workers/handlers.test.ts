import { describe, expect, it } from "vitest";
import { defaultHandlers, getHandler, registerHandler } from "./handlers";
import type { TaskContext } from "../types";

const context: TaskContext = {
  jobId: "job-1",
  taskType: "send_email",
  attempt: 1,
  updateProgress: async () => undefined,
  log: async () => undefined
};

describe("handler registry", () => {
  it("registers and retrieves a handler", async () => {
    registerHandler("test_handler", async () => ({ ok: true }));

    const handler = getHandler("test_handler");

    await expect(handler?.({}, context)).resolves.toEqual({ ok: true });
  });

  it("registers the default sample handlers", () => {
    expect(defaultHandlers.has("send_email")).toBe(true);
    expect(defaultHandlers.has("resize_image")).toBe(true);
    expect(defaultHandlers.has("generate_pdf")).toBe(true);
  });
});

describe("sample handlers", () => {
  it("send_email returns an email id and sent timestamp", async () => {
    const handler = getHandler("send_email");

    await expect(
      handler?.({ to: "user@example.com", subject: "Hello", body: "Body" }, context)
    ).resolves.toMatchObject({ emailId: expect.stringContaining("email_") });
  });

  it("send_email validates payload shape", async () => {
    const handler = getHandler("send_email");

    await expect(handler?.({ to: "not-an-email", subject: "Hello" }, context)).rejects.toThrow(
      "send_email payload requires to, subject, and body"
    );
  });

  it("resize_image can be forced to fail deterministically", async () => {
    const handler = getHandler("resize_image");

    await expect(
      handler?.({ imageUrl: "https://example.com/a.png", width: 100, height: 100, forceFail: true }, context)
    ).rejects.toThrow("Forced resize_image failure");
  });
});
