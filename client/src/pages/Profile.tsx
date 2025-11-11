import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to setup 2FA');
      return response.json();
    },
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      toast({
        title: '2FA Setup',
        description: 'Scan the QR code with your authenticator app',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const enable2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enable 2FA');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '2FA Enabled',
        description: 'Two-factor authentication is now active',
      });
      setQrCode('');
      setSecret('');
      setVerificationCode('');
      refreshUser();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to disable 2FA');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '2FA Disabled',
        description: 'Two-factor authentication has been disabled',
      });
      refreshUser();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEnable2FA = (e: React.FormEvent) => {
    e.preventDefault();
    enable2FAMutation.mutate(verificationCode);
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation('/')}
          data-testid="button-home"
        >
          <Home className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold mb-6">User Profile</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Username</Label>
              <div className="text-lg">{user?.username}</div>
            </div>
            <div>
              <Label>Email</Label>
              <div className="text-lg">{user?.email}</div>
            </div>
            <div>
              <Label>Role</Label>
              <div className="text-lg capitalize">{user?.role}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    ✓ Two-factor authentication is enabled
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => disable2FAMutation.mutate()}
                  disabled={disable2FAMutation.isPending}
                  data-testid="button-disable-2fa"
                >
                  {disable2FAMutation.isPending ? 'Disabling...' : 'Disable 2FA'}
                </Button>
              </div>
            ) : qrCode ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img src={qrCode} alt="2FA QR Code" className="w-64 h-64" />
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">
                    Or enter this code manually:
                  </Label>
                  <code className="block mt-1 p-2 bg-muted rounded font-mono text-sm">
                    {secret}
                  </code>
                </div>

                <form onSubmit={handleEnable2FA} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verificationCode">Verification Code</Label>
                    <Input
                      id="verificationCode"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      required
                      data-testid="input-verification-code"
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code from your authenticator app
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={enable2FAMutation.isPending}
                    data-testid="button-verify-2fa"
                  >
                    {enable2FAMutation.isPending ? 'Verifying...' : 'Verify and Enable'}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Two-factor authentication is not enabled. Enable it to add an extra layer of security.
                </p>
                <Button
                  onClick={() => setup2FAMutation.mutate()}
                  disabled={setup2FAMutation.isPending}
                  data-testid="button-setup-2fa"
                >
                  {setup2FAMutation.isPending ? 'Setting up...' : 'Setup 2FA'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
