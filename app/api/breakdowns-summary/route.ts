// app/api/breakdowns-summary/route.ts

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// FUNGSI YANG DIPERBAIKI untuk menangani berbagai format tanggal
function calculateDuration(dateStr: string, timeStr: string, dateCloseStr: string, timeCloseStr: string): string {
    // Validasi input dasar, jika tanggal atau waktu kosong, kembalikan N/A
    if (!dateStr || !timeStr) return 'N/A';

    // Pisahkan tanggal berdasarkan pemisah umum (/, -)
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) return 'Invalid Date Format';

    let year, month, day;

    // Logika untuk mendeteksi format YYYY-MM-DD atau DD-MM-YYYY
    if (parts[0].length === 4) { // YYYY-MM-DD
        [year, month, day] = parts;
    } else if (parts[2].length === 4) { // DD-MM-YYYY
        [day, month, year] = parts;
    } else {
        return 'Ambiguous Date Format';
    }

    // Buat string tanggal yang valid untuk JavaScript: YYYY-MM-DDTHH:mm:ss
    const startDateTimeStr = `${year}-${month}-${day}T${timeStr}`;
    const startDate = new Date(startDateTimeStr);

    let endDate;
    if (dateCloseStr && timeCloseStr) {
        const closeParts = dateCloseStr.split(/[-/]/);
        let closeYear, closeMonth, closeDay;
        if (closeParts[0].length === 4) {
            [closeYear, closeMonth, closeDay] = closeParts;
        } else if (closeParts[2].length === 4) {
            [closeDay, closeMonth, closeYear] = closeParts;
        }
        if(closeYear) {
            endDate = new Date(`${closeYear}-${closeMonth}-${closeDay}T${timeCloseStr}`);
        } else {
            endDate = new Date(); // Fallback ke waktu sekarang jika format tanggal tutup salah
        }
    } else {
        endDate = new Date(); // Waktu saat ini di server
    }

    if (isNaN(startDate.getTime())) return 'Invalid Start Date';

    let diff = endDate.getTime() - startDate.getTime();
    if (diff < 0) diff = 0; // Cegah durasi negatif

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * (1000 * 60 * 60 * 24);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(diff / (1000 * 60));

    return `${days}h ${hours}j ${minutes}m`;
}


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
        
        return {
            ...bd,
            realtimeStatus,
            duration: calculateDuration(bd.dateBd, bd.timeBd, bd.dateClose, bd.timeClose),
        };
    });

    return NextResponse.json({ data: summaryData });

  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json({ error: 'Gagal mengambil summary data' }, { status: 500 });
  }
}
