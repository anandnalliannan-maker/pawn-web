import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ||
  'http://localhost:4000';

/**
 * POST /api/customers/new-loan?accNo=...
 * Proxies to pawn-api: POST /customers/:accNo/new-loan
 * This avoids encoded slashes in path params.
 */
export async function POST(req: NextRequest) {
  try {
    const accNo = req.nextUrl.searchParams.get('accNo') || '';
    if (!accNo) {
      return NextResponse.json({ message: 'Missing accNo' }, { status: 400 });
    }

    const upstreamUrl = `${API_BASE}/customers/${encodeURIComponent(accNo)}/new-loan`;

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
    console.error('Error proxying POST /api/customers/new-loan:', err);
    return NextResponse.json(
      { message: 'Failed to reach pawn-api server' },
      { status: 500 },
    );
  }
}
