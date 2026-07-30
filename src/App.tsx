import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppProvider } from '@/context/AppContext';
import { supabaseConfigured } from '@/lib/supabase';

const queryClient = new QueryClient();

/**
 * Custom hash location hook — reads/writes window.location.hash.
 * Avoids the wouter/use-hash-location circular dependency that causes
 * "Invalid hook call" errors with React 19.
 * URLs look like: /#/  and  /#/dashboard
 */
function useHashLocation(): [string, (to: string, opts?: { replace?: boolean }) => void] {
  const getHash = () => {
    const h = window.location.hash;
    return h ? h.slice(1) || '/' : '/';
  };

  const [loc, setLoc] = useState<string>(getHash);

  useEffect(() => {
    const handler = () => setLoc(getHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    if (opts?.replace) {
      window.history.replaceState(null, '', '#' + to);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = to;
    }
  }, []);

  return [loc, navigate];
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function SetupScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#F5F0EA', fontFamily: 'system-ui, sans-serif', padding: '24px',
    }}>
      <div style={{
        maxWidth: 460, width: '100%', background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(16px)', border: '1px solid rgba(205,180,158,0.5)',
        borderRadius: 20, padding: '32px', boxShadow: '0 8px 32px rgba(17,17,17,0.10)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: '#083B3A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="31" stroke="#CDB49E" strokeWidth="5.5"/>
              <circle cx="50" cy="50" r="6.5" fill="#CDB49E"/>
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111111' }}>OreoPie</div>
            <div style={{ fontSize: 11, color: '#8A4E2A', fontFamily: 'monospace' }}>Setup required</div>
          </div>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111111', margin: '0 0 8px' }}>
          Supabase credentials missing
        </h2>
        <p style={{ fontSize: 13, color: '#8A4E2A', lineHeight: 1.6, margin: '0 0 20px' }}>
          OreoPie needs two environment secrets to connect to your Supabase project.
        </p>

        <div style={{ background: '#083B3A0D', border: '1px solid #083B3A26', borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#083B3A', marginBottom: 6 }}>Required secrets:</div>
          {['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].map(k => (
            <div key={k} style={{
              fontFamily: 'monospace', fontSize: 12, color: '#111111',
              background: 'rgba(255,255,255,0.6)', borderRadius: 6, padding: '4px 8px', marginTop: 4,
            }}>{k}</div>
          ))}
        </div>

        <ol style={{ fontSize: 13, color: '#555', lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
          <li>Open your <strong>Supabase Dashboard → Settings → API</strong></li>
          <li>Copy the <strong>Project URL</strong> and <strong>anon public</strong> key</li>
          <li>In Replit: open <strong>Secrets</strong> (lock icon) and add both values</li>
          <li>Restart the dev server — the app will load</li>
        </ol>
      </div>
    </div>
  );
}

function App() {
  if (!supabaseConfigured) return <SetupScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <WouterRouter hook={useHashLocation}>
            <Router />
          </WouterRouter>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'rgba(255,255,255,0.85)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(205,180,158,0.5)',
                color: '#111111',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                borderRadius: '14px',
                boxShadow: '0 8px 32px rgba(17,17,17,0.12)',
              },
            }}
          />
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
