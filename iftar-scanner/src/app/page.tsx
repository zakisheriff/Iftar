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
  const [confirming, setConfirming] = useState<{ type: 'mark' | 'unmark', token: string, name: string } | null>(null);
  const [manualPaused, setManualPaused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchMasterList = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/list');
      const data = await res.json();
      if (data.status === 'success') {
        // Deduplicate by iit_id + email to prevent "doubling"
        const seen = new Set();
        const unique = data.data.filter((s: Student) => {
          const key = (s.iit_id + '|' + s.email).toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setStudents(unique);
      }
    } catch (e) {
      console.error(e);
    }
    setSyncing(false);
  };

  useEffect(() => {
    fetchMasterList();
    const interval = setInterval(fetchMasterList, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualMark = async (token: string, name: string) => {
    setConfirming({ type: 'mark', token, name });
  };

  const executeManualMark = async () => {
    if (!confirming) return;
    const { token } = confirming;
    setConfirming(null);
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
      let finalMsg = finalStatus === 'success' ? 'Checked In (Manual)' : finalStatus === 'already_used' ? 'Already Checked In' : 'Invalid ID';

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
          time: (finalStatus === 'success' ? 'Checked In (Manual)' : finalStatus === 'already_used' ? 'Duplicate scan' : 'Invalid ID') + ' · ' + timeStr
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
    setConfirming({ type: 'unmark', token, name });
  };

  const executeUnmark = async () => {
    if (!confirming) return;
    const { token } = confirming;
    setConfirming(null);
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
    if (!result || result.length === 0 || scanState !== 'idle' || resultData !== null || confirming !== null) return;
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
      let finalMsg = finalStatus === 'success' ? 'Welcome! Checked In.' : finalStatus === 'already_used' ? 'Already Checked In' : 'Invalid QR Code';

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
          time: (finalStatus === 'success' ? 'Checked In' : finalStatus === 'already_used' ? 'Duplicate scan' : 'Invalid QR') + ' · ' + timeStr
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

  const forceReset = () => {
    setScanState('idle');
    setResultData(null);
    setConfirming(null);
    setManualPaused(false);
  };

  const total = students.length;
  const ok = students.filter(s => s.attended).length;
  const pending = total - ok;

  const filteredStudents = students.filter(s => {
    const sTerm = search.toLowerCase().trim();
    const matchesSearch = !sTerm ||
      s.name.toLowerCase().includes(sTerm) ||
      s.email.toLowerCase().includes(sTerm) ||
      s.iit_id.toLowerCase().includes(sTerm);

    // Use !! (truthiness) because SQLite returns 0/1 for booleans
    const matchesFilter = filter === 'all' ? true :
      filter === 'success' ? !!s.attended :
        !s.attended;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="page">
      <header className="page-header">
        <div className="brand-icon">
          <img src="/assets/iftar-logo.png" alt="Iftar 2026 Logo" className="header-logo" />
        </div>
        <p className="tagline">Attendance Management System</p>
        <p className="theme-desc">Scan QR codes or search to mark attendance.</p>
      </header>

      {/* CAMERA CARD */}
      <div className="camera-card">
        <div
          className="video-wrapper"
          onClick={() => {
            if (scanState === 'idle' && !resultData && !confirming) {
              setManualPaused(prev => !prev);
            }
          }}
          style={{ cursor: scanState === 'idle' && !resultData && !confirming ? 'pointer' : 'default' }}
        >
          <div style={{ position: 'absolute', inset: 0 }}>
            <Scanner
              onScan={handleScan}
              styles={{ container: { width: '100%', height: '100%' } }}
              components={{ finder: false }}
              formats={['qr_code']}
              paused={manualPaused || scanState !== 'idle' || resultData !== null || confirming !== null}
              sound={false}
            />
          </div>

          {/* CLICKABLE RESUME OVERLAY - Only shows when result is displayed, confirming, or manually paused */}
          {(manualPaused || resultData !== null || confirming !== null) && (
            <button
              className="resume-overlay"
              onClick={(e) => { e.stopPropagation(); forceReset(); }}
              title="Tap to scan again"
            >
              <div className="resume-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6"></path>
                  <path d="M1 20v-6h6"></path>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>{manualPaused ? 'Camera Paused · Tap to Resume' : 'Tap to Resume Scanning'}</span>
              </div>
            </button>
          )}

          {/* CUSTOM CONFIRMATION OVERLAY */}
          {confirming && (
            <div id="confirm-overlay" className="show">
              <div className="confirm-card">
                <div className="confirm-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                    <path d="M12 8v4"></path>
                    <path d="M12 16h.01"></path>
                  </svg>
                </div>
                <div className="confirm-title">
                  {confirming.type === 'mark' ? 'Confirm Check-in' : 'Confirm Unmark'}
                </div>
                <div className="confirm-desc">
                  {confirming.type === 'mark'
                    ? <>Are you sure you want to mark <strong>{confirming.name} ({confirming.token})</strong> as Present?</>
                    : <>Are you sure you want to set <strong>{confirming.name} ({confirming.token})</strong> back to Pending?</>}
                </div>
                <div className="confirm-actions">
                  <button className="confirm-btn-cancel" onClick={(e) => { e.stopPropagation(); setConfirming(null); }}>Cancel</button>
                  <button className="confirm-btn-proceed" onClick={(e) => { e.stopPropagation(); confirming.type === 'mark' ? executeManualMark() : executeUnmark(); }}>
                    {confirming.type === 'mark' ? 'Confirm' : 'Unmark'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="scan-frame">
            <div className="frame-box">
              <div className="frame-corner-br"></div>
              <div className="frame-corner-bl"></div>
            </div>
            {scanState === 'idle' && !manualPaused && !resultData && !confirming && (
              <div className="tap-pause-hint">Tap to pause</div>
            )}
          </div>

          <div id="loading-overlay" className={scanState === 'loading' ? 'show' : ''}>
            <svg className="spinner" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
            </svg>
          </div>

          <div
            id="result-overlay"
            className={`${resultData ? 'show' : ''} ${resultData?.status || ''}`}
            onClick={forceReset}
            style={{ cursor: 'pointer' }}
          >
            <div className="result-icon-wrapper">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                {resultData?.status === 'success' && <path d="M20 6L9 17l-5-5"></path>}
                {resultData?.status === 'already_used' && (
                  <>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </>
                )}
                {resultData?.status === 'invalid' && (
                  <>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </>
                )}
              </svg>
            </div>
            <div className="result-label">{resultData?.message}</div>
            <div className="result-name">{resultData?.name}</div>
            <div className="result-name" style={{ fontSize: '13px', opacity: 0.75, marginTop: '2px' }}>
              {resultData?.iitId ? `IIT ID: ${resultData.iitId}` : ''}
            </div>
            <div className="result-hint">Tap anywhere to resume</div>
          </div>
        </div>
      </div>

      <div className="status-text-only">
        {scanState === 'loading' ? 'Processing...' : (manualPaused || resultData || confirming) ? 'Tap scanner to resume' : 'Point camera at student\'s QR code'}
      </div>

      {/* STATS STRIP */}
      <div className="stats-strip">
        <div className={`stat-card clickable ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          <div className="stat-num">{total}</div>
          <div className="stat-label">TOTAL</div>
        </div>
        <div className={`stat-card clickable ${filter === 'success' ? 'active' : ''}`} onClick={() => setFilter('success')}>
          <div className="stat-num ok">{ok}</div>
          <div className="stat-label">PRESENT</div>
        </div>
        <div className={`stat-card clickable ${filter === 'duplicate' ? 'active' : ''}`} onClick={() => setFilter('duplicate')}>
          <div className="stat-num dup">{pending}</div>
          <div className="stat-label">PENDING</div>
        </div>
      </div>

      {/* SEARCH */}
      <div className="search-container">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            id="student-search"
            placeholder="Search students by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            ref={searchInputRef}
          />
          {search && (
            <button
              className="search-clear-btn"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setSearch(''); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
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
              <div className="student-item" key={s.iit_id + s.email}>
                <div className={`student-status-dot ${s.attended ? 'status-present' : 'status-pending'}`}></div>
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
