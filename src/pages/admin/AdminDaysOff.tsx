import { useState } from 'react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { CalendarOff, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { useEmployees } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const AdminDaysOff = () => {
  const { employees, loading, updateEmployee } = useEmployees();
  const { employee: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const visibleEmployees = employees.filter(e => (e.role || 'pracownik') !== 'salon');

  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [newDayOff, setNewDayOff] = useState('');
  const [saving, setSaving] = useState(false);

  const empId = isAdmin ? selectedEmpId || visibleEmployees[0]?.id || '' : currentUser?.id || '';
  const emp = employees.find(e => e.id === empId);

  const handleAdd = async () => {
    if (!newDayOff || !emp) return;
    setSaving(true);
    try {
      const current = emp.daysOff || [];
      if (!current.includes(newDayOff)) {
        await updateEmployee(emp.id, { daysOff: [...current, newDayOff].sort() });
        toast.success('Dzień wolny dodany');
      }
      setNewDayOff('');
    } catch { toast.error('Błąd zapisu'); }
    setSaving(false);
  };

  const handleRemove = async (dateStr: string) => {
    if (!emp) return;
    try {
      await updateEmployee(emp.id, { daysOff: (emp.daysOff || []).filter(d => d !== dateStr) });
      toast.success('Dzień wolny usunięty');
    } catch { toast.error('Błąd zapisu'); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <CalendarOff className="w-6 h-6 text-primary" />
          Dni wolne
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Zaplanuj nieobecności — w tych dniach rezerwacje będą zablokowane</p>
      </div>

      <div className="glass-card p-6 space-y-5">
        {isAdmin && visibleEmployees.length > 1 && (
          <div className="space-y-1.5">
            <Label>Pracownik</Label>
            <NativeSelect
              value={selectedEmpId || visibleEmployees[0]?.id || ''}
              onChange={e => setSelectedEmpId(e.target.value)}
              className="w-full"
            >
              {visibleEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </NativeSelect>
          </div>
        )}

        {!isAdmin && (
          <p className="text-sm font-medium">{emp?.name}</p>
        )}

        <div className="space-y-1.5">
          <Label>Dodaj dzień wolny</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              value={newDayOff}
              onChange={e => setNewDayOff(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="flex-1"
            />
            <Button onClick={handleAdd} disabled={!newDayOff || saving} className="shrink-0 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Dodaj
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Zaplanowane dni wolne</Label>
          {(emp?.daysOff || []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Brak zaplanowanych dni wolnych</p>
          ) : (
            <div className="space-y-1">
              {(emp?.daysOff || []).map(dateStr => (
                <div key={dateStr} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50 text-sm">
                  <span className="font-medium capitalize">
                    {format(new Date(dateStr + 'T12:00:00'), 'EEEE, d MMMM yyyy', { locale: pl })}
                  </span>
                  <button
                    onClick={() => handleRemove(dateStr)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-3"
                    title="Usuń"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDaysOff;
