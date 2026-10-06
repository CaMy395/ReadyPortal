import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from './apiConfig';
import { chatRequest, ensureVisitorSession, getVisitorIdentity } from './liveVisitorChat';

let lastAlertReport=0;
export default function VisitorTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    let stopped=false;
    const report = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        await ensureVisitorSession(pathname);
        if (stopped || document.visibilityState!=='visible') return;
        await chatRequest('/visitor/presence',{ path:pathname },{ visitor:true });
        if (stopped) return;
        if (Date.now()-lastAlertReport>=60000) {
          lastAlertReport=Date.now();
          // The live thread exists before the push notification links to it.
          const response=await fetch(`${API_BASE_URL}/api/push/visit`, { method:'POST',
            headers:{ 'Content-Type':'application/json' },
            body:JSON.stringify({ visitorId:getVisitorIdentity().visitorId,path:pathname }),
          });
          if (!response.ok) lastAlertReport=0;
        }
      } catch { /* Tracking never interrupts the visitor's page. */ }
    };
    report();
    const timer = setInterval(report, 15000);
    document.addEventListener('visibilitychange', report);
    return () => { stopped=true; clearInterval(timer); document.removeEventListener('visibilitychange', report); };
  }, [pathname]);
  return null;
}
