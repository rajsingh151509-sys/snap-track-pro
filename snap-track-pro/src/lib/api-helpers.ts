import { NextResponse } from 'next/server';
import { HttpError } from './auth';

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function handle(err: unknown) {
  if (err instanceof HttpError) return fail(err.status, err.message);
  // eslint-disable-next-line no-console
  console.error('[snap-track] unhandled', err);
  return fail(500, 'Server error');
}
