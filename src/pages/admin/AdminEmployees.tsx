import { useState } from 'react';
import type { Employee } from '@/data/services';
import { useEmployees } from '@/hooks/useFirestore';
import { Plus, Edit2, Trash2, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const AdminEmployees = () => {
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState({ name: '' });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '' });
    setDialogOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({ name: e.name });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Wprowadź imię'); return; }
    try {
      if (editing) {
        await updateEmployee(editing.id, { name: form.name });
        toast.success('Pracownik zaktualizowany');
      } else {
        await addEmployee({
          name: form.name, photo: '', services: [],
          workingHours: {
            mon: { start: '09:00', end: '17:00' },
            tue: { start: '09:00', end: '17:00' },
            wed: { start: '09:00', end: '17:00' },
            thu: { start: '09:00', end: '17:00' },
            fri: { start: '09:00', end: '17:00' },
          },
          daysOff: [],
        });
        toast.success('Pracownik dodany');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Błąd zapisu');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEmployee(id);
      toast.success('Pracownik usunięty');
    } catch {
      toast.error('Błąd usuwania');
    }
  };

  const dayLabels: Record<string, string> = {
    mon: 'Pon', tue: 'Wt', wed: 'Śr', thu: 'Czw', fri: 'Pt', sat: 'Sob', sun: 'Nd',
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Pracownicy</h1>
        <Button onClick={openNew} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Dodaj pracownika
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {employees.map((emp) => (
          <div key={emp.id} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-semibold">{emp.name}</h3>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(emp.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {emp.workingHours && (
              <div className="mb-3">
                <p className="text-xs text-muted-foreground font-medium mb-1.5">Godziny pracy</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(emp.workingHours).map(([day, h]) => {
                    const label = dayLabels[day] || day;
                    const display = typeof h === 'string' ? h : (h && typeof h === 'object' && 'start' in h) ? `${h.start}-${h.end}` : '';
                    return (
                      <span key={day} className="text-xs bg-secondary px-2 py-1 rounded">
                        {label}: {display}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Usługi: {emp.services?.length ?? 0}
            </p>
          </div>
        ))}
      </div>

      {employees.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Brak pracowników. Dodaj pierwszego pracownika.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edytuj pracownika' : 'Dodaj pracownika'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Imię i nazwisko</Label>
              <Input value={form.name} onChange={e => setForm({ name: e.target.value })} />
            </div>
            <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground">
              {editing ? 'Zapisz' : 'Dodaj'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmployees;
