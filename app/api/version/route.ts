import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const versionFile = join(process.cwd(), 'version.txt');
    const version = readFileSync(versionFile, 'utf-8').trim() || '1.0.0';
    return NextResponse.json({ version }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
      },
    });
  } catch {
    return NextResponse.json({ version: '1.0.0' });
  }
}
