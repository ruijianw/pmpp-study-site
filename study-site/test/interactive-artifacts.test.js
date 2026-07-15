import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createFlashcardSession,
  createQuizSession,
  createSlideDeckSession,
  navigateLinearSession,
} from "../public/interactiveArtifacts.js";

test("flashcard session flips cards and navigates through the deck", () => {
  const session = createFlashcardSession({
    items: [
      {
        front: "What does a GPU optimize for?",
        back: "Throughput across many concurrent threads.",
        difficulty: "easy",
        sourceHint: "Chapter 1",
      },
      {
        front: "What limits Amdahl speedup?",
        back: "The sequential fraction of the program.",
        difficulty: "medium",
        sourceHint: "Chapter 1",
      },
    ],
  });

  assert.equal(session.count, 2);
  assert.equal(session.currentIndex, 0);
  assert.equal(session.current.front, "What does a GPU optimize for?");
  assert.equal(session.flipped, false);

  session.flip();
  assert.equal(session.flipped, true);

  session.next();
  assert.equal(session.currentIndex, 1);
  assert.equal(session.flipped, false);
  assert.equal(session.current.back, "The sequential fraction of the program.");

  session.previous();
  assert.equal(session.currentIndex, 0);
});

test("quiz session scores multiple-choice answers and reveals short answers", () => {
  const session = createQuizSession({
    items: [
      {
        type: "multiple-choice",
        question: "Which design best describes GPUs?",
        options: ["A. Latency oriented", "B. Throughput oriented"],
        answer: "B",
        explanation: "GPUs favor throughput over single-thread latency.",
      },
      {
        type: "short-answer",
        question: "Name the main Amdahl limit.",
        expectedAnswer: "The serial portion limits speedup.",
        explanation: "Even infinite parallel speed cannot remove serial work.",
      },
    ],
  });

  assert.equal(session.questions.length, 2);
  assert.equal(session.score.correct, 0);
  assert.equal(session.score.answered, 0);

  const result = session.answerMultipleChoice(0, "A");
  assert.equal(result.correct, false);
  assert.equal(result.correctAnswer, "B");
  assert.equal(result.explanation, "GPUs favor throughput over single-thread latency.");
  assert.deepEqual(session.score, { answered: 1, correct: 0, total: 1 });

  const reveal = session.revealShortAnswer(1);
  assert.equal(reveal.expectedAnswer, "The serial portion limits speedup.");
  assert.equal(reveal.explanation, "Even infinite parallel speed cannot remove serial work.");
});

test("slide deck session normalizes slides and navigates through the deck", () => {
  const session = createSlideDeckSession({
    items: [
      {
        slideNumber: 1,
        title: "Concurrency Revolution",
        bullets: ["Frequency scaling stalled.", "Parallel hardware became necessary."],
        speakerNotes: "Explain why clock speed stopped being enough.",
        visualSuggestion: "Timeline of frequency and core count.",
      },
      {
        slideNumber: 2,
        title: "GPU Throughput",
        bullets: ["Many ALUs.", "Latency hiding with many threads."],
        speakerNotes: "Contrast CPU and GPU design.",
        visualSuggestion: "Chip area comparison.",
      },
    ],
  });

  assert.equal(session.count, 2);
  assert.equal(session.currentIndex, 0);
  assert.equal(session.current.title, "Concurrency Revolution");
  assert.deepEqual(session.current.bullets, [
    "Frequency scaling stalled.",
    "Parallel hardware became necessary.",
  ]);

  session.next();
  assert.equal(session.currentIndex, 1);
  assert.equal(session.current.slideNumber, 2);
  assert.equal(session.current.speakerNotes, "Contrast CPU and GPU design.");

  session.previous();
  assert.equal(session.currentIndex, 0);
});

test("linear study sessions navigate with arrow keys", () => {
  const flashcards = createFlashcardSession({
    items: [
      { front: "Host code launches what?", back: "A GPU kernel." },
      { front: "Blocks contain what?", back: "Threads." },
    ],
  });

  flashcards.flip();
  assert.equal(navigateLinearSession(flashcards, "ArrowRight"), true);
  assert.equal(flashcards.currentIndex, 1);
  assert.equal(flashcards.flipped, false);

  assert.equal(navigateLinearSession(flashcards, "ArrowLeft"), true);
  assert.equal(flashcards.currentIndex, 0);
  assert.equal(navigateLinearSession(flashcards, "Enter"), false);

  const slides = createSlideDeckSession({
    items: [
      { title: "CUDA Execution Model" },
      { title: "Memory Hierarchy" },
    ],
  });

  assert.equal(navigateLinearSession(slides, "ArrowRight"), true);
  assert.equal(slides.currentIndex, 1);

  assert.equal(navigateLinearSession(slides, "ArrowLeft"), true);
  assert.equal(slides.currentIndex, 0);
});
