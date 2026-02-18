import { NextResponse } from "next/server";
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

export async function GET() {
  try {
    const parentPayload = await parentGet<ParentListResponse>("list");
    const mapped = mapListResponse(parentPayload);

    return NextResponse.json(mapped, { status: 200 });
  } catch (error) {
    if (error instanceof UpstreamError) {
      return NextResponse.json(
        {
          message: error.message,
          upstreamStatus: error.status,
          details: error.details
        },
        { status: error.status === 504 ? 504 : 502 }
      );
    }

    return NextResponse.json({ message: "Unhandled internal server error" }, { status: 500 });
  }
}
