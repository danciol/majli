import { useState } from 'react';
import type { Employee } from '@/data/services';
import { useEmployees } from '@/hooks/useFirestore';
import { Plus, Edit2, Trash2, User, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as fbSignIn,
  updatePassword,
  deleteUser,
  signOut as fbSignOut,
} from 'firebase/auth';
import { salonConfig } from '@/config/salon';
import { loginToEmail } from '@/lib/auth';

const DAYS = [
  { key: 'monday', label: 'Poniedziałek' },
  { key: 'tuesday', label: 'Wtorek' },
  { key: 'wednesday', label: 'Środa' },
  { key: 'thursday', label: 'Czwartek' },
  { key: 'friday', label: 'Piątek' },
  { key: 'saturday', label: 'Sobota' },
  { key: 'sunday', label: 'Niedziela' },
];

const dayLabelsShort: Record<string, string> = {
  monday: 'Pon', tuesday: 'Wt', wednesday: 'Śr', thursday: 'Czw',
  friday: 'Pt', saturday: 'Sob', sunday: 'Nd',
  mon: 'Pon', tue: 'Wt', wed: 'Śr', thu: 'Czw',
  fri: 'Pt', sat: 'Sob', sun: 'Nd',
};

interface EmployeeForm {
  name: string;
  login: string;
  password: string;
  role: string;
  workingHours: Record<string, string>;
  daysOff: string;
  canViewCalendars: string[];
}

const defaultWorkingHours: Record<string, string> = {
  monday: '9:00-17:00',
  tuesday: '9:00-17:00',
  wednesday: '9:00-17:00',
  thursday: '9:00-17:00',
  friday: '9:00-17:00',
  saturday: 'wolne',
  sunday: 'wolne',
};

// Use a secondary Firebase app to create/update/delete auth accounts
// without affecting the currently logged-in admin session.
async function withSecondaryAuth<T>(fn: (secondaryAuth: ReturnType<typeof getAuth>) => Promise<T>): Promise<T> {
  const appName = `emp-op-${Date.now()}`;
  const secondaryApp = initializeApp(salonConfig.firebase, appName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    return await fn(secondaryAuth);
  } finally {
    await fbSignOut(secondaryAuth).catch(() => {});
    await deleteApp(secondaryApp).catch(() => {});
  }
}

const AdminEmployees = () => {
  const { employees, loading, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmployeeForm>({
    name: '', login: '', password: '', role: 'pracownik',
    workingHours: { ...defaultWorkingHours }, daysOff: '', canViewCalendars: [],
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      name: '', login: '', password: '', role: 'pracownik',
      workingHours: { ...defaultWorkingHours }, daysOff: '', canViewCalendars: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    const wh: Record<string, string> = {};
    for (const [day, val] of Object.entries(e.workingHours)) {
      wh[day] = typeof val === 'string' ? val : `${val.start}-${val.end}`;
    }
    setForm({
      name: e.name,
      login: e.login || '',
      password: '',
      role: e.role || 'pracownik',
      workingHours: wh,
      daysOff: (e.daysOff || []).join(', '),
      canViewCalendars: e.canViewCalendars || [],
    });
    setDialogOpen(true);
  };

  const setWH = (day: string, value: string) => {
    setForm(f => ({ ...f, workingHours: { ...f.workingHours, [day]: value } }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Wprowadź imię'); return; }
    if (!editing) {
      if (!form.login.trim()) { toast.error('Wprowadź login'); return; }
      if (!form.password.trim()) { toast.error('Wprowadź hasło'); return; }
      if (form.password.length < 6) { toast.error('Hasło musi mieć minimum 6 znaków'); return; }
    }

    setSaving(true);
    try {
      const daysOff = form.daysOff.split(',').map(s => s.trim()).filter(Boolean);

      if (editing) {
        // Update Firestore data
        const data: Partial<Employee> = {
          name: form.name,
          role: form.role as Employee['role'],
          workingHours: form.workingHours,
          daysOff,
          canViewCalendars: form.canViewCalendars,
        };

        // If new password provided, update Firebase Auth
        if (form.password.trim()) {
          if (form.password.length < 6) { toast.error('Hasło musi mieć minimum 6 znaków'); setSaving(false); return; }
          const empLogin = editing.login || '';
          const empEmail = editing.email || loginToEmail(empLogin);
          const storedPassword = editing.password || '';

          try {
            await withSecondaryAuth(async (secondaryAuth) => {
              const cred = await fbSignIn(secondaryAuth, empEmail, storedPassword);
              await updatePassword(cred.user, form.password);
            });
            data.password = form.password;
          } catch {
            toast.warning('Dane zaktualizowane, ale zmiana hasła nie powiodła się — stare hasło mogło być inne');
          }
        }

        await updateEmployee(editing.id, data);
        toast.success('Pracownik zaktualizowany');
      } else {
        // New employee — create Firebase Auth account
        const email = loginToEmail(form.login);
        await withSecondaryAuth(async (secondaryAuth) => {
          await createUserWithEmailAndPassword(secondaryAuth, email, form.password);
        });

        await addEmployee({
          name: form.name,
          email,
          login: form.login.toLowerCase().trim(),
          password: form.password,
          role: form.role,
          workingHours: form.workingHours,
          daysOff,
          canViewCalendars: [],
        });
        toast.success('Pracownik dodany');
      }

      setDialogOpen(false);
    } catch (e: any) {
      if (e?.code === 'auth/email-already-in-use') toast.error('Login jest już zajęty');
      else if (e?.code === 'auth/weak-password') toast.error('Hasło musi mieć minimum 6 znaków');
      else if (e?.code === 'auth/invalid-credential') toast.error('Błąd autoryzacji — sprawdź dane pracownika');
      else toast.error('Błąd zapisu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const emp = employees.find(e => e.id === id);
    try {
      // Try to delete Firebase Auth account
      if (emp?.login && emp?.password) {
        const empEmail = emp.email || loginToEmail(emp.login);
        await withSecondaryAuth(async (secondaryAuth) => {
          const cred = await fbSignIn(secondaryAuth, empEmail, emp.password!);
          await deleteUser(cred.user);
        }).catch(() => {
          // If Firebase Auth deletion fails, continue — Firestore record will be removed
        });
      }
      await deleteEmployee(id);
      toast.success('Pracownik usunięty');
    } catch {
      toast.error('Błąd usuwania');
    }
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
                <div>
                  <h3 className="font-heading font-semibold">{emp.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{emp.role || 'pracownik'}</p>
                  {emp.login && <p className="text-xs text-muted-foreground font-mono">@{emp.login}</p>}
                </div>
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
                    const label = dayLabelsShort[day] || day;
                    const display = typeof h === 'string' ? h : `${h.start}-${h.end}`;
                    return (
                      <span key={day} className="text-xs bg-secondary px-2 py-1 rounded">
                        {label}: {display}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {emp.daysOff && emp.daysOff.length > 0 && (
              <p className="text-xs text-muted-foreground">Dni wolne: {emp.daysOff.length}</p>
            )}
          </div>
        ))}
      </div>

      {employees.length === 0 && (
        <p className="text-center text-muted-foreground py-12">Brak pracowników. Dodaj pierwszego pracownika.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Edytuj pracownika' : 'Dodaj pracownika'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Imię i nazwisko</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Rola</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="pracownik">Pracownik</SelectItem>
                  <SelectItem value="salon">Salon (recepcja)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Login</Label>
                {editing ? (
                  <div className="flex items-center h-10 px-3 rounded-md border border-border bg-secondary/50 text-sm font-mono text-muted-foreground">
                    {editing.login || '—'}
                  </div>
                ) : (
                  <Input
                    value={form.login}
                    onChange={e => setForm(f => ({ ...f, login: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                    placeholder="np. anna"
                    autoCapitalize="none"
                  />
                )}
              </div>
              <div>
                <Label>{editing ? 'Nowe hasło (opcjonalne)' : 'Hasło'}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder={editing ? 'Zostaw puste — bez zmian' : 'Min. 6 znaków'}
                />
              </div>
            </div>

            {!editing && (
              <p className="text-xs text-muted-foreground -mt-2">
                Login będzie służył do logowania. Konto zostanie automatycznie utworzone w systemie.
              </p>
            )}

            {form.role !== 'salon' && (
              <>
                <div>
                  <Label className="mb-2 block">Godziny pracy</Label>
                  <div className="space-y-2">
                    {DAYS.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-sm w-28 shrink-0">{label}</span>
                        <Input
                          value={form.workingHours[key] || ''}
                          onChange={e => setWH(key, e.target.value)}
                          placeholder="np. 9:00-17:00 lub wolne"
                          className="text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Dni wolne (daty oddzielone przecinkami, np. 2026-04-11, 2026-04-25)</Label>
                  <Input
                    value={form.daysOff}
                    onChange={e => setForm(f => ({ ...f, daysOff: e.target.value }))}
                    placeholder="2026-04-11, 2026-04-25"
                  />
                </div>
              </>
            )}

            {form.role === 'pracownik' && (
              <div>
                <Label className="mb-2 block">Widoczność kalendarzy</Label>
                <p className="text-xs text-muted-foreground mb-2">Wybierz których pracowników kalendarze może przeglądać</p>
                <div className="space-y-2">
                  {employees.filter(e => e.id !== editing?.id && (e.role || 'pracownik') !== 'salon').map(emp => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.canViewCalendars.includes(emp.id)}
                        onCheckedChange={(checked) => {
                          setForm(f => ({
                            ...f,
                            canViewCalendars: checked
                              ? [...f.canViewCalendars, emp.id]
                              : f.canViewCalendars.filter(id => id !== emp.id),
                          }));
                        }}
                      />
                      {emp.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Zapisuję...</> : (editing ? 'Zapisz' : 'Dodaj pracownika')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminEmployees;
