import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminTopbar } from "@/components/admin-topbar";
import { ReactNode } from "react";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  showSearch?: boolean;
}

export function AdminLayout({ 
  children, 
  title,
  searchPlaceholder,
  onSearch,
  showSearch = false 
}: AdminLayoutProps) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AdminSidebar />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <AdminTopbar 
            title={title}
            searchPlaceholder={searchPlaceholder}
            onSearch={onSearch}
            showSearch={showSearch}
          />
          <main className="flex-1 overflow-auto bg-muted/30">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
