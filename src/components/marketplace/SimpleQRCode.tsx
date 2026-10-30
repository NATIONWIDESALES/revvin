import { useEffect, useRef } from "react";

interface SimpleQRCodeProps {
  url: string;
  size?: number;
  color?: string;
}

/**
 * A QR code drawn into a box of fixed size. The drawing library loads only
 * when a QR code is actually on screen, and the box is the final size from the
 * first paint, so nothing moves when the code appears.
 */
const SimpleQRCode = ({ url, size = 180, color = "#0F172A" }: SimpleQRCodeProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled || !ref.current) return;
      const qr = new QRCodeStyling({
        width: size,
        height: size,
        data: url,
        dotsOptions: { color, type: "rounded" },
        cornersSquareOptions: { color, type: "extra-rounded" },
        cornersDotOptions: { color, type: "dot" },
        backgroundOptions: { color: "#ffffff" },
        qrOptions: { errorCorrectionLevel: "H" },
      });
      ref.current.innerHTML = "";
      qr.append(ref.current);
    });
    return () => {
      cancelled = true;
    };
  }, [url, size, color]);

  return <div ref={ref} style={{ width: size, height: size, flex: "none" }} />;
};

export default SimpleQRCode;
