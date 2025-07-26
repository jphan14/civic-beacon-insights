import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, FileText, Archive, Info, Search, MessageCircle } from "lucide-react";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { label: "Meeting Summaries", href: "#summaries", icon: FileText },
    { label: "Historical Archives", href: "/archive", icon: Archive },
    { label: "AI Assistant", href: "/chat", icon: MessageCircle },
    { label: "Search", href: "#search", icon: Search },
    { label: "About", href: "#about", icon: Info },
  ];

  const NavLink = ({ item }: { item: typeof navItems[0] }) => (
    <a
      href={item.href}
      className="flex items-center gap-2 text-foreground hover:text-primary transition-colors duration-200 font-medium"
      onClick={() => setIsOpen(false)}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </a>
  );

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold text-primary">Civic Beacon: La Canada Flintridge</h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              {navItems.map((item) => (
                <NavLink key={item.label} item={item} />
              ))}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <div className="flex flex-col space-y-6 mt-8">
                  {navItems.map((item) => (
                    <NavLink key={item.label} item={item} />
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;