'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { IDetectedBarcode } from '@yudiel/react-qr-scanner';

const Scanner = dynamic(() => import('@yudiel/react-qr-scanner').then((mod) => mod.Scanner), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: 'black', borderRadius: 'var(--radius) var(--radius) 0 0' }}></div>
});

type Student = {
  name: string;
  email: string;
  iit_id: string;
  attended: boolean;
};

export default function Home() {
  const [scanState, setScanState] = useState<'idle' | 'loading'>('idle');
  const [resultData, setResultData] = useState<{ status: string, message: string, name: string, iitId: string } | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<{ status: string, name: string, iitId: string, time: string }[]>([]);

  // Filters
  const [filter, setFilter] = useState<'all' | 'success' | 'duplicate'>('all');
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);

  const fetchMasterList = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/list');
      const data = await res.json();
      if (data.status === 'success') {
        setStudents(data.data);
      }
    } catch (e) {
      console.error(e);
    }
    setSyncing(false);
  };

  useEffect(() => {
    fetchMasterList();
    const interval = setInterval(fetchMasterList, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualMark = async (token: string, name: string) => {
    if (scanState !== 'idle' || resultData !== null) return;
    const confirmed = window.confirm(`Are you sure you want to mark ${name} as Admitted?`);
    if (!confirmed) return;
    setScanState('loading');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let finalStatus = data.status;
      let finalMsg = finalStatus === 'success' ? 'Admitted (Manual)' : finalStatus === 'already_used' ? 'Already Checked In' : 'Invalid ID';

      setResultData({
        status: finalStatus,
        message: finalMsg,
        name: data.name || (finalStatus === 'invalid' ? 'IIT ID not recognised' : 'Unknown'),
        iitId: data.iit_id || ''
      });

      setLogs(prev => {
        const newLogs = [{
          status: finalStatus,
          name: data.name || 'Unknown',
          iitId: data.iit_id || '',
          time: (finalStatus === 'success' ? 'Admitted (Manual)' : finalStatus === 'already_used' ? 'Duplicate scan' : 'Invalid ID') + ' · ' + timeStr
        }, ...prev];
        return newLogs.slice(0, 50);
      });

      if (finalStatus === 'success') {
        fetchMasterList();
      }

      setTimeout(() => {
        setResultData(null);
        setScanState('idle');
      }, 2500);

    } catch (e) {
      setResultData({
        status: 'invalid', message: 'Network Error', name: 'Check internet', iitId: ''
      });
      setTimeout(() => { setResultData(null); setScanState('idle'); }, 2500);
    }
  };

  const handleUnmark = async (token: string, name: string) => {
    if (scanState !== 'idle' || resultData !== null) return;
    const confirmed = window.confirm(`Are you sure you want to UNMARK ${name} and set them as Pending?`);
    if (!confirmed) return;

    setScanState('loading');

    try {
      const res = await fetch('/api/unmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let finalStatus = data.status;
      let finalMsg = finalStatus === 'success' ? 'Unmarked (Pending)' : 'Error';

      setResultData({
        status: finalStatus,
        message: finalMsg,
        name: data.name || 'Unknown',
        iitId: data.iit_id || ''
      });

      setLogs(prev => {
        const newLogs = [{
          status: finalStatus,
          name: data.name || 'Unknown',
          iitId: data.iit_id || '',
          time: (finalStatus === 'success' ? 'Unmarked' : 'Error') + ' · ' + timeStr
        }, ...prev];
        return newLogs.slice(0, 50);
      });

      if (finalStatus === 'success') {
        fetchMasterList();
      }

      setTimeout(() => {
        setResultData(null);
        setScanState('idle');
      }, 2500);

    } catch (e) {
      setResultData({
        status: 'invalid', message: 'Network Error', name: 'Check internet', iitId: ''
      });
      setTimeout(() => { setResultData(null); setScanState('idle'); }, 2500);
    }
  };

  const handleScan = async (result: IDetectedBarcode[]) => {
    if (!result || result.length === 0 || scanState !== 'idle' || resultData !== null) return;
    const token = result[0].rawValue;

    setScanState('loading');

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      let finalStatus = data.status;
      let finalMsg = finalStatus === 'success' ? 'Admitted! Welcome.' : finalStatus === 'already_used' ? 'Already Checked In' : 'Invalid QR Code';

      setResultData({
        status: finalStatus,
        message: finalMsg,
        name: data.name || (finalStatus === 'invalid' ? 'IIT ID not recognised' : 'Unknown'),
        iitId: data.iit_id || ''
      });

      // Add to logs
      setLogs(prev => {
        const newLogs = [{
          status: finalStatus,
          name: data.name || 'Unknown',
          iitId: data.iit_id || '',
          time: finalStatus === 'success' ? 'Admitted' : finalStatus === 'already_used' ? 'Duplicate scan' : 'Invalid QR' + ' · ' + timeStr
        }, ...prev];
        return newLogs.slice(0, 50);
      });

      if (finalStatus === 'success') {
        fetchMasterList(); // Update the list in background
      }

      setTimeout(() => {
        setResultData(null);
        setScanState('idle');
      }, 2500);

    } catch (e) {
      setResultData({
        status: 'invalid', message: 'Network Error', name: 'Check internet', iitId: ''
      });
      setTimeout(() => { setResultData(null); setScanState('idle'); }, 2500);
    }
  };

  const total = students.length;
  const ok = students.filter(s => s.attended).length;
  const pending = total - ok;

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.iit_id.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filter === 'all' ? true :
      filter === 'success' ? s.attended === true :
        s.attended === false;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="page">
      <header>
        <div className="brand-icon">
          <img src="/assets/iftar-logo.png" alt="Iftar 2026 Logo" style={{ height: "100px", width: "auto", objectFit: "contain" }} />
        </div>
        <p className="tagline">Attendance Management System</p>
        <p className="theme-desc">Scan QR codes or search the directory to mark guest admissions.</p>
      </header>

      {/* CAMERA CARD */}
      <div className="camera-card">
        <div className="video-wrapper">
          <div style={{ position: 'absolute', inset: 0 }}>
            <Scanner
              onScan={handleScan}
              styles={{ container: { width: '100%', height: '100%' } }}
              components={{ finder: false }}
              formats={['qr_code']}
            />
          </div>

          <div className="scan-frame">
            <div className="frame-box">
              <div className="frame-corner-br"></div>
              <div className="frame-corner-bl"></div>
            </div>
          </div>

          <div id="loading-overlay" className={scanState === 'loading' ? 'show' : ''}>
            <svg className="spinner" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
          </div>

          <div id="result-overlay" className={`${resultData ? 'show' : ''} ${resultData?.status || ''}`}>
            <div className="result-icon-wrapper">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                {resultData?.status === 'success' && <path d="M20 6L9 17l-5-5"></path>}
                {resultData?.status === 'used' && <><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></>}
                {resultData?.status === 'invalid' && <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></>}
              </svg>
            </div>
            <div className="result-label">{resultData?.message}</div>
            <div className="result-name">{resultData?.name}</div>
            <div className="result-name" style={{ fontSize: '13px', opacity: 0.75, marginTop: '2px' }}>
              {resultData?.iitId ? `IIT ID: ${resultData.iitId}` : ''}
            </div>
          </div>
        </div>

        <div className="status-bar">
          <div className="status-dot"></div>
          <span className="status-text">Point camera at student's QR code</span>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="stats-strip">
        <div className={`stat-card clickable ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          <div className="stat-num">{total}</div>
          <div className="stat-label">Total</div>
          <div className="stat-label-sub">Registered</div>
        </div>
        <div className={`stat-card clickable ${filter === 'success' ? 'active' : ''}`} onClick={() => setFilter('success')}>
          <div className="stat-num ok">{ok}</div>
          <div className="stat-label">Admitted</div>
          <div className="stat-label-sub">Checked In</div>
        </div>
        <div className={`stat-card clickable ${filter === 'duplicate' ? 'active' : ''}`} onClick={() => setFilter('duplicate')}>
          <div className="stat-num dup">{pending}</div>
          <div className="stat-label">Pending</div>
          <div className="stat-label-sub">Remaining</div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="student-search" placeholder="Search students by name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* MASTER LIST */}
      <div className="attendance-list-card">
        <div className="list-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Master Attendance
          </div>
          <button className={`sync-btn ${syncing ? 'spinning' : ''}`} onClick={fetchMasterList}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
        <div className="student-list">
          {filteredStudents.length === 0 ? (
            <div className="list-empty">{students.length === 0 ? 'Syncing...' : 'No matches found.'}</div>
          ) : (
            filteredStudents.map(s => (
              <div className="student-item" key={s.iit_id}>
                <div className={`student-status-dot ${s.attended ? 'status-admitted' : 'status-pending'}`}></div>
                <div className="student-info">
                  <div className="student-name">{s.name}</div>
                  <div className="student-email">{s.iit_id} · {s.email}</div>
                </div>
                {!s.attended ? (
                  <button className="mark-btn" onClick={() => handleManualMark(s.iit_id, s.name)}>Mark</button>
                ) : (
                  <button className="mark-btn unmark-btn" onClick={() => handleUnmark(s.iit_id, s.name)}>Unmark</button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* LIVE LOG */}
      <div className="log-card">
        <div className="log-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
          Recent Scans
        </div>
        <div className="log-list">
          {logs.length === 0 ? (
            <div className="log-empty">No scans yet.</div>
          ) : (
            logs.map((log, i) => (
              <div className="log-item" key={i}>
                <div className={`log-badge ${log.status}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    {log.status === 'success' && <path d="M20 6L9 17l-5-5"></path>}
                    {log.status === 'used' && <><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></>}
                    {log.status === 'invalid' && <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></>}
                  </svg>
                </div>
                <div className="log-info">
                  <div className="log-name">{log.name} <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '12px' }}>· {log.iitId}</span></div>
                  <div className="log-time">{log.time}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <footer>Scanner works securely inside your local database.</footer>
    </div>
  );
}
