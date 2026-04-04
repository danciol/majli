import { useState, useMemo } from 'react';
import { useClients, useAppointments, useServices } from '@/hooks/useFirestore';
import { Users, Search, Loader2, Phone, Mail, Calendar, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const AdminClients = () => {
  const { clients, loading: loadingC, addClient } = useClients();
  const { appointments, loading: loadingA } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const loading = loadingC || loadingA || loadingS;

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const getClientAppointments = (clientName: string, clientPhone: string) => {
    return appointments.filter(a =>
      a.clientName === clientName || (clientPhone && a.clientPhone === clientPhone)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleAddClient = async () => {
    if (!newName.trim()) return;
    await addClient({
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim(),
      appointmentIds: [],
    });
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setShowAddDialog(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Klienci ({clients.length})
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Szukaj klienta..."
              className="pl-9"
            />
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-1.5">
            <Plus className="w-4 h-4" /> Dodaj klienta
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {search ? 'Nie znaleziono klientów' : 'Brak klientów w bazie'}
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((client) => {
            const clientAppts = getClientAppointments(client.name, client.phone);
            const lastAppt = clientAppts[0];
            const lastService = lastAppt ? services.find(s => s.id === lastAppt.serviceId) : null;
            const isExpanded = expandedId === client.id;

            return (
              <div key={client.id} className="glass-card p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-heading font-semibold text-foreground mb-2">{client.name}</h3>
                  {clientAppts.length > 0 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : client.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 text-sm">
                  {client.phone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-3.5 h-3.5" /> {client.phone}
                    </p>
                  )}
                  {client.email && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" /> {client.email}
                    </p>
                  )}
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Wizyt: {clientAppts.length}
                  </p>
                  {lastAppt && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Ostatnia: {format(new Date(lastAppt.date), 'd MMM yyyy', { locale: pl })}
                      {lastService && ` · ${lastService.name}`}
                    </p>
                  )}
                </div>

                {isExpanded && clientAppts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Historia wizyt</p>
                    {clientAppts.map(appt => {
                      const svc = services.find(s => s.id === appt.serviceId);
                      return (
                        <div key={appt.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-secondary/40">
                          <div>
                            <span className="font-medium">{svc?.name || 'Wizyta'}</span>
                            <span className="text-muted-foreground ml-2">
                              {format(new Date(appt.date), 'd MMM yyyy, HH:mm', { locale: pl })}
                            </span>
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            appt.status === 'completed' ? 'bg-green-100 text-green-700' :
                            appt.status === 'confirmed' ? 'bg-primary/10 text-primary' :
                            appt.status === 'cancelled' ? 'bg-destructive/10 text-destructive' :
                            'bg-accent/10 text-accent-foreground'
                          }`}>
                            {appt.status === 'completed' ? 'Zakończona' :
                             appt.status === 'confirmed' ? 'Potwierdzona' :
                             appt.status === 'cancelled' ? 'Anulowana' : 'Oczekuje'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Dodaj klienta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Imię i nazwisko *</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jan Kowalski" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="+48 600 100 200" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Anuluj</Button>
              <Button onClick={handleAddClient} disabled={!newName.trim()}>Dodaj</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminClients;
