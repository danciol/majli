import { useState } from 'react';
import { CreditCard, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingData } from './BookingWizard';

interface Props {
  booking: BookingData;
  depositAmount: number;
  onPaymentSuccess: (orderId: string) => void;
  onBack: () => void;
}

// ─── Sandbox Przelewy24 ──────────────────────────────────────────────────────
// Prawdziwe klucze podmień w .env gdy będziesz miał konto P24
const P24_SANDBOX = true;
const P24_MERCHANT_ID = 'SANDBOX_MERCHANT_ID';
const P24_POS_ID = 'SANDBOX_MERCHANT_ID';
const P24_API_KEY = 'SANDBOX_API_KEY';
const P24_CRC = 'SANDBOX_CRC';

export function StepPayment({ booking, depositAmount, onPaymentSuccess, onBack }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      // W trybie sandbox symulujemy rejestrację transakcji
      if (P24_SANDBOX && P24_MERCHANT_ID === 'SANDBOX_MERCHANT_ID') {
        // TRYB DEMO — symulacja płatności bez prawdziwego API
        await new Promise(resolve => setTimeout(resolve, 1500));
        const fakeOrderId = `SANDBOX-${Date.now()}`;
        onPaymentSuccess(fakeOrderId);
        return;
      }

      // ── Prawdziwa integracja P24 (aktywna gdy podmienisz klucze) ──
      const baseUrl = window.location.origin;
      const sessionId = `majli-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const body = {
        merchantId: Number(P24_MERCHANT_ID),
        posId: Number(P24_POS_ID),
        sessionId,
        amount: depositAmount * 100, // P24 przyjmuje grosze
        currency: 'PLN',
        description: `Zaliczka na wizytę — ${booking.service?.name}`,
        email: booking.clientEmail,
        client: booking.clientName,
        phone: booking.clientPhone,
        country: 'PL',
        language: 'pl',
        urlReturn: `${baseUrl}/booking/success?session=${sessionId}`,
        urlStatus: `${baseUrl}/api/p24/notify`,
        sign: P24_CRC, // prawdziwy sign generuj przez sha384 na backendzie
      };

      const apiBase = 'https://sandbox.przelewy24.pl/api/v1';
      const res = await fetch(`${apiBase}/transaction/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${P24_POS_ID}:${P24_API_KEY}`)}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.data?.token) {
        throw new Error(data.error || 'Błąd rejestracji płatności');
      }

      // Przekieruj klienta do bramki P24
      window.location.href = `${apiBase}/transaction/0/${data.data.token}`;

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd płatności');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <CreditCard className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-heading text-lg font-semibold text-foreground">Zaliczka</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Wymagana zaliczka, aby potwierdzić rezerwację
        </p>
      </div>

      <div className="bg-secondary/50 rounded-xl p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Usługa</span>
          <span className="font-medium">{booking.service?.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Cena całkowita</span>
          <span>{booking.service?.price} zł</span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between">
          <span className="font-semibold">Zaliczka teraz</span>
          <span className="font-bold text-primary text-lg">{depositAmount} zł</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Pozostałe {(booking.service?.price ?? 0) - depositAmount} zł płatne w salonie
        </p>
      </div>

      {P24_SANDBOX && P24_MERCHANT_ID === 'SANDBOX_MERCHANT_ID' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <AlertCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" />
          <p className="text-xs text-accent-foreground">
            <strong>Tryb testowy</strong> — płatność jest symulowana. Aby aktywować prawdziwe płatności, dodaj klucze Przelewy24 w ustawieniach.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
        <ShieldCheck className="w-3.5 h-3.5" />
        Bezpieczna płatność przez Przelewy24
      </div>

      <div className="space-y-2">
        <Button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-primary text-primary-foreground font-semibold"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Przetwarzanie...</>
            : `Zapłać ${depositAmount} zł zaliczki`
          }
        </Button>
        <Button variant="ghost" onClick={onBack} disabled={loading} className="w-full">
          Wróć
        </Button>
      </div>
    </div>
  );
}
