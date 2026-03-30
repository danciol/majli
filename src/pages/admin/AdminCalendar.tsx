import { useState, useRef } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Upload, FileUp, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockAppointments, mockServices, mockEmployees, Appointment } from '@/data/services';
import { parseICSFile } from '@/lib/icsParser';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const hours = Array.from({ length: 12 }, (_, i) => i + 8);

const AdminCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [importedAppointments, setImportedAppointments] = useState<Partial<Appointment>[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>(mockAppointments);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingImport, setPendingImport] = useState<Partial<Appointment>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.ics')) {
      toast.error('Wybierz plik w formacie .ics');
      return;
    }

    try {
      const text = await file.text();
      const events = parseICSFile(text);
      
      if (events.length === 0) {
        toast.error('Nie znaleziono wydarzeń w pliku');
        return;
      }

      // Filter out duplicates by UID
      const existingUIDs = new Set(
        allAppointments.map(a => a.googleCalendarEventId).filter(Boolean)
      );
      const newEvents = events.filter(
        e => !e.googleCalendarEventId || !existingUIDs.has(e.googleCalendarEventId)
      );

      if (newEvents.length === 0) {
        toast.info('Wszystkie wydarzenia z pliku już istnieją w kalendarzu');
        return;
      }

      setPendingImport(newEvents);
      setShowImportDialog(true);
    } catch {
      toast.error('Błąd podczas odczytywania pliku');
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmImport = () => {
    const newAppts = pendingImport.map(p => ({
      ...p,
      serviceId: p.serviceId || '',
      employeeId: p.employeeId || '',
      clientName: p.clientName || 'Wydarzenie',
      clientPhone: p.clientPhone || '',
      clientEmail: p.clientEmail || '',
      date: p.date || new Date().toISOString(),
      duration: p.duration || 60,
      status: p.status || 'confirmed',
      id: p.id || '',
      createdAt: p.createdAt || new Date().toISOString(),
    })) as Appointment[];

    setAllAppointments(prev => [...prev, ...newAppts]);
    setImportedAppointments(prev => [...prev, ...pendingImport]);
    setPendingImport([]);
    setShowImportDialog(false);
    toast.success(`Zaimportowano ${newAppts.length} wydarzeń`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl font-bold">Kalendarz</h1>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics"
            onChange={handleFileUpload}
            className="hidden"
            id="ics-upload"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Importuj .ics
          </Button>
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
                const dayAppts = allAppointments.filter((a) => {
                  const aDate = new Date(a.date);
                  return isSameDay(aDate, day) && aDate.getHours() === hour;
                });
                return (
                  <div key={day.toISOString()} className="border-l border-border/50 p-0.5 relative">
                    {dayAppts.map((a) => {
                      const service = mockServices.find(s => s.id === a.serviceId);
                      const isImported = !a.serviceId;
                      return (
                        <div
                          key={a.id}
                          className={`rounded px-2 py-1 text-xs truncate cursor-pointer transition-colors ${
                            isImported
                              ? 'bg-accent/15 text-accent-foreground hover:bg-accent/25 border-l-2 border-accent'
                              : 'bg-primary/15 text-primary hover:bg-primary/25'
                          }`}
                          title={`${a.clientName}${service ? ` - ${service.name}` : ''}${a.notes ? `\n${a.notes}` : ''}`}
                        >
                          <p className="font-semibold truncate">{a.clientName}</p>
                          <p className="truncate opacity-70">
                            {service?.name || `${a.duration} min`}
                          </p>
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

      {/* Import confirmation dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" />
              Import kalendarza
            </DialogTitle>
            <DialogDescription>
              Znaleziono {pendingImport.length} wydarzeń do zaimportowania
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {pendingImport.map((event, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{event.clientName}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.date && format(new Date(event.date), 'EEEE, d MMMM yyyy · HH:mm', { locale: pl })}
                    {' · '}{event.duration} min
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Anuluj
            </Button>
            <Button onClick={confirmImport} className="bg-primary text-primary-foreground">
              Importuj {pendingImport.length} wydarzeń
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCalendar;
