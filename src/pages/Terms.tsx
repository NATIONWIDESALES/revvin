import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const Terms = () => {
  return (
    <div className="py-12">
      <SEOHead title="Terms of Service — Revvin" description="Read Revvin's Terms of Service covering platform usage, referral obligations, payout structure, and dispute resolution for businesses and referrers." path="/terms" />
      <div className="container max-w-3xl">
        <Button variant="ghost" size="sm" className="gap-1 mb-6" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 20, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-bold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing or using the Revvin platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. Revvin reserves the right to modify these terms at any time with 30 days' notice via email or in-platform notification.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">2. Platform Overview</h2>
            <p>Revvin is a pay-per-close referral marketplace that connects businesses seeking customer acquisition ("Businesses") with individuals who provide qualified introductions ("Referrers"). The platform facilitates referral submissions, tracks deal outcomes, coordinates payouts, and provides administrative oversight.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">3. User Accounts</h2>
            <p>You must register for an account to use the Service. You are responsible for maintaining the confidentiality of your login credentials. You agree to provide accurate, current, and complete information during registration and to update your information as necessary. Users must be at least 18 years of age.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">4. Business Obligations</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Businesses are responsible for the payout amount advertised in their offers.</li>
              <li>When a referral is accepted, the payout terms are locked for that referral.</li>
              <li>Businesses must act on submitted referrals within 14 days of acceptance.</li>
              <li>Deal outcomes (won, lost, declined) must be reported honestly and promptly.</li>
              <li>Businesses may not contact referrers' leads outside the Revvin platform for deals submitted through the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">5. Referrer Obligations</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Referrals must be genuine introductions — not fabricated, purchased, or recycled leads.</li>
              <li>Referrers must have the consent of the referred individual before submitting their information.</li>
              <li>Duplicate submissions are not permitted. First submission wins, timestamped.</li>
              <li>Referrers may not misrepresent the business's services or pricing to the referred individual.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">6. Payout Structure</h2>
            <p>Referrers receive 100% of the advertised referral fee upon a verified closed deal. The platform fee (25% on Free tier, 10% on Paid tier) is charged separately to the business at offer publication. Payouts are processed according to the timeline specified on the offer (Net 7, Net 14, or Net 30).</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">7. Payouts</h2>
            <p>When a referral is accepted, payout terms are snapshotted. Upon a verified deal closure, Revvin processes the payout to the referrer. If a deal is lost or declined, no payout is created. During early access, payouts are processed manually by the Revvin team after verification.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">8. Disputes</h2>
            <p>Referrers may file a dispute if they believe a referral was incorrectly marked as lost or declined. Disputes are reviewed by Revvin's operations team within 5 business days. Revvin's dispute resolution decision is final and binding. Repeated frivolous disputes may result in account suspension.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">9. Verification</h2>
            <p>Businesses may apply for Verified or Verified+ status. Verification involves identity confirmation, business license review, and insurance validation. Verified status does not constitute an endorsement by Revvin. Revvin reserves the right to revoke verification at any time.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">10. Prohibited Conduct</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Submitting fraudulent, misleading, or spam referrals.</li>
              <li>Creating multiple accounts to circumvent platform limits.</li>
              <li>Attempting to transact outside the platform for referrals discovered through Revvin.</li>
              <li>Harassing, threatening, or abusing other users.</li>
              <li>Reverse-engineering, scraping, or interfering with the platform infrastructure.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">11. Limitation of Liability</h2>
            <p>Revvin provides the platform "as is" without warranty. Revvin is not liable for the quality of services provided by businesses, the outcome of referrals, or any indirect, incidental, or consequential damages arising from the use of the platform. Total liability is limited to fees paid in the preceding 12 months.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">12. Governing Law</h2>
            <p>These Terms are governed by the laws of the Province of British Columbia, Canada, without regard to conflict of law principles. For users in the United States, disputes shall be resolved in accordance with the laws of the State of Delaware. Any disputes shall be resolved through binding arbitration.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">13. Contact</h2>
            <p>For questions about these Terms, contact us at <span className="text-primary font-medium">legal@revvin.io</span>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
