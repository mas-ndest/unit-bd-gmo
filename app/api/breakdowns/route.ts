// src/app/api/breakdowns/route.ts

import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { sendWablasNotification } from '../../lib/wablas';

export async function GET() {
  console.log("CHECKING ENV VAR:", process.env.GOOGLE_SHEET_ID);
  try {
    // Otentikasi menggunakan service account dari environment variables
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Mengganti \\n menjadi newline
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });

    const sheets = google.sheets({
      auth,
      version: 'v4',
    });

    // Ambil data dari sheet 'breakdown'
    // Range A:N sesuai dengan 14 kolom yang Anda sebutkan
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'breakdown!A:N', 
    });

    const rows = response.data.values;

    if (rows && rows.length > 1) {
      const headers = rows[0]; // Baris pertama adalah header
      const data = rows.slice(1).map(row => {
        const rowData: { [key: string]: any } = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index];
        });
        return rowData;
      });
      return NextResponse.json({ data });
    }

    return NextResponse.json({ data: [] });

  } catch (error) {
    console.error("DETAIL ERROR SAAT MENGAMBIL DATA:", error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // --- LOGIKA LAMA: Menyimpan ke Google Sheets (Dipertahankan) ---
    const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ auth, version: 'v4' });
    const newRow = [
      `BD-${Date.now()}`,
      body.dateBd,
      body.timeBd,
      body.kodeUnit,
      body.hm,
      body.tipeUnit,
      body.lokasi,
      body.deskripsiBd,
      body.reporter,
      body.section,
      '', // workOrder
      'Open', // statusBd
      '', // dateClose
      '', // timeClose
    ];
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'breakdown!A:N',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });
    // --- AKHIR LOGIKA LAMA ---

    // --- LOGIKA BARU: Mengirim Notifikasi (Ditambahkan) ---
    const pesanNotifikasi = 
`‼️ *LAPORAN BREAKDOWN BARU* ‼️

Tim terkait mohon segera merespons laporan berikut:

- *Unit*: *${body.kodeUnit} (${body.tipeUnit})*
- *Tanggal & Jam*: *${body.dateBd} ${body.timeBd}*
- *Lokasi*: *${body.lokasi}*
- *HM/KM*: *${body.hm}*
- *Kerusakan*: *${body.deskripsiBd}*
- *Pelapor*: *${body.reporter}*

Terima kasih.`;

    await sendWablasNotification(pesanNotifikasi);
    // --- AKHIR LOGIKA BARU ---

    return NextResponse.json({ message: 'Data berhasil disimpan' });
  } catch (error: any) {
    console.error("ERROR SAAT MENYIMPAN BREAKDOWN:", error);
    return NextResponse.json({ error: error.message || 'Gagal menyimpan data' }, { status: 500 });
  }
}

/**
 * Mengupdate laporan breakdown dan mengirim notifikasi jika ditutup.
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { idBd, statusBd, dateClose, timeClose } = body;

    // --- LOGIKA LAMA: Mengupdate Google Sheets (Dipertahankan) ---
    const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ auth, version: 'v4' });

    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'breakdown!A:A',
    });
    const idColumn = getResponse.data.values;
    if (!idColumn) throw new Error("Sheet 'breakdown' tidak ditemukan.");

    const rowIndex = idColumn.findIndex(row => row[0] === idBd) + 1;
    if (rowIndex === 0) {
        return NextResponse.json({ error: `ID Breakdown '${idBd}' tidak ditemukan` }, { status: 404 });
    }

    await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `breakdown!L${rowIndex}:N${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[statusBd, dateClose, timeClose]],
        },
    });
    // --- AKHIR LOGIKA LAMA ---

    // --- LOGIKA BARU: Mengirim Notifikasi (Ditambahkan) ---
    if (statusBd === 'Closed') {
        const pesanNotifikasi = 
`✅ *UPDATE: UNIT READY* ✅

Informasi unit yang telah selesai diperbaiki:

- *ID Laporan*: *${idBd}*
- *Status*: *SELESAI / CLOSED*
- *Waktu Selesai*: *${dateClose} ${timeClose}*

Unit sudah siap untuk dioperasikan kembali. Terima kasih kepada tim yang bertugas.`;

        await sendWablasNotification(pesanNotifikasi);
    }
    // --- AKHIR LOGIKA BARU ---

    return NextResponse.json({ message: 'Breakdown berhasil diupdate' });
  } catch (error: any) {
    console.error("ERROR SAAT UPDATE BREAKDOWN:", error);
    return NextResponse.json({ error: error.message || 'Gagal mengupdate breakdown' }, { status: 500 });
  }
}

