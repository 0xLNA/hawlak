import { NextResponse } from "next/server";
import { getPlace } from "../../../../../lib/places";
import { getAggregatedPlaceInsights } from "../../../../../lib/aggregated-insights";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const place = getPlace(id);

    if (!place) {
      return NextResponse.json(
        { error: "المكان غير موجود." },
        { status: 404 }
      );
    }

    const insights = await getAggregatedPlaceInsights(id);

    return NextResponse.json({
      placeId: id,
      insights,
    });
  } catch (error) {
    console.error("placeInsightsRoute:", error);

    return NextResponse.json(
      { error: "تعذر تحميل تجارب المكان." },
      { status: 500 }
    );
  }
}
