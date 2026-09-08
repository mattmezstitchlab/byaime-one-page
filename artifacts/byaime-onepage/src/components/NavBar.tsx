import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Search, ChevronDown, User, MessageSquare, Menu } from 'lucide-react';
import { getAssetUrl } from '@/lib/assets';

export function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out px-4 md:px-6 py-4 flex items-center justify-between",
        scrolled ? "bg-background/80 backdrop-blur-md border-b border-foreground/5" : "bg-transparent"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 text-foreground cursor-pointer hover:opacity-80 transition-opacity">
          <img src={getAssetUrl('logo.svg')} alt="AIME" className="h-10 w-auto rounded-xl" />
          <ChevronDown className="w-4 h-4 opacity-50" />
        </div>
      </div>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-6 text-foreground text-sm font-medium">
        <button className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
          <Search className="w-4 h-4" />
          <span>Rechercher</span>
        </button>
        <div className="w-px h-4 bg-foreground/20 mx-2" />
        <button className="opacity-80 hover:opacity-100 transition-opacity">
          <MessageSquare className="w-4 h-4" />
        </button>
        <button className="opacity-80 hover:opacity-100 transition-opacity">
          <User className="w-4 h-4" />
        </button>
        <Button variant="pill" className="ml-4 bg-foreground text-xs font-semibold uppercase tracking-wider text-background hover:bg-foreground/85">
          CONNEXION
        </Button>
      </div>

      {/* Mobile Nav */}
      <div className="flex md:hidden items-center gap-4 text-foreground">
        <button className="opacity-80 hover:opacity-100 transition-opacity">
          <Search className="w-5 h-5" />
        </button>
        <button className="opacity-80 hover:opacity-100 transition-opacity">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
