export type MetricAnswer = {
  mentionsPrimary: boolean | number;
  primaryPosition: number | null;
  sentimentScore: number | null;
};

export function rate(part: number, total: number) {
  return total === 0 ? 0 : Math.round((part / total) * 1000) / 10;
}

export function average(values: Array<number | null | undefined>, digits = 1) {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (!valid.length) return null;
  const factor = 10 ** digits;
  return Math.round((valid.reduce((sum, value) => sum + value, 0) / valid.length) * factor) / factor;
}

export function calculateAnswerMetrics(answers: MetricAnswer[]) {
  const mentioned = answers.filter((answer) => Boolean(answer.mentionsPrimary));
  return {
    validAnswers: answers.length,
    mentions: mentioned.length,
    mentionRate: rate(mentioned.length, answers.length),
    topThreeRate: rate(
      mentioned.filter((answer) => (answer.primaryPosition ?? 99) <= 3).length,
      mentioned.length,
    ),
    avgPosition: average(mentioned.map((answer) => answer.primaryPosition)),
    sentiment: average(mentioned.map((answer) => answer.sentimentScore)),
  };
}

export function weightedDelta(
  baseline: { rate: number; count: number },
  post: { rate: number; count: number },
) {
  return {
    percentagePoints: Math.round((post.rate - baseline.rate) * 10) / 10,
    baselineMentions: Math.round((baseline.rate / 100) * baseline.count),
    postMentions: Math.round((post.rate / 100) * post.count),
  };
}
