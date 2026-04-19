import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const versionFile = join(process.cwd(), 'version.txt');
    const version = readFileSync(versionFile, 'utf-8').trim() || '1.0.0';
    return NextResponse.json({ version });
  } catch {
    return NextResponse.json({ version: '1.0.0' });
  }
}
