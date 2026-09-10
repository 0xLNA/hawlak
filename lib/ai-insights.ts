import OpenAI from "openai";
import { z } from "zod";

const insightSchema = z.object({
  vibe: z.array(z.string()).default([]),
  bestFor: z.array(z.string()).default([]),
  positives: z.array(z.string()).default([]),
  complaints: z.array(z.string()).default([]),
  popularItems: z.array(z.string()).default([]),
  timeContext: z.array(z.string()).default([]),
});

export type ExtractedReviewInsights = z.infer<typeof insightSchema>;

function normalize(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function extractReviewInsights(
  rawText: string
): Promise<ExtractedReviewInsights> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing.");
  }

  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model: "gpt-5.6-luna",
    reasoning: {
      effort: "none",
    },
    input: [
      {
        role: "system",
        content: `
You extract structured place insights from Arabic or English user reviews.

Rules:
- Use ONLY information explicitly supported by the review.
- Never guess or invent.
- Return valid JSON only.
- Keep tags short and in English snake_case.
- If a category is not supported, return an empty array.
- Do not treat absence of praise as a complaint.
- Do not classify something unless the text provides evidence.

Return exactly this shape:

{
  "vibe": [],
  "bestFor": [],
  "positives": [],
  "complaints": [],
  "popularItems": [],
  "timeContext": []
}

Examples of acceptable tags:

vibe:
quiet, calm, lively, crowded, cozy, family_friendly

bestFor:
study, work, friends, family, date, solo

complaints:
limited_parking, crowded_evening, slow_service, noise, high_price, limited_seating

timeContext:
morning, afternoon, evening, late_night
        `.trim(),
      },
      {
        role: "user",
        content: rawText,
      },
    ],
  });

  let parsed: unknown;

  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }

  const validated = insightSchema.parse(parsed);

  return {
    vibe: normalize(validated.vibe),
    bestFor: normalize(validated.bestFor),
    positives: normalize(validated.positives),
    complaints: normalize(validated.complaints),
    popularItems: normalize(validated.popularItems),
    timeContext: normalize(validated.timeContext),
  };
}
