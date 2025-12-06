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
  login: z.string().min(1, 'loginOrEmailRequired'),
  password: z.string().min(1, 'passwordRequired'),
});

export default function Login() {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      setError('');
      devLog('[LOGIN] Attempting login for:', data.login);

      // First, try super admin login
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
        devLog('[LOGIN] Super admin login successful!');
        // Clear cache and force full page reload
        queryClient.clear();
        // Force complete browser reload - not React router navigation
        document.location.href = window.location.origin;
        return;
      }

      // Super admin failed, try regular user login
      devLog('[LOGIN] Super admin failed, trying user login...');
      await login(data.login, data.password);
      // If we get here, user login succeeded
      queryClient.clear();
      window.location.href = '/';

    } catch (err: any) {
      devLog('Login error:', err);
      const errorMessage = err.message && (err.message === 'invalidCredentialsMessage' || err.message === 'loginOrEmailRequired' || err.message === 'passwordRequired')
        ? t(err.message)
        : (err.message || t('loginFailedMessage'));
      setError(errorMessage);
      setIsSubmitting(false);
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
            <div className="text-xs text-gray-500 mt-1">{t('recruitmentPlatform')}</div>
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
                    <FormLabel>{t('loginOrEmailLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={t('loginOrEmailPlaceholder')}
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
                disabled={isLoading || isSubmitting}
              >
                {(isLoading || isSubmitting) ? t('loading') : t('signIn')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
