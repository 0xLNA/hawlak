 import type { ExperienceInput } from "./experience-input";
import { getSupabaseServer } from "./supabase-server";

export interface StoredExperience {
  id: string;
  placeId: string;
  rawText: string;
  createdAt: string;
  sourceType: "user_review";
  processed: boolean;
}

export async function saveExperience(
  input: ExperienceInput
): Promise<StoredExperience> {
  const supabase = getSupabaseServer();

  const { data, error } = await supabase
    .from("experiences")
    .insert({
      place_id: input.placeId,
      raw_text: input.rawText,
      source_type: "user_review",
      processed: false,
    })
    .select()
    .single();

  if (error) {
    console.error("saveExperience:", error.message);
    throw new Error("Failed to save experience.");
  }

  return {
    id: data.id,
    placeId: data.place_id,
    rawText: data.raw_text,
    createdAt: data.created_at,
    sourceType: "user_review",
    processed: data.processed,
  };
}

export async function markExperienceProcessed(id: string) {
  const supabase = getSupabaseServer();

  const { error } = await supabase
    .from("experiences")
    .update({ processed: true })
    .eq("id", id);

  if (error) {
    console.error("markExperienceProcessed:", error.message);
    throw new Error("Failed to mark experience as processed.");
  }
}