import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Wprowadź email i hasło');
      return;
    }
    const success = login(email, password);
    if (success) {
      toast.success('Zalogowano pomyślnie');
      navigate('/admin');
    } else {
      toast.error('Nieprawidłowy email lub hasło');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
      <div className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-heading text-3xl font-bold text-primary mb-2">Majli Beauty</h1>
          <p className="text-muted-foreground text-sm">Panel pracownika</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="anna@majlibeauty.pl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground">
            Zaloguj się
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-6">
          Dane testowe: anna@majlibeauty.pl / admin123
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
