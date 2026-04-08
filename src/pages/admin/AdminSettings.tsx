import { useState, useEffect } from 'react';
import { Settings, CreditCard, Loader2, Save } from 'lucide-react';
import { useSettings } from '@/hooks/useFirestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const AdminSettings = () => {
  const { depositAmount, loading, saveDepositAmount } = useSettings();
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setValue(depositAmount > 0 ? String(depositAmount) : '');
    }
  }, [depositAmount, loading]);

  const handleSave = async () => {
    const amount = Number(value);
    if (value !== '' && (isNaN(amount) || amount < 0)) {
      toast.error('Podaj prawidłową kwotę');
      return;
    }
    setSaving(true);
    try {
      await saveDepositAmount(amount);
      toast.success(amount > 0 ? `Zaliczka ustawiona na ${amount} zł` : 'Zaliczka wyłączona');
    } catch {
      toast.error('Błąd zapisu ustawień');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Ustawienia
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Globalne ustawienia salonu</p>
      </div>

      <div className="glass-card p-6 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Zaliczka przy rezerwacji</h2>
        </div>

        <div className="space-y-2">
          <Label>Wysokość zaliczki (zł)</Label>
          <div className="flex gap-3">
            <Input
              type="number"
              min="0"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="np. 50"
              className="max-w-[160px]"
            />
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Zapisuję...</>
                : <><Save className="w-4 h-4" /> Zapisz</>
              }
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {value && Number(value) > 0
              ? `Klientka zapłaci ${value} zł zaliczki przy każdej rezerwacji online`
              : 'Wpisz 0 lub zostaw puste — rezerwacja bez zaliczki'
            }
          </p>
        </div>

        {depositAmount > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
            ✅ Aktualnie aktywna zaliczka: <strong>{depositAmount} zł</strong>
          </div>
        )}
        {depositAmount === 0 && (
          <div className="p-3 rounded-lg bg-secondary/50 border border-border text-sm text-muted-foreground">
            ℹ️ Zaliczka wyłączona — klientki rezerwują bez płatności
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettings;
