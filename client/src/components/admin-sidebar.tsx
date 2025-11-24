import { motion } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Building2, UtensilsCrossed, Package, ShoppingCart, Sparkles } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Restaurants",
    url: "/restaurants",
    icon: Building2,
  },
  {
    title: "Menu Items",
    url: "/menu-items",
    icon: UtensilsCrossed,
  },
  {
    title: "Categories",
    url: "/categories",
    icon: Package,
  },
  {
    title: "Orders",
    url: "/orders",
    icon: ShoppingCart,
  },
];

export function AdminSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">3D Tech-Menu</h1>
            <p className="text-xs text-muted-foreground">Admin Portal</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {menuItems.map((item, index) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn(
                          "w-full justify-start gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <a
                          href={item.url}
                          data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                          className="flex items-center gap-3"
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <span className="font-medium">{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </motion.div>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
