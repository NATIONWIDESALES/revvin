import { describe, expect, it } from "vitest";
import {
  generateMessages,
  TIMING_OPTIONS,
  TONE_OPTIONS,
  TRADE_OPTIONS,
  type MessageInputs,
} from "@/lib/toolkit/messages";

const base: MessageInputs = {
  trade: TRADE_OPTIONS[0].value,
  customerFirstName: "",
  businessName: "",
  ownerName: "",
  jobDescription: "",
  rewardDisplay: "",
  referralPageLink: "",
  timing: "just_completed",
  tone: "direct",
};

const all = (m: ReturnType<typeof generateMessages>) => [m.sms, m.emailSubject, m.emailBody, m.inPerson];

describe("referral message generator", () => {
  it("produces three usable messages with every optional field blank", () => {
    const m = generateMessages(base);
    for (const text of all(m)) {
      expect(text.trim().length).toBeGreaterThan(10);
      expect(text).not.toMatch(/[{}]|\[\[|undefined|null/);
      expect(text).not.toMatch(/\s,|,\s*\.|\s\.\s|\.\.|::/);
    }
  });

  it("is deterministic for the same inputs", () => {
    expect(generateMessages(base)).toEqual(generateMessages(base));
  });

  it("includes the details that were supplied", () => {
    const m = generateMessages({
      ...base,
      customerFirstName: "Dana",
      businessName: "Northside Roofing",
      ownerName: "Sam",
      jobDescription: "the garage roof",
      rewardDisplay: "$150",
      referralPageLink: "revvin.co/r/northside",
    });
    const joined = all(m).join("\n");
    for (const detail of ["Dana", "Northside Roofing", "Sam", "the garage roof", "$150", "revvin.co/r/northside"]) {
      expect(joined).toContain(detail);
    }
  });

  it("treats the reward as presentation text and never parses it as money", () => {
    const m = generateMessages({ ...base, rewardDisplay: "a $50 gift card or a free service call" });
    expect(all(m).join("\n")).toContain("a $50 gift card or a free service call");
  });

  it("changes wording with timing and with tone", () => {
    const timings = TIMING_OPTIONS.map((t) => generateMessages({ ...base, timing: t.value }).sms);
    expect(new Set(timings).size).toBe(TIMING_OPTIONS.length);
    const tones = TONE_OPTIONS.map((t) => generateMessages({ ...base, tone: t.value }).sms);
    expect(new Set(tones).size).toBe(TONE_OPTIONS.length);
  });

  it("gives the email a subject line separate from the body", () => {
    const m = generateMessages(base);
    expect(m.emailSubject.length).toBeGreaterThan(5);
    expect(m.emailSubject).not.toContain("\n");
    expect(m.emailBody).not.toBe(m.emailSubject);
  });

  it("supports every curated trade without leaking a raw slug", () => {
    for (const trade of TRADE_OPTIONS) {
      const joined = all(generateMessages({ ...base, trade: trade.value })).join("\n");
      expect(joined).not.toContain("_");
      expect(joined.length).toBeGreaterThan(20);
    }
  });

  it("keeps unexpected trade values from breaking the output", () => {
    const m = generateMessages({ ...base, trade: "not-a-real-trade" });
    expect(m.sms.length).toBeGreaterThan(10);
  });

  it("never claims Revvin sent the message", () => {
    const joined = all(generateMessages(base)).join("\n").toLowerCase();
    expect(joined).not.toContain("sent by revvin");
    expect(joined).not.toContain("on behalf of");
  });

  it("bounds absurdly long input instead of composing a giant message", () => {
    const m = generateMessages({ ...base, jobDescription: "x".repeat(5000) });
    expect(m.sms.length).toBeLessThan(2000);
  });
});
