export function Footer() {
  return (
    <footer className="bg-foreground text-background/70 py-10">
      <div className="container mx-auto px-4 text-center">
        <p className="font-heading text-2xl font-bold text-background mb-2">Majli Beauty</p>
        <p className="text-sm mb-4">Salon Kosmetyczny &middot; Warszawa</p>
        <p className="text-xs text-background/40">
          &copy; {new Date().getFullYear()} Majli Beauty. Wszelkie prawa zastrzeżone.
        </p>
      </div>
    </footer>
  );
}
