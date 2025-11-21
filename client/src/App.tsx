import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import Dashboard from "@/pages/dashboard";
import Restaurants from "@/pages/restaurants";
import Categories from "@/pages/categories";
import MenuItems from "@/pages/menu-items";
import Orders from "@/pages/orders";
import PublicMenu from "@/pages/public-menu";
import NotFound from "@/pages/not-found";

function AdminLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 p-4 border-b bg-background sticky top-0 z-40">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      {/* Redirect root to dashboard */}
      <Route path="/">
        {() => <Redirect to="/dashboard" />}
      </Route>

      {/* Admin routes with sidebar */}
      <Route path="/dashboard">
        <AdminLayout>
          <Dashboard />
        </AdminLayout>
      </Route>

      <Route path="/restaurants">
        <AdminLayout>
          <Restaurants />
        </AdminLayout>
      </Route>

      <Route path="/categories">
        <AdminLayout>
          <Categories />
        </AdminLayout>
      </Route>

      <Route path="/menu-items">
        <AdminLayout>
          <MenuItems />
        </AdminLayout>
      </Route>

      <Route path="/orders">
        <AdminLayout>
          <Orders />
        </AdminLayout>
      </Route>

      {/* Public menu route without sidebar */}
      <Route path="/menu/:restaurantId">
        <PublicMenu />
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
