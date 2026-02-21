import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const ReferralAgreement = () => {
  return (
    <div className="py-12">
      <SEOHead title="Referral Agreement" description="Understand the referral terms between businesses and referrers on Revvin, including payout rules, exclusivity, and disputes." path="/referral-agreement" />
      <div className="container max-w-3xl">
        <Button variant="ghost" size="sm" className="gap-1 mb-6" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
        </Button>

        <h1 className="font-display text-3xl font-bold mb-2">Referral Agreement</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 20, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="font-display text-lg font-bold text-foreground">1. Agreement</h2>
            <p>This Referral Agreement ("Agreement") governs the relationship between Referrers and Businesses on the Revvin platform. By submitting a referral, both parties agree to the terms outlined here and in the general Terms of Service.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">2. Referral Submission</h2>
            <p>A referral is considered valid when it meets all qualification criteria listed on the offer, the referred individual has given consent to be contacted, and the referral is not a duplicate of a previously submitted lead. The timestamp of submission determines priority in case of duplicate claims.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">3. Business Response Timeline</h2>
            <p>Upon accepting a referral, the Business commits to contacting the referred individual within 48 hours and providing status updates at least every 7 days. Failure to respond within 14 days of acceptance may trigger automatic dispute resolution in the Referrer's favor.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">4. Payout Terms</h2>
            <p>Payouts follow the 90/10 model: the Referrer receives 90% of the advertised referral fee, and Revvin retains 10% as a platform management fee. Payouts are triggered when the Business marks a deal as "Won/Closed" and the funds are released from escrow. Payment is processed to the Referrer's configured payout method (ACH for US, Interac e-Transfer or EFT for Canada).</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">5. Exclusivity</h2>
            <p>Referrals submitted through Revvin are exclusive to the platform for 90 days from the date of submission. Neither the Referrer nor the Business may attempt to complete the transaction outside of Revvin during this period. After 90 days, if the deal has not progressed, the exclusivity period expires.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">6. Dispute Process</h2>
            <p>If a Referrer believes a deal outcome was misreported, they may file a dispute within 14 days of the status change. Revvin will review supporting evidence from both parties and render a decision within 5 business days. The resolution is final and may result in payout release, denial, or a split decision.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">7. Termination</h2>
            <p>Either party may terminate their participation in any active referral by notifying Revvin. If funds have been escrowed, they will be returned to the Business unless the referral has already progressed to a qualified stage. Termination of this Agreement does not affect pending payouts for completed deals.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReferralAgreement;
