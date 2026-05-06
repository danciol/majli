import { useState, useEffect } from 'react';
import { Settings, CreditCard, Loader2, Save, Calendar, ExternalLink, Link2, Unlink, MessageSquare, KeyRound } from 'lucide-react';
import { useSettings } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { authorizeSalonAccount, disconnectSalonAccount, silentRefreshSalonToken } from '@/lib/googleCalendar';

const AdminSettings = () => {
  const { depositAmount, googleClientId, googleConnected, googleTokenExpiry, textBeeApiKey, textBeeDeviceId, serviceAccountEmail, loading, saveDepositAmount, saveGoogleClientId, saveTextBee, saveServiceAccount } = useSettings();
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [depositValue, setDepositValue] = useState('');
  const [clientIdValue, setClientIdValue] = useState('');
  const [tbApiKey, setTbApiKey] = useState('');
  const [tbDeviceId, setTbDeviceId] = useState('');
  const [savingTextBee, setSavingTextBee] = useState(false);
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [savingGoogle, setSavingGoogle] = useState(false);
  const [saJson, setSaJson] = useState('');
  const [savingSa, setSavingSa] = useState(false);

  useEffect(() => {
    if (!loading) {
      setDepositValue(depositAmount > 0 ? String(depositAmount) : '');
      setClientIdValue(googleClientId || '');
      setTbApiKey(textBeeApiKey || '');
      setTbDeviceId(textBeeDeviceId || '');
    }
  }, [depositAmount, googleClientId, textBeeApiKey, textBeeDeviceId, loading]);

  // Auto silent refresh gdy token wygasł
  useEffect(() => {
    if (!googleConnected || !googleClientId) return;
    if (googleTokenExpiry && googleTokenExpiry > Date.now()) return;
    silentRefreshSalonToken().catch(() => {});
  }, [googleConnected, googleClientId, googleTokenExpiry]);

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
          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">ℹ️ Brak Client ID — połączenie Google niemożliwe</div>
        )}

        <div className="pt-2 border-t border-border space-y-3">
          <p className="text-sm font-medium">Konto Google salonu</p>
          <p className="text-xs text-muted-foreground">Zaloguj się kontem Google salonu — pracownicy udostępniają mu swoje kalendarze, a wizyty są zapisywane automatycznie.</p>
          {googleConnected ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <span className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  {googleTokenExpiry && googleTokenExpiry > Date.now()
                    ? 'Konto Google połączone'
                    : 'Token wygasł — odnów połączenie'}
                </span>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive gap-1"
                  onClick={async () => {
                    try { await disconnectSalonAccount(); toast.success('Rozłączono konto Google'); }
                    catch { toast.error('Błąd rozłączania'); }
                  }}>
                  <Unlink className="w-3 h-3" /> Rozłącz
                </Button>
              </div>
              {googleTokenExpiry && googleTokenExpiry <= Date.now() && (
                <Button variant="outline" size="sm" className="w-full gap-2" disabled={refreshing}
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      const ok = await silentRefreshSalonToken();
                      if (ok) toast.success('Token odnowiony');
                      else {
                        const ok2 = await authorizeSalonAccount();
                        if (ok2) toast.success('Połączono ponownie');
                      }
                    } catch (e: any) { toast.error(e.message || 'Błąd'); }
                    finally { setRefreshing(false); }
                  }}>
                  {refreshing ? <><Loader2 className="w-4 h-4 animate-spin" />Odnawiam...</> : 'Odnów połączenie'}
                </Button>
              )}
            </div>
          ) : (
            <Button onClick={async () => {
              if (!googleClientId) { toast.error('Najpierw zapisz Google Client ID'); return; }
              setConnectingGoogle(true);
              try {
                const ok = await authorizeSalonAccount();
                if (ok) toast.success('Konto Google połączone!');
                else toast.error('Anulowano');
              } catch (e: any) { toast.error(e.message || 'Błąd'); }
              finally { setConnectingGoogle(false); }
            }} disabled={connectingGoogle || !googleClientId} className="gap-2">
              {connectingGoogle ? <><Loader2 className="w-4 h-4 animate-spin" />Łączę...</> : <><Calendar className="w-4 h-4" />Połącz konto Google</>}
            </Button>
          )}
        </div>
      </div>
      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /><h2 className="font-semibold">Google Service Account</h2></div>
        <p className="text-xs text-muted-foreground">
          Zamiast ręcznego logowania — wklej JSON klucza Service Account. Token odnawiany jest automatycznie, połączenie nigdy nie wygasa.{' '}
          <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
            Google Cloud Console <ExternalLink className="w-3 h-3" />
          </a>{' '}→ Service Accounts → Utwórz → Klucze → Dodaj klucz JSON
        </p>
        {serviceAccountEmail ? (
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
            ✅ Service Account: <span className="font-mono text-xs break-all">{serviceAccountEmail}</span>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">ℹ️ Brak Service Account — używane ręczne logowanie OAuth</div>
        )}
        <div className="space-y-2">
          <Label>Klucz JSON (wklej całą zawartość pliku)</Label>
          <Textarea
            value={saJson}
            onChange={e => setSaJson(e.target.value)}
            placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  ...\n}'}
            rows={5}
            className="font-mono text-xs resize-none"
          />
          <Button onClick={async () => {
            if (!saJson.trim()) { toast.error('Wklej zawartość pliku JSON'); return; }
            try {
              const parsed = JSON.parse(saJson.trim());
              if (!parsed.client_email || !parsed.private_key) { toast.error('Nieprawidłowy format klucza'); return; }
              setSavingSa(true);
              await saveServiceAccount(saJson.trim());
              toast.success(`Service Account zapisany: ${parsed.client_email}`);
              setSaJson('');
            } catch { toast.error('Błąd parsowania JSON'); }
            finally { setSavingSa(false); }
          }} disabled={savingSa} className="gap-2">
            {savingSa ? <><Loader2 className="w-4 h-4 animate-spin" />Zapisuję...</> : <><Save className="w-4 h-4" />Zapisz Service Account</>}
          </Button>
        </div>
      </div>

      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /><h2 className="font-semibold">TextBee SMS</h2></div>
        <p className="text-xs text-muted-foreground">
          Wpisz klucz API i Device ID z <a href="https://textbee.dev" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">textbee.dev <ExternalLink className="w-3 h-3" /></a> żeby wysyłać SMS-y bezpośrednio z aplikacji.
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>API Key</Label>
            <Input value={tbApiKey} onChange={e => setTbApiKey(e.target.value)} placeholder="tb_xxxxxxxxxxxxxxxx" className="font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label>Device ID</Label>
            <Input value={tbDeviceId} onChange={e => setTbDeviceId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="font-mono text-xs" />
          </div>
          <Button onClick={async () => {
            setSavingTextBee(true);
            try { await saveTextBee(tbApiKey.trim(), tbDeviceId.trim()); toast.success('TextBee zapisany'); }
            catch { toast.error('Błąd zapisu'); } finally { setSavingTextBee(false); }
          }} disabled={savingTextBee} className="gap-2">
            {savingTextBee ? <><Loader2 className="w-4 h-4 animate-spin" />Zapisuję...</> : <><Save className="w-4 h-4" />Zapisz</>}
          </Button>
        </div>
        {textBeeApiKey && textBeeDeviceId ? (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">✅ TextBee skonfigurowany</div>
        ) : (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">ℹ️ Brak konfiguracji — SMS-y będą otwierać aplikację telefonu</div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
