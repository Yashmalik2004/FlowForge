import { describe, expect, it } from "vitest";
import { TASK_QUEUE_NAME, priorityToBullPriority } from "./queue";

describe("queue configuration", () => {
  it("uses a BullMQ-safe queue name", () => {
    expect(TASK_QUEUE_NAME).not.toContain(":");
  });

  it("maps higher business priority to earlier BullMQ priority", () => {
    expect(priorityToBullPriority("high")).toBeLessThan(priorityToBullPriority("normal"));
    expect(priorityToBullPriority("normal")).toBeLessThan(priorityToBullPriority("low"));
  });
});
