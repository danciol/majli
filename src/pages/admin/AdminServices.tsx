import { useState } from 'react';
import { categories } from '@/data/services';
import type { Service } from '@/data/services';
import { useServices } from '@/hooks/useFirestore';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const AdminServices = () => {
  const { services, loading, addService, updateService, deleteService } = useServices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState({ name: '', category: 'manicure', price: '', duration: '', description: '' });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', category: 'manicure', price: '', duration: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, category: s.category, price: String(s.price), duration: String(s.duration), description: s.description });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.duration) {
      toast.error('Wypełnij wszystkie wymagane pola');
      return;
    }
    try {
      if (editing) {
        await updateService(editing.id, { name: form.name, category: form.category, price: Number(form.price), duration: Number(form.duration), description: form.description });
        toast.success('Usługa zaktualizowana');
      } else {
        await addService({
          name: form.name,
          category: form.category,
          price: Number(form.price),
          duration: Number(form.duration),
          description: form.description,
          employeeIds: [],
          active: true,
        });
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

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Usługi</h1>
        <Button onClick={openNew} className="bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Dodaj usługę
        </Button>
      </div>

      {categories.map((cat) => {
        const catServices = services.filter(s => s.category === cat.id);
        if (catServices.length === 0) return null;
        return (
          <div key={cat.id} className="glass-card p-6">
            <h2 className="font-heading text-lg font-semibold mb-4">
              {cat.icon} {cat.name}
            </h2>
            <div className="space-y-2">
              {catServices.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.duration} min &middot; {s.price} zł</p>
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
        );
      })}

      {services.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Brak usług. Dodaj pierwszą usługę.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edytuj usługę' : 'Dodaj usługę'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Nazwa</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Kategoria</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <Label>Opis</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
