/**
 * Authoritative legal content.
 *
 * The rendered pages and the prerendered initial HTML both read from here. They
 * used to diverge: the pages carried the real policy while the prerender carried
 * a hand-written three-paragraph summary with terms that did not appear in the
 * policy at all. A crawler and a visitor must not be shown different terms, so
 * there is now exactly one copy of the text.
 */

export interface LegalParagraph {
  /** Bolded lead-in, e.g. "Account information." */
  lead?: string;
  text: string;
}

export interface LegalSection {
  heading: string;
  paragraphs?: LegalParagraph[];
  bullets?: string[];
}

export interface LegalDoc {
  path: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
}

const p = (text: string, lead?: string): LegalParagraph => ({ text, lead });

export const TERMS_DOC: LegalDoc = {
  path: "/terms",
  h1: "Terms of Service",
  metaTitle: "Terms of Service | Revvin",
  metaDescription:
    "Revvin's Terms of Service: free referral pages, Revvin Pro at $49/month USD, and the fact that businesses pay referral rewards directly while Revvin never holds the money.",
  lastUpdated: "September 8, 2026",
  intro:
    'Welcome to Revvin. These Terms of Service ("Terms") are a plain-language agreement between you and Revvin ("Revvin", "we", "us") covering revvin.co, the branded referral pages we host for businesses, and related services (the "Service"). By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service.',
  sections: [
    {
      heading: "1. What Revvin is",
      paragraphs: [
        p(
          "Revvin provides referral program infrastructure for service businesses: a branded referral page, a shareable link, a QR code, and a lead inbox with a dashboard. Revvin is a tool. We do not perform the services businesses sell, we do not vet or verify leads, referrers, or businesses, and we do not guarantee any volume of referrals, leads, or revenue.",
        ),
      ],
    },
    {
      heading: "2. Who can use the Service",
      paragraphs: [
        p(
          "The Service is offered to businesses located in the United States, Canada and the United Arab Emirates, and to referrers submitting leads to those businesses. You must be at least 18 years old and able to enter a binding contract. You are responsible for keeping your login credentials confidential and for activity on your account.",
        ),
      ],
    },
    {
      heading: "3. Subscription and billing",
      bullets: [
        "Creating an account, building your referral page, and previewing it are free. No payment details are required to build.",
        "Business subscriptions are either a flat $49 per month in US dollars, billed monthly through Stripe, or $450 per year in US dollars, billed once up front through Stripe. Pricing, offer payouts and every amount shown in the Service are in USD for all customers, in every country, including Canada and the United Arab Emirates. Your bank may apply its own conversion rate and fees.",
        "Publishing your referral page is free. There is no contract and no setup fee. Billing only starts if you choose to subscribe to Revvin Pro, and cancelling Pro never takes your page down. Until you publish, your page is a private draft that is not visible to the public.",
        "You can cancel anytime through the Stripe billing portal linked from your account. On cancellation your Pro access continues until the end of the current paid period and does not renew. On the annual plan the paid period is the full twelve months you were charged for. After Pro ends your referral page stays live and keeps taking referrals, because publishing is free.",
        "Fees already paid are non-refundable. We do not pro-rate or refund the unused part of a monthly or annual billing period, including when you cancel an annual subscription part way through the year.",
        "Invite codes: if you subscribe using an invite code we issued you, the first three months are free and your card is collected at checkout. From month four the subscription bills automatically at $17 per month USD, and that rate stays in place for as long as the subscription remains active. You can cancel anytime during the free months and you will not be charged. Invite codes apply to monthly billing only, are not transferable, and may be limited by number of uses or an expiry date.",
        "We retain your lead history after cancellation so you can return to it if you resubscribe.",
        "Referrers use Revvin for free.",
      ],
    },
    {
      heading: "4. Referrer rewards are between the business and the referrer",
      paragraphs: [
        p(
          "Businesses set their own referral reward and pay their referrers directly, off platform, on the terms the business publishes. Revvin is not a party to any referral reward. We do not process reward payouts, we do not hold or transmit reward funds, we do not guarantee payment of any reward, and we take no fee on rewards. Any dispute about whether a reward is owed or paid is between the business and the referrer.",
        ),
      ],
    },
    {
      heading: "5. Contacting your own customers",
      paragraphs: [
        p(
          "When a business uses Revvin to announce or promote its referral program to its own customers, the business is solely responsible for having the right to contact those people and for complying with applicable communications and marketing laws, including the US Telephone Consumer Protection Act (TCPA), Canada's Anti-Spam Legislation (CASL) and, in the United Arab Emirates, the TDRA rules on unsolicited electronic marketing.",
        ),
        p(
          "Personal referral asks are prepared by Revvin and then sent from the business's own devices and accounts, using the business's own SMS and email apps. Revvin does not send those, and never sends SMS to your customers at all.",
        ),
        p(
          "Reactivation campaigns are different and are the one case where Revvin sends on your behalf. On Revvin Pro, Revvin sends campaign email from your Revvin account to the contacts you selected, with your business postal address and a working unsubscribe link in every message, subject to a cap on recipients per send. By starting a campaign you confirm that every recipient gave you permission to email them. Recipients can unsubscribe using that link. Campaign sending checks recorded opt-outs and delivery restrictions and skips matching recipients.",
        ),
      ],
    },
    {
      heading: "6. Referrer conduct",
      bullets: [
        "Only submit real introductions for people who have agreed to be contacted by the business.",
        "Do not fabricate, purchase, scrape, or recycle leads.",
        "Do not misrepresent a business's services or pricing.",
      ],
    },
    {
      heading: "7. Business conduct",
      bullets: [
        "Be accurate about your business, offer, and reward terms.",
        "Handle leads and referrer information lawfully and respectfully.",
        "Pay referrers what you promised, on the timeline you promised.",
      ],
    },
    {
      heading: "8. Acceptable use",
      paragraphs: [
        p(
          "Do not use the Service to break the law, harm others, interfere with the platform, reverse engineer it, or attempt to gain unauthorized access. We may suspend or terminate accounts that violate these Terms.",
        ),
      ],
    },
    {
      heading: "9. Your content",
      paragraphs: [
        p(
          "You keep ownership of the content you put into Revvin, including your business details, logo, offer copy, and lead notes. You grant Revvin a limited license to host, display, and process that content as needed to operate the Service for you.",
        ),
      ],
    },
    {
      heading: "10. Service availability and changes",
      paragraphs: [
        p(
          "We work to keep the Service available, but we do not promise uninterrupted or error-free operation. We may add, change, or remove features. If a change materially reduces the Service, we will make a reasonable effort to give notice.",
        ),
      ],
    },
    {
      heading: "11. Disclaimers",
      paragraphs: [
        p(
          'The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. Revvin does not warrant the quality, safety, licensing, or performance of any business listed on the platform, and does not warrant the accuracy of any lead submitted by a referrer.',
        ),
      ],
    },
    {
      heading: "12. Limitation of liability",
      paragraphs: [
        p(
          "To the maximum extent permitted by law, Revvin will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, data, or business opportunities, arising out of or related to your use of the Service. Revvin's total liability for any claim relating to the Service is limited to the fees you paid Revvin in the twelve months before the event that gave rise to the claim.",
        ),
      ],
    },
    {
      heading: "13. Indemnification",
      paragraphs: [
        p(
          "You agree to defend and indemnify Revvin from claims arising out of your use of the Service, your content, your referral rewards, or your communications with customers, including any claim that your outreach violated TCPA, CASL, or another communications or privacy law.",
        ),
      ],
    },
    {
      heading: "14. Termination",
      paragraphs: [
        p(
          "You can stop using the Service at any time by cancelling your subscription. We may suspend or terminate an account for a violation of these Terms or for conduct that puts other users, our vendors, or the platform at risk. Sections that by their nature should survive termination will survive, including payment obligations already incurred, disclaimers, limitations of liability, and indemnification.",
        ),
      ],
    },
    {
      heading: "15. Changes to these Terms",
      paragraphs: [
        p(
          'We may update these Terms from time to time. When we do, we will update the "Last updated" date above and, for material changes, give reasonable notice. Continued use of the Service after an update means you accept the updated Terms.',
        ),
      ],
    },
    {
      heading: "16. Governing law",
      paragraphs: [
        p(
          "These Terms are governed by the laws of the jurisdiction where Revvin is established, without regard to conflict-of-law rules. Disputes will be handled in the courts serving that jurisdiction, unless applicable consumer protection law grants you rights in your home jurisdiction.",
        ),
      ],
    },
    {
      heading: "17. Contact",
      paragraphs: [
        p(
          "For any question about these Terms, or for support, privacy, or legal matters, contact info@revvin.co. This is the only contact address for Revvin.",
        ),
      ],
    },
  ],
};

export const PRIVACY_DOC: LegalDoc = {
  path: "/privacy",
  h1: "Privacy Policy",
  metaTitle: "Privacy Policy | Revvin",
  metaDescription:
    "How Revvin collects, uses, and protects personal information across business accounts, referrer accounts, referral page leads, and reactivation campaign email.",
  lastUpdated: "September 8, 2026",
  intro:
    'This Privacy Policy explains how Revvin ("Revvin", "we", "us") collects, uses, shares, and protects personal information when you use revvin.co, our branded business referral pages, and related services (the "Service"). It applies to businesses that subscribe to Revvin, referrers who submit leads, and the prospective customers ("Leads") whose information is submitted through a referral page. If you do not agree with this Policy, do not use the Service.',
  sections: [
    {
      heading: "1. Information We Collect",
      paragraphs: [
        p(
          "When you create a business or referrer account we collect your name, email address, password (hashed), phone number, role, and, for businesses, company name, industry, service area, logo, and the content you publish on your referral page.",
          "Account information.",
        ),
        p(
          "When a referrer submits a lead through a branded referral page we collect the referrer's name, email and phone, and the Lead's name, email, phone, location, and any notes or attachments the referrer chooses to provide.",
          "Referral information.",
        ),
        p(
          "When a business imports its own customer list we store the names, email addresses, phone numbers and last job dates it provides, so the business can ask them for referrals or email them a reactivation campaign.",
          "Customer lists imported by a business.",
        ),
        p(
          "Business subscriptions are processed by Stripe. We do not see or store full payment card numbers. We receive a customer identifier, subscription status, and billing metadata from Stripe to manage your account.",
          "Billing information.",
        ),
        p(
          "Server logs, IP address, browser and device information, pages viewed, and basic analytics events. We use cookies and similar technologies as described in Section 7.",
          "Usage and device information.",
        ),
        p(
          "Messages you send us by email or in-app, records of transactional and campaign emails, and available delivery outcomes, unsubscribes and bounces. Personal SMS asks are prepared for you to send from your own phone; Revvin does not send those messages or read their replies.",
          "Communications.",
        ),
      ],
    },
    {
      heading: "2. How We Use Information",
      bullets: [
        "Operate the Service, including hosting branded referral pages and routing submitted leads to the correct business.",
        "Authenticate users and protect accounts.",
        "Process subscription billing through Stripe and send related receipts and notices.",
        "Send transactional messages about referral activity, account changes, and security events.",
        "Send reactivation campaign email on behalf of a business to the contacts that business selected, with its postal address and an unsubscribe link in every message.",
        "Maintain recorded opt-outs and delivery restrictions used to suppress further campaign email.",
        "Provide customer support and respond to your requests.",
        "Detect, investigate, and prevent fraud, abuse, and terms violations.",
        "Improve the Service and develop new features, using aggregated or de-identified data where practical.",
        "Comply with legal obligations and enforce our Terms and Referral Agreement.",
      ],
      paragraphs: [
        p(
          "We do not sell personal information, and we do not use referral or Lead information to train third-party advertising models.",
        ),
      ],
    },
    {
      heading: "3. How Referrals and Leads Flow",
      paragraphs: [
        p(
          "Revvin is the infrastructure that connects a referrer to a business; we do not act as the business or process payment between them. When a referrer submits a referral:",
        ),
      ],
      bullets: [
        "The Lead's contact information and any notes are shared with the business that owns the referral page.",
        "The referrer's name, email, and phone are shared with that business so they can coordinate the deal and pay the referrer directly when it closes.",
        "The business becomes an independent controller of that information for its own customer-relationship purposes and is responsible for its own handling under applicable law.",
        "Revvin retains a timestamped record of the referral so both sides have the same source of truth.",
        "Referrers are responsible for having a lawful basis to submit a Lead's information (for example, the Lead's consent). Businesses are responsible for honoring the privacy choices of Leads they receive.",
      ],
    },
    {
      heading: "4. Service Providers and Sharing",
      paragraphs: [
        p(
          "We share personal information with vendors that help us run the Service, under contracts that limit their use of the data to providing services to Revvin. Current categories include:",
        ),
      ],
      bullets: [
        "Cloud hosting and database (managed Postgres and storage, hosted on AWS).",
        "Billing (Stripe) for subscription processing.",
        "Email delivery (Resend) for transactional, account and campaign email.",
        "SMS delivery (Twilio) for transactional text messages where used.",
        "Analytics and error monitoring for product and reliability purposes.",
        "We may also share information when required by law, valid legal process, or to protect the rights, property, or safety of Revvin, our users, or the public; and in connection with a corporate transaction such as a merger, financing, or sale of assets, in which case we will require the recipient to honor this Policy or provide notice.",
      ],
    },
    {
      heading: "5. International Data Transfers",
      paragraphs: [
        p(
          "Revvin operates in the United States, Canada and the United Arab Emirates. Our infrastructure providers may process data in the United States and other countries. By using the Service you understand that your information may be transferred to and processed in jurisdictions outside your own, including the United States, and we apply reasonable safeguards consistent with applicable law.",
        ),
      ],
    },
    {
      heading: "6. Data Retention",
      paragraphs: [
        p(
          "We retain account information for as long as your account is active. Referral records, including the parties involved and status changes, are retained while either the referrer or the business account is active and for a reasonable period afterward so that disputes about closed deals can be resolved. Unsubscribe and bounce records are kept indefinitely to preserve recorded opt-outs and delivery restrictions. We may keep limited records longer where required by law (for example, tax records) or for fraud prevention. You can request deletion of your account at any time as described in Section 8.",
        ),
      ],
    },
    {
      heading: "7. Cookies and Tracking",
      paragraphs: [
        p(
          "We use cookies and similar technologies for authentication, session management, security, and basic product analytics. You can control cookies through your browser settings; disabling essential cookies will prevent you from signing in.",
        ),
        p(
          "Browser Meta (Facebook) and Plausible measurement is currently paused. We use first-party measurement of public marketing page views, selected actions and labeled demo activity. These events exclude signed-in visitors, account and authentication routes, private receipt links, and preview environments. Recorded page paths and referring addresses omit query strings, fragments and private identifiers. We do not currently measure signup or account milestones through browser analytics.",
          "Public marketing measurement.",
        ),
      ],
    },
    {
      heading: "8. Your Rights and Choices",
      paragraphs: [
        p(
          "Depending on where you live, you may have the right to access, correct, delete, or receive a portable copy of your personal information, to object to or restrict certain processing, and to withdraw consent. To exercise these rights, email info@revvin.co from the address associated with your account. We may need to verify your identity before acting on a request.",
        ),
        p(
          "If a business sent you a referral through Revvin and you want your information removed from our systems, email info@revvin.co. We will remove it from Revvin, but you may also need to contact the business directly about any records it holds.",
          "For Leads.",
        ),
        p(
          "You can opt out of marketing and reactivation email at any time using the unsubscribe link in the message. Recorded opt-outs are checked before further marketing and reactivation campaigns are sent. Transactional email related to your account and referrals will continue.",
          "Marketing and campaign email.",
        ),
        p(
          "Residents of states with comprehensive privacy laws have the rights described above and the right not to be discriminated against for exercising them. We do not sell personal information and we do not engage in cross-context behavioral advertising.",
          "California, Colorado, and similar US state privacy rights.",
        ),
        p(
          "Canadian users may direct privacy complaints to us first, and if unresolved, to the Office of the Privacy Commissioner of Canada or the applicable provincial regulator.",
          "Canada (PIPEDA and provincial laws).",
        ),
        p(
          "Users in the UAE may request access, correction, deletion or restriction of their personal data, and may withdraw consent at any time, by emailing info@revvin.co. Data is processed on the basis of the account contract and, for marketing, on consent. Personal data is stored on infrastructure located outside the UAE, including the United States, under contractual safeguards with our processors.",
          "United Arab Emirates (PDPL).",
        ),
      ],
    },
    {
      heading: "9. Security",
      paragraphs: [
        p(
          "We use administrative, technical, and organizational measures designed to protect personal information, including TLS in transit, encryption at rest provided by our hosting infrastructure, role-based access controls, row-level database access policies, and secret management for credentials. No system is perfectly secure; we cannot guarantee absolute security and you are responsible for keeping your account credentials confidential.",
        ),
      ],
    },
    {
      heading: "10. Children",
      paragraphs: [
        p(
          "The Service is intended for users 18 or older and is not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us information, contact us and we will delete it.",
        ),
      ],
    },
    {
      heading: "11. Changes to This Policy",
      paragraphs: [
        p(
          'We may update this Policy from time to time. If we make material changes we will notify you by email or by an in-app notice and update the "Last updated" date above. Your continued use of the Service after the effective date means you accept the updated Policy.',
        ),
      ],
    },
    {
      heading: "12. Contact",
      paragraphs: [
        p("For privacy questions or to exercise your rights, contact info@revvin.co."),
      ],
    },
  ],
};

/**
 * Flatten one legal document into prerender sections. The initial HTML then
 * carries the same words as the rendered page instead of a separate summary.
 */
export function legalPrerenderSections(doc: LegalDoc): { heading: string; body: string }[] {
  return [{ heading: "Introduction", body: `Last updated: ${doc.lastUpdated}. ${doc.intro}` }, ...doc.sections.map((s) => {
    const paras = (s.paragraphs ?? []).map((x) => (x.lead ? `${x.lead} ${x.text}` : x.text));
    const bullets = s.bullets ?? [];
    return { heading: s.heading, body: [...paras, ...bullets].join(" ") };
  })];
}
