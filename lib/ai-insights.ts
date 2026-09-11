import Anthropic from "@anthropic-ai/sdk";
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

function extractJson(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end < start) {
    throw new Error("Claude returned invalid JSON.");
  }

  return cleaned.slice(start, end + 1);
}

export async function extractReviewInsights(
  rawText: string
): Promise<ExtractedReviewInsights> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is missing.");
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 600,
    system: `
You extract structured place insights from Arabic or English user experiences.

Use ONLY information explicitly supported by the text.

Rules:
- Never guess.
- Never invent.
- Return JSON only.
- Do not include markdown.
- Use short English snake_case tags.
- If there is no evidence for a category, return an empty array.
- Do not classify absence of praise as a complaint.
- Preserve meaning rather than translating literally.

Return exactly this shape:

{
  "vibe": [],
  "bestFor": [],
  "positives": [],
  "complaints": [],
  "popularItems": [],
  "timeContext": []
}

Examples:

vibe:
quiet, calm, lively, crowded, cozy, family_friendly

bestFor:
study, work, friends, family, date, solo

complaints:
limited_parking, crowded_evening, slow_service, noise, high_price, limited_seating

timeContext:
morning, afternoon, evening, late_night
    `.trim(),
    messages: [
      {
        role: "user",
        content: rawText,
      },
    ],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  if (!text.trim()) {
    throw new Error("Claude returned no text output.");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJson(text));
  } catch {
    throw new Error("Claude returned invalid JSON.");
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
