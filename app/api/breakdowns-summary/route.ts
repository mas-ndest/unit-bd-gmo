// app/api/breakdowns-summary/route.ts

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// Fungsi helper untuk menghitung durasi
function calculateDuration(startDateTimeStr: string, endDateTimeStr: string | null): string {
    // Cek jika input string valid
    if (!startDateTimeStr || !startDateTimeStr.includes('T')) return 'Invalid Start';

    const startDate = new Date(startDateTimeStr);
    const endDate = endDateTimeStr && endDateTimeStr.includes('T') ? new Date(endDateTimeStr) : new Date();
    
    // Cek jika hasil konversi date valid
    if (isNaN(startDate.getTime())) return 'Invalid Start Date';

    let diff = endDate.getTime() - startDate.getTime();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * (1000 * 60 * 60 * 24);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(diff / (1000 * 60));

    return `${days}h ${hours}j ${minutes}m`;
}

export async function GET() {
  try {
    // INI BAGIAN YANG DIPERBAIKI: Menambahkan kredensial secara eksplisit
    const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const sheets = google.sheets({ auth, version: 'v4' });

    // Ambil semua data breakdown & log perbaikan sekaligus
    const [breakdownRes, logRes] = await Promise.all([
        sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'breakdown!A:N' }),
        sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'logPerbaikan!A:N' })
    ]);

    const breakdownRows = breakdownRes.data.values;
    const logRows = logRes.data.values;

    if (!breakdownRows || breakdownRows.length <= 1) return NextResponse.json({ data: [] });

    const breakdownHeaders = breakdownRows[0];
    const breakdownData = breakdownRows.slice(1).map(row => {
        const bd: { [key: string]: any } = {};
        breakdownHeaders.forEach((h, i) => bd[h] = row[i] || '');
        return bd;
    });

    const logHeaders = logRows ? logRows[0] : [];
    const logData = logRows ? logRows.slice(1).map(row => {
        const log: { [key: string]: any } = {};
        logHeaders.forEach((h, i) => log[h] = row[i] || '');
        return log;
    }) : [];
    
    const summaryData = breakdownData.map(bd => {
        let realtimeStatus = bd.statusBd;
        if (bd.statusBd === 'Open') {
            const relevantLogs = logData.filter(log => log.idBd === bd.idBd);
            if (relevantLogs.length > 0) {
                const lastLog = relevantLogs[relevantLogs.length - 1];
                if (lastLog.Tindakan === 'Progress' || lastLog.Tindakan === 'Waiting') {
                    realtimeStatus = lastLog.Tindakan;
                }
            }
        }

        const startDateTime = (bd.dateBd && bd.timeBd) ? `${bd.dateBd}T${bd.timeBd}` : null;
        const endDateTime = (bd.dateClose && bd.timeClose) ? `${bd.dateClose}T${bd.timeClose}` : null;
        
        return {
            ...bd,
            realtimeStatus,
            duration: startDateTime ? calculateDuration(startDateTime, endDateTime) : 'N/A',
        };
    });

    return NextResponse.json({ data: summaryData });

  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json({ error: 'Gagal mengambil summary data' }, { status: 500 });
  }
}
