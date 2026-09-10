import { NextResponse } from "next/server";
import { getPlace } from "../../../../../lib/places";
import { addStar, getStarCount } from "../../../../../lib/place-signals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  if (!getPlace(id)) return reply({ error: "المكان غير موجود." }, 404);
  try {
    return reply({ placeId: id, starCount: await getStarCount(id) });
  } catch (error) {
    console.error("getPlaceStar:", error);
    return reply({ error: "تعذر تحميل الترشيحات الآن." }, 503);
  }
}

export async function POST(_request: Request, context: Context) {
  const { id } = await context.params;
  if (!getPlace(id)) return reply({ error: "المكان غير موجود." }, 404);
  try {
    await addStar(id);
  } catch (error) {
    console.error("addPlaceStar:", error);
    return reply({ error: "تعذر حفظ ترشيحك الآن." }, 503);
  }
  // A count-read failure must not encourage a retry of a successful insert.
  let starCount: number | null = null;
  try { starCount = await getStarCount(id); } catch (error) { console.error("getPlaceStar:", error); }
  return reply({ placeId: id, starCount }, 201);
}
