import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Copy, Check, ArrowLeft, Lock, User, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { login, signup, forgotPassword, validateUsername } from '@/lib/auth';
import { getSession } from '@/lib/session';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login: loginCtx } = useApp();
  const [mode, setMode] = useState<Mode>('login');

  // Redirect if already logged in
  useEffect(() => {
    if (getSession()) setLocation('/dashboard');
  }, [setLocation]);

  return (
    <div className="oreopie-bg flex flex-col items-center justify-center min-h-screen px-4 py-10">
      {/* Decorative blobs */}
      <div className="blob w-[500px] h-[500px] top-[-120px] right-[-100px]"
        style={{ background: 'rgba(8,59,58,0.10)' }} />
      <div className="blob w-[400px] h-[400px] bottom-[-80px] left-[-80px]"
        style={{ background: 'rgba(109,0,26,0.08)' }} />
      <div className="blob w-[300px] h-[300px] top-[40%] right-[10%]"
        style={{ background: 'rgba(138,78,42,0.07)' }} />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="font-display text-4xl font-bold text-[#111111] tracking-wide">OreoPie</h1>
        </motion.div>

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="glass rounded-2xl p-8"
          >
            {mode === 'login' && <LoginForm onSwitch={setMode} onSuccess={(u) => { loginCtx(u); setLocation('/dashboard'); }} />}
            {mode === 'signup' && <SignupForm onSwitch={setMode} onSuccess={(u) => { loginCtx(u); setLocation('/dashboard'); }} />}
            {mode === 'forgot' && <ForgotForm onBack={() => setMode('login')} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Login Form ──────────────────────────────────────────────
function LoginForm({ onSwitch, onSuccess }: { onSwitch: (m: Mode) => void; onSuccess: (u: { id: string; username: string; email: string }) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username.trim(), password);
      onSuccess(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#111111]">Welcome back</h2>
        <p className="text-sm text-[#8A4E2A] mt-1">Sign in to connect your devices</p>
      </div>

      <FieldInput
        icon={<User size={15} />}
        label="User ID"
        value={username}
        onChange={setUsername}
        placeholder="your_username"
        autoComplete="username"
        data-testid="input-username"
      />

      <PasswordInput
        label="Password"
        value={password}
        onChange={setPassword}
        show={showPass}
        onToggle={() => setShowPass(!showPass)}
        data-testid="input-password"
      />

      {error && <ErrorBanner message={error} />}

      <button
        type="submit"
        disabled={loading}
        data-testid="button-login"
        className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-150
          bg-[#083B3A] text-[#F5F1EB] hover:bg-[#0a4a49] active:scale-[0.98] disabled:opacity-50
          shadow-sm"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <div className="flex items-center justify-between pt-1 text-sm">
        <button type="button" onClick={() => onSwitch('forgot')}
          className="text-[#8A4E2A] hover:text-[#083B3A] transition-colors font-mono text-xs">
          Forgot password?
        </button>
        <button type="button" onClick={() => onSwitch('signup')}
          className="text-[#083B3A] hover:text-[#0a4a49] transition-colors font-medium">
          Create account
        </button>
      </div>
    </form>
  );
}

// ── Signup Form ─────────────────────────────────────────────
function SignupForm({ onSwitch, onSuccess }: { onSwitch: (m: Mode) => void; onSuccess: (u: { id: string; username: string; email: string }) => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const usernameError = username.length > 0 ? validateUsername(username) : null;
  const usernameValid = username.length > 0 && usernameError === null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (usernameError) { setError(usernameError); return; }
    setLoading(true);
    try {
      const user = await signup(username.trim(), email.trim(), password);
      toast.success('Account created!');
      onSuccess(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#111111]">Create your ID</h2>
        <p className="text-sm text-[#8A4E2A] mt-1">No email verification required</p>
      </div>

      {/* Username with live validation */}
      <div className="space-y-1">
        <label className="font-mono text-[11px] uppercase tracking-widest text-[#8A4E2A]">
          Choose a User ID
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CDB49E]">
            <User size={15} />
          </div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. ShadowFox42"
            autoComplete="username"
            data-testid="input-username-signup"
            className={`w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-white/60 border transition-all outline-none
              ${usernameValid ? 'border-[#083B3A] focus:ring-1 focus:ring-[#083B3A]/30' :
                usernameError ? 'border-[#6D001A]/50 focus:ring-1 focus:ring-[#6D001A]/20' :
                'border-[#CDB49E]/70 focus:border-[#083B3A] focus:ring-1 focus:ring-[#083B3A]/20'}`}
          />
          {usernameValid && (
            <CheckCircle2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#083B3A]" />
          )}
          {usernameError && username.length > 0 && (
            <AlertCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6D001A]" />
          )}
        </div>
        {username.length > 0 && (
          <p className={`font-mono text-[11px] pl-1 ${usernameValid ? 'text-[#083B3A]' : 'text-[#6D001A]'}`}>
            {usernameValid ? 'Looks good' : usernameError}
          </p>
        )}
        <p className="font-mono text-[10px] text-[#8A4E2A]/70 pl-1">
          Letters & numbers only — min 6 chars (e.g. Alex99, MoonWatcher)
        </p>
      </div>

      <FieldInput
        icon={<Mail size={15} />}
        label="Email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        type="email"
        autoComplete="email"
        data-testid="input-email"
      />

      <PasswordInput
        label="Password"
        value={password}
        onChange={setPassword}
        show={showPass}
        onToggle={() => setShowPass(!showPass)}
        data-testid="input-password-signup"
      />

      {error && <ErrorBanner message={error} />}

      <button
        type="submit"
        disabled={loading || !!usernameError}
        data-testid="button-signup"
        className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-150
          bg-[#083B3A] text-[#F5F1EB] hover:bg-[#0a4a49] active:scale-[0.98] disabled:opacity-50 shadow-sm"
      >
        {loading ? 'Creating account…' : 'Create Account'}
      </button>

      <div className="text-center text-sm">
        <button type="button" onClick={() => onSwitch('login')}
          className="text-[#083B3A] hover:text-[#0a4a49] transition-colors font-medium">
          Already have an account? Sign in
        </button>
      </div>
    </form>
  );
}

// ── Forgot Password Form ────────────────────────────────────
function ForgotForm({ onBack }: { onBack: () => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recovered, setRecovered] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setRecovered('');
    setLoading(true);
    try {
      const pass = await forgotPassword(username.trim(), email.trim());
      setRecovered(pass);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not find your account');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(recovered);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button type="button" onClick={onBack}
        className="flex items-center gap-1.5 text-[#8A4E2A] text-sm hover:text-[#083B3A] transition-colors mb-1">
        <ArrowLeft size={14} /> Back to sign in
      </button>
      <div>
        <h2 className="font-display text-2xl font-semibold text-[#111111]">Recover Password</h2>
        <p className="text-sm text-[#8A4E2A] mt-1">Enter your User ID and the email you registered with</p>
      </div>

      <FieldInput
        icon={<User size={15} />}
        label="User ID"
        value={username}
        onChange={setUsername}
        placeholder="your_username"
        data-testid="input-username-forgot"
      />
      <FieldInput
        icon={<Mail size={15} />}
        label="Email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        type="email"
        data-testid="input-email-forgot"
      />

      {error && <ErrorBanner message={error} />}

      {recovered && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#083B3A]/8 border border-[#083B3A]/20 rounded-xl p-4 space-y-2"
        >
          <p className="font-mono text-[11px] uppercase tracking-widest text-[#083B3A]">
            Your password
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/70 border border-[#CDB49E]/50 rounded-lg px-3 py-2 font-mono text-sm text-[#111111] break-all">
              {recovered}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="p-2 rounded-lg border border-[#CDB49E]/50 bg-white/60 hover:bg-[#083B3A] hover:text-white hover:border-[#083B3A] transition-all"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </motion.div>
      )}

      {!recovered && (
        <button
          type="submit"
          disabled={loading}
          data-testid="button-recover"
          className="w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-150
            bg-[#083B3A] text-[#F5F1EB] hover:bg-[#0a4a49] active:scale-[0.98] disabled:opacity-50 shadow-sm"
        >
          {loading ? 'Looking up…' : 'Recover Password'}
        </button>
      )}

      {recovered && (
        <button type="button" onClick={onBack}
          className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-[#083B3A] text-[#F5F1EB] hover:bg-[#0a4a49] transition-all">
          Back to Sign In
        </button>
      )}
    </form>
  );
}

// ── Shared field components ─────────────────────────────────
function FieldInput({
  icon, label, value, onChange, placeholder, type = 'text', autoComplete, 'data-testid': testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  'data-testid'?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="font-mono text-[11px] uppercase tracking-widest text-[#8A4E2A]">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CDB49E]">{icon}</div>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          data-testid={testId}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-white/60 border border-[#CDB49E]/70
            focus:border-[#083B3A] focus:ring-1 focus:ring-[#083B3A]/20 outline-none transition-all"
        />
      </div>
    </div>
  );
}

function PasswordInput({
  label, value, onChange, show, onToggle, 'data-testid': testId,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  'data-testid'?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="font-mono text-[11px] uppercase tracking-widest text-[#8A4E2A]">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CDB49E]"><Lock size={15} /></div>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          data-testid={testId}
          className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm bg-white/60 border border-[#CDB49E]/70
            focus:border-[#083B3A] focus:ring-1 focus:ring-[#083B3A]/20 outline-none transition-all"
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CDB49E] hover:text-[#083B3A] transition-colors">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="flex items-start gap-2 bg-[#6D001A]/8 border border-[#6D001A]/20 rounded-lg px-3 py-2"
    >
      <AlertCircle size={14} className="text-[#6D001A] mt-0.5 flex-shrink-0" />
      <p className="text-[#6D001A] text-xs font-mono">{message}</p>
    </motion.div>
  );
}
