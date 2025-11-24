import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface AdminTopbarProps {
  title?: string;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  showSearch?: boolean;
}

export function AdminTopbar({ 
  title, 
  searchPlaceholder = "Search...", 
  onSearch,
  showSearch = false 
}: AdminTopbarProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6"
    >
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger className="md:hidden" data-testid="button-sidebar-toggle" />
        {title && (
          <h2 className="text-lg font-semibold md:text-xl">{title}</h2>
        )}
        {showSearch && onSearch && (
          <div className="relative hidden md:flex flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </motion.header>
  );
}
