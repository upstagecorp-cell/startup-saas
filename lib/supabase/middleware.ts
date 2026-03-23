import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/env";

const DASHBOARD_PATH = "/dashboard";
const AUTH_PATHS = new Set(["/login", "/signup"]);
type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function updateSession(request: NextRequest) {
  const supabaseEnv = getSupabaseEnv();
  const pathname = request.nextUrl.pathname;

  if (!supabaseEnv) {
    console.error("Supabase env is missing in middleware.");
    return NextResponse.next({
      request
    });
  }

  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();
  console.log("Middleware auth check:", {
    pathname,
    hasUser: Boolean(user),
    userId: user?.id ?? null
  });

  if (!user && pathname.startsWith(DASHBOARD_PATH)) {
    console.warn("Redirecting to login because no authenticated user was found for dashboard.");
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_PATHS.has(pathname)) {
    console.log("Redirecting authenticated user away from auth page.");
    const url = request.nextUrl.clone();
    url.pathname = DASHBOARD_PATH;
    return NextResponse.redirect(url);
  }

  return response;
}
