import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/transparency", label: "How Scores Are Calculated" },
];

// Rendered globally, unlike NavBar — legal pages must be discoverable by
// everyone, including signed-out visitors who haven't created an account yet.
export function Footer() {
  return (
    <footer className="mt-auto border-t border-border px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 text-center text-xs text-muted sm:flex-row sm:justify-between sm:text-left">
        <p>© {new Date().getFullYear()} Sweat Is Free. All rights reserved.</p>
        <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
