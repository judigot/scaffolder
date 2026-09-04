import { NextResponse } from 'next/server';

interface INotFoundResponse {
  error: 'Not Found';
}

function notFound(): NextResponse<INotFoundResponse> {
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

export function GET(): NextResponse<INotFoundResponse> {
  return notFound();
}

export function POST(): NextResponse<INotFoundResponse> {
  return notFound();
}

export function PUT(): NextResponse<INotFoundResponse> {
  return notFound();
}

export function PATCH(): NextResponse<INotFoundResponse> {
  return notFound();
}

export function DELETE(): NextResponse<INotFoundResponse> {
  return notFound();
}
