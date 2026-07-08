import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const Terms = () => {
  return (
    <div className="py-12">
      <SEOHead title="Revvin | Terms of Service" description="Revvin's Terms of Service: flat $49/month subscription, referral program infrastructure, and how businesses, referrers, and Revvin each fit in." path="/terms" />
      <div className="container max-w-3xl">
        <Button variant="ghost" size="sm" className="gap-1 mb-6" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to Home</Link>
        </Button>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 8, 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
          <section>
            <p>
              Welcome to Revvin. These Terms of Service ("Terms") are a plain-language agreement between you and Revvin ("Revvin", "we", "us") covering revvin.co, the branded referral pages we host for businesses, and related services (the "Service"). By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">1. What Revvin is</h2>
            <p>Revvin provides referral program infrastructure for service businesses: a branded referral page, a shareable link, a QR code, and a lead inbox with a dashboard. Revvin is a tool. We do not perform the services businesses sell, we do not vet or verify leads, referrers, or businesses, and we do not guarantee any volume of referrals, leads, or revenue.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">2. Who can use the Service</h2>
            <p>The Service is offered to businesses located in the United States and Canada, and to referrers submitting leads to those businesses. You must be at least 18 years old and able to enter a binding contract. You are responsible for keeping your login credentials confidential and for activity on your account.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">3. Subscription and billing</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Business subscriptions are a flat $49 per month in US dollars, billed monthly through Stripe. Pricing is in USD for all customers, including customers in Canada.</li>
              <li>There is no free trial, no contract, and no setup fee. Billing starts on the day you subscribe.</li>
              <li>You can cancel anytime through the Stripe billing portal linked from your account. On cancellation your access continues until the end of the current paid period and does not renew.</li>
              <li>We retain your lead history after cancellation so you can return to it if you resubscribe.</li>
              <li>Referrers use Revvin for free.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">4. Referrer rewards are between the business and the referrer</h2>
            <p>Businesses set their own referral reward and pay their referrers directly, off platform, on the terms the business publishes. Revvin is not a party to any referral reward. We do not process reward payouts, we do not hold or transmit reward funds, we do not guarantee payment of any reward, and we take no fee on rewards. Any dispute about whether a reward is owed or paid is between the business and the referrer.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">5. Contacting your own customers</h2>
            <p>When a business uses Revvin to announce or promote its referral program to its own customers, the business is solely responsible for having the right to contact those people and for complying with applicable communications and marketing laws, including the US Telephone Consumer Protection Act (TCPA) and Canada's Anti-Spam Legislation (CASL). Sends happen from the business's own devices and accounts, using the business's own SMS and email apps. Revvin does not send SMS or email to your customers on your behalf.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">6. Referrer conduct</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Only submit real introductions for people who have agreed to be contacted by the business.</li>
              <li>Do not fabricate, purchase, scrape, or recycle leads.</li>
              <li>Do not misrepresent a business's services or pricing.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">7. Business conduct</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Be accurate about your business, offer, and reward terms.</li>
              <li>Handle leads and referrer information lawfully and respectfully.</li>
              <li>Pay referrers what you promised, on the timeline you promised.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">8. Acceptable use</h2>
            <p>Do not use the Service to break the law, harm others, interfere with the platform, reverse engineer it, or attempt to gain unauthorized access. We may suspend or terminate accounts that violate these Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">9. Your content</h2>
            <p>You keep ownership of the content you put into Revvin, including your business details, logo, offer copy, and lead notes. You grant Revvin a limited license to host, display, and process that content as needed to operate the Service for you.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">10. Service availability and changes</h2>
            <p>We work to keep the Service available, but we do not promise uninterrupted or error-free operation. We may add, change, or remove features. If a change materially reduces the Service, we will make a reasonable effort to give notice.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">11. Disclaimers</h2>
            <p>The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. Revvin does not warrant the quality, safety, licensing, or performance of any business listed on the platform, and does not warrant the accuracy of any lead submitted by a referrer.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">12. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Revvin will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, data, or business opportunities, arising out of or related to your use of the Service. Revvin's total liability for any claim relating to the Service is limited to the fees you paid Revvin in the twelve months before the event that gave rise to the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">13. Indemnification</h2>
            <p>You agree to defend and indemnify Revvin from claims arising out of your use of the Service, your content, your referral rewards, or your communications with customers, including any claim that your outreach violated TCPA, CASL, or another communications or privacy law.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">14. Termination</h2>
            <p>You can stop using the Service at any time by cancelling your subscription. We may suspend or terminate an account for a violation of these Terms or for conduct that puts other users, our vendors, or the platform at risk. Sections that by their nature should survive termination will survive, including payment obligations already incurred, disclaimers, limitations of liability, and indemnification.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">15. Changes to these Terms</h2>
            <p>We may update these Terms from time to time. When we do, we will update the "Last updated" date above and, for material changes, give reasonable notice. Continued use of the Service after an update means you accept the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">16. Governing law</h2>
            <p>These Terms are governed by the laws of the jurisdiction where Revvin is established, without regard to conflict-of-law rules. Disputes will be handled in the courts serving that jurisdiction, unless applicable consumer protection law grants you rights in your home jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground">17. Contact</h2>
            <p>For any question about these Terms, or for support, privacy, or legal matters, contact <span className="text-primary font-medium">info@revvin.co</span>. This is the only contact address for Revvin.</p>
          </section>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          See also our <Link to="/privacy" className="text-primary font-medium hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
};

export default Terms;
