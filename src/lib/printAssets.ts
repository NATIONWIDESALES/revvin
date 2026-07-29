// Print pack specs. Sizes are real-world inches, and the QR size is tuned to
// the distance the thing is read from: a yard sign is scanned from the pavement,
// a business card from arm's length. Rendering one QR size on everything is the
// usual way these packs fail in the field.
export interface PrintAsset {
  id: string;
  name: string;
  /** Finished trim size in inches. */
  widthIn: number;
  heightIn: number;
  /** QR module area in inches, excluding the quiet zone we add around it. */
  qrIn: number;
  /** Roughly how far away the code gets scanned, used to explain the sizing. */
  scanDistance: string;
  where: string;
  say: string;
  printNote: string;
}

export const PRINT_ASSETS: PrintAsset[] = [
  {
    id: "yard-sign",
    name: "Yard sign",
    widthIn: 24,
    heightIn: 18,
    qrIn: 5,
    scanDistance: "6 to 10 feet, from the pavement",
    where:
      "In the front yard while you are on site, and for a week after if the customer is happy to leave it. Face it at the footpath, not the house.",
    say:
      "Ask before you put it in: \"Mind if I leave our sign out front for a week? If a neighbour scans it and books, you get the reward.\" Most people say yes when there is something in it for them.",
    printNote:
      "Print at 24 by 18 inches on 4mm corflute with H stakes. Any local sign shop does this in a day.",
  },
  {
    id: "door-hanger",
    name: "Door hanger",
    widthIn: 4.25,
    heightIn: 11,
    qrIn: 2,
    scanDistance: "arm's length, at the door",
    where:
      "The four or five houses either side of a job you are already on. That street has just watched your van sit there all morning.",
    say:
      "Nothing to say, nobody is home. That is the point. Hang it, do not knock, and do not leave it in a mailbox.",
    printNote:
      "Print at 4.25 by 11 inches on 14pt card. Ask the printer to add a 1.75 inch hanger hole at the top, inside the trim.",
  },
  {
    id: "invoice-insert",
    name: "Invoice insert / flyer",
    widthIn: 8.5,
    heightIn: 11,
    qrIn: 3,
    scanDistance: "held in the hand",
    where:
      "In the envelope with a paper invoice, in the folder you leave behind, or on the counter at the end of the job.",
    say:
      "Hand it over with the invoice: \"If you know anyone who needs the same job doing, that code is how you send them. There is a reward in it for you.\"",
    printNote: "Print at US Letter, 8.5 by 11 inches, on plain 100gsm. Your office printer is fine.",
  },
  {
    id: "card-back",
    name: "Business card back",
    widthIn: 3.5,
    heightIn: 2,
    qrIn: 1,
    scanDistance: "close up, in the hand",
    where:
      "The back of the cards you already hand out. Front stays as it is, this replaces the empty side.",
    say:
      "\"My number is on the front. The code on the back is for referrals, it pays you if someone books.\"",
    printNote:
      "Send this to your printer as the reverse of your existing card, 3.5 by 2 inches. Keep 0.125 inch bleed if they ask for it.",
  },
  {
    id: "truck-magnet",
    name: "Truck magnet / decal",
    widthIn: 12,
    heightIn: 12,
    qrIn: 6,
    scanDistance: "10 feet or more, often from another vehicle",
    where:
      "Rear door or tailgate, not the side. People scan you at the lights and in car parks, and that means they are behind you.",
    say:
      "Nothing to say. Keep it clean and keep the code unscratched, a damaged code is a dead code even with error correction.",
    printNote:
      "Print at 12 by 12 inches on 30mil magnetic sheet, or as a vinyl decal if the panel is not steel.",
  },
];

export const getPrintAsset = (id: string | undefined) =>
  PRINT_ASSETS.find((a) => a.id === id) ?? null;
