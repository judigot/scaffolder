import { NextResponse } from 'next/server';

interface IHelloResponse {
  message: 'Hello, world!';
}

export function GET(): NextResponse<IHelloResponse> {
  const body: IHelloResponse = { message: 'Hello, world!' };
  return NextResponse.json(body);
}
