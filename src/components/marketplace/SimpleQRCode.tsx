import { useEffect, useRef } from "react";
import QRCodeStyling from "qr-code-styling";

interface SimpleQRCodeProps {
  url: string;
  size?: number;
  color?: string;
}

const SimpleQRCode = ({ url, size = 180, color = "#0F172A" }: SimpleQRCodeProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    qrRef.current = new QRCodeStyling({
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
    qrRef.current.append(ref.current);
  }, [url, size, color]);

  return <div ref={ref} style={{ width: size, height: size }} />;
};

export default SimpleQRCode;