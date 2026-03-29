import { useState, useCallback } from 'react';

export interface CheckInAnswers {
  pacing: string;
  hardTopics: string;
  taskTypesFeedback: string;
  raw: string[];
}

interface CheckInQuestion {
  id: keyof Omit<CheckInAnswers, 'raw'>;
  prompt: string;
}

const CHECK_IN_QUESTIONS: CheckInQuestion[] = [
  {
    id: 'pacing',
    prompt: "Overall, how did the pacing feel this week? Too fast, about right, or too slow?",
  },
  {
    id: 'hardTopics',
    prompt: "Any topics or tasks that felt harder than expected?",
  },
  {
    id: 'taskTypesFeedback',
    prompt: "Did you get enough hands-on practice, or would you want more of a certain type?",
  },
];

export function useWeeklyCheckIn() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<CheckInAnswers>>({});
  const [rawAnswers, setRawAnswers] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const currentQuestion = CHECK_IN_QUESTIONS[step] ?? null;

  const submitAnswer = useCallback((answer: string) => {
    const question = CHECK_IN_QUESTIONS[step];
    if (!question) return;

    const updated = { ...answers, [question.id]: answer };
    const updatedRaw = [...rawAnswers, answer];

    setAnswers(updated);
    setRawAnswers(updatedRaw);

    if (step < CHECK_IN_QUESTIONS.length - 1) {
      setStep(s => s + 1);
    } else {
      setIsComplete(true);
    }
  }, [step, answers, rawAnswers]);

  const reset = useCallback(() => {
    setStep(0);
    setAnswers({});
    setRawAnswers([]);
    setIsComplete(false);
  }, []);

  const checkInAnswers: CheckInAnswers | null = isComplete
    ? {
        pacing: answers.pacing ?? '',
        hardTopics: answers.hardTopics ?? '',
        taskTypesFeedback: answers.taskTypesFeedback ?? '',
        raw: rawAnswers,
      }
    : null;

  return {
    currentQuestion,
    submitAnswer,
    checkInAnswers,
    isComplete,
    step,
    totalQuestions: CHECK_IN_QUESTIONS.length,
    reset,
  };
}
