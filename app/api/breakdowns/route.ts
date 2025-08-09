// src/app/api/breakdowns/route.ts

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

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

    // Validasi sederhana
    if (!body.kodeUnit || !body.dateBd || !body.timeBd) {
      return NextResponse.json({ error: 'Data penting tidak lengkap' }, { status: 400 });
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ auth, version: 'v4' });

    // Sesuaikan urutan array dengan urutan kolom di sheet 'breakdown' Anda
    const newRow = [
      `BD-${Date.now()}`, // idBd
      body.dateBd,         // dateBd (dari form)
      body.timeBd,         // timeBd (dari form)
      body.kodeUnit,       // kodeUnit (dari form)
      body.hm,             // hm (dari form)
      body.tipeUnit,       // tipeUnit (dari form, otomatis)
      body.lokasi,         // lokasi (default)
      body.deskripsiBd,    // deskripsiBd (dari form)
      body.reporter,       // reporter (dari form)
      body.section,        // section (default)
      '',                  // workOrder
      'Open',              // statusBd
      '',                  // dateClose
      '',                  // timeClose
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'breakdown!A:N',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ message: 'Data berhasil disimpan' });

  } catch (error) {
    console.error("ERROR SAAT MENYIMPAN DATA:", error);
    return NextResponse.json({ error: 'Gagal menyimpan data ke Google Sheets' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { idBd, statusBd, dateClose, timeClose } = body;

    if (!idBd) {
      return NextResponse.json({ error: 'idBd diperlukan untuk update' }, { status: 400 });
    }

    // BAGIAN YANG DIPERBAIKI: Menambahkan otentikasi yang benar
    const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ auth, version: 'v4' });

    // 1. Ambil semua data ID untuk menemukan baris yang benar
    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'breakdown!A:A', // Cukup ambil kolom ID
    });

    const idColumn = getResponse.data.values;
    if (!idColumn) throw new Error("Sheet 'breakdown' tidak ditemukan atau kosong.");

    // 2. Cari index baris (tambah 1 karena index array dari 0, baris sheet dari 1)
    const rowIndex = idColumn.findIndex(row => row[0] === idBd) + 1;
    if (rowIndex === 0) { // findIndex mengembalikan -1 jika tidak ketemu
        return NextResponse.json({ error: `ID Breakdown '${idBd}' tidak ditemukan` }, { status: 404 });
    }

    // 3. Update status, tgl tutup, dan jam tutup
    // Kolom L = statusBd, M = dateClose, N = timeClose
    await sheets.spreadsheets.values.update({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: `breakdown!L${rowIndex}:N${rowIndex}`, // Target spesifik ke kolom yg diupdate
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[statusBd, dateClose, timeClose]],
        },
    });

    return NextResponse.json({ message: 'Breakdown berhasil diupdate' });
  } catch (error: any) {
    console.error("ERROR SAAT UPDATE BREAKDOWN:", error);
    // Kirim pesan error yang lebih spesifik ke frontend
    return NextResponse.json({ error: error.message || 'Gagal mengupdate breakdown' }, { status: 500 });
  }
}