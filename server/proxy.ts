import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');

  // Check allowed origins: explicit CLIENT_ORIGIN or default localhost/vercel previews
  let isAllowed = false;
  if (!origin) {
    isAllowed = true;
  } else if (process.env.CLIENT_ORIGIN) {
    const allowed = process.env.CLIENT_ORIGIN.split(',').map(o => o.trim());
    if (allowed.includes('*') || allowed.includes(origin)) {
      isAllowed = true;
    }
  } else {
    if (origin.includes('localhost') || origin.endsWith('.vercel.app') || origin.endsWith('.pages.dev')) {
      isAllowed = true;
    }
  }

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  };

  if (origin && isAllowed) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
  }

  // Preflight OPTIONS handler
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: '/api/:path*',
};

export default proxy;
