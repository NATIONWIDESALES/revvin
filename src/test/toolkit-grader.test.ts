import { describe, expect, it } from "vitest";
import {
  GRADER_QUESTIONS,
  GRADER_TOTAL_QUESTIONS,
  gradeFor,
  scoreProgram,
  type GraderAnswers,
  type GraderQuestionId,
} from "@/lib/toolkit/grader";

const answersWith = (yes: GraderQuestionId[]): GraderAnswers =>
  Object.fromEntries(GRADER_QUESTIONS.map((q) => [q.id, yes.includes(q.id)])) as GraderAnswers;

describe("referral program grader", () => {
  it("scores an empty checklist at zero and returns three actions", () => {
    const result = scoreProgram(answersWith([]));
    expect(result.score).toBe(0);
    expect(result.actions).toHaveLength(3);
    expect(result.grade).toBe(gradeFor(0));
    expect(result.complete).toBe(true);
  });

  it("scores a complete checklist at 100 with no outstanding actions", () => {
    const result = scoreProgram(answersWith(GRADER_QUESTIONS.map((q) => q.id)));
    expect(result.score).toBe(100);
    expect(result.actions).toHaveLength(0);
    expect(result.grade).toBe("Ready to run");
  });

  it("weights every question equally", () => {
    const one = scoreProgram(answersWith([GRADER_QUESTIONS[0].id])).score;
    const other = scoreProgram(answersWith([GRADER_QUESTIONS[5].id])).score;
    expect(one).toBe(other);
    expect(one).toBeGreaterThan(0);
  });

  it("is deterministic and stable in ordering for the same answers", () => {
    const answers = answersWith([GRADER_QUESTIONS[1].id, GRADER_QUESTIONS[4].id]);
    expect(scoreProgram(answers)).toEqual(scoreProgram(answers));
  });

  it("draws actions only from questions answered not yet, in canonical order", () => {
    const done = GRADER_QUESTIONS.slice(0, 4).map((q) => q.id);
    const result = scoreProgram(answersWith(done));
    const missing = GRADER_QUESTIONS.filter((q) => !done.includes(q.id)).map((q) => q.id);
    expect(result.actions.map((a) => a.id)).toEqual(missing.slice(0, 3));
    for (const action of result.actions) expect(action.action.length).toBeGreaterThan(10);
  });

  it("treats missing answers as not yet in place and as unanswered", () => {
    const result = scoreProgram({});
    expect(result.score).toBe(0);
    expect(result.answeredCount).toBe(0);
    expect(result.complete).toBe(false);
  });

  it("uses three distinct grade labels with no numbers in them", () => {
    const labels = [gradeFor(0), gradeFor(50), gradeFor(100)];
    expect(new Set(labels).size).toBe(3);
    for (const label of labels) expect(label).not.toMatch(/\d/);
  });

  it("has eight distinct questions, each with a legend, help and action", () => {
    expect(GRADER_TOTAL_QUESTIONS).toBe(8);
    expect(new Set(GRADER_QUESTIONS.map((q) => q.id)).size).toBe(8);
    for (const q of GRADER_QUESTIONS) {
      expect(q.legend.length).toBeGreaterThan(10);
      expect(q.help.length).toBeGreaterThan(10);
      expect(q.action.length).toBeGreaterThan(10);
    }
  });
});
