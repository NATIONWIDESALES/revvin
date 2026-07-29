import QRCodeStyling from "qr-code-styling";

// Same qr-code-styling setup as the on-screen QR, with one deliberate change:
// print codes are pure black on white. Brand colour on the corner markers looks
// fine on a screen and costs you scans on a sign in daylight, on cheap card, or
// under a car park light. Contrast wins.
export const createPrintQr = (data: string, px: number) =>
  new QRCodeStyling({
    width: px,
    height: px,
    data,
    margin: 0,
    dotsOptions: { color: "#000000", type: "rounded" },
    cornersSquareOptions: { color: "#000000", type: "extra-rounded" },
    cornersDotOptions: { color: "#000000", type: "dot" },
    backgroundOptions: { color: "#ffffff" },
    qrOptions: { errorCorrectionLevel: "H" },
  });

/** Renders the code once at high resolution and hands back a PNG data URL. */
export const printQrDataUrl = async (data: string, px = 1400): Promise<string> => {
  const qr = createPrintQr(data, px);
  const blob = (await qr.getRawData("png")) as Blob | null;
  if (!blob) return "";
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(blob);
  });
};
