import { mockAppointments, mockServices, mockEmployees } from '@/data/services';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Eye } from 'lucide-react';

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

const AdminAppointments = () => {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Wizyty</h1>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Klient</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Usługa</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Pracownik</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {mockAppointments.map((appt) => {
                const service = mockServices.find(s => s.id === appt.serviceId);
                const employee = mockEmployees.find(e => e.id === appt.employeeId);
                return (
                  <tr key={appt.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-3">
                      <p className="font-medium">{format(new Date(appt.date), 'd MMM yyyy', { locale: pl })}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(appt.date), 'HH:mm')}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{appt.clientName}</p>
                      <p className="text-xs text-muted-foreground">{appt.clientPhone}</p>
                    </td>
                    <td className="p-3">
                      <p>{service?.name}</p>
                      <p className="text-xs text-muted-foreground">{appt.duration} min &middot; {service?.price} zł</p>
                    </td>
                    <td className="p-3">{employee?.name}</td>
                    <td className="p-3">
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[appt.status]}`}>
                        {statusLabels[appt.status]}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Potwierdź">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Anuluj">
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminAppointments;
