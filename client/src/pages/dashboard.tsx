import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Restaurant, MenuItem, Order } from "@shared/schema";
import { Building2, UtensilsCrossed, ShoppingCart, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: restaurants, isLoading: loadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: menuItems, isLoading: loadingItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: orders, isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const stats = [
    {
      title: "Total Restaurants",
      value: restaurants?.length || 0,
      icon: Building2,
      description: "Active restaurant accounts",
    },
    {
      title: "Menu Items",
      value: menuItems?.length || 0,
      icon: UtensilsCrossed,
      description: "Dishes across all menus",
    },
    {
      title: "Total Orders",
      value: orders?.length || 0,
      icon: ShoppingCart,
      description: "Orders received",
    },
    {
      title: "Pending Orders",
      value: orders?.filter((o) => o.status === "pending").length || 0,
      icon: TrendingUp,
      description: "Awaiting confirmation",
    },
  ];

  if (loadingRestaurants || loadingItems || loadingOrders) {
    return (
      <div className="p-8">
        <h1 className="text-4xl font-display font-bold mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl md:text-4xl font-display font-bold mb-8" data-testid="text-dashboard-title">
        Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="hover-elevate" data-testid={`card-stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-value-${stat.title.toLowerCase().replace(' ', '-')}`}>
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {restaurants && restaurants.length === 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Welcome to 3D Tech-Menu!</CardTitle>
            <CardDescription>
              Get started by creating your first restaurant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Navigate to the Restaurants page to add your first restaurant and start building your digital menu with AI-powered 3D dish visualization.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
