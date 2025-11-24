import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Restaurant, MenuItem, Order, GenerationJob } from "@shared/schema";
import { Building2, UtensilsCrossed, ShoppingCart, TrendingUp, Clock, Activity, AlertCircle, CheckCircle2, Loader2, XCircle, Sparkles } from "lucide-react";
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

  const { data: generationJobs } = useQuery<GenerationJob[]>({
    queryKey: ["/api/generation-jobs"],
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const ordersToday = orders?.filter(o => new Date(o.createdAt) >= today).length || 0;
  const ordersThisWeek = orders?.filter(o => new Date(o.createdAt) >= weekAgo).length || 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;

  // Recent Activity
  const lastRestaurant = restaurants?.sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )[0];
  
  const lastMenuItem = menuItems?.sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  )[0];

  const recentOrders = orders?.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5) || [];

  // 3D Jobs Status
  const jobStats = {
    pending: generationJobs?.filter(j => j.status === "pending").length || 0,
    processing: generationJobs?.filter(j => j.status === "processing").length || 0,
    completed: generationJobs?.filter(j => j.status === "completed").length || 0,
    failed: generationJobs?.filter(j => j.status === "failed").length || 0,
  };

  // Simple sparkline data (dummy data for demo)
  const generateSparkline = (value: number, max: number) => {
    const points = 12;
    const data = Array.from({ length: points }, (_, i) => {
      const base = (value / max) * 100;
      const variation = Math.random() * 20 - 10;
      return Math.max(10, Math.min(90, base + variation));
    });
    return data;
  };

  const SparklineChart = ({ data, color = "hsl(var(--primary))" }: { data: number[]; color?: string }) => {
    const width = 100;
    const height = 30;
    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const stats = [
    {
      title: "Total Restaurants",
      value: restaurants?.length || 0,
      icon: Building2,
      description: "Active restaurant accounts",
      trend: generateSparkline(restaurants?.length || 0, 50),
      color: "hsl(var(--primary))",
    },
    {
      title: "Total Menu Items",
      value: menuItems?.length || 0,
      icon: UtensilsCrossed,
      description: "Dishes across all menus",
      trend: generateSparkline(menuItems?.length || 0, 200),
      color: "hsl(var(--primary))",
    },
    {
      title: "Orders Today",
      value: ordersToday,
      icon: ShoppingCart,
      description: `${ordersThisWeek} orders this week`,
      trend: generateSparkline(ordersToday, 50),
      color: "hsl(142, 76%, 36%)",
    },
    {
      title: "Pending Orders",
      value: pendingOrders,
      icon: Clock,
      description: "Awaiting confirmation",
      trend: generateSparkline(pendingOrders, 20),
      color: "hsl(38, 92%, 50%)",
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
    <div className="p-4 md:p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-2" data-testid="text-dashboard-title">
          Dashboard
        </h1>
        <p className="text-muted-foreground">Overview of your 3D Tech-Menu platform</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            whileHover={{ y: -4 }}
          >
            <Card 
              className="hover-elevate border-2 hover:border-primary/20 transition-all duration-300 bg-card/50 backdrop-blur-sm" 
              data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="p-2 rounded-lg bg-primary/10">
                  <stat.icon className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2" data-testid={`text-stat-value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {stat.description}
                </p>
                <div className="flex items-center justify-between">
                  <SparklineChart data={stat.trend} color={stat.color} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Activity & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle>Recent Activity</CardTitle>
              </div>
              <CardDescription>Latest updates across your platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastRestaurant && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">New Restaurant Created</p>
                    <p className="text-xs text-muted-foreground truncate">{lastRestaurant.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lastRestaurant.createdAt ? new Date(lastRestaurant.createdAt).toLocaleString() : "Recently"}
                    </p>
                  </div>
                </div>
              )}
              
              {lastMenuItem && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="p-2 rounded-full bg-primary/10">
                    <UtensilsCrossed className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">New Menu Item Added</p>
                    <p className="text-xs text-muted-foreground truncate">{lastMenuItem.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lastMenuItem.createdAt ? new Date(lastMenuItem.createdAt).toLocaleString() : "Recently"}
                    </p>
                  </div>
                </div>
              )}

              {recentOrders.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Recent Orders</p>
                  {recentOrders.slice(0, 3).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs font-medium">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={order.status === "pending" ? "secondary" : "default"}>
                        {order.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* System Health - 3D Jobs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle>3D Generation Jobs</CardTitle>
              </div>
              <CardDescription>System health and job status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-muted/50 border-2 border-primary/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    <span className="text-sm font-medium">Pending</span>
                  </div>
                  <p className="text-2xl font-bold">{jobStats.pending}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border-2 border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Processing</span>
                  </div>
                  <p className="text-2xl font-bold">{jobStats.processing}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border-2 border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                  <p className="text-2xl font-bold">{jobStats.completed}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border-2 border-red-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                  <p className="text-2xl font-bold">{jobStats.failed}</p>
                </div>
              </div>
              
              {generationJobs && generationJobs.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">Recent Jobs</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {generationJobs
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 5)
                      .map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-xs">
                          <div className="flex items-center gap-2">
                            {job.status === "pending" && <Loader2 className="h-3 w-3 text-primary animate-spin" />}
                            {job.status === "processing" && <Clock className="h-3 w-3 text-orange-500" />}
                            {job.status === "completed" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                            {job.status === "failed" && <XCircle className="h-3 w-3 text-red-500" />}
                            <span className="truncate max-w-[120px]">Job {job.id.slice(0, 8)}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {job.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
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
