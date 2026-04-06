import { useState } from 'react';
import type { Service } from '@/data/services';
import { categories } from '@/data/services';
import { useServices, useEmployees } from '@/hooks/useFirestore';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const AdminServices = () => {
  const { services, loading, addService, updateService, deleteService } = useServices();
  const { employees, loading: loadingE } = useEmployees();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: '', price: '', duration: '', category: '', description: '', employeeIds: [] as string[], selfBooking: true });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', price: '', duration: '', category: '', description: '', employeeIds: [], selfBooking: true });
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name,
      price: String(s.price),
      duration: String(s.duration),
      employeeIds: s.employees || s.employeeIds || [],
      selfBooking: s.selfBooking !== false,
    });
    setDialogOpen(true);
  };

  const toggleEmployee = (empId: string) => {
    setForm(f => ({
      ...f,
      employeeIds: f.employeeIds.includes(empId)
        ? f.employeeIds.filter(id => id !== empId)
        : [...f.employeeIds, empId],
    }));
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.duration) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }
    try {
      const data = {
        name: form.name,
        price: Number(form.price),
        duration: Number(form.duration),
        employees: form.employeeIds,
        selfBooking: form.selfBooking,
      };
      if (editing) {
        await updateService(editing.id, data);
        toast.success('Usługa zaktualizowana');
      } else {
        await addService(data as Omit<Service, 'id'>);
        toast.success('Usługa dodana');
      }
      setDialogOpen(false);
    } catch {
      toast.error('Błąd zapisu');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteService(id);
      toast.success('Usługa usunięta');
    } catch {
      toast.error('Błąd usuwania');
    }
  };

  const getEmployeeNames = (s: Service) => {
    const ids = s.employees || s.employeeIds || [];
    return ids.map(id => employees.find(e => e.id === id)?.name).filter(Boolean).join(', ');
  };

  if (loading || loadingE) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Usługi</h1>
        <Button onClick={openNew} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Dodaj usługę
        </Button>
      </div>

      <div className="glass-card p-6">
        <div className="space-y-2">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
              <div>
                <p className="font-medium text-sm">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.duration} min · {s.price} zł
                  {getEmployeeNames(s) && ` · ${getEmployeeNames(s)}`}
                  {s.selfBooking !== false && ' · 🌐 Online'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {services.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Brak usług. Dodaj pierwszą usługę.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edytuj usługę' : 'Dodaj usługę'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nazwa</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cena (zł)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <Label>Czas (min)</Label>
                <Input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Przypisani pracownicy</Label>
              <div className="space-y-2">
                {employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.employeeIds.includes(emp.id)}
                      onCheckedChange={() => toggleEmployee(emp.id)}
                    />
                    <span className="text-sm">{emp.name}</span>
                  </label>
                ))}
                {employees.length === 0 && <p className="text-xs text-muted-foreground">Brak pracowników</p>}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={form.selfBooking}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, selfBooking: !!checked }))}
                />
                <span className="text-sm">Klient może sam się umówić online</span>
              </label>
              <p className="text-xs text-muted-foreground mt-1">Usługa będzie widoczna w rezerwacji online na stronie</p>
            </div>
            <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground">
              {editing ? 'Zapisz zmiany' : 'Dodaj usługę'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminServices;
