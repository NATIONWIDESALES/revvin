import { Link } from "react-router-dom";
import LegalDocView from "@/components/LegalDocView";
import { TERMS_DOC } from "@/content/legal";

const Terms = () => (
  <LegalDocView
    doc={TERMS_DOC}
    footer={
      <p className="mt-8 text-sm text-muted-foreground">
        See also our{" "}
        <Link to="/privacy" className="text-primary font-medium hover:underline">
          Privacy Policy
        </Link>
        .
      </p>
    }
  />
);

export default Terms;
