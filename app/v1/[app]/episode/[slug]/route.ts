import { NextResponse } from "next/server";
import { resolveProvider } from "@/lib/providers";
import { handleRouteError } from "@/lib/route-error";

export async function GET(
  _request: Request,
  context: { params: Promise<{ app: string; slug: string }> }
) {
  const { app, slug } = await context.params;
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

  try {
    const data = await provider.episode(slug);

    return NextResponse.json(
      {
        app: appName,
        id: data.id,
        title: data.title,
        url: data.url,
        subtitle: data.subtitle ?? ""
      },
      { status: 200 }
    );
  } catch (error) {
    return handleRouteError(error, appName);
  }
}
