import { NextResponse } from "next/server";
import { getAggregatedPlaceInsights } from "@/lib/aggregated-insights";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const insights = await getAggregatedPlaceInsights(id);

    return NextResponse.json({
      placeId: id,
      insights,
    });
  } catch (error) {
    console.error("GET place insights:", error);

    return NextResponse.json(
      { error: "Failed to load place insights." },
      { status: 500 }
    );
  }
}