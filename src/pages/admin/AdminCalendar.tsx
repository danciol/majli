import { useState } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockAppointments, mockServices, mockEmployees } from '@/data/services';

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8:00 - 19:00

const AdminCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Kalendarz</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {format(weekDays[0], 'd MMM', { locale: pl })} – {format(weekDays[6], 'd MMM yyyy', { locale: pl })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addDays(d, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="glass-card overflow-auto">
        <div className="min-w-[700px]">
          {/* Header */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div className="p-2" />
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`p-3 text-center text-sm border-l border-border ${
                  isSameDay(day, new Date()) ? 'bg-primary/10 font-bold' : ''
                }`}
              >
                <p className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: pl })}</p>
                <p className="font-semibold">{format(day, 'd')}</p>
              </div>
            ))}
          </div>

          {/* Time grid */}
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50 min-h-[60px]">
              <div className="p-2 text-xs text-muted-foreground text-right pr-3 pt-1">
                {hour}:00
              </div>
              {weekDays.map((day) => {
                const dayAppts = mockAppointments.filter((a) => {
                  const aDate = new Date(a.date);
                  return isSameDay(aDate, day) && aDate.getHours() === hour;
                });
                return (
                  <div key={day.toISOString()} className="border-l border-border/50 p-0.5 relative">
                    {dayAppts.map((a) => {
                      const service = mockServices.find(s => s.id === a.serviceId);
                      return (
                        <div
                          key={a.id}
                          className="bg-primary/15 text-primary rounded px-2 py-1 text-xs truncate cursor-pointer hover:bg-primary/25 transition-colors"
                          title={`${a.clientName} - ${service?.name}`}
                        >
                          <p className="font-semibold truncate">{a.clientName}</p>
                          <p className="truncate opacity-70">{service?.name}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminCalendar;
