import { useMemo } from 'react';
import { Calendar, Users, Scissors, Clock, TrendingUp } from 'lucide-react';
import { useAppointments, useServices, useEmployees } from '@/hooks/useFirestore';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

const statusLabels: Record<string, string> = {
  pending: 'Oczekuje',
  confirmed: 'Potwierdzona',
  cancelled: 'Anulowana',
  completed: 'Zakończona',
};

const statusColors: Record<string, string> = {
  pending: 'bg-accent/20 text-accent-foreground',
  confirmed: 'bg-primary/15 text-primary',
  cancelled: 'bg-destructive/15 text-destructive',
  completed: 'bg-green-100 text-green-700',
};

const AdminDashboard = () => {
  const { appointments, loading: loadingA } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const { employees, loading: loadingE } = useEmployees();

  const loading = loadingA || loadingS || loadingE;
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  const todayAppointments = useMemo(
    () => appointments.filter(a => a.date.startsWith(todayStr)),
    [appointments, todayStr]
  );

  const stats = [
    { label: 'Wizyty dziś', value: todayAppointments.length, icon: Calendar, color: 'text-primary' },
    { label: 'Usługi', value: services.length, icon: Scissors, color: 'text-accent' },
    { label: 'Pracownicy', value: employees.length, icon: Users, color: 'text-gold' },
    { label: 'Wszystkie wizyty', value: appointments.length, icon: TrendingUp, color: 'text-green-600' },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {format(today, "EEEE, d MMMM yyyy", { locale: pl })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Dzisiejsze wizyty
        </h2>
        {todayAppointments.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">Brak wizyt na dziś</p>
        ) : (
          <div className="space-y-3">
            {todayAppointments.map((appt) => {
              const service = services.find(s => s.id === appt.serviceId);
              const employee = employees.find(e => e.id === appt.employeeId);
              return (
                <div key={appt.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[50px]">
                      <p className="text-sm font-bold">{format(new Date(appt.date), 'HH:mm')}</p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{appt.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {service?.name} &middot; {employee?.name} &middot; {appt.duration} min
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[appt.status]}`}>
                    {statusLabels[appt.status]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
