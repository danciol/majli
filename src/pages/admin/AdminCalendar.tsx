import { useState, useRef } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Upload, FileUp, CheckCircle2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Appointment } from '@/data/services';
import { useAppointments, useServices, useEmployees } from '@/hooks/useFirestore';
import { useAuth } from '@/contexts/AuthContext';
import { parseICSFile } from '@/lib/icsParser';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import AppointmentDialog from '@/components/admin/AppointmentDialog';

const hours = Array.from({ length: 13 }, (_, i) => i + 8);

const statusColors: Record<string, string> = {
  pending: 'bg-accent/20 border-accent text-accent-foreground',
  confirmed: 'bg-primary/15 border-primary text-primary',
  cancelled: 'bg-destructive/15 border-destructive text-destructive',
  completed: 'bg-green-500/15 border-green-500 text-green-700',
};

const AdminCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { appointments, loading: loadingA, addAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const { services, loading: loadingS } = useServices();
  const { employees, loading: loadingE } = useEmployees();
  const { employee: currentUser } = useAuth();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingImport, setPendingImport] = useState<Partial<Appointment>[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [rawIcsText, setRawIcsText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [apptDialogOpen, setApptDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [newApptDate, setNewApptDate] = useState<Date | null>(null);

  // Filter by selected visible employee
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');

  const isAdmin = currentUser?.role === 'admin';

  // Which employees this user can see
  const visibleEmployees = isAdmin
    ? employees
    : employees.filter(e =>
        e.id === currentUser?.id ||
        (currentUser?.canViewCalendars || []).includes(e.id)
      );

  // Filter appointments
  const filteredAppointments = appointments.filter(a => {
    const visibleIds = visibleEmployees.map(e => e.id);
    if (!visibleIds.includes(a.employeeId)) return false;
    if (filterEmployeeId !== 'all' && a.employeeId !== filterEmployeeId) return false;
    return true;
  });

  const loading = loadingA || loadingS || loadingE;
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.ics')) { toast.error('Wybierz plik w formacie .ics'); return; }
    try {
      const text = await file.text();
      setRawIcsText(text);
      // Show employee selection dialog first
      setSelectedEmployeeId(employees.length > 0 ? employees[0].id : '');
      setShowImportDialog(true);
      // Parse with default employee for preview
      const events = parseICSFile(text, services, employees.length > 0 ? employees[0].id : '');
      if (events.length === 0) { toast.error('Nie znaleziono wydarzeń w pliku'); setShowImportDialog(false); return; }
      const existingUIDs = new Set(appointments.map(a => a.googleCalendarEventId).filter(Boolean));
      const newEvents = events.filter(ev => !ev.googleCalendarEventId || !existingUIDs.has(ev.googleCalendarEventId));
      if (newEvents.length === 0) { toast.info('Wszystkie wydarzenia już istnieją'); setShowImportDialog(false); return; }
      setPendingImport(newEvents);
    } catch { toast.error('Błąd podczas odczytywania pliku'); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleEmployeeChange = (empId: string) => {
    setSelectedEmployeeId(empId);
    // Re-parse with new employee
    if (rawIcsText) {
      const events = parseICSFile(rawIcsText, services, empId);
      const existingUIDs = new Set(appointments.map(a => a.googleCalendarEventId).filter(Boolean));
      const newEvents = events.filter(ev => !ev.googleCalendarEventId || !existingUIDs.has(ev.googleCalendarEventId));
      setPendingImport(newEvents);
    }
  };

  const confirmImport = async () => {
    if (!selectedEmployeeId) { toast.error('Wybierz pracownika'); return; }
    try {
      let imported = 0;
      for (const p of pendingImport) {
        const apptData: Omit<Appointment, 'id'> = {
          serviceId: p.serviceId || '',
          employeeId: selectedEmployeeId,
          clientName: p.clientName || 'Klient',
          clientPhone: p.clientPhone || '',
          clientEmail: p.clientEmail || '',
          date: p.date || new Date().toISOString(),
          duration: p.duration || 60,
          status: (p.status as Appointment['status']) || 'confirmed',
          createdAt: p.createdAt || new Date().toISOString(),
        };
        if (p.googleCalendarEventId) apptData.googleCalendarEventId = p.googleCalendarEventId;
        if (p.notes) apptData.notes = p.notes;
        await addAppointment(apptData);
        imported++;
      }
      setPendingImport([]);
      setShowImportDialog(false);
      setRawIcsText('');
      toast.success(`Zaimportowano ${imported} wydarzeń`);
    } catch { toast.error('Błąd importu'); }
  };

  const handleCellClick = (day: Date, hour: number) => {
    const clickDate = new Date(day);
    clickDate.setHours(hour, 0, 0, 0);
    setEditingAppointment(null);
    setNewApptDate(clickDate);
    setApptDialogOpen(true);
  };

  const handleAppointmentClick = (e: React.MouseEvent, appt: Appointment) => {
    e.stopPropagation();
    setNewApptDate(null);
    setEditingAppointment(appt);
    setApptDialogOpen(true);
  };

  const handleSaveAppointment = async (data: Appointment) => {
    try {
      if (editingAppointment) {
        const { id, ...rest } = data;
        await updateAppointment(id, rest);
        toast.success('Wizyta zaktualizowana');
      } else {
        const { id, ...rest } = data;
        await addAppointment(rest);
        toast.success('Wizyta dodana');
      }
    } catch { toast.error('Błąd zapisu'); }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await deleteAppointment(id);
      toast.success('Wizyta usunięta');
    } catch { toast.error('Błąd usuwania'); }
  };

  const goToToday = () => setCurrentDate(new Date());

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold">Kalendarz</h1>
          <Button variant="outline" size="sm" onClick={goToToday}>Dziś</Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {visibleEmployees.length > 1 && (
            <Select value={filterEmployeeId} onValueChange={setFilterEmployeeId}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue placeholder="Wszyscy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy pracownicy</SelectItem>
                {visibleEmployees.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <input ref={fileInputRef} type="file" accept=".ics" onChange={handleFileUpload} className="hidden" />
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" /> Importuj .ics
            </Button>
          )}
          <div className="flex items-center gap-1 ml-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => addDays(d, -7))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {format(weekDays[0], 'd MMM', { locale: pl })} – {format(weekDays[6], 'd MMM yyyy', { locale: pl })}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => addDays(d, 7))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border sticky top-0 bg-card z-10">
            <div className="p-2" />
            {weekDays.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div key={day.toISOString()} className="p-2 text-center border-l border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {format(day, 'EEE', { locale: pl })}
                  </p>
                  <div className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-lg font-semibold mt-0.5 ${
                    isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/40">
              <div className="pr-2 pt-0 text-[11px] text-muted-foreground text-right -translate-y-2">
                {hour}:00
              </div>
              {weekDays.map((day) => {
                const dayAppts = appointments.filter((a) => {
                  const aDate = new Date(a.date);
                  return isSameDay(aDate, day) && aDate.getHours() === hour;
                });

                return (
                  <div
                    key={day.toISOString()}
                    className="border-l border-border/40 min-h-[56px] relative group cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => handleCellClick(day, hour)}
                  >
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <Plus className="w-4 h-4 text-muted-foreground/40" />
                    </div>

                    {dayAppts.map((a) => {
                      const service = services.find(s => s.id === a.serviceId);
                      const employee = employees.find(e => e.id === a.employeeId);
                      const heightBlocks = Math.max(1, Math.ceil(a.duration / 60));
                      const colorClass = statusColors[a.status] || statusColors.confirmed;

                      return (
                        <div
                          key={a.id}
                          onClick={(e) => handleAppointmentClick(e, a)}
                          className={`relative z-10 rounded-md px-2 py-1 text-xs cursor-pointer border-l-[3px] mb-0.5 transition-all hover:shadow-md ${colorClass}`}
                          style={{ minHeight: `${heightBlocks * 48}px` }}
                          title={`${a.clientName}${service ? ` – ${service.name}` : ''}${a.notes ? `\n${a.notes}` : ''}`}
                        >
                          <p className="font-semibold truncate leading-tight">
                            {service?.name || a.clientName}
                          </p>
                          <p className="truncate opacity-70 leading-tight">
                            {format(new Date(a.date), 'HH:mm')} · {a.clientName}
                          </p>
                          {employee && (
                            <p className="truncate opacity-50 leading-tight">{employee.name}</p>
                          )}
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

      <AppointmentDialog
        open={apptDialogOpen}
        onOpenChange={setApptDialogOpen}
        appointment={editingAppointment}
        defaultDate={newApptDate}
        services={services}
        employees={employees}
        onSave={handleSaveAppointment}
        onDelete={handleDeleteAppointment}
      />

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" />
              Import kalendarza
            </DialogTitle>
            <DialogDescription>
              Wybierz pracownika i zaimportuj wydarzenia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Pracownik</Label>
              <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
                <SelectTrigger><SelectValue placeholder="Wybierz pracownika" /></SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">
                Znaleziono {pendingImport.length} wydarzeń do zaimportowania
              </p>
              <div className="max-h-[250px] overflow-y-auto space-y-2">
                {pendingImport.map((event, i) => {
                  const matchedService = services.find(s => s.id === event.serviceId);
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{event.clientName}</p>
                        {event.clientPhone && (
                          <p className="text-xs text-muted-foreground">📞 {event.clientPhone}</p>
                        )}
                        {matchedService && (
                          <p className="text-xs text-primary/80">💅 {matchedService.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {event.date && format(new Date(event.date), 'EEEE, d MMMM yyyy · HH:mm', { locale: pl })}
                          {' · '}{event.duration} min
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setShowImportDialog(false); setRawIcsText(''); }}>Anuluj</Button>
            <Button onClick={confirmImport} disabled={!selectedEmployeeId}>
              Importuj {pendingImport.length} wydarzeń
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCalendar;
