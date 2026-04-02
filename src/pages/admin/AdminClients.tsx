import { useState, useMemo } from 'react';
import { useClients } from '@/hooks/useFirestore';
import { useAppointments, useServices } from '@/hooks/useFirestore';
import { Users, Search, Loader2, Phone, Mail, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const AdminClients = () => {
  const { clients, loading: loadingC } = useClients();
  const { appointments, loading: loadingA } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const [search, setSearch] = useState('');

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
      a.clientName === clientName || a.clientPhone === clientPhone
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          Klienci ({clients.length})
        </h1>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj klienta..."
            className="pl-9"
          />
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

            return (
              <div key={client.id} className="glass-card p-5">
                <h3 className="font-heading font-semibold text-foreground mb-2">{client.name}</h3>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminClients;
