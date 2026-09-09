import { NextResponse } from "next/server";
import { getPlace } from "../../../../lib/places";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const place = getPlace(id);
  return place ? NextResponse.json(place) : NextResponse.json({ error: "Place not found" }, { status: 404 });
}
