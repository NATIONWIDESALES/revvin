import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const NotFound = () => (
  <div className="flex min-h-[70vh] items-center justify-center bg-background px-4">
    <SEOHead title="Page Not Found — Revvin" description="The page you're looking for doesn't exist on Revvin." noindex />
    <div className="text-center max-w-md">
      <p className="text-sm font-semibold text-primary mb-2">404</p>
      <h1 className="mb-3 text-3xl md:text-4xl font-bold tracking-tight text-foreground">
        We couldn't find that page
      </h1>
      <p className="mb-7 text-muted-foreground">
        The link may be broken or the page may have moved. Try one of these instead.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button asChild>
          <Link to="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/browse">Browse referral offers</Link>
        </Button>
      </div>
    </div>
  </div>
);

export default NotFound;
