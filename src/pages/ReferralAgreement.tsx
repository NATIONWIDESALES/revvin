import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const ReferralAgreement = () => {
  return (
    <div className="py-12">
      <SEOHead title="Referral Agreement | Revvin" description="Understand the referral terms between businesses and referrers on Revvin, including payout rules, exclusivity, and dispute resolution process." path="/referral-agreement" />
      <div className="mx-auto w-full max-w-[720px] px-5">

        <h1 className="mb-3 text-5xl leading-[1] md:text-6xl">Referral Agreement</h1>
        <p className="mb-8 border-b border-line pb-5 text-sm text-muted-foreground">Last updated: April 1, 2026</p>

        <div className="article-body space-y-6">
          <section>
            <h2>1. Agreement</h2>
            <p>This Referral Agreement ("Agreement") governs the relationship between Referrers and Businesses on the Revvin platform. By submitting a referral, both parties agree to the terms outlined here and in the general Terms of Service.</p>
          </section>

          <section>
            <h2>2. Referral Submission</h2>
            <p>A referral is considered valid when it meets all qualification criteria listed on the offer, the referred individual has given consent to be contacted, and the referral is not a duplicate of a previously submitted lead. The timestamp of submission determines priority in case of duplicate claims.</p>
          </section>

          <section>
            <h2>3. Business Response Timeline</h2>
            <p>Upon accepting a referral, the Business commits to contacting the referred individual within 48 hours and keeping its status current in the dashboard. Repeated failure to respond or to update referral status may result in account suspension at Revvin's discretion. Revvin does not act as an agent for either party.</p>
          </section>

          <section>
            <h2>4. Payout Terms</h2>
            <p>Referrers receive the full advertised referral fee upon a verified closed deal. Payment is made directly by the Business to the Referrer, using the payout method and timing specified on the offer (typically Net 7, Net 14, or Net 30 from verified close). Revvin does not process payouts on behalf of the Business and does not deduct any amount from the Referrer's payout.</p>
          </section>

          <section>
            <h2>5. Exclusivity</h2>
            <p>Referrals submitted through Revvin are exclusive to the platform for 90 days from the date of submission. Neither the Referrer nor the Business may attempt to complete the transaction outside of Revvin during this period. After 90 days, if the deal has not progressed, the exclusivity period expires.</p>
          </section>

          <section>
            <h2>6. Disputes and Non-Payment</h2>
            <p>Disputes over deal outcomes or payment are between the Business and the Referrer. Revvin maintains the timestamped record of the referral and any status changes, and a Referrer may flag a closed referral as unpaid after 30 days. Revvin may, at its sole discretion, review flags and suspend a Business's account for a pattern of non-payment or dishonest reporting, but Revvin does not arbitrate disputes, does not collect or hold funds, and does not guarantee payment.</p>
          </section>

          <section>
            <h2>7. Termination</h2>
            <p>Either party may terminate their participation in any active referral by notifying Revvin. Termination of this Agreement does not affect a Business's obligation to pay Referrers for deals that have already closed.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReferralAgreement;
