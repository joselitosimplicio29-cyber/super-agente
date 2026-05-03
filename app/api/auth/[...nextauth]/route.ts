import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    user: null,
    expires: new Date(Date.now() + 86400000).toISOString(),
  });
}

export async function POST() {
  return NextResponse.json({
    user: null,
    expires: new Date(Date.now() + 86400000).toISOString(),
  });
}