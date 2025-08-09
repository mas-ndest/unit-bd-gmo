// app/api/breakdowns-summary/route.ts

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

// FUNGSI YANG DIPERBAIKI DENGAN PENANGANAN ZONA WAKTU
function calculateDuration(dateStr: string, timeStr: string, dateCloseStr: string, timeCloseStr: string): string {
    // Validasi input dasar
    if (!dateStr || !timeStr) return 'N/A';

    // Menangani format tanggal DD-MM-YYYY atau YYYY-MM-DD
    const parts = dateStr.split(/[-/]/);
    const year = parts[0].length === 4 ? parts[0] : parts[2];
    const month = parts[1];
    const day = parts[0].length === 4 ? parts[2] : parts[0];

    // Buat string tanggal-waktu dengan format ISO 8601 dan tambahkan offset zona waktu WITA (UTC+8)
    const startDateTimeStr = `${year}-${month}-${day}T${timeStr}:00+08:00`;
    const startDate = new Date(startDateTimeStr);

    let endDate;
    if (dateCloseStr && timeCloseStr) {
        const closeParts = dateCloseStr.split(/[-/]/);
        const closeYear = closeParts[0].length === 4 ? closeParts[0] : closeParts[2];
        const closeMonth = closeParts[1];
        const closeDay = closeParts[0].length === 4 ? closeParts[2] : closeParts[0];
        // Lakukan hal yang sama untuk tanggal selesai
        const endDateTimeStr = `${closeYear}-${closeMonth}-${closeDay}T${timeCloseStr}:00+08:00`;
        endDate = new Date(endDateTimeStr);
    } else {
        // Waktu saat ini di server (UTC), ini sudah benar untuk perbandingan
        endDate = new Date(); 
    }

    if (isNaN(startDate.getTime())) return 'Invalid Start Date';
    if (endDate && isNaN(endDate.getTime())) return 'Invalid End Date';

    // Perbedaan waktu dalam milidetik
    let diff = endDate.getTime() - startDate.getTime();

    // Durasi tidak mungkin negatif sekarang, tapi sebagai pengaman
    if (diff < 0) return '0d 0j 0m';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    diff -= days * (1000 * 60 * 60 * 24);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);
    const minutes = Math.floor(diff / (1000 * 60));

    // Menggunakan d (hari), j (jam), m (menit)
    return `${days}d ${hours}j ${minutes}m`;
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
            // PANGGIL FUNGSI BARU
            duration: calculateDuration(bd.dateBd, bd.timeBd, bd.dateClose, bd.timeClose),
        };
    });

    return NextResponse.json({ data: summaryData });

  } catch (error) {
    console.error("Error fetching summary:", error);
    return NextResponse.json({ error: 'Gagal mengambil summary data' }, { status: 500 });
  }
}
