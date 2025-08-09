// app/lib/wablas.ts

/**
 * Fungsi untuk mengirim notifikasi WhatsApp melalui Wablas API v2.
 * Versi ini ditambahkan log detail untuk debugging.
 */
export async function sendWablasNotification(message: string) {
  const token = process.env.WABLAS_API_TOKEN;
  const targetGroup = process.env.WABLAS_GROUP_ID;

  // --- LOGGING UNTUK DEBUG ---
  console.log("--- Memulai Proses Notifikasi Wablas ---");
  console.log(`Token Ditemukan: ${token ? 'Ya' : 'Tidak'}`);
  console.log(`Group ID Ditemukan: ${targetGroup || 'Tidak Ada'}`);
  // ---------------------------

  if (!token || !targetGroup) {
    console.error("STOP: Kredensial Wablas tidak lengkap di Environment Variables.");
    return;
  }

  const url = "https://kudus.wablas.com/api/v2/send-message";
  const payload = {
    "data": [
      {
        "phone": targetGroup,
        "message": message,
        "isGroup": true
      }
    ]
  };

  try {
    // --- LOGGING UNTUK DEBUG ---
    console.log("Mengirim payload ke Wablas:", JSON.stringify(payload, null, 2));
    // ---------------------------

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    // --- LOGGING UNTUK DEBUG ---
    console.log("--- Respons Penuh dari Wablas ---");
    console.log(JSON.stringify(result, null, 2));
    console.log("---------------------------------");
    // ---------------------------

    if (result.status !== 'success') {
      console.error("Wablas melaporkan kegagalan:", result.data?.[0]?.message || 'Pesan error tidak diketahui');
    }

  } catch (error) {
    console.error("Terjadi error saat fetch ke API Wablas:", error);
  }
}
