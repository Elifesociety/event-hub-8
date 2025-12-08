import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.jpg";
const navItems = [{
  label: "Dashboard",
  href: "/"
}, {
  label: "Programs",
  href: "/programs"
}, {
  label: "Team",
  href: "/team"
}, {
  label: "Food Court",
  href: "/food-court"
}, {
  label: "Billing",
  href: "/billing"
}, {
  label: "Accounts",
  href: "/accounts"
}, {
  label: "My Profile",
  href: "/stall-login",
  icon: User
}, {
  label: "Admin",
  href: "/admin-login",
  icon: Shield
}];
export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  return <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Samrambhaka Mela Logo" className="h-12 w-auto rounded-lg" />
          <span className="text-lg font-bold text-foreground hidden sm:block">സംരംഭക മേള 2025-26</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => <Link key={item.href} to={item.href} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1", location.pathname === item.href || (item.href === "/stall-login" && location.pathname === "/my-profile") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.label}
            </Link>)}
        </nav>

        {/* Mobile Menu Button */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && <nav className="md:hidden border-t border-border bg-card p-4 animate-slide-up">
          {navItems.map(item => <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)} className={cn("flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors", location.pathname === item.href || (item.href === "/stall-login" && location.pathname === "/my-profile") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.label}
            </Link>)}
        </nav>}
    </header>;
}