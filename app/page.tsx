// app/page.tsx

"use client";

import { useEffect, useState } from 'react';
import AddBreakdownModal from './components/AddBreakdownModal';
import DetailBreakdownModal from './components/DetailBreakdownModal'; 

interface Breakdown {
  idBd: string;
  dateBd: string;
  timeBd: string;
  kodeUnit: string;
  hm: string;
  tipeUnit: string;
  lokasi: string;
  deskripsiBd: string;
  reporter: string;
  section: string;
  workOrder: string;
  statusBd: string;
  dateClose: string;
  timeClose: string;
  realtimeStatus: string;
  duration: string;
}

export default function HomePage() {
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedBreakdown, setSelectedBreakdown] = useState<Breakdown | null>(null);

  async function fetchData() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/breakdowns-summary');
      if (!response.ok) {
        throw new Error((await response.json()).error || 'Failed to fetch data');
      }
      const result = await response.json();
      setBreakdowns(result.data || []); 
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  function handleDataChange() {
    setRefreshTrigger(count => count + 1);
    setIsAddModalOpen(false);
    setSelectedBreakdown(null);
  }

  return (
    <main className="p-4 sm:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-3xl font-bold text-gray-800">PT. MUTIARA TANJUNG LESTARI</h4>
          <h5 className="text-3xl font-bold text-gray-800">Dept. Plant Maintenance</h5>
          <h1 className="text-3xl font-bold text-gray-800">Unit Breakdown Site GMO</h1>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
          >
            + Laporkan Breakdown
          </button>
        </div>
        
        {isLoading && <p className="text-gray-500">Loading data from Google Sheets...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}

        {!isLoading && !error && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {breakdowns.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {breakdowns.map((bd) => (
                  <li 
                    key={bd.idBd} 
                    onClick={() => setSelectedBreakdown(bd)}
                    className="p-4 hover:bg-indigo-50 cursor-pointer transition-colors duration-150"
                  >
                    <div className="flex justify-between items-start">
                        <div className="flex-grow">
                            <p><strong className="text-indigo-600 font-semibold">{bd.kodeUnit}</strong> - <span>{bd.deskripsiBd}</span></p>
                            {/* STRUKTUR TAMPILAN BARU YANG LEBIH ROBUST */}
                            <div className="text-xs text-gray-600 mt-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                                    <p><strong>Mulai:</strong> {bd.dateBd || '-'} {bd.timeBd || ''}</p>
                                    {bd.statusBd === 'Closed' && (
                                        <p><strong>Selesai:</strong> {bd.dateClose || '-'} {bd.timeClose || ''}</p>
                                    )}
                                </div>
                                <p className="mt-1"><strong>Durasi:</strong> <span className="font-semibold">{bd.duration}</span></p>
                            </div>
                        </div>
                        <span className={`ml-4 flex-shrink-0 mt-1 text-center py-1 px-3 rounded-full text-xs font-bold text-white ${
                          bd.realtimeStatus === 'Closed' ? 'bg-green-600' :
                          bd.realtimeStatus === 'Progress' ? 'bg-yellow-500' :
                          bd.realtimeStatus === 'Waiting' ? 'bg-yellow-500' :
                          'bg-red-600'
                        }`}>
                          {bd.realtimeStatus.toUpperCase()}
                        </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-gray-500">Tidak ada data breakdown yang ditemukan.</p>
            )}
          </div>
        )}
      </div>
      
      {isAddModalOpen && <AddBreakdownModal onClose={() => setIsAddModalOpen(false)} onSuccess={handleDataChange} />}
      {selectedBreakdown && <DetailBreakdownModal breakdown={selectedBreakdown} onClose={() => setSelectedBreakdown(null)} onUpdate={handleDataChange} />}
    </main>
  );
}
