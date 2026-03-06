import { NextResponse } from 'next/server';
import { mockPromos } from '@/config/seed-data';

export async function GET() {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  
  return NextResponse.json(mockPromos);
}
