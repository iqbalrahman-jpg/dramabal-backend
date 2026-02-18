import { NextResponse } from "next/server";
import { APP_SOURCES } from "@/lib/app-sources";

export async function GET() {
  return NextResponse.json(
    {
      items: APP_SOURCES,
      total: APP_SOURCES.length
    },
    { status: 200 }
  );
}
