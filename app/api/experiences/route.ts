import { NextResponse } from "next/server";
import { readJsonBody, RequestError } from "../../../lib/json-body";
import { parseExperience } from "../../../lib/experience-input";
import { saveExperience } from "../../../lib/experiences";
import { processExperience } from "../../../lib/process-experience";
import { getPlace } from "../../../lib/places";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let input;

  try {
    input = parseExperience(await readJsonBody(request, 16 * 1024));

    if (!input) {
      return NextResponse.json(
        { error: "اكتب تجربة بين 10 و500 حرف لمكان محدد." },
        { status: 400 }
      );
    }

    if (!getPlace(input.placeId)) {
      return NextResponse.json(
        { error: "المكان غير موجود." },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "تعذر قراءة الطلب. تحقق من النص وحاول مجددًا." },
      {
        status: error instanceof RequestError ? error.status : 400,
      }
    );
  }

  try {
    // 1. Save raw experience first
    const experience = await saveExperience(input);

    try {
      // 2. Extract AI insights and save them
      const insights = await processExperience(experience);

      return NextResponse.json(
        {
          id: experience.id,
          placeId: experience.placeId,
          createdAt: experience.createdAt,
          processed: true,
          insights,
        },
        { status: 201 }
      );
    } catch (error) {
      // Important:
      // We keep the raw review even if AI processing fails.
      console.error("processExperience:", error);

      return NextResponse.json(
        {
          id: experience.id,
          placeId: experience.placeId,
          createdAt: experience.createdAt,
          processed: false,
          message: "تم حفظ تجربتك. شكرًا لمشاركتك.",
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("experienceRoute:", error);

    return NextResponse.json(
      {
        error: "تعذر حفظ تجربتك الآن. النص ما زال موجودًا؛ حاول مجددًا لاحقًا.",
      },
      { status: 503 }
    );
  }
}
