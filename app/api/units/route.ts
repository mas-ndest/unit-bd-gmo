// app/api/units/route.ts

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
      range: 'MasterUnit!A:B', // Mengambil data dari sheet MasterUnit
    });

    const rows = response.data.values;

    if (rows && rows.length > 1) {
      const headers = rows[0];
      const data = rows.slice(1).map(row => ({
        kodeUnit: row[0],
        tipeUnit: row[1],
      }));
      return NextResponse.json({ data });
    }

    return NextResponse.json({ data: [] });

  } catch (error) {
    console.error("Error fetching unit list:", error);
    return NextResponse.json({ error: 'Failed to fetch unit list' }, { status: 500 });
  }
}