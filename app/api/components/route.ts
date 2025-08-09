// app/api/components/route.ts
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ auth, version: 'v4' });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'MasterKomponen!A:B',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) return NextResponse.json({ data: {} });

    // Mengelompokkan sub-komponen berdasarkan komponen utama
    const componentMap = rows.slice(1).reduce((acc, row) => {
      const [component, subComponent] = row;
      if (!acc[component]) {
        acc[component] = [];
      }
      acc[component].push(subComponent);
      return acc;
    }, {} as Record<string, string[]>);
    
    return NextResponse.json({ data: componentMap });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch component list' }, { status: 500 });
  }
}