// src/app/api/customers/route.ts
import { NextRequest, NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
  "http://localhost:4000";

/**
 * GET /api/customers
 * Proxies query params to pawn-api: GET /customers
 * Example: /api/customers?name=Anand
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = url.searchParams.toString();

    const upstreamUrl = `${API_BASE}/customers${
      params ? `?${params}` : ""
    }`;

    const upstreamRes = await fetch(upstreamUrl, { cache: "no-store" });
    const bodyText = await upstreamRes.text();

    if (!upstreamRes.ok) {
      return new NextResponse(bodyText || "Upstream error", {
        status: upstreamRes.status,
      });
    }

    const data = bodyText ? JSON.parse(bodyText) : null;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error proxying GET /api/customers:", err);
    return NextResponse.json(
      { message: "Failed to reach pawn-api server" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers
 * Proxies new customer creation to pawn-api: POST /customers
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const upstreamRes = await fetch(`${API_BASE}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const bodyText = await upstreamRes.text();

    if (!upstreamRes.ok) {
      return new NextResponse(bodyText || "Upstream error", {
        status: upstreamRes.status,
      });
    }

    const data = bodyText ? JSON.parse(bodyText) : null;
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error proxying POST /api/customers:", err);
    return NextResponse.json(
      { message: "Failed to reach pawn-api server" },
      { status: 500 }
    );
  }
}
