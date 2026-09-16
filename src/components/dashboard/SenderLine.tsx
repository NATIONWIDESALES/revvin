interface Props {
  businessName: string;
  replyTo?: string | null;
  className?: string;
}

/**
 * One small line so an owner knows exactly what their customers see in the
 * inbox, and where a reply lands. Revvin sends from the shared domain, so the
 * From name is the business followed by "via Revvin".
 */
const SenderLine = ({ businessName, replyTo, className }: Props) => {
  const reply = String(replyTo || "").trim();
  return (
    <p className={`text-[11px] text-muted-foreground ${className ?? ""}`}>
      Customers see: {businessName} via Revvin. Replies go to{" "}
      {reply || "your account email"}.
    </p>
  );
};

export default SenderLine;
