import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const Privacy = () => {
  return (
    <div className="py-12">
      <SEOHead title="Revvin | Privacy Policy" description="How Revvin collects, uses, and protects personal information across business accounts, referrer accounts, and leads submitted through referral pages." path="/privacy" />
      <div className="container max-w-3xl">
        <Button variant="ghost" size="sm" className="gap-1 mb-6" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 8, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <p>
              This Privacy Policy explains how Revvin ("Revvin", "we", "us") collects, uses, shares, and protects personal information when you use revvin.co, our branded business referral pages, and related services (the "Service"). It applies to businesses that subscribe to Revvin, referrers who submit leads, and the prospective customers ("Leads") whose information is submitted through a referral page. If you do not agree with this Policy, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">1. Information We Collect</h2>
            <p><strong>Account information.</strong> When you create a business or referrer account we collect your name, email address, password (hashed), phone number, role, and, for businesses, company name, industry, service area, logo, and the content you publish on your referral page.</p>
            <p><strong>Referral information.</strong> When a referrer submits a lead through a branded referral page we collect the referrer's name, email and phone, and the Lead's name, email, phone, location, and any notes or attachments the referrer chooses to provide.</p>
            <p><strong>Billing information.</strong> Business subscriptions are processed by Stripe. We do not see or store full payment card numbers. We receive a customer identifier, subscription status, and billing metadata from Stripe to manage your account.</p>
            <p><strong>Usage and device information.</strong> Server logs, IP address, browser and device information, pages viewed, and basic analytics events. We use cookies and similar technologies as described in Section 7.</p>
            <p><strong>Communications.</strong> Messages you send us by email or in-app, and records of transactional emails or SMS we send to you (for example, referral status updates).</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">2. How We Use Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Operate the Service, including hosting branded referral pages and routing submitted leads to the correct business.</li>
              <li>Authenticate users and protect accounts.</li>
              <li>Process subscription billing through Stripe and send related receipts and notices.</li>
              <li>Send transactional messages about referral activity, account changes, and security events.</li>
              <li>Provide customer support and respond to your requests.</li>
              <li>Detect, investigate, and prevent fraud, abuse, and terms violations.</li>
              <li>Improve the Service and develop new features, using aggregated or de-identified data where practical.</li>
              <li>Comply with legal obligations and enforce our Terms and Referral Agreement.</li>
            </ul>
            <p>We do not sell personal information, and we do not use referral or Lead information to train third-party advertising models.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">3. How Referrals and Leads Flow</h2>
            <p>Revvin is the infrastructure that connects a referrer to a business; we do not act as the business or process payment between them. When a referrer submits a referral:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The Lead's contact information and any notes are shared with the business that owns the referral page.</li>
              <li>The referrer's name, email, and phone are shared with that business so they can coordinate the deal and pay the referrer directly when it closes.</li>
              <li>The business becomes an independent controller of that information for its own customer-relationship purposes and is responsible for its own handling under applicable law.</li>
              <li>Revvin retains a timestamped record of the referral so both sides have the same source of truth.</li>
            </ul>
            <p>Referrers are responsible for having a lawful basis to submit a Lead's information (for example, the Lead's consent). Businesses are responsible for honoring the privacy choices of Leads they receive.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">4. Service Providers and Sharing</h2>
            <p>We share personal information with vendors that help us run the Service, under contracts that limit their use of the data to providing services to Revvin. Current categories include:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Cloud hosting and database</strong> (Supabase, including managed Postgres and storage, hosted on AWS).</li>
              <li><strong>Billing</strong> (Stripe) for subscription processing.</li>
              <li><strong>Email delivery</strong> (Resend) for transactional and account email.</li>
              <li><strong>SMS delivery</strong> (Twilio) for transactional text messages where used.</li>
              <li><strong>Analytics and error monitoring</strong> for product and reliability purposes.</li>
            </ul>
            <p>We may also share information when required by law, valid legal process, or to protect the rights, property, or safety of Revvin, our users, or the public; and in connection with a corporate transaction such as a merger, financing, or sale of assets, in which case we will require the recipient to honor this Policy or provide notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">5. International Data Transfers</h2>
            <p>Revvin operates in the United States and Canada. Our infrastructure providers may process data in the United States and other countries. By using the Service you understand that your information may be transferred to and processed in jurisdictions outside your own, including the United States, and we apply reasonable safeguards consistent with applicable law.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">6. Data Retention</h2>
            <p>We retain account information for as long as your account is active. Referral records, including the parties involved and status changes, are retained while either the referrer or the business account is active and for a reasonable period afterward so that disputes about closed deals can be resolved. We may keep limited records longer where required by law (for example, tax records) or for fraud prevention. You can request deletion of your account at any time as described in Section 8.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">7. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies for authentication, session management, security, and basic product analytics. We do not use cross-site advertising cookies. You can control cookies through your browser settings; disabling essential cookies will prevent you from signing in.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">8. Your Rights and Choices</h2>
            <p>Depending on where you live, you may have the right to access, correct, delete, or receive a portable copy of your personal information, to object to or restrict certain processing, and to withdraw consent. To exercise these rights, email <span className="text-primary font-medium">info@revvin.co</span> from the address associated with your account. We may need to verify your identity before acting on a request.</p>
            <p><strong>For Leads.</strong> If a business sent you a referral through Revvin and you want your information removed from our systems, email <span className="text-primary font-medium">info@revvin.co</span>. We will remove it from Revvin, but you may also need to contact the business directly about any records it holds.</p>
            <p><strong>Marketing email.</strong> You can opt out of marketing email at any time using the unsubscribe link. Transactional email related to your account and referrals will continue.</p>
            <p><strong>California, Colorado, and similar US state privacy rights.</strong> Residents of states with comprehensive privacy laws have the rights described above and the right not to be discriminated against for exercising them. We do not sell personal information and we do not engage in cross-context behavioral advertising.</p>
            <p><strong>Canada (PIPEDA and provincial laws).</strong> Canadian users may direct privacy complaints to us first, and if unresolved, to the Office of the Privacy Commissioner of Canada or the applicable provincial regulator.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">9. Security</h2>
            <p>We use administrative, technical, and organizational measures designed to protect personal information, including TLS in transit, encryption at rest provided by our hosting infrastructure, role-based access controls, row-level database access policies, and secret management for credentials. No system is perfectly secure; we cannot guarantee absolute security and you are responsible for keeping your account credentials confidential.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">10. Children</h2>
            <p>The Service is intended for users 18 or older and is not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us information, contact us and we will delete it.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">11. Changes to This Policy</h2>
            <p>We may update this Policy from time to time. If we make material changes we will notify you by email or by an in-app notice and update the "Last updated" date above. Your continued use of the Service after the effective date means you accept the updated Policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">12. Contact</h2>
            <p>For privacy questions or to exercise your rights, contact <span className="text-primary font-medium">info@revvin.co</span>.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
