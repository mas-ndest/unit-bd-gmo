// app/components/DetailBreakdownModal.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';

// Tipe Data
interface Breakdown { [key: string]: any; }
interface RepairLog { [key: string]: any; }
interface ComponentMap { [key: string]: string[]; }
interface Props {
  breakdown: Breakdown;
  onClose: () => void;
  onUpdate: () => void;
}

// Opsi untuk dropdown
const subTindakanOptions = ['Part', 'Man Power', 'Bays', 'Rain', 'Others'];

export default function DetailBreakdownModal({ breakdown, onClose, onUpdate }: Props) {
  // State untuk data
  const [logs, setLogs] = useState<RepairLog[]>([]);
  const [components, setComponents] = useState<ComponentMap>({});
  
  // State untuk UI
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [editingLog, setEditingLog] = useState<RepairLog | null>(null);

  // State untuk form tambah
  const [tindakan, setTindakan] = useState('Progress');
  const [selectedComponent, setSelectedComponent] = useState('');

  const fetchAllData = async () => {
    setIsLoadingLogs(true);
    try {
      const [logsRes, compRes] = await Promise.all([
        fetch(`/api/repairs?idBd=${breakdown.idBd}`),
        fetch('/api/components')
      ]);
      const logsData = await logsRes.json();
      const compData = await compRes.json();
      setLogs(logsData.data || []);
      setComponents(compData.data || {});
    } catch (err) {
        console.error("Gagal memuat data modal detail:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [breakdown.idBd]);

  const handleConfirmClose = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = {
        idBd: breakdown.idBd,
        statusBd: 'Closed',
        dateClose: formData.get('dateClose'),
        timeClose: formData.get('timeClose'),
    };
    try {
        const response = await fetch('/api/breakdowns', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error((await response.json()).error || "Gagal menutup breakdown");
        alert('Breakdown berhasil ditutup!');
        onUpdate();
        onClose();
    } catch (err: any) {
        alert(`Error: ${err.message}`);
    }
  };

  const handleAddLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = {
        idBd: breakdown.idBd,
        startDate: formData.get('startDate'),
        startTime: formData.get('startTime'),
        endDate: formData.get('endDate'),
        endTime: formData.get('endTime'),
        Tindakan: tindakan,
        subTindakan: formData.get('subTindakan'),
        Component: selectedComponent,
        subComponent: formData.get('subComponent'),
        deskripsiPerbaikan: formData.get('deskripsiPerbaikan'),
        manPower: formData.get('manPower'),
        Pengawas: formData.get('Pengawas'),
    };
    
    try {
        const response = await fetch('/api/repairs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error((await response.json()).error || "Gagal menyimpan aktivitas");
        setShowAddForm(false);
        fetchAllData();
    } catch (err: any) {
        alert(`Error: ${err.message}`);
    }
  };
  
  const handleEditLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingLog) return;
    const formData = new FormData(event.currentTarget);
    const data = {
        idLog: editingLog.idLog,
        deskripsiPerbaikan: formData.get('deskripsiPerbaikan'),
        manPower: formData.get('manPower'),
        Pengawas: formData.get('Pengawas'),
    };

    try {
        const response = await fetch('/api/repairs', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error((await response.json()).error || "Gagal mengupdate aktivitas");
        setEditingLog(null);
        fetchAllData();
    } catch (err: any) {
        alert(`Error: ${err.message}`);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Detail & Aktivitas: {breakdown.kodeUnit}</h2>
          <button onClick={onClose} className="text-2xl font-light text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        
        <div className="max-h-[80vh] overflow-y-auto">
          {/* Bagian Detail Breakdown */}
          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg text-gray-800">Laporan Breakdown</h3>
                {breakdown.statusBd === 'Open' && !isClosing && (
                  <button onClick={() => setIsClosing(true)} className="px-3 py-1 bg-green-600 text-white rounded-md text-sm font-semibold hover:bg-green-700">
                    Selesaikan Laporan
                  </button>
                )}
            </div>
            {isClosing && (
                <form onSubmit={handleConfirmClose} className="p-4 mb-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-semibold text-green-800">Tutup Laporan Breakdown</p>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        <input type="date" name="dateClose" required className="p-2 border border-gray-300 rounded-md shadow-sm text-sm"/>
                        <input type="time" name="timeClose" required className="p-2 border border-gray-300 rounded-md shadow-sm text-sm"/>
                    </div>
                    <div className="flex gap-2 mt-3 justify-end">
                        <button type="button" onClick={() => setIsClosing(false)} className="px-3 py-1 bg-white border rounded-md text-sm">Batal</button>
                        <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded-md text-sm font-semibold">Konfirmasi & Tutup</button>
                    </div>
                </form>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                <div><strong>Status:</strong> <span className={`font-semibold ${breakdown.statusBd === 'Open' ? 'text-red-600' : 'text-green-600'}`}>{breakdown.statusBd}</span></div>
                <div><strong>Pelapor:</strong> {breakdown.reporter}</div>
                <div><strong>Tgl Lapor:</strong> {breakdown.dateBd} {breakdown.timeBd}</div>
                <div><strong>Tipe Unit:</strong> {breakdown.tipeUnit}</div>
                <div><strong>HM/KM:</strong> {breakdown.hm}</div>
                <div><strong>Lokasi:</strong> {breakdown.lokasi}</div>
                <div className="col-span-full"><strong>Deskripsi:</strong> {breakdown.deskripsiBd}</div>
                {breakdown.statusBd === 'Closed' && 
                 <div><strong>Tgl Selesai:</strong> {breakdown.dateClose} {breakdown.timeClose}</div>}
            </div>
          </div>
          
          {/* Bagian Aktivitas Perbaikan */}
          <div className="p-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg text-gray-800">Aktivitas Perbaikan</h3>
                {!showAddForm && (
                  <button onClick={() => setShowAddForm(true)} className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700">
                    + Tambah Aktivitas
                  </button>
                )}
            </div>
            
            {showAddForm && (
              <form onSubmit={handleAddLog} className="mt-4 p-4 bg-gray-50 rounded-lg border space-y-3 text-sm">
                 <div className="grid grid-cols-2 gap-3">
                    <input name="startDate" type="date" required className="p-2 border rounded-md"/>
                    <input name="startTime" type="time" required className="p-2 border rounded-md"/>
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <select name="Tindakan" value={tindakan} onChange={(e) => setTindakan(e.target.value)} className="p-2 border rounded-md">
                        <option value="Progress">Progress</option>
                        <option value="Waiting">Waiting</option>
                    </select>
                    {tindakan === 'Waiting' && (
                        <select name="subTindakan" className="p-2 border rounded-md">
                            {subTindakanOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    )}
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <select name="Component" value={selectedComponent} onChange={(e) => setSelectedComponent(e.target.value)} className="p-2 border rounded-md">
                        <option value="">Pilih Komponen...</option>
                        {Object.keys(components).map(comp => <option key={comp} value={comp}>{comp}</option>)}
                    </select>
                    {selectedComponent && (
                        <select name="subComponent" className="p-2 border rounded-md">
                            <option value="">Pilih Sub-Komponen...</option>
                            {components[selectedComponent]?.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                    )}
                 </div>
                 <textarea name="deskripsiPerbaikan" placeholder="Deskripsi perbaikan..." required className="w-full p-2 border rounded-md"></textarea>
                 {/* KONDISI BARU UNTUK MAN POWER & PENGAWAS */}
                 {tindakan !== 'Waiting' && (
                    <div className="grid grid-cols-2 gap-3">
                        <input name="manPower" placeholder="Man Power (Mekanik)" required className="w-full p-2 border rounded-md"/>
                        <input name="Pengawas" placeholder="Pengawas" required className="w-full p-2 border rounded-md"/>
                    </div>
                 )}
                 <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddForm(false)} className="px-3 py-1 bg-white border rounded-md font-semibold">Batal</button>
                    <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded-md font-semibold">Simpan Aktivitas</button>
                 </div>
              </form>
            )}

            <div className="mt-4 space-y-3">
              {isLoadingLogs ? <p>Memuat log...</p> : logs.length > 0 ? 
                logs.map((log) => (
                  <div key={log.idLog}>
                    {editingLog?.idLog === log.idLog ? (
                        <form onSubmit={handleEditLog} className="p-3 border-2 border-indigo-400 rounded-md bg-indigo-50 text-sm space-y-2">
                            <p className="font-bold">Edit Aktivitas</p>
                            <textarea name="deskripsiPerbaikan" defaultValue={log.deskripsiPerbaikan} className="w-full p-2 border rounded-md"></textarea>
                            <div className="grid grid-cols-2 gap-2">
                                <input name="manPower" defaultValue={log.manPower} className="w-full p-2 border rounded-md"/>
                                <input name="Pengawas" defaultValue={log.Pengawas} className="w-full p-2 border rounded-md"/>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setEditingLog(null)} className="px-3 py-1 bg-white border rounded-md text-xs">Batal</button>
                                <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded-md text-xs">Update</button>
                            </div>
                        </form>
                    ) : (
                        <div className="p-3 border rounded-md bg-gray-50 text-sm group relative">
                            <p className="font-bold">{log.Tindakan} {log.subTindakan ? `(${log.subTindakan})` : ''}</p>
                            <p>{log.deskripsiPerbaikan}</p>
                            {/* INFORMASI BARU DITAMPILKAN DI SINI */}
                            <div className="text-xs text-gray-500 mt-2 border-t pt-2 space-y-1">
                                <p><strong>Mulai:</strong> {log.startDate} {log.startTime}</p>
                                {log.endDate && <p><strong>Selesai:</strong> {log.endDate} {log.endTime}</p>}
                                <p><strong>Oleh:</strong> {log.manPower || '-'} | <strong>Pengawas:</strong> {log.Pengawas || '-'}</p>
                            </div>
                            <button onClick={() => setEditingLog(log)} className="absolute top-2 right-2 px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                Edit
                            </button>
                        </div>
                    )}
                  </div>
                )) : <p className="text-sm text-gray-500 text-center py-4">Belum ada aktivitas.</p>}
            </div>
          </div>
        </div>

        <div className="p-2 bg-gray-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-semibold hover:bg-gray-50">Tutup</button>
        </div>
      </div>
    </div>
  );
}
