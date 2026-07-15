export const artifactTypes = [
  {
    id: "study-guide",
    label: "Study Guide",
    description: "Learning objectives, key concepts, pitfalls, and a practice plan.",
    prompt: `Create a study guide with:
- learningObjectives: 5-8 concrete objectives
- chapterMap: short section-by-section map
- keyConcepts: concepts with concise explanations
- pitfalls: common misunderstandings
- practicePlan: 3 study sessions with tasks`,
  },
  {
    id: "briefing",
    label: "Briefing",
    description: "A concise briefing document for technical review.",
    prompt: `Create a briefing document with:
- executiveSummary
- coreClaims
- whyItMatters
- prerequisites
- implementationImplications`,
  },
  {
    id: "data-table",
    label: "Data Table",
    description: "Structured concept table for comparison and review.",
    prompt: `Create a data table with rows containing:
- concept
- definition
- cudaRelevance
- performanceConcern
- commonMistake`,
  },
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Question-answer cards for spaced repetition.",
    prompt: `Create 16-24 flashcards with:
- front
- back
- difficulty: easy, medium, or hard
- sourceHint: chapter topic or section`,
  },
  {
    id: "quiz",
    label: "Quiz",
    description: "Multiple-choice and short-answer questions with explanations.",
    prompt: `Create a quiz with:
- multipleChoice: 8 questions, 4 options each, answer index, explanation
- shortAnswer: 5 questions, expected answer, explanation
- reviewAdvice`,
  },
  {
    id: "slide-deck",
    label: "Slide Deck",
    description: "A presentation outline with speaker notes and visual suggestions.",
    prompt: `Create a slide deck outline with 10-14 slides:
- title
- bullets
- speakerNotes
- visualSuggestion`,
  },
  {
    id: "blog-post",
    label: "Blog Post",
    description: "A readable NotebookLM Studio article with technical takeaways.",
    prompt: `Create a polished technical blog post with:
- a clear headline
- an engaging introduction
- 4-6 explanatory sections
- concrete CUDA/GPU performance takeaways
- a concise closing reflection`,
  },
];

const artifactTypeById = new Map(artifactTypes.map((type) => [type.id, type]));

export function getArtifactType(type) {
  return artifactTypeById.get(type);
}
