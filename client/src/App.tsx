import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/admin-layout";
import { ThemeProvider } from "@/components/theme-provider";
import Dashboard from "@/pages/dashboard";
import Restaurants from "@/pages/restaurants";
import Categories from "@/pages/categories";
import MenuItems from "@/pages/menu-items";
import Orders from "@/pages/orders";
import PublicMenu from "@/pages/public-menu";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Redirect root to dashboard */}
      <Route path="/">
        {() => <Redirect to="/dashboard" />}
      </Route>

      {/* Admin routes with sidebar */}
      <Route path="/dashboard">
        <AdminLayout title="Dashboard">
          <Dashboard />
        </AdminLayout>
      </Route>

      <Route path="/restaurants">
        <AdminLayout title="Restaurants">
          <Restaurants />
        </AdminLayout>
      </Route>

      <Route path="/categories">
        <AdminLayout title="Categories">
          <Categories />
        </AdminLayout>
      </Route>

      <Route path="/menu-items">
        <AdminLayout title="Menu Items">
          <MenuItems />
        </AdminLayout>
      </Route>

      <Route path="/orders">
        <AdminLayout title="Orders">
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
