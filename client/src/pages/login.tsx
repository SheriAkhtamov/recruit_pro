import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Logo from '@/components/Logo';
import { devLog } from '@/lib/debug';

const loginSchema = z.object({
  login: z.string().min(1, 'Login or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login() {
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      login: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      setError('');
      
      // Try to login as regular user first (by email)
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isEmail = emailPattern.test(data.login);
      
      if (isEmail) {
        // Try regular user login first
        try {
          await login(data.login, data.password);
          return; // Success, exit early
        } catch (userError: any) {
          // If user login fails, try super admin
          try {
            const superAdminResponse = await fetch('/api/super-admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                username: data.login,
                password: data.password,
              }),
            });
            
            if (superAdminResponse.ok) {
              const result = await superAdminResponse.json();
              devLog('[LOGIN] Super admin login successful:', result);
              queryClient.invalidateQueries({ queryKey: ['/api/super-admin/me'] });
              setTimeout(() => {
                window.location.href = '/super-admin';
              }, 100);
              return;
            }
          } catch (superAdminError: any) {
            // Ignore super admin error, show user error
          }
          
          throw userError; // Throw original error if both fail
        }
      } else {
        // Try super admin login first (by username)
        devLog('[LOGIN] Attempting super admin login for:', data.login);
        try {
          const superAdminResponse = await fetch('/api/super-admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              username: data.login,
              password: data.password,
            }),
          });
          
          devLog('[LOGIN] Super admin response status:', superAdminResponse.status);
          
          if (superAdminResponse.ok) {
            const result = await superAdminResponse.json();
            devLog('[LOGIN] Super admin login successful:', result);
            // Invalidate queries to refresh auth state
            queryClient.invalidateQueries({ queryKey: ['/api/super-admin/me'] });
            // Small delay to ensure session is saved
            setTimeout(() => {
              window.location.href = '/super-admin';
            }, 100);
            return;
          }
          
          // If super admin failed, try as regular user
          const superAdminErrorData = await superAdminResponse.json().catch(() => ({ error: 'Invalid credentials' }));
          devLog('[LOGIN] Super admin login failed:', superAdminErrorData);
          
          try {
            await login(data.login, data.password);
          } catch (userError: any) {
            // Both failed - show error
            devLog('[LOGIN] Both logins failed');
            throw new Error(superAdminErrorData.error || 'Invalid credentials. Please check your login and password.');
          }
        } catch (superAdminError: any) {
          devLog('[LOGIN] Super admin fetch error:', superAdminError);
          // If fetch failed, try as regular user
          try {
            await login(data.login, data.password);
          } catch (userError: any) {
            devLog('[LOGIN] User login also failed:', userError);
            throw new Error('Invalid credentials. Please check your login and password.');
          }
        }
      }
    } catch (err: any) {
      devLog('Login error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <CardTitle className="text-2xl font-semibold">
            Cognix Hire
            <div className="text-xs text-gray-500 mt-1">Recruitment Platform</div>
          </CardTitle>
          <p className="text-sm text-gray-600">{t('signInToContinue')}</p>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="login"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Логин или Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="Введите логин или email" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('password')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t('password')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-primary-600 hover:bg-primary-700" 
                disabled={isLoading}
              >
                {isLoading ? t('loading') : t('signIn')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
