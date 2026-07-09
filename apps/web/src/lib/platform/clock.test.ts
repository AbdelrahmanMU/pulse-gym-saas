import { describe, expect, it } from "vitest";
import { systemClock } from "./clock";
import { createFakeClock, createFakeIdGenerator } from "./fakes";

/**
 * Platform adapters as injectable, deterministic fakes (T-26 DoD). The fake clock
 * freezes time and the fake id generator yields a predictable sequence, so domain
 * logic can be tested without the real system clock / random ids.
 */
describe("clock", () => {
  it("systemClock.today returns a YYYY-MM-DD string in the given zone", () => {
    expect(systemClock.today("UTC")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(systemClock.now()).toBeInstanceOf(Date);
  });

  it("fake clock freezes `now` and formats `today` in the requested time zone", () => {
    const fixed = new Date("2026-06-29T02:30:00Z");
    const clock = createFakeClock(fixed);
    expect(clock.now()).toBe(fixed);
    expect(clock.today("UTC")).toBe("2026-06-29");
    // 02:30 UTC is the previous evening in New York → the date rolls back.
    expect(clock.today("America/New_York")).toBe("2026-06-28");
  });
});

describe("fake id generator", () => {
  it("yields a deterministic, incrementing sequence", () => {
    const ids = createFakeIdGenerator();
    expect(ids.newId()).toBe("id-1");
    expect(ids.newId()).toBe("id-2");
    expect(createFakeIdGenerator("x-").newId()).toBe("x-1");
  });
});
