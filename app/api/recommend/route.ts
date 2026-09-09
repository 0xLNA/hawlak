import { NextResponse } from "next/server";
import { parseIntent } from "../../../lib/intent";
import { getPlaces } from "../../../lib/places";
import { recommend } from "../../../lib/recommend";
import { readJsonBody, RequestError } from "../../../lib/json-body";

export async function POST(request: Request) {
  try {
    const intent = parseIntent(await readJsonBody(request, 4096));
    if (!intent) return NextResponse.json({ error: "Expected category and up to six supported preferences" }, { status: 400 });
    return NextResponse.json(recommend(getPlaces(), intent));
  } catch (error) {
    return NextResponse.json({ error: error instanceof RequestError ? error.message : "Invalid request" }, { status: error instanceof RequestError ? error.status : 400 });
  }
}