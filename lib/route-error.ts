import { NextResponse } from "next/server";
import { UpstreamError } from "@/lib/upstream";

export function handleRouteError(error: unknown, app?: string) {
  if (error instanceof UpstreamError) {
    return NextResponse.json(
      {
        message: error.message,
        ...(app ? { app } : {}),
        upstreamStatus: error.status,
        details: error.details
      },
      { status: error.status === 504 ? 504 : 502 }
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(
      {
        message: error.message,
        ...(app ? { app } : {})
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message: "Unhandled internal server error",
      ...(app ? { app } : {})
    },
    { status: 500 }
  );
}
