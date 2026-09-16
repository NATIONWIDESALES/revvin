import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  customerFromAddress,
  customerReplyTo,
  postalAddressOf,
} from "../../supabase/functions/_shared/email-format";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("customer-facing sender identity", () => {
  it("puts the business first and strips header-breaking characters", () => {
    expect(customerFromAddress("Summit Roofing", "Revvin <info@revvin.co>")).toBe(
      "Summit Roofing via Revvin <info@revvin.co>",
    );
    expect(customerFromAddress('Acme <bad@x.com> "Co"', "Revvin <info@revvin.co>")).toBe(
      "Acme bad@x.com Co via Revvin <info@revvin.co>",
    );
    expect(customerFromAddress("", "info@revvin.co")).toBe("Revvin <info@revvin.co>");
  });

  it("prefers the business email, then the owner account, then the platform mailbox", () => {
    expect(customerReplyTo("Owner@Summit.com", "acct@x.com")).toBe("owner@summit.com");
    expect(customerReplyTo(null, "acct@x.com")).toBe("acct@x.com");
    expect(customerReplyTo("not-an-email", null)).toBe("info@revvin.co");
  });

  it("only returns a postal address when every part is on file", () => {
    expect(
      postalAddressOf({ street_address: "1 Main", city: "Vancouver", postal_code: "V5K", country: "CA" }),
    ).toEqual({ street_address: "1 Main", city: "Vancouver", postal_code: "V5K", country: "CA" });
    expect(postalAddressOf({ street_address: "1 Main", city: "", postal_code: "V5K", country: "CA" })).toBeNull();
    expect(postalAddressOf(null)).toBeNull();
  });
});

describe("one campaign email per recipient", () => {
  const reconciler = read("supabase/functions/process-campaign-sends/index.ts");

  it("the reconciler cannot send email", () => {
    expect(reconciler).not.toContain("sendEmailViaGateway");
    expect(reconciler).not.toContain("resend-gateway");
  });

  it("the reconciler never claims or completes a recipient row", () => {
    expect(reconciler).not.toMatch(/status:\s*"sending"/);
    expect(reconciler).not.toMatch(/status:\s*"sent",\s*sent_at/);
  });

  it("send-campaign remains the only path that queues a recipient", () => {
    const sender = read("supabase/functions/send-campaign/index.ts");
    expect(sender).toContain("customerFromAddress");
    expect(sender).toContain("customerReplyTo");
    expect(sender).toContain("campaign_emails");
  });
});

describe("job done and reward emails come from the business", () => {
  for (const path of [
    "supabase/functions/process-referral-triggers/index.ts",
    "supabase/functions/notify-referrer-reward/index.ts",
  ]) {
    it(`${path} uses the shared sender helpers`, () => {
      const src = read(path);
      expect(src).toContain("customerFromAddress(biz.name");
      expect(src).not.toMatch(/reply_to:\s*RESEND_REPLY_TO/);
      expect(src).not.toMatch(/from:\s*RESEND_FROM_ADDRESS/);
    });
  }

  it("the job done emails carry the postal address when there is one", () => {
    const src = read("supabase/functions/process-referral-triggers/index.ts");
    expect(src.match(/postalAddressOf\(biz\)/g)?.length).toBe(2);
  });
});

describe("bulk ask stays device native", () => {
  const tab = read("src/components/dashboard/CustomersTab.tsx");

  it("offers Gmail and Outlook alongside the mail app draft", () => {
    expect(tab).toContain("Open in Gmail");
    expect(tab).toContain("Open in Outlook");
    expect(tab).toContain("https://mail.google.com/mail/?view=cm&fs=1&bcc=");
    expect(tab).toContain("https://outlook.office.com/mail/deeplink/compose?bcc=");
    expect(tab).toContain('window.open(href, "_blank", "noopener,noreferrer")');
  });

  it("keeps the batch confirm step and copy addresses", () => {
    expect(tab).toContain("Copy addresses");
    expect(tab).toContain("setBulkAwaitingConfirm(true)");
  });
});
