import { NextResponse } from 'next/server';

interface IHealthResponse {
  status: 'healthy';
  timestamp: string;
}

export function GET(): NextResponse<IHealthResponse> {
  const body: IHealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body);
}
