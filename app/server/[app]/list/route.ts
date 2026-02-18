import { NextResponse } from "next/server";
import { resolveAppSource } from "@/lib/app-sources";
import { UpstreamError, parentGet } from "@/lib/parent-api";

type ParentListItem = {
  id?: string | number;
  title?: string;
  name?: string;
  status?: string;
  created_at?: string;
};

type ParentListResponse = {
  data?: ParentListItem[];
  items?: ParentListItem[];
  results?: ParentListItem[];
};

function mapListItem(item: ParentListItem) {
  return {
    id: item.id ?? null,
    name: item.title ?? item.name ?? "Unnamed",
    status: item.status ?? "unknown",
    createdAt: item.created_at ?? null
  };
}

function mapListResponse(payload: ParentListResponse) {
  const items = payload.data ?? payload.items ?? payload.results ?? [];

  return {
    items: items.map(mapListItem),
    total: items.length
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ app: string }> }
) {
  const { app } = await context.params;
  const appName = resolveAppSource(app);

  if (!appName) {
    return NextResponse.json(
      {
        message: "Invalid app source",
        app
      },
      { status: 400 }
    );
  }

  try {
    const parentPayload = await parentGet<ParentListResponse>(`${appName}/list`);
    const mapped = mapListResponse(parentPayload);

    return NextResponse.json(
      {
        app: appName,
        ...mapped
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json(
        {
          message: error.message,
          app: appName,
          upstreamStatus: error.status,
          details: error.details
        },
        { status: error.status === 504 ? 504 : 502 }
      );
    }

    return NextResponse.json(
      {
        message: "Unhandled internal server error",
        app: appName
      },
      { status: 500 }
    );
  }
}
