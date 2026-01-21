import { NextResponse } from 'next/server';

const companies = ['Company A', 'Company B', 'Company C'];

export async function GET() {
  return NextResponse.json(companies);
}
