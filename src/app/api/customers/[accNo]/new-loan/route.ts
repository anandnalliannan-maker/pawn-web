import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ||
  'http://localhost:4000';

/**
 * POST /api/customers/[accNo]/new-loan
 * Proxies to pawn-api: POST /customers/:accNo/new-loan
 */
export async function POST(req: NextRequest) {
  try {
    const parts = req.nextUrl.pathname.split('/');
    const accNoRaw = parts[3] || '';
    const decodedAccNo = decodeURIComponent(accNoRaw);
    const upstreamUrl = `${API_BASE}/customers/${encodeURIComponent(decodedAccNo)}/new-loan`;

    const body = await req.text();
    const auth = req.headers.get('authorization') || '';
    const companyId = req.headers.get('x-company-id') || '';

    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
        ...(companyId ? { 'x-company-id': companyId } : {}),
      },
      body,
    });

    const text = await upstreamRes.text();
    if (!upstreamRes.ok) {
      return new NextResponse(text || 'Upstream error', {
        status: upstreamRes.status,
      });
    }

    return NextResponse.json(text ? JSON.parse(text) : {});
  } catch (err) {
    console.error('Error proxying POST /api/customers/[accNo]/new-loan:', err);
    return NextResponse.json(
      { message: 'Failed to reach pawn-api server' },
      { status: 500 },
    );
  }
}
