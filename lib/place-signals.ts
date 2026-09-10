import { getSupabaseServer } from "./supabase-server";

export async function getStarCount(placeId: string): Promise<number> {
  const { count, error } = await getSupabaseServer().from("place_signals")
    .select("id", { count: "exact", head: true })
    .eq("place_id", placeId).eq("signal_type", "star");
  if (error || count === null) throw new Error("Failed to load star count.");
  return count;
}

export async function addStar(placeId: string): Promise<void> {
  const { error } = await getSupabaseServer().from("place_signals")
    .insert({ place_id: placeId, signal_type: "star" });
  if (error) throw new Error("Failed to save star.");
}

export async function getStarCounts(placeIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!placeIds.length) return counts;
  const supabase = getSupabaseServer();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("place_signals").select("place_id")
      .in("place_id", placeIds).eq("signal_type", "star").order("id").range(offset, offset + 999);
    if (error) throw new Error("Failed to load stars.");
    for (const row of data ?? []) counts.set(row.place_id, (counts.get(row.place_id) ?? 0) + 1);
    if (!data || data.length < 1000) return counts;
  }
}
