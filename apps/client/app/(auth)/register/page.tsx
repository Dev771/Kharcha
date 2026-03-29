'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient('/auth/register', { method: 'POST', body: { email, password, name } });
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        toast.error('Registration succeeded but auto-login failed. Please sign in.');
        router.push('/login');
      } else {
        const onboarded = localStorage.getItem('kharcha:onboarded');
        router.push(onboarded ? '/' : '/onboarding');
        router.refresh();
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 409) toast.error('An account with this email already exists');
      else if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center mx-auto mb-4 shadow-brand">
          <Wallet className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Create your account</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Start splitting expenses in seconds</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required autoFocus />
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 8 characters)" required minLength={8} />
        <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>Create Account</Button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--text-muted)]">or</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <Button variant="secondary" size="lg" className="w-full" onClick={() => signIn('google', { callbackUrl: '/' })}>
        <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-[var(--muted-foreground)]">
        Already have an account?{' '}
        <Link href="/login" className="text-brand font-medium hover:text-brand-dark">Sign in</Link>
      </p>
    </div>
  );
}
