// app/lib/wablas.ts

/**
 * Fungsi untuk mengirim notifikasi WhatsApp melalui Wablas API v2.
 * @param message Pesan yang akan dikirim.
 */
export async function sendWablasNotification(message: string) {
  // Ambil kredensial dari environment variables
  const token = process.env.WABLAS_API_TOKEN;
  // Di sini, WABLAS_GROUP_ID Anda adalah nilai untuk field 'phone'
  const targetGroup = process.env.WABLAS_GROUP_ID;

  if (!token || !targetGroup) {
    console.error("Kredensial Wablas (Token & Group ID) tidak ditemukan.");
    return;
  }

  // URL API v2 sesuai kode Anda
  const url = "https://kudus.wablas.com/api/v2/send-message";

  // Siapkan payload sesuai struktur data yang Anda gunakan
  const payload = {
    "data": [
      {
        "phone": targetGroup,
        "message": message,
        "isGroup": true // Mengirim ke grup
      }
    ]
  };

  try {
    console.log("Mengirim notifikasi ke Wablas API v2...");
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (result.status === 'success') {
      console.log("Notifikasi Wablas berhasil dikirim.");
    } else {
      // Log pesan error dari Wablas jika ada
      console.error("Gagal mengirim notifikasi Wablas:", result.data[0]?.message || 'Pesan error tidak diketahui');
    }
  } catch (error) {
    console.error("Terjadi error saat menghubungi API Wablas:", error);
  }
}
