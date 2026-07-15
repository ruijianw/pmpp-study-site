export function createFlashcardSession(content = {}) {
  const cards = normalizeFlashcards(content.items);
  let currentIndex = 0;
  let flipped = false;

  return {
    get count() {
      return cards.length;
    },
    get cards() {
      return cards;
    },
    get currentIndex() {
      return currentIndex;
    },
    get current() {
      return cards[currentIndex] || null;
    },
    get flipped() {
      return flipped;
    },
    flip() {
      if (cards.length === 0) return null;
      flipped = !flipped;
      return this.current;
    },
    next() {
      if (cards.length === 0) return null;
      currentIndex = Math.min(currentIndex + 1, cards.length - 1);
      flipped = false;
      return this.current;
    },
    previous() {
      if (cards.length === 0) return null;
      currentIndex = Math.max(currentIndex - 1, 0);
      flipped = false;
      return this.current;
    },
  };
}

export function createQuizSession(content = {}) {
  const questions = normalizeQuizQuestions(content.items);
  const answers = new Map();

  return {
    questions,
    answerMultipleChoice(index, selected) {
      const question = questions[index];
      if (!question || question.type !== "multiple-choice") {
        throw new Error("Question is not multiple-choice.");
      }
      const selectedAnswer = normalizeAnswer(selected, question.options);
      const correctAnswer = normalizeAnswer(question.answer ?? question.answerIndex, question.options);
      const result = {
        correct: selectedAnswer === correctAnswer,
        correctAnswer,
        explanation: question.explanation || "",
        selectedAnswer,
      };
      answers.set(index, result);
      return result;
    },
    revealShortAnswer(index) {
      const question = questions[index];
      if (!question || question.type !== "short-answer") {
        throw new Error("Question is not short-answer.");
      }
      const result = {
        expectedAnswer: question.expectedAnswer || question.answer || "",
        explanation: question.explanation || "",
      };
      answers.set(index, { revealed: true, ...result });
      return result;
    },
    getAnswerState(index) {
      return answers.get(index);
    },
    get score() {
      const multipleChoice = questions.filter((question) => question.type === "multiple-choice");
      const answered = multipleChoice.filter((question) => answers.has(question.index)).length;
      const correct = multipleChoice.filter((question) => answers.get(question.index)?.correct).length;
      return { answered, correct, total: multipleChoice.length };
    },
  };
}

export function createSlideDeckSession(content = {}) {
  const slides = normalizeSlides(content.items);
  let currentIndex = 0;

  return {
    get count() {
      return slides.length;
    },
    get slides() {
      return slides;
    },
    get currentIndex() {
      return currentIndex;
    },
    get current() {
      return slides[currentIndex] || null;
    },
    next() {
      if (slides.length === 0) return null;
      currentIndex = Math.min(currentIndex + 1, slides.length - 1);
      return this.current;
    },
    previous() {
      if (slides.length === 0) return null;
      currentIndex = Math.max(currentIndex - 1, 0);
      return this.current;
    },
  };
}

export function optionLabel(option, index) {
  if (typeof option === "string") {
    const match = option.trim().match(/^([A-Z])[\s.)-]/i);
    if (match) return match[1].toUpperCase();
  }
  return String.fromCharCode(65 + index);
}

function normalizeFlashcards(items = []) {
  return items
    .filter((item) => item && (item.front || item.question) && (item.back || item.answer))
    .map((item) => ({
      front: String(item.front || item.question),
      back: String(item.back || item.answer),
      difficulty: item.difficulty || "review",
      sourceHint: item.sourceHint || item.source || "",
    }));
}

function normalizeQuizQuestions(items = []) {
  return items
    .filter((item) => item && item.question)
    .map((item, index) => ({
      ...item,
      index,
      type: item.type || (Array.isArray(item.options) ? "multiple-choice" : "short-answer"),
      options: Array.isArray(item.options) ? item.options : [],
    }));
}

function normalizeSlides(items = []) {
  return items
    .filter((item) => item && item.title)
    .map((item, index) => ({
      slideNumber: Number(item.slideNumber || index + 1),
      title: String(item.title),
      bullets: Array.isArray(item.bullets) ? item.bullets.map(String) : [],
      speakerNotes: item.speakerNotes ? String(item.speakerNotes) : "",
      visualSuggestion: item.visualSuggestion ? String(item.visualSuggestion) : "",
    }));
}

function normalizeAnswer(value, options = []) {
  if (typeof value === "number") return optionLabel(options[value], value);
  const text = String(value ?? "").trim();
  const exactIndex = options.findIndex((option) => option === text);
  if (exactIndex >= 0) return optionLabel(options[exactIndex], exactIndex);
  const match = text.match(/^([A-Z])(?:[\s.)-]|$)/i);
  return match ? match[1].toUpperCase() : text.toUpperCase();
}
