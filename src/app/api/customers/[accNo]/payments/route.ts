// src/app/api/customers/[accNo]/payments/route.ts
import { NextRequest, NextResponse } from 'next/server';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, '') ||
  'http://localhost:4000';

/**
 * POST /api/customers/[accNo]/payments
 * Proxies to pawn-api: POST /customers/:accNo/payments
 */
export async function POST(
  req: NextRequest,
  ctx: { params: { accNo: string } }
) {
  const { accNo } = ctx.params;

  try {
    const decodedAccNo = decodeURIComponent(accNo);
    const upstreamUrl = `${API_BASE}/customers/${encodeURIComponent(
      decodedAccNo
    )}/payments`;

    const body = await req.text();

    const upstreamRes = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const bodyText = await upstreamRes.text();

    if (!upstreamRes.ok) {
      return new NextResponse(bodyText || 'Upstream error', {
        status: upstreamRes.status,
      });
    }

    const data = bodyText ? JSON.parse(bodyText) : null;
    return NextResponse.json(data);
  } catch (err) {
    console.error(
      'Error proxying POST /api/customers/[accNo]/payments:',
      err
    );
    return NextResponse.json(
      { message: 'Failed to reach pawn-api server' },
      { status: 500 }
    );
  }
}
