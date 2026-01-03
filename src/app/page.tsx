'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [data, setData] = useState<{ state: string; status?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [polling, setPolling] = useState(false);
  
  // Keep track of previous state to trigger notification only on change
  const prevStateRef = useRef<string | null>(null);

  const checkStatus = async (isAuto = false) => {
    if (!isAuto) setLoading(true);
    try {
      const res = await fetch('/api/check');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date().toLocaleTimeString());

      // Notification Logic
      if (isAuto && json.state === 'SUCCESS' && prevStateRef.current !== 'SUCCESS') {
        sendNotification('Growtopia Server is Online!', 'The website returned 200 OK.');
      } else if (isAuto && json.state !== 'SUCCESS' && prevStateRef.current === 'SUCCESS') {
         sendNotification('Growtopia Server might be Down', `Status code: ${json.status}`);
      }
      
      prevStateRef.current = json.state;

    } catch (err) {
      setData({ state: 'ERROR' });
    } finally {
      if (!isAuto) setTimeout(() => setLoading(false), 500);
    }
  };

  const requestNotification = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notification');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const sendNotification = (title: string, body: string) => {
    if (permission === 'granted') {
      // Try to use Service Worker registration if available (better for PWA)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(title, {
            body: body,
            icon: '/icon.png',
            tag: 'growtopia-status' // prevents stacking multiple notifications
          });
        }).catch(() => {
          // Fallback if SW not ready/failed
          new Notification(title, {
             body: body,
             icon: '/icon.png',
          });
        });
      } else {
         // Fallback for non-SW browsers
         new Notification(title, {
           body: body,
           icon: '/icon.png',
         });
      }
    }
  };

  const togglePolling = () => {
    setPolling(!polling);
  };

  useEffect(() => {
    // Initial check
    checkStatus();

    // Check notification permission on mount
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (polling) {
      // Check every 1 hour if polling is enabled
      interval = setInterval(() => {
         checkStatus(true);
      }, 3600000); // 1 hour
    }
    return () => clearInterval(interval);
  }, [polling]);

  let statusClass = 'status-loading';
  let icon = ''; 
  let statusText = 'Checking...';
  let subText = 'Connecting to Growtopia servers';

  if (!loading && data) {
    if (data.state === 'SUCCESS') {
      statusClass = 'status-success';
      icon = '✓';
      statusText = 'Online & Healthy';
      subText = 'The website is accessible (200 OK)';
    } else if (data.state === 'FORBIDDEN') {
      statusClass = 'status-forbidden';
      icon = '✕';
      statusText = 'Access Forbidden';
      subText = 'The website is returning 403 Forbidden';
    } else {
      statusClass = 'status-forbidden'; 
      icon = '!';
      statusText = 'Service Unreachable';
      subText = `Status Code: ${data.status || 'Unknown'}`;
    }
  }

  return (
    <main>
       <div className="glass-card">
          <h1 className="title">Growtopia Status</h1>
          <p className="subtitle">Real-time website health monitor</p>

          <div className={`status-indicator ${statusClass}`}>
            <span className="status-icon">{icon}</span>
          </div>

          <h2 className="status-text">{statusText}</h2>
          <p className="status-subtext">{subText}</p>

          <div style={{ display: 'flex', gap: '10px', width: '100%', flexDirection: 'column' }}>
            <button 
              className="cta-button" 
              onClick={() => checkStatus()} 
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Check Now'}
            </button>

             <button 
              className={`cta-button secondary ${polling ? 'active' : ''}`}
              onClick={togglePolling} 
              style={{ background: polling ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: polling ? '#10B981' : 'var(--text-muted)' }}
            >
              {polling ? 'Auto-Check Details: ON' : 'Enable Auto-Updates'}
            </button>
          </div>

          
          {permission !== 'granted' && permission !== 'denied' && (
             <button 
             onClick={requestNotification}
             style={{ background: 'none', border: 'none', color: 'var(--primary)', marginTop: '20px', cursor: 'pointer', textDecoration: 'underline' }}
             >
               Enable Notifications
             </button>
          )}

           {permission === 'denied' && (
             <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--error)' }}>
               Notifications denied. Check browser settings.
             </p>
          )}
          
          {lastUpdated && !loading && (
             <div style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.8rem', opacity: 0.6 }}>
               Last checked: {lastUpdated}
             </div>
          )}
       </div>
    </main>
  );
}
