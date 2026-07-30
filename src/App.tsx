import { useState, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import AuthPage from '@/pages/AuthPage';
import DashboardPage from '@/pages/DashboardPage';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { AppProvider } from '@/context/AppContext';

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

function App() {
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
