import { extractReviewInsights } from "./ai-insights";
import { getSupabaseServer } from "./supabase-server";
import { markExperienceProcessed, type StoredExperience } from "./experiences";

export async function processExperience(experience: StoredExperience) {
  const insights = await extractReviewInsights(experience.rawText);
  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from("extracted_insights")
    .insert({
      experience_id: experience.id,
      place_id: experience.placeId,

      vibe: insights.vibe,
      best_for: insights.bestFor,
      positives: insights.positives,
      complaints: insights.complaints,
      popular_items: insights.popularItems,
      time_context: insights.timeContext,
    });

  if (error) {
    console.error("saveInsights:", error.message);
    throw new Error("Failed to save extracted insights.");
  }

  await markExperienceProcessed(experience.id);

  return insights;
}