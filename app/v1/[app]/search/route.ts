import { NextResponse } from "next/server";
import { resolveProvider } from "@/lib/providers";
import { handleRouteError } from "@/lib/route-error";

export async function GET(
  request: Request,
  context: { params: Promise<{ app: string }> }
) {
  const { app } = await context.params;
  const { appName, provider } = resolveProvider(app);

  if (!appName) {
    return NextResponse.json({ message: "Invalid app source", app }, { status: 400 });
  }

  if (!provider) {
    return NextResponse.json(
      {
        message: `${appName} is not implemented yet`,
        app: appName
      },
      { status: 501 }
    );
  }

  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("name")?.trim() ?? "";

  if (!keyword) {
    return NextResponse.json(
      {
        message: "Query parameter 'name' is required",
        app: appName
      },
      { status: 400 }
    );
  }

  try {
    const data = await provider.search(keyword);
    return NextResponse.json({ app: appName, keyword, ...data }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, appName);
  }
}
