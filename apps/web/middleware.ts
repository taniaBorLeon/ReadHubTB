import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@readhub/database/middleware";

const PUBLIC_ROUTES = ["/login", "/register"];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isApiRoute = pathname.startsWith("/api/");

  if (!user && !isPublicRoute) {
    // Las rutas de API nunca deben redirigir: un fetch() del cliente seguiría
    // la redirección y recibiría el HTML de /login donde esperaba JSON.
    if (isApiRoute) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublicRoute) {
    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (!isPublicRoute) {
    supabaseResponse.headers.set("Cache-Control", "no-store");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
