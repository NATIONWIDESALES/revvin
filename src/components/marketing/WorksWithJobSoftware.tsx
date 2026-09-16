import { Link } from "react-router-dom";

const WorksWithJobSoftware = () => (
  <section className="border-y border-border bg-muted/30">
    <div className="container py-6 text-center">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Works with your job software.</span>{" "}
        Tell Revvin when a job is done from tools that work with Zapier, and the ask goes out automatically.{" "}
        <Link to="/docs/zapier" className="font-medium text-foreground underline underline-offset-4">
          See how it connects
        </Link>
      </p>
    </div>
  </section>
);

export default WorksWithJobSoftware;