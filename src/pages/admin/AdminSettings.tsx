import { useState, useEffect } from 'react';
import { Settings, CreditCard, Loader2, Save, Calendar, ExternalLink } from 'lucide-react';
import { useSettings } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const AdminSettings = () => {
  const { depositAmount, googleClientId, loading, saveDepositAmount, saveGoogleClientId } = useSettings();
  const [depositValue, setDepositValue] = useState('');
  const [clientIdValue, setClientIdValue] = useState('');
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);

  useEffect(() => {
    if (!loading) {
      setDepositValue(depositAmount > 0 ? String(depositAmount) : '');
      setClientIdValue(googleClientId || '');
    }
  }, [depositAmount, googleClientId, loading]);

  const handleSaveDeposit = async () => {
    const amount = Number(depositValue);
    if (depositValue !== '' && (isNaN(amount) || amount < 0)) { toast.error('Podaj prawidłową kwotę'); return; }
    setSavingDeposit(true);
    try { await saveDepositAmount(amount); toast.success(amount > 0 ? `Zaliczka: ${amount} zł` : 'Zaliczka wyłączona'); }
    catch { toast.error('Błąd zapisu'); } finally { setSavingDeposit(false); }
  };

  const handleSaveGoogle = async () => {
    setSavingGoogle(true);
    try { await saveGoogleClientId(clientIdValue.trim()); toast.success('Google Client ID zapisany'); }
    catch { toast.error('Błąd zapisu'); } finally { setSavingGoogle(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Settings className="w-6 h-6 text-primary" />Ustawienia</h1>
        <p className="text-sm text-muted-foreground mt-1">Globalne ustawienia salonu</p>
      </div>

      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /><h2 className="font-semibold">Zaliczka przy rezerwacji</h2></div>
        <div className="space-y-2">
          <Label>Wysokość zaliczki (zł)</Label>
          <div className="flex gap-3">
            <Input type="number" min="0" value={depositValue} onChange={e => setDepositValue(e.target.value)} placeholder="np. 50" className="max-w-[160px]" />
            <Button onClick={handleSaveDeposit} disabled={savingDeposit} className="gap-2">
              {savingDeposit ? <><Loader2 className="w-4 h-4 animate-spin" />Zapisuję...</> : <><Save className="w-4 h-4" />Zapisz</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{depositValue && Number(depositValue) > 0 ? `Klientka zapłaci ${depositValue} zł zaliczki` : 'Brak zaliczki'}</p>
        </div>
        {depositAmount > 0 ? (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">✅ Aktywna zaliczka: <strong>{depositAmount} zł</strong></div>
        ) : (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">ℹ️ Zaliczka wyłączona</div>
        )}
      </div>

      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /><h2 className="font-semibold">Google Calendar</h2></div>
        <p className="text-xs text-muted-foreground">Wpisz Google OAuth Client ID żeby pracownicy mogli połączyć swoje kalendarze. Wizyty będą automatycznie pojawiać się w kalendarzu pracownicy po potwierdzeniu.</p>
        <div className="space-y-2">
          <Label>Google OAuth Client ID</Label>
          <div className="flex gap-3">
            <Input value={clientIdValue} onChange={e => setClientIdValue(e.target.value)} placeholder="123456789-abc.apps.googleusercontent.com" className="font-mono text-xs" />
            <Button onClick={handleSaveGoogle} disabled={savingGoogle} className="gap-2 shrink-0">
              {savingGoogle ? <><Loader2 className="w-4 h-4 animate-spin" />Zapisuję...</> : <><Save className="w-4 h-4" />Zapisz</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Znajdziesz w <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink className="w-3 h-3" /></a> → APIs & Services → Credentials
          </p>
        </div>
        {googleClientId ? (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs font-mono break-all">✅ Client ID: {googleClientId}</div>
        ) : (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">ℹ️ Brak Client ID — pracownicy nie mogą połączyć kalendarza Google</div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
