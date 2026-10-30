
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import api from '../api/client';

const API_BASE_URL = (api.defaults.baseURL ?? '').replace(/\/$/, '');

export default function LoginPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-[340px] rounded-control border border-border bg-surface-raised p-5 shadow-panel sm:p-6">
        <div className="mb-5 text-center">
          <h1 className="text-xl font-semibold text-text">Login</h1>
        </div>

        <a
          href={`${API_BASE_URL}/api/auth/google`}
          className="flex min-h-9 w-full items-center justify-center gap-2 rounded-control border border-transparent bg-primary-tint px-3 text-xs font-semibold text-text transition hover:bg-primary-tint focus-visible:shadow-focus"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 48 48"
            className="h-5 w-5"
          >
            <path fill="#FFC107" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
            <path fill="#4CAF50" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
            <path fill="#1976D2" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8l6.8-5.3Z" />
            <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12Z" />
          </svg>
          Login with Google
        </a>

        <div className="my-4 flex items-center gap-2 text-[10px] text-muted">
          <span className="h-px flex-1 bg-border" />
          <span>or sign up through email</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-2.5 opacity-60" aria-disabled="true">
          <Input
            label="Email ID"
            name="email"
            type="email"
            placeholder="Email ID"
            disabled
            className="min-h-8 py-1.5 text-xs"
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Password"
            disabled
            className="min-h-8 py-1.5 text-xs"
          />

          <Button
            variant="primary"
            className="min-h-8 bg-primary py-1.5 text-xs text-background disabled:bg-primary disabled:text-background"
            disabled
          >
            Login
          </Button>
        </div>

        <p className="mt-2 text-center text-[10px] text-muted">
          Coming soon
        </p>
      </section>
    </main>
  );
}
