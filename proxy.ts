import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .well-known/ (Vercel Workflow internal endpoints)
     * - sw.js, manifest.webmanifest (PWA service worker & manifest)
     * - api/ routes (handled with their own route security / triggers)
     * - images & public static files (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|\\.well-known/|sw\\.js|manifest\\.webmanifest|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
