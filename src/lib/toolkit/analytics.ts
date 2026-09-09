/**
 * Toolkit funnel labels.
 *
 * These ride on the existing `cta_clicked` event with a fixed, low-cardinality
 * label, so measuring the toolkit funnel needs no new event name and no schema
 * change. The label says which tool and which step. It never carries a score, a
 * dollar figure, a percentage, a name, a link or anything a visitor typed.
 */
export const TOOLKIT_CTAS = {
  hubSignup: "toolkit_signup",
  graderStarted: "tool_grader_start",
  graderCompleted: "tool_grader_done",
  graderSignup: "tool_grader_signup",
  calculatorStarted: "tool_calculator_start",
  calculatorCompleted: "tool_calculator_done",
  calculatorSignup: "tool_calculator_signup",
  generatorStarted: "tool_generator_start",
  generatorCompleted: "tool_generator_done",
  generatorSignup: "tool_generator_signup",
  graderPro: "tool_grader_pro",
  calculatorPro: "tool_calculator_pro",
} as const;

export type ToolkitCta = (typeof TOOLKIT_CTAS)[keyof typeof TOOLKIT_CTAS];

export const TOOLKIT_CTA_LABELS: readonly ToolkitCta[] = Object.values(TOOLKIT_CTAS);
