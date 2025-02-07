import { useEffect, useState } from 'react';
import { login, setAuthToken } from '@/lib/literalClient';

type Props = {
  onAuthSuccess: () => void;
  onAuthError: (error: string) => void;
};

export default function LiteralLogin({ onAuthSuccess, onAuthError }: Props) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const autoLogin = async () => {
      try {
        setIsLoading(true);
        const email = process.env.NEXT_PUBLIC_LITERAL_EMAIL;
        const password = decodeURIComponent(process.env.NEXT_PUBLIC_LITERAL_PASSWORD || '');
        
        console.log('Environment variables:', {
          email: email ? 'exists' : 'missing',
          password: password ? 'exists' : 'missing',
        });
        
        if (!email || !password) {
          throw new Error('Missing credentials in environment variables');
        }

        console.log('Attempting login...');
        const response = await login(email, password);
        console.log('Login response:', {
          hasToken: !!response?.login?.token,
          email: response?.login?.email
        });

        localStorage.setItem('literalToken', response.login.token);
        setAuthToken(response.login.token);
        console.log('Auth token set successfully');
        onAuthSuccess();
      } catch (err) {
        console.error('Detailed login error:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          response: (err as any)?.response,
          stack: err instanceof Error ? err.stack : undefined
        });
        onAuthError('');
      } finally {
        setIsLoading(false);
      }
    };

    autoLogin();
  }, [onAuthSuccess, onAuthError]);

  return null
} 