import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ||
  'http://localhost:4000';

/**
 * GET /api/customers/[accNo]
 * Proxies to pawn-api backend → GET /customers/:accNo
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: { accNo: string } }
) {
  try {
    const decodedAccNo = decodeURIComponent(ctx.params.accNo);

    const upstreamUrl = `${API_BASE}/customers/${encodeURIComponent(
      decodedAccNo
    )}`;

    const upstreamRes = await fetch(upstreamUrl, { cache: 'no-store' });
    const text = await upstreamRes.text();

    if (!upstreamRes.ok) {
      return new NextResponse(text || 'Upstream error', {
        status: upstreamRes.status,
      });
    }

    const data = text ? JSON.parse(text) : null;
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error proxying GET /api/customers/[accNo]:', err);

    return NextResponse.json(
      { message: 'Failed to reach pawn-api server' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers/[accNo]
 * For saving payments later (if needed)
 * Currently unused but kept for API completeness
 */
export async function POST(
  req: NextRequest,
  ctx: { params: { accNo: string } }
) {
  try {
    const decodedAccNo = decodeURIComponent(ctx.params.accNo);
    const upstreamUrl = `${API_BASE}/customers/${encodeURIComponent(
      decodedAccNo
    )}/payments`;

    const body = await req.text();

    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    console.error('Error proxying POST /api/customers/[accNo]:', err);

    return NextResponse.json(
      { message: 'Failed to reach pawn-api server' },
      { status: 500 }
    );
  }
}
