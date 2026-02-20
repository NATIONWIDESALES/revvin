import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const Privacy = () => {
  return (
    <div className="py-12">
      <div className="container max-w-3xl">
        <Button variant="ghost" size="sm" className="gap-1 mb-6" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
        </Button>

        <h1 className="font-display text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: February 20, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="font-display text-lg font-bold text-foreground">1. Information We Collect</h2>
            <p>We collect information you provide when creating an account (name, email, phone number, role selection), submitting referrals (customer name, email, phone), and using the platform (transaction history, offer interactions, IP address, device information).</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To operate and improve the Revvin marketplace.</li>
              <li>To process referral submissions and manage escrow payouts.</li>
              <li>To verify business identities and referrer eligibility.</li>
              <li>To communicate platform updates, referral status changes, and payout notifications.</li>
              <li>To detect and prevent fraudulent activity.</li>
              <li>To comply with legal obligations in Canada and the United States.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">3. Information Sharing</h2>
            <p>We share limited information between parties to facilitate referrals:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>With Businesses:</strong> Customer name, contact information, and referral notes submitted by the referrer.</li>
              <li><strong>With Referrers:</strong> Referral status updates and payout amounts. Business contact details are never shared with referrers.</li>
              <li><strong>With Service Providers:</strong> Payment processors (Stripe), hosting providers, and analytics tools that help us operate the platform.</li>
              <li><strong>With Legal Authorities:</strong> When required by law, court order, or to protect the safety of our users.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">4. Cross-Border Data Transfer</h2>
            <p>Revvin operates in both Canada and the United States. Your data may be processed and stored in either country. By using the platform, you consent to the transfer of your information across borders. We comply with PIPEDA (Canada) and applicable U.S. state privacy laws including CCPA (California).</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">5. Data Retention</h2>
            <p>We retain your account information for as long as your account is active. Referral records and transaction history are retained for 7 years for regulatory compliance. You may request deletion of your account at any time, subject to legal retention requirements.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">6. Your Rights</h2>
            <p>Depending on your jurisdiction, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal information we hold about you.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Request deletion of your personal information.</li>
              <li>Opt out of marketing communications.</li>
              <li>Download a copy of your data in a portable format.</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact <span className="text-primary font-medium">privacy@revvin.io</span>.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">7. Security</h2>
            <p>We implement industry-standard security measures including encryption in transit (TLS 1.3), encryption at rest, and role-based access controls. Financial data is processed through PCI-compliant payment processors. We conduct regular security audits and vulnerability assessments.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">8. Cookies & Tracking</h2>
            <p>We use essential cookies for authentication and session management. We use analytics cookies to understand platform usage. You may disable non-essential cookies through your browser settings. We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">9. Children's Privacy</h2>
            <p>Revvin is not directed at individuals under 18 years of age. We do not knowingly collect personal information from minors. If we learn that we have collected information from a minor, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Material changes will be communicated via email or in-platform notification at least 30 days before they take effect.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-bold text-foreground">11. Contact</h2>
            <p>For privacy inquiries, contact our Data Protection Officer at <span className="text-primary font-medium">privacy@revvin.io</span>.</p>
            <p className="mt-2">Revvin Technologies Inc.<br />Vancouver, BC, Canada</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
