/**
 * Referral Program Grader — pure scoring logic.
 *
 * This is an operational checklist, not a forecast. Each item is a thing the
 * owner either has written down or does not, so the score is simply the share
 * of items in place. There are no industry benchmarks here and nothing in this
 * module predicts referral volume, revenue or close rates.
 *
 * Deliberately free of React, storage, network and analytics: the page renders
 * this, and nothing here ever sees a name, a figure or a customer detail.
 */

export type GraderQuestionId =
  | "fixed_reward"
  | "qualifying_event"
  | "payout_timing"
  | "one_destination"
  | "ask_timing"
  | "follow_up_owner"
  | "source_tracked"
  | "people_updated";

export interface GraderQuestion {
  id: GraderQuestionId;
  /** The fieldset legend. Written as a yes/no question about today, not a goal. */
  legend: string;
  /** One short clarifier so "yes" means the same thing to everyone. */
  help: string;
  /** The action shown when this item is not in place. */
  action: string;
}

/**
 * Eight items, each worth the same 12.5 points. Equal weighting is a choice, not
 * a measurement: we have no evidence that would justify claiming one item
 * matters more than another, so we do not pretend to.
 *
 * The order is the canonical order. It drives both the questionnaire and the
 * priority of the recommended actions, so results are stable for the same input.
 */
export const GRADER_QUESTIONS: readonly GraderQuestion[] = [
  {
    id: "fixed_reward",
    legend: "Is the reward one clear fixed amount?",
    help: "One number a customer can repeat from memory, not a range, a discount ladder or a maybe.",
    action: "Set one fixed reward amount and write it down.",
  },
  {
    id: "qualifying_event",
    legend: "Have you defined what actually earns the reward?",
    help: "For example a new customer who books and pays for a job, rather than any name passed along.",
    action: "Define the qualifying event in one sentence, for example a new customer who books a paid job.",
  },
  {
    id: "payout_timing",
    legend: "Is the payout timing written down?",
    help: "Something you could send in a text, such as paid within 7 days of the job being paid in full.",
    action: "Write down when you pay, counted from a moment you control.",
  },
  {
    id: "one_destination",
    legend: "Does a customer have one link or QR code to send people to?",
    help: "A single destination beats asking people to remember a phone number or search for you.",
    action: "Put your offer on one page and use one link and QR code everywhere.",
  },
  {
    id: "ask_timing",
    legend: "Do you ask close to the end of the job?",
    help: "The same day or the next day, while the work is still fresh for the customer.",
    action: "Move the ask to the day the job finishes instead of weeks later.",
  },
  {
    id: "follow_up_owner",
    legend: "Does one named person follow up every referral?",
    help: "One owner by name, so a referred customer is never waiting on nobody in particular.",
    action: "Name the one person responsible for calling every referred customer back.",
  },
  {
    id: "source_tracked",
    legend: "Do you record where each referral came from and how it ended?",
    help: "Who sent it, and whether it closed, so you know what the program produced.",
    action: "Record the referrer and the outcome for every referral in one place.",
  },
  {
    id: "people_updated",
    legend: "Do you keep the referrer and the customer updated?",
    help: "A short message when you have made contact, and again when the reward is on its way.",
    action: "Send the referrer a short update when you make contact and when you pay.",
  },
];

export const GRADER_TOTAL_QUESTIONS = GRADER_QUESTIONS.length;
export const GRADER_POINTS_PER_QUESTION = 100 / GRADER_TOTAL_QUESTIONS; // 12.5

export type GraderAnswers = Partial<Record<GraderQuestionId, boolean>>;

export type GraderGrade = "Foundation needed" | "Good start" | "Ready to run";

export interface GraderAction {
  id: GraderQuestionId;
  action: string;
}

export interface GraderResult {
  /** Whole number 0 to 100: the share of checklist items in place. */
  score: number;
  grade: GraderGrade;
  /** Up to three actions, in canonical question order. */
  actions: GraderAction[];
  answeredYes: number;
  answeredCount: number;
  total: number;
  complete: boolean;
}

/**
 * Grade bands, stated plainly so nobody reads them as a prediction:
 *   0 to 37   Foundation needed  (fewer than 3 of the 8 items in place)
 *   38 to 74  Good start        (3 to 5 items)
 *   75 to 100 Ready to run      (6 or more items)
 */
export function gradeFor(score: number): GraderGrade {
  if (score >= 75) return "Ready to run";
  if (score >= 38) return "Good start";
  return "Foundation needed";
}

/** Only an explicit `true` counts. Unanswered is treated the same as "not yet". */
export function scoreProgram(answers: GraderAnswers): GraderResult {
  const yes = GRADER_QUESTIONS.filter((q) => answers[q.id] === true);
  const answeredCount = GRADER_QUESTIONS.filter((q) => typeof answers[q.id] === "boolean").length;
  const score = Math.round((yes.length / GRADER_TOTAL_QUESTIONS) * 100);

  // Missing items keep the canonical question order, so the same answers always
  // produce the same three actions in the same sequence.
  const actions = GRADER_QUESTIONS.filter((q) => answers[q.id] !== true)
    .slice(0, 3)
    .map((q) => ({ id: q.id, action: q.action }));

  return {
    score,
    grade: gradeFor(score),
    actions,
    answeredYes: yes.length,
    answeredCount,
    total: GRADER_TOTAL_QUESTIONS,
    complete: answeredCount === GRADER_TOTAL_QUESTIONS,
  };
}
