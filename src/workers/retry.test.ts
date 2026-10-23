import { describe, expect, it } from "vitest";
import { calculateRetryDelay } from "./retry";

describe("calculateRetryDelay", () => {
  it("uses exponential delay with jitter bounds", () => {
    const delay = calculateRetryDelay(3);

    expect(delay).toBeGreaterThanOrEqual(8000);
    expect(delay).toBeLessThan(9000);
  });

  it("rejects invalid attempt numbers", () => {
    expect(() => calculateRetryDelay(0)).toThrow("attemptNumber must be at least 1");
  });
});
