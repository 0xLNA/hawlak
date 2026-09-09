import { NextRequest, NextResponse } from "next/server";
import { getPlaces } from "../../../lib/places";
import { isCategory } from "../../../lib/intent";

export function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  if (category !== null && !isCategory(category)) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  return NextResponse.json(getPlaces(category ?? undefined));
}
