// app/api/repairs/route.ts
import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

// Fungsi helper untuk otentikasi agar tidak menulis kode berulang
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

/**
 * Mengambil SEMUA log perbaikan untuk ID Breakdown tertentu.
 * Dipanggil saat modal detail dibuka.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idBd = searchParams.get('idBd');

  if (!idBd) {
    return NextResponse.json({ error: 'idBd diperlukan' }, { status: 400 });
  }

  try {
    const auth = getAuth();
    const sheets = google.sheets({ auth, version: 'v4' });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'logPerbaikan!A:N', // Pastikan range sesuai jumlah kolom Anda
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return NextResponse.json({ data: [] });
    }

    const headers = rows[0];
    // Filter log perbaikan berdasarkan idBd yang cocok di kolom kedua (index 1)
    const filteredData = rows.slice(1)
      .filter(row => row[1] === idBd) // Kolom B adalah idBd
      .map(row => {
        const rowData: { [key: string]: any } = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });
        return rowData;
      });

    return NextResponse.json({ data: filteredData });

  } catch (error) {
    console.error("Error fetching repair logs:", error);
    return NextResponse.json({ error: 'Gagal mengambil log perbaikan' }, { status: 500 });
  }
}

/**
 * Menambah log perbaikan baru.
 * Dipanggil saat form tambah aktivitas disubmit.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const auth = getAuth();
    const sheets = google.sheets({ auth, version: 'v4' });

    // Urutan harus sesuai dengan kolom di sheet logPerbaikan
    const newRow = [
      `LOG-${Date.now()}`,       // A: idLog (unik)
      body.idBd,                 // B: idBd
      body.startDate,            // C: startDate
      body.startTime,            // D: startTime
      body.endDate || '',        // E: endDate
      body.endTime || '',        // F: endTime
      body.Tindakan,             // G: Tindakan
      body.subTindakan || '',    // H: subTindakan
      body.Component || '',      // I: Component
      body.subComponent || '',   // J: subComponent
      body.deskripsiPerbaikan,   // K: deskripsiPerbaikan
      '',                        // L: Vendor (dikosongkan)
      body.manPower,             // M: manPower
      body.Pengawas,             // N: Pengawas
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'logPerbaikan!A:N',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return NextResponse.json({ message: 'Aktivitas berhasil disimpan' });
    
  } catch (error) {
    console.error("Error saving repair log:", error);
    return NextResponse.json({ error: 'Gagal menyimpan log perbaikan' }, { status: 500 });
  }
}

/**
 * FUNGSI BARU: Mengupdate log perbaikan yang sudah ada.
 * Dipanggil saat form edit aktivitas disubmit.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { idLog, deskripsiPerbaikan, manPower, Pengawas } = body;

    if (!idLog) {
      return NextResponse.json({ error: 'idLog diperlukan untuk update' }, { status: 400 });
    }

    const auth = getAuth();
    const sheets = google.sheets({ auth, version: 'v4' });

    // 1. Ambil semua data ID untuk menemukan baris yang benar
    const getResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'logPerbaikan!A:A', // Ambil kolom idLog
    });
    const idColumn = getResponse.data.values;
    if (!idColumn) throw new Error("Sheet logPerbaikan tidak ditemukan atau kosong");

    // 2. Cari index baris (tambah 1 karena index array dari 0, baris sheet dari 1)
    const rowIndex = idColumn.findIndex(row => row[0] === idLog) + 1;
    if (rowIndex === 0) {
        return NextResponse.json({ error: 'ID Log tidak ditemukan' }, { status: 404 });
    }

    // 3. Update kolom yang relevan menggunakan batchUpdate agar efisien
    // Asumsi urutan kolom: K=deskripsi, M=manPower, N=Pengawas
    await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: [
                {
                    range: `logPerbaikan!K${rowIndex}`,
                    values: [[deskripsiPerbaikan]]
                },
                {
                    range: `logPerbaikan!M${rowIndex}`,
                    values: [[manPower]]
                },
                {
                    range: `logPerbaikan!N${rowIndex}`,
                    values: [[Pengawas]]
                }
            ]
        }
    });

    return NextResponse.json({ message: 'Log perbaikan berhasil diupdate' });
  } catch (error) {
    console.error("ERROR SAAT UPDATE LOG:", error);
    return NextResponse.json({ error: 'Gagal mengupdate log perbaikan' }, { status: 500 });
  }
}
