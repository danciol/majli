import { CheckCircle2, Calendar, Clock, User, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingData } from './BookingWizard';

interface Props {
  booking: BookingData;
  onClose: () => void;
}

export function StepConfirmation({ booking, onClose }: Props) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-8 h-8 text-primary" />
      </div>
      <h3 className="font-heading text-xl font-semibold text-foreground mb-1">Rezerwacja potwierdzona!</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Potwierdzenie zostanie wysłane na Twój adres email
      </p>

      <div className="bg-secondary/50 rounded-xl p-5 text-left space-y-3 mb-6">
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 text-primary mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Termin</p>
            <p className="text-sm font-medium text-foreground">
              {booking.date?.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' o '}{booking.time}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 text-primary mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Usługa</p>
            <p className="text-sm font-medium text-foreground">{booking.service?.name}</p>
            <p className="text-xs text-muted-foreground">{booking.service?.duration} min — {booking.service?.price} zł</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <User className="w-4 h-4 text-primary mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Specjalistka</p>
            <p className="text-sm font-medium text-foreground">{booking.employee?.name}</p>
          </div>
        </div>
        <div className="border-t border-border pt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <User className="w-3.5 h-3.5 text-muted-foreground" /> {booking.clientName}
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" /> {booking.clientPhone}
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" /> {booking.clientEmail}
          </div>
        </div>
      </div>

      <Button onClick={onClose} className="w-full bg-primary text-primary-foreground font-semibold">
        Zamknij
      </Button>
    </div>
  );
}
