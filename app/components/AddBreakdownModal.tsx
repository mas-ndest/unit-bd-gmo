// app/components/AddBreakdownModal.tsx

"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';

interface Unit {
  kodeUnit: string;
  tipeUnit: string;
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddBreakdownModal({ onClose, onSuccess }: Props) {
  const [unitList, setUnitList] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [tipeUnit, setTipeUnit] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Ambil daftar unit saat modal pertama kali dibuka
  useEffect(() => {
    async function fetchUnits() {
      try {
        const response = await fetch('/api/units');
        const result = await response.json();
        if (result.data) {
          setUnitList(result.data);
        }
      } catch (err) {
        console.error("Gagal mengambil daftar unit:", err);
        setError("Gagal memuat daftar unit. Cek koneksi.");
      }
    }
    fetchUnits();
  }, []);

  // 2. Fungsi untuk handle perubahan pilihan unit
  const handleUnitChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const newKodeUnit = event.target.value;
    setSelectedUnit(newKodeUnit);

    const unit = unitList.find(u => u.kodeUnit === newKodeUnit);
    setTipeUnit(unit ? unit.tipeUnit : '');
  };

  // 3. Fungsi untuk submit form
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const data = {
      dateBd: formData.get('dateBd'),
      timeBd: formData.get('timeBd'),
      kodeUnit: formData.get('kodeUnit'),
      hm: formData.get('hm'),
      tipeUnit: tipeUnit, // Ambil dari state
      lokasi: 'Gurimbang', // Default value
      deskripsiBd: formData.get('deskripsiBd'),
      reporter: formData.get('reporter'),
      section: 'Rental A2B', // Default value
    };

    try {
      const response = await fetch('/api/breakdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error((await response.json()).error || 'Gagal menyimpan data');
      
      alert('Laporan breakdown berhasil disimpan!');
      onSuccess();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Laporkan Breakdown Baru</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            
            {/* Tanggal & Waktu */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="dateBd" className="block text-sm font-medium text-gray-700">Tgl Breakdown</label>
                <input type="date" name="dateBd" id="dateBd" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
              </div>
              <div>
                <label htmlFor="timeBd" className="block text-sm font-medium text-gray-700">Jam Breakdown</label>
                <input type="time" name="timeBd" id="timeBd" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
              </div>
            </div>

            {/* Kode Unit (Dropdown) & HM */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="kodeUnit" className="block text-sm font-medium text-gray-700">Kode Unit</label>
                <select name="kodeUnit" id="kodeUnit" value={selectedUnit} onChange={handleUnitChange} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                  <option value="" disabled>Pilih Unit...</option>
                  {unitList.map(unit => (
                    <option key={unit.kodeUnit} value={unit.kodeUnit}>{unit.kodeUnit}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="hm" className="block text-sm font-medium text-gray-700">HM / KM</label>
                <input type="number" name="hm" id="hm" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
              </div>
            </div>

            {/* Tipe Unit (Otomatis) */}
            <div>
              <label htmlFor="tipeUnit" className="block text-sm font-medium text-gray-700">Tipe Unit</label>
              <input type="text" name="tipeUnit" id="tipeUnit" value={tipeUnit} readOnly disabled className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"/>
            </div>
            
            {/* Reporter & Deskripsi */}
            <div>
              <label htmlFor="reporter" className="block text-sm font-medium text-gray-700">Nama Pelapor</label>
              <input type="text" name="reporter" id="reporter" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"/>
            </div>
            <div>
              <label htmlFor="deskripsiBd" className="block text-sm font-medium text-gray-700">Deskripsi Kerusakan</label>
              <textarea name="deskripsiBd" id="deskripsiBd" rows={3} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
            </div>
            
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="p-6 bg-gray-50 flex justify-end items-center space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}