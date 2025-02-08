import { useEffect, useState } from 'react';
import { setAuthToken } from '@/lib/literalClient';

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
        
        const response = await fetch('/api/auth/literal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const data = await response.json();
        
        if (!data.token) {
          throw new Error('No token received');
        }

        localStorage.setItem('literalToken', data.token);
        setAuthToken(data.token);
        onAuthSuccess();
      } catch (err) {
        console.error('Login error:', err);
        onAuthError(err instanceof Error ? err.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    autoLogin();
  }, [onAuthSuccess, onAuthError]);

  return null;
}