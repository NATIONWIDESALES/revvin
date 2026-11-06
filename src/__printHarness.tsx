import "./index.css";
import { createRoot } from "react-dom/client";
import AssetSheet from "@/components/print/AssetSheet";
import { PRINT_ASSETS } from "@/lib/printAssets";
const logo = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="100"><rect width="300" height="100" fill="#1e3a8a"/><text x="150" y="65" font-size="40" fill="#fff" text-anchor="middle">ACME</text></svg>');
const C: Record<string, any> = {
  a: { name: "Acme Roofing", logo_url: logo, brand_color: "#1D4ED8", headline: "Know someone who needs a new roof?", offer_amount: "$135", offer_trigger: "the job is completed and paid", offer_fine_print: "One reward per new customer. Paid by e-transfer within 14 days.", phone: "6042194008" },
  b: { name: "Karm Personal Test", offer_amount: "$135", phone: "6042194008" },
  c: { name: "Northshore Premium Exterior Renovations Co", headline: "Know a neighbor planning a renovation this year?", offer_amount: "$250", offer_trigger: "their project starts", offer_fine_print: "Fine print here.", phone: "604-219-4008" },
  d: { name: "Big Ticket HVAC", brand_color: "#FACC15", offer_amount: "$1,500", offer_trigger: "the install is complete", phone: "16042194008" },
};
const k = new URLSearchParams(location.search).get("c") || "a";
const a = PRINT_ASSETS.find(x => x.id === new URLSearchParams(location.search).get("p"))!;
createRoot(document.getElementById("root")!).render(<div id="w" style={{display:"inline-block"}}><AssetSheet asset={a} biz={C[k]} url="https://www.revvin.co/r/karm-personal-test" /></div>);
