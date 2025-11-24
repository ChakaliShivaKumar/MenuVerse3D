import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Restaurant, MenuItem, Category, GenerationJob, InsertOrder } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { ShoppingCart, Plus, Minus, Trash2, Sparkles, X, Star, TrendingUp, Gift, Heart, Clock, Award, ChefHat, Eye, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface CartItem {
  menuItemId: string;
  name: string;
  price: string;
  quantity: number;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

export default function PublicMenu() {
  const [, params] = useRoute("/menu/:restaurantId");
  const restaurantId = params?.restaurantId;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [is3DViewerOpen, setIs3DViewerOpen] = useState(false);
  const [selected3DModel, setSelected3DModel] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string>("");
  const processedCompletedJobs = useRef<Set<string>>(new Set());
  const [welcomeApi, setWelcomeApi] = useState<CarouselApi | null>(null);
  const [featuredApi, setFeaturedApi] = useState<CarouselApi | null>(null);
  const [specialsApi, setSpecialsApi] = useState<CarouselApi | null>(null);
  const [reviewsApi, setReviewsApi] = useState<CarouselApi | null>(null);
  const [welcomeCurrent, setWelcomeCurrent] = useState(0);
  const [specialsCurrent, setSpecialsCurrent] = useState(0);
  const [reviewsCurrent, setReviewsCurrent] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    email: "",
    tableNumber: "",
    notes: "",
  });
  const { toast } = useToast();

  const { data: restaurant, isLoading: loadingRestaurant } = useQuery<Restaurant>({
    queryKey: ["/api/restaurants", restaurantId],
    enabled: !!restaurantId,
  });

  const { data: menuItems, isLoading: loadingItems } = useQuery<MenuItem[]>({
    queryKey: ["/api/restaurants", restaurantId, "menu-items"],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/menu-items`);
      if (!response.ok) throw new Error("Failed to fetch menu items");
      const data = await response.json();
      // Debug: log all menu items and their 3D model status
      console.log(`[PublicMenu] Fetched ${data.length} menu items`);
      data.forEach((item: any) => {
        if (item.model3D?.modelUrl) {
          console.log(`✓ Menu item "${item.name}" has 3D model:`, item.model3D.modelUrl);
        } else {
          console.log(`✗ Menu item "${item.name}" has no 3D model (model3D:`, item.model3D, `)`);
        }
      });
      return data;
    },
    enabled: !!restaurantId,
    // Refetch on mount to ensure we have the latest data
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: generationJobs } = useQuery<GenerationJob[]>({
    queryKey: ["/api/generation-jobs"],
    refetchInterval: (query) => {
      // Poll if there are jobs in processing/pending state OR completed jobs that might have just finished
      const jobs = query.state.data || [];
      const menuItemIds = menuItems?.map(item => item.id) || [];
      const hasProcessingJobs = jobs.some(
        job => menuItemIds.includes(job.menuItemId) && 
        (job.status === "processing" || job.status === "pending")
      );
      // Also poll if there are completed jobs for this restaurant's items
      const hasCompletedJobs = jobs.some(
        job => menuItemIds.includes(job.menuItemId) && 
        job.status === "completed" && job.modelUrl
      );
      // Poll for 2 minutes after any jobs complete to ensure data syncs
      return (hasProcessingJobs || hasCompletedJobs) ? 30000 : false;
    },
  });
  
  // Separate effect to poll menu items when generation jobs are active
  useEffect(() => {
    if (!generationJobs || !menuItems || !restaurantId) return;
    
    // Check if we have processing or completed jobs for this restaurant's menu items
    const menuItemIds = new Set(menuItems.map(item => item.id));
    const hasActiveJobs = generationJobs.some(
      job => menuItemIds.has(job.menuItemId) && 
      ((job.status === "processing" || job.status === "pending") || 
       (job.status === "completed" && job.modelUrl))
    );
    
    // Poll menu items when there are active generation jobs (to get fresh 3D model data)
    if (hasActiveJobs) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ 
          queryKey: ["/api/restaurants", restaurantId, "menu-items"] 
        });
      }, 30000); // Poll every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [generationJobs, menuItems, restaurantId, queryClient]);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/restaurants", restaurantId, "categories"],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/categories`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
    enabled: !!restaurantId,
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (data: InsertOrder) => {
      return await apiRequest("POST", "/api/orders", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setCart([]);
      setIsCartOpen(false);
      setCustomerInfo({ name: "", phone: "", email: "", tableNumber: "", notes: "" });
      toast({
        title: "Order placed!",
        description: "Your order has been submitted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addToCart = (item: MenuItem) => {
    const existing = cart.find((c) => c.menuItemId === item.id);
    if (existing) {
      setCart(cart.map((c) =>
        c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, {
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
      }]);
    }
    toast({
      title: "Added to cart",
      description: `${item.name} has been added to your cart.`,
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart(cart.map((c) =>
      c.menuItemId === menuItemId
        ? { ...c, quantity: Math.max(0, c.quantity + delta) }
        : c
    ).filter((c) => c.quantity > 0));
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(cart.filter((c) => c.menuItemId !== menuItemId));
  };

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  };

  const getTax = () => {
    return getSubtotal() * 0.08; // 8% tax rate
  };

  const getTotal = () => {
    return getSubtotal() + getTax();
  };

  const handlePlaceOrder = () => {
    if (!restaurantId) return;

    const orderData: InsertOrder = {
      restaurantId,
      customerName: customerInfo.name || undefined,
      customerPhone: customerInfo.phone || undefined,
      customerEmail: customerInfo.email || undefined,
      tableNumber: customerInfo.tableNumber || undefined,
      items: cart,
      subtotal: getSubtotal().toFixed(2),
      tax: getTax().toFixed(2),
      total: getTotal().toFixed(2),
      notes: customerInfo.notes || undefined,
      status: "pending",
    };

    placeOrderMutation.mutate(orderData);
  };

  const get3DModel = (itemId: string): string | null => {
    // First check if menu item has model3D data (from database)
    const menuItem = menuItems?.find(item => item.id === itemId);
    if (menuItem) {
      // Check for model3D in the menu item object
      const model3D = (menuItem as any)?.model3D;
      if (model3D?.modelUrl) {
        console.log(`[get3DModel] Found 3D model in menu item "${menuItem.name}":`, model3D.modelUrl);
        return model3D.modelUrl;
      }
    }
    
    // Fallback to generation jobs (for recently completed models)
    const job = generationJobs?.find((job) => 
      job.menuItemId === itemId && job.status === "completed" && job.modelUrl
    );
    if (job?.modelUrl) {
      console.log(`[get3DModel] Found 3D model in generation job for item "${itemId}":`, job.modelUrl);
      return job.modelUrl;
    }
    
    return null;
  };

  // Scroll detection for sticky cart
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Carousel current slide tracking
  useEffect(() => {
    if (!welcomeApi) return;
    welcomeApi.on("select", () => {
      setWelcomeCurrent(welcomeApi.selectedScrollSnap());
    });
    setWelcomeCurrent(welcomeApi.selectedScrollSnap());
  }, [welcomeApi]);

  useEffect(() => {
    if (!specialsApi) return;
    specialsApi.on("select", () => {
      setSpecialsCurrent(specialsApi.selectedScrollSnap());
    });
    setSpecialsCurrent(specialsApi.selectedScrollSnap());
  }, [specialsApi]);

  useEffect(() => {
    if (!reviewsApi) return;
    reviewsApi.on("select", () => {
      setReviewsCurrent(reviewsApi.selectedScrollSnap());
    });
    setReviewsCurrent(reviewsApi.selectedScrollSnap());
  }, [reviewsApi]);

  // Auto-play welcome carousel
  useEffect(() => {
    if (!welcomeApi) return;
    const interval = setInterval(() => {
      welcomeApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [welcomeApi]);

  // Auto-play specials carousel
  useEffect(() => {
    if (!specialsApi) return;
    const interval = setInterval(() => {
      specialsApi.scrollNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [specialsApi]);

  // Auto-play reviews carousel
  useEffect(() => {
    if (!reviewsApi) return;
    const interval = setInterval(() => {
      reviewsApi.scrollNext();
    }, 5000);
    return () => clearInterval(interval);
  }, [reviewsApi]);

  // Auto-refresh menu items immediately when generation jobs complete
  useEffect(() => {
    if (!generationJobs || !restaurantId || !menuItems) return;

    const menuItemIds = new Set(menuItems.map(item => item.id));
    const completedJobs = generationJobs.filter(
      job => 
        menuItemIds.has(job.menuItemId) &&
        job.status === "completed" && 
        job.modelUrl && 
        !processedCompletedJobs.current.has(job.id)
    );

    // Process newly completed jobs immediately
    if (completedJobs.length > 0) {
      console.log(`Found ${completedJobs.length} newly completed 3D model(s), refreshing menu items immediately...`);
      completedJobs.forEach(job => {
        processedCompletedJobs.current.add(job.id);
        const menuItem = menuItems.find(item => item.id === job.menuItemId);
        console.log(`Completed model for menu item "${menuItem?.name || job.menuItemId}":`, job.modelUrl);
      });
      // Immediately invalidate and refetch menu items to show new 3D models
      queryClient.invalidateQueries({ 
        queryKey: ["/api/restaurants", restaurantId, "menu-items"] 
      });
      queryClient.refetchQueries({ 
        queryKey: ["/api/restaurants", restaurantId, "menu-items"] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/generation-jobs"] 
      });
    }
  }, [generationJobs, restaurantId, menuItems, queryClient]);

  const view3DModel = (modelUrl: string, itemName: string) => {
    setSelected3DModel(modelUrl);
    setSelectedItemName(itemName);
    setIs3DViewerOpen(true);
  };

  const getCategorizedItems = () => {
    const categorized: Record<string, MenuItem[]> = {};
    const uncategorized: MenuItem[] = [];

    menuItems?.filter((item) => item.available).forEach((item) => {
      if (item.categoryId) {
        const category = categories?.find((c) => c.id === item.categoryId);
        if (category) {
          if (!categorized[category.id]) {
            categorized[category.id] = [];
          }
          categorized[category.id].push(item);
        } else {
          uncategorized.push(item);
        }
      } else {
        uncategorized.push(item);
      }
    });

    return { categorized, uncategorized };
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Image loading state component
  const ImageWithLoader = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    return (
      <div className="relative w-full h-full">
        {isLoading && (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
        <img
          src={src}
          alt={alt}
          className={className}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          loading="lazy"
        />
        {hasError && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary/50" />
          </div>
        )}
      </div>
    );
  };

  if (loadingRestaurant || loadingItems) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Skeleton */}
        <div className="h-80 md:h-96 bg-gradient-to-br from-primary/20 to-primary/5 relative overflow-hidden">
          <Skeleton className="absolute inset-0" />
          <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-12">
            <div className="flex items-end gap-6">
              <Skeleton className="h-24 w-24 md:h-32 md:w-32 rounded-2xl" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-12 w-64 md:h-16 md:w-96" />
                <Skeleton className="h-6 w-96 md:h-8 md:w-[500px]" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Offers Banner Skeleton */}
        <div className="h-16 bg-primary/10">
          <Skeleton className="h-full w-full" />
        </div>

        {/* Welcome Section Skeleton */}
        <div className="py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4">
            <Skeleton className="h-16 w-96 mx-auto mb-8" />
            <Skeleton className="h-8 w-64 mx-auto" />
          </div>
        </div>

        {/* Menu Items Skeleton */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-48 w-full aspect-video" />
                <CardHeader className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Restaurant Not Found</CardTitle>
            <CardDescription>
              The restaurant you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { categorized, uncategorized } = getCategorizedItems();
  const sortedCategories = categories?.sort((a, b) => a.displayOrder - b.displayOrder) || [];

  // Sample offers - in production, these would come from the database
  const offers = [
    { id: 1, text: "🎉 20% OFF on all bowls this week!", icon: Gift },
    { id: 2, text: "⭐ Try our new Signature Bowls - Limited time!", icon: Star },
    { id: 3, text: "🔥 Hot Deal: Buy 2 Get 1 Free on Smoothies", icon: TrendingUp },
    { id: 4, text: "🌱 Fresh ingredients daily - Order now!", icon: Sparkles },
  ];

  // Get featured items (items with images, sorted by display order)
  const featuredItems = menuItems
    ?.filter((item) => item.available && item.image)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 6) || [];

  // Today's Specials / Chef's Picks (items with images, first 4)
  const todaysSpecials = menuItems
    ?.filter((item) => item.available && item.image)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 4)
    .map((item, index) => ({
      ...item,
      badge: index === 0 ? "New" : index === 1 ? "Popular" : index === 2 ? "Limited" : "Chef's Pick",
    })) || [];

  // Welcome messages - rotate through these
  const welcomeMessages = [
    {
      title: "Welcome to Fresh Flavors!",
      subtitle: "Discover our handcrafted menu made with love and the finest ingredients",
      cta: "Start Ordering",
    },
    {
      title: "Experience Food in 3D",
      subtitle: "View our dishes in immersive 3D before you order - a first in dining!",
      cta: "Explore Menu",
    },
    {
      title: "Made Fresh Daily",
      subtitle: "Every dish is prepared fresh with premium ingredients, just for you",
      cta: "Order Now",
    },
  ];

  // Sample customer reviews
  const reviews = [
    {
      id: 1,
      name: "Sarah Johnson",
      rating: 5,
      text: "Amazing food and the 3D view feature is incredible! Best dining experience ever.",
      avatar: "SJ",
    },
    {
      id: 2,
      name: "Michael Chen",
      rating: 5,
      text: "Fresh ingredients, fast service, and the menu is so easy to navigate. Highly recommend!",
      avatar: "MC",
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      rating: 5,
      text: "The quality is outstanding and the prices are fair. Will definitely come back!",
      avatar: "ER",
    },
    {
      id: 4,
      name: "David Kim",
      rating: 5,
      text: "Love the interactive menu and the food tastes even better than it looks in 3D!",
      avatar: "DK",
    },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-0 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/4 -right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse delay-2000" />
        
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-30" />
        
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${15 + Math.random() * 10}s infinite ease-in-out`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Scrolling Offers Banner */}
      <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20 overflow-hidden">
        <div className="flex animate-scroll">
          <div className="flex items-center gap-8 whitespace-nowrap">
            {[...offers, ...offers].map((offer, idx) => {
              const Icon = offer.icon;
              return (
                <div key={`${offer.id}-${idx}`} className="flex items-center gap-3 px-6 py-3">
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">{offer.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Welcome Section with Carousel */}
      <div className="relative bg-gradient-to-b from-background via-primary/5 to-background py-12 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            setApi={setWelcomeApi}
            className="w-full"
          >
            <CarouselContent>
              {welcomeMessages.map((message, index) => (
                <CarouselItem key={index} className="basis-full">
                  <div className="text-center space-y-4 animate-fade-in-up">
                    <div className="flex justify-center gap-2 mb-4">
                      <Heart className="h-6 w-6 text-primary animate-pulse" />
                      <Award className="h-6 w-6 text-primary animate-pulse delay-300" />
                      <Clock className="h-6 w-6 text-primary animate-pulse delay-500" />
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                      {message.title}
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                      {message.subtitle}
                    </p>
                    <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
                      <Button
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-lg px-8 py-6 rounded-full shadow-xl hover:scale-105 transition-all duration-300 group/cta"
                        onClick={() => {
                          document.getElementById("menu-content")?.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        <span className="relative z-10 flex items-center">
                          {message.cta}
                          <Sparkles className="ml-2 h-5 w-5 transition-transform duration-300 group-hover/cta:rotate-180" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-full opacity-0 group-hover/cta:opacity-100 transition-opacity duration-300" />
                      </Button>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>Fast Service</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Award className="h-4 w-4" />
                          <span>Premium Quality</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-4 bg-background/80 backdrop-blur-md border-2 border-primary/20 hover:bg-background" />
            <CarouselNext className="right-4 bg-background/80 backdrop-blur-md border-2 border-primary/20 hover:bg-background" />
            {/* Carousel Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {welcomeMessages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => welcomeApi?.scrollTo(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    welcomeCurrent === index
                      ? "w-8 bg-primary"
                      : "w-2 bg-primary/30 hover:bg-primary/50"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </Carousel>
        </div>
      </div>

      {/* Enhanced Hero Section with Animation */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative h-80 md:h-96 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 overflow-hidden"
      >
        {/* Parallax Background Image */}
        {restaurant.bannerImage && (
          <div className="absolute inset-0">
            <img 
              src={restaurant.bannerImage} 
              alt={restaurant.name} 
              className="absolute inset-0 w-full h-full object-cover opacity-30 scale-110 transition-transform duration-700 hover:scale-100" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20" />
          </div>
        )}
        
        {/* Animated Overlay Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.3),transparent_50%)]" />
        </div>

        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-12">
          <div className="flex items-end gap-6 animate-fade-in-up">
            {restaurant.logo && (
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                <img 
                  src={restaurant.logo} 
                  alt={`${restaurant.name} logo`} 
                  className="relative h-24 w-24 md:h-32 md:w-32 rounded-2xl border-4 border-background shadow-2xl object-cover transition-transform duration-300 hover:scale-105" 
                />
              </div>
            )}
            <div className="flex-1">
              <h1 
                className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-foreground mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text" 
                data-testid="text-restaurant-name"
              >
                {restaurant.name}
              </h1>
              {restaurant.description && (
                <p className="text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed">
                  {restaurant.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Today's Specials / Chef's Picks Section */}
      {todaysSpecials.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative bg-gradient-to-b from-background via-primary/5 to-background py-12 md:py-16 overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-8 space-y-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <ChefHat className="h-6 w-6 text-primary" />
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  Today's Specials
                </h2>
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <p className="text-muted-foreground text-lg">
                Handpicked favorites from our chef
              </p>
            </div>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              setApi={setSpecialsApi}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {todaysSpecials.map((item, index) => {
                  const modelUrl = get3DModel(item.id);
                  const badgeColors: Record<string, string> = {
                    "New": "bg-green-500/90",
                    "Popular": "bg-orange-500/90",
                    "Limited": "bg-red-500/90",
                    "Chef's Pick": "bg-primary/90",
                  };
                  return (
                    <CarouselItem key={item.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/4">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        whileHover={{ scale: 1.05, rotateY: 5 }}
                        className="h-full"
                      >
                        <Card className="group overflow-hidden hover-elevate transition-all duration-500 hover:shadow-2xl border-2 hover:border-primary/30 bg-card/80 backdrop-blur-sm h-full">
                          {item.image && (
                            <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="w-full h-full"
                              >
                                <ImageWithLoader
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover transition-transform duration-700"
                                />
                              </motion.div>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                              <div className="absolute top-3 left-3">
                                <Badge className={`${badgeColors[item.badge]} backdrop-blur-sm text-white border-0 shadow-lg font-semibold`}>
                                  {item.badge}
                                </Badge>
                              </div>
                              <div className="absolute top-3 right-3">
                                <Badge className="bg-background/90 backdrop-blur-sm text-primary border-2 border-primary/30 shadow-lg font-bold text-base px-3 py-1">
                                  ${item.price}
                                </Badge>
                              </div>
                              {modelUrl && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="absolute bottom-3 right-3 backdrop-blur-md bg-background/90 hover:bg-background border border-primary/20 shadow-lg transition-all duration-300 hover:scale-110"
                                  onClick={() => view3DModel(modelUrl, item.name)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View 3D
                                </Button>
                              )}
                            </div>
                          )}
                          <CardHeader className="space-y-2 pb-2">
                            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors duration-300 line-clamp-1">
                              {item.name}
                            </CardTitle>
                            {item.description && (
                              <CardDescription className="line-clamp-2 text-xs leading-relaxed">
                                {item.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardFooter className="pt-0">
                            <Button
                              className="w-full group/btn relative overflow-hidden bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105"
                              onClick={() => addToCart(item)}
                            >
                              <span className="relative z-10 flex items-center">
                                <Plus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover/btn:rotate-90" />
                                Add to Cart
                              </span>
                            </Button>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="left-2 bg-background/90 backdrop-blur-md border-2 border-primary/20 hover:bg-background shadow-lg" />
              <CarouselNext className="right-2 bg-background/90 backdrop-blur-md border-2 border-primary/20 hover:bg-background shadow-lg" />
              {/* Carousel Dots */}
              <div className="flex justify-center gap-2 mt-6">
                {todaysSpecials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => specialsApi?.scrollTo(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      specialsCurrent === index
                        ? "w-8 bg-primary"
                        : "w-2 bg-primary/30 hover:bg-primary/50"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </Carousel>
          </div>
        </motion.div>
      )}

      {/* Cart Button - Sticky/Floating with Animation */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetTrigger asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="lg"
              className="rounded-full h-14 px-6 shadow-2xl bg-primary hover:bg-primary/90 backdrop-blur-md border-2 border-primary/20 transition-all duration-300 hover:shadow-primary/50 group relative"
              data-testid="button-open-cart"
            >
              <ShoppingCart className="h-5 w-5 mr-2 transition-transform duration-300 group-hover:scale-110" />
              <span className="font-semibold">Cart</span>
              {cartItemCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-2"
                >
                  <Badge className="bg-background text-primary border-2 border-primary/30 shadow-lg">
                    {cartItemCount}
                  </Badge>
                </motion.div>
              )}
              {cartItemCount > 0 && (
                <motion.div
                  className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                />
              )}
            </Button>
          </motion.div>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Your Cart</SheetTitle>
            <SheetDescription>
              Review your order before submitting
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <Card key={item.menuItemId} data-testid={`cart-item-${item.menuItemId}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              ${item.price} each
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.menuItemId, -1)}
                              data-testid={`button-decrease-${item.menuItemId}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-medium" data-testid={`text-quantity-${item.menuItemId}`}>
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.menuItemId, 1)}
                              data-testid={`button-increase-${item.menuItemId}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromCart(item.menuItemId)}
                            data-testid={`button-remove-${item.menuItemId}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (8%)</span>
                    <span className="font-medium">${getTax().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span data-testid="text-cart-total">${getTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name (optional)</Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      placeholder="Your name"
                      data-testid="input-customer-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      data-testid="input-customer-phone"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      placeholder="your@email.com"
                      data-testid="input-customer-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="table">Table Number (optional)</Label>
                    <Input
                      id="table"
                      value={customerInfo.tableNumber}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, tableNumber: e.target.value })}
                      placeholder="Table 5"
                      data-testid="input-table-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Special Instructions (optional)</Label>
                    <Textarea
                      id="notes"
                      value={customerInfo.notes}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                      placeholder="Any special requests..."
                      data-testid="input-order-notes"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
          {cart.length > 0 && (
            <SheetFooter className="mt-6">
              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={placeOrderMutation.isPending}
                data-testid="button-place-order"
              >
                {placeOrderMutation.isPending ? "Placing Order..." : "Place Order"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Trust Building Section */}
      <div className="relative bg-gradient-to-b from-primary/5 to-background py-8 border-y border-primary/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-sm md:text-base">Fast Service</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Quick & Fresh</p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Award className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-sm md:text-base">Premium Quality</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Finest Ingredients</p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-sm md:text-base">Made with Love</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Handcrafted Daily</p>
            </div>
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="font-semibold text-sm md:text-base">3D Experience</h3>
              <p className="text-xs md:text-sm text-muted-foreground">See Before You Order</p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Items Carousel */}
      {featuredItems.length > 0 && (
        <div className="relative bg-gradient-to-b from-background to-primary/5 py-12 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-8 space-y-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-6 w-6 text-primary fill-primary" />
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  Featured Favorites
                </h2>
                <Star className="h-6 w-6 text-primary fill-primary" />
              </div>
              <p className="text-muted-foreground text-lg">
                Our most popular dishes, handpicked for you
              </p>
            </div>
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              setApi={setFeaturedApi}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {featuredItems.map((item, index) => {
                  const modelUrl = get3DModel(item.id);
                  return (
                    <CarouselItem key={item.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        whileHover={{ y: -5 }}
                        className="h-full"
                      >
                        <Card className="group overflow-hidden hover-elevate transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border-2 hover:border-primary/20 bg-card/80 backdrop-blur-sm h-full">
                        {item.image && (
                          <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="w-full h-full"
                            >
                              <ImageWithLoader
                                src={item.image}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform duration-700"
                              />
                            </motion.div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="absolute top-3 left-3 flex flex-col gap-2">
                              <Badge className="bg-primary/90 backdrop-blur-sm text-primary-foreground border-0 shadow-lg text-base font-bold px-3 py-1">
                                ${item.price}
                              </Badge>
                            </div>
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-background/90 backdrop-blur-sm text-primary border-2 border-primary/30 shadow-lg">
                                <Star className="h-3 w-3 mr-1 fill-primary" />
                                Featured
                              </Badge>
                            </div>
                            <div className="absolute bottom-3 right-3 flex gap-2">
                              {modelUrl && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="backdrop-blur-md bg-background/90 hover:bg-background border border-primary/20 shadow-lg transition-all duration-300 hover:scale-110"
                                  onClick={() => view3DModel(modelUrl, item.name)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View 3D
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                        <CardHeader className="space-y-3 pb-3">
                          <div className="space-y-1">
                            <CardTitle className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight">
                              {item.name}
                            </CardTitle>
                            {item.description && (
                              <CardDescription className="text-sm md:text-base leading-relaxed line-clamp-2 text-muted-foreground">
                                {item.description}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <Badge variant="outline" className="text-xs">
                              <Star className="h-3 w-3 mr-1 fill-primary text-primary" />
                              Featured
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardFooter className="pt-0 flex gap-2">
                          {modelUrl && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 group/view"
                              onClick={() => view3DModel(modelUrl, item.name)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View 3D
                            </Button>
                          )}
                          <Button
                            className={`${modelUrl ? 'flex-1' : 'w-full'} group/btn relative overflow-hidden bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105`}
                            onClick={() => addToCart(item)}
                          >
                            <span className="relative z-10 flex items-center">
                              <Plus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover/btn:rotate-90" />
                              Add to Cart
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                          </Button>
                        </CardFooter>
                      </Card>
                      </motion.div>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="left-2 bg-background/90 backdrop-blur-md border-2 border-primary/20 hover:bg-background shadow-lg" />
              <CarouselNext className="right-2 bg-background/90 backdrop-blur-md border-2 border-primary/20 hover:bg-background shadow-lg" />
            </Carousel>
          </div>
        </div>
      )}

      {/* Menu Content */}
      <div id="menu-content" className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {sortedCategories.length > 0 ? (
          <Tabs defaultValue={sortedCategories[0]?.id || "all"} className="w-full">
            <TabsList className="mb-8 flex-wrap h-auto">
              {sortedCategories.map((category) => (
                <TabsTrigger key={category.id} value={category.id} data-testid={`tab-${category.id}`}>
                  {category.name}
                </TabsTrigger>
              ))}
              {uncategorized.length > 0 && (
                <TabsTrigger value="uncategorized">Other</TabsTrigger>
              )}
            </TabsList>

            {sortedCategories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                {category.description && (
                  <p className="text-muted-foreground mb-6">{category.description}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {categorized[category.id]?.sort((a, b) => a.displayOrder - b.displayOrder).map((item, index) => {
                    const modelUrl = get3DModel(item.id);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        data-testid={`card-menu-item-${item.id}`}
                      >
                        <Card 
                          className="group overflow-hidden hover-elevate transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border-2 hover:border-primary/20 bg-card/80 backdrop-blur-sm h-full" 
                        >
                          {item.image ? (
                            <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
                              <motion.img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                whileHover={{ scale: 1.1 }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              <div className="absolute top-3 left-3 flex flex-col gap-2">
                                <Badge className="bg-primary/90 backdrop-blur-sm text-primary-foreground border-0 shadow-lg text-base font-bold px-3 py-1">
                                  ${item.price}
                                </Badge>
                              </div>
                              <div className="absolute bottom-3 right-3 flex gap-2">
                                {modelUrl && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="backdrop-blur-md bg-background/90 hover:bg-background border border-primary/20 shadow-lg transition-all duration-300 hover:scale-110"
                                    onClick={() => view3DModel(modelUrl, item.name)}
                                    data-testid={`button-view-3d-${item.id}`}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View 3D
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : modelUrl ? (
                          <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex flex-col items-center justify-center gap-4 p-6 border-b border-primary/10">
                            <div className="text-center space-y-2">
                              <div className="flex justify-center mb-2">
                                <div className="p-3 rounded-full bg-primary/10">
                                  <Sparkles className="h-6 w-6 text-primary" />
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-foreground">3D Model Available</p>
                              <p className="text-xs text-muted-foreground max-w-xs">Experience this item in immersive 3D</p>
                            </div>
                            <Button
                              size="lg"
                              className="w-full max-w-[200px] shadow-md"
                              onClick={() => view3DModel(modelUrl, item.name)}
                              data-testid={`button-view-3d-${item.id}`}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              View in 3D
                            </Button>
                          </div>
                        ) : null}
                          <CardHeader className="space-y-3 pb-3">
                            <div className="space-y-1">
                              <CardTitle className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight">
                                {item.name}
                              </CardTitle>
                              {item.description && (
                                <CardDescription className="text-sm md:text-base leading-relaxed line-clamp-2 text-muted-foreground">
                                  {item.description}
                                </CardDescription>
                              )}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <Badge variant="outline" className="text-xs">
                                <Star className="h-3 w-3 mr-1 fill-primary text-primary" />
                                Popular
                              </Badge>
                              {!item.image && (
                                <Badge variant="outline" className="text-xs">
                                  ${item.price}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardFooter className="pt-0 flex gap-2">
                            {modelUrl && !item.image && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 group/view"
                                onClick={() => view3DModel(modelUrl, item.name)}
                                data-testid={`button-view-3d-${item.id}`}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View 3D
                              </Button>
                            )}
                            <Button
                              className={`${modelUrl && !item.image ? 'flex-1' : 'w-full'} group/btn relative overflow-hidden bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105`}
                              onClick={() => addToCart(item)}
                              data-testid={`button-add-to-cart-${item.id}`}
                            >
                              <span className="relative z-10 flex items-center">
                                <Plus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover/btn:rotate-90" />
                                Add to Cart
                              </span>
                              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                            </Button>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}

            {uncategorized.length > 0 && (
              <TabsContent value="uncategorized" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {uncategorized.sort((a, b) => a.displayOrder - b.displayOrder).map((item, index) => {
                    const modelUrl = get3DModel(item.id);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                      >
                        <Card 
                          className="group overflow-hidden hover-elevate transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border-2 hover:border-primary/20 bg-card/80 backdrop-blur-sm h-full"
                        >
                        {item.image ? (
                          <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {modelUrl && (
                              <Button
                                size="sm"
                                className="absolute bottom-3 right-3 backdrop-blur-md bg-background/90 hover:bg-background border border-primary/20 shadow-lg transition-all duration-300 hover:scale-110"
                                onClick={() => view3DModel(modelUrl, item.name)}
                                data-testid={`button-view-3d-${item.id}`}
                              >
                                <Sparkles className="h-4 w-4 mr-1" />
                                View in 3D
                              </Button>
                            )}
                            <div className="absolute top-3 left-3">
                              <Badge className="bg-primary/90 backdrop-blur-sm text-primary-foreground border-0 shadow-lg">
                                ${item.price}
                              </Badge>
                            </div>
                          </div>
                        ) : modelUrl ? (
                          <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex flex-col items-center justify-center gap-4 p-6 border-b border-primary/10">
                            <div className="text-center space-y-2">
                              <div className="flex justify-center mb-2">
                                <div className="p-3 rounded-full bg-primary/10">
                                  <Sparkles className="h-6 w-6 text-primary" />
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-foreground">3D Model Available</p>
                              <p className="text-xs text-muted-foreground max-w-xs">Experience this item in immersive 3D</p>
                            </div>
                            <Button
                              size="lg"
                              className="w-full max-w-[200px] shadow-md"
                              onClick={() => view3DModel(modelUrl, item.name)}
                              data-testid={`button-view-3d-${item.id}`}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              View in 3D
                            </Button>
                          </div>
                        ) : null}
                          <CardHeader className="space-y-3 pb-3">
                            <div className="space-y-1">
                              <CardTitle className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight">
                                {item.name}
                              </CardTitle>
                              {item.description && (
                                <CardDescription className="text-sm md:text-base leading-relaxed line-clamp-2 text-muted-foreground">
                                  {item.description}
                                </CardDescription>
                              )}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <Badge variant="outline" className="text-xs">
                                <Star className="h-3 w-3 mr-1 fill-primary text-primary" />
                                Popular
                              </Badge>
                              {!item.image && (
                                <Badge variant="outline" className="text-xs">
                                  ${item.price}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardFooter className="pt-0 flex gap-2">
                            {modelUrl && !item.image && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 group/view"
                                onClick={() => view3DModel(modelUrl, item.name)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View 3D
                              </Button>
                            )}
                            <Button
                              className={`${modelUrl && !item.image ? 'flex-1' : 'w-full'} group/btn relative overflow-hidden bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105`}
                              onClick={() => addToCart(item)}
                            >
                              <span className="relative z-10 flex items-center">
                                <Plus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover/btn:rotate-90" />
                                Add to Cart
                              </span>
                              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                            </Button>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {menuItems?.filter((item) => item.available).sort((a, b) => a.displayOrder - b.displayOrder).map((item, index) => {
              const modelUrl = get3DModel(item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                >
                  <Card 
                    className="group overflow-hidden hover-elevate transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border-2 hover:border-primary/20 bg-card/80 backdrop-blur-sm h-full"
                  >
                  {item.image ? (
                    <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="w-full h-full"
                      >
                        <ImageWithLoader
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-700"
                        />
                      </motion.div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {modelUrl && (
                        <Button
                          size="sm"
                          className="absolute bottom-3 right-3 backdrop-blur-md bg-background/90 hover:bg-background border border-primary/20 shadow-lg transition-all duration-300 hover:scale-110"
                          onClick={() => view3DModel(modelUrl, item.name)}
                          data-testid={`button-view-3d-${item.id}`}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          View in 3D
                        </Button>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-primary/90 backdrop-blur-sm text-primary-foreground border-0 shadow-lg">
                          ${item.price}
                        </Badge>
                      </div>
                    </div>
                  ) : modelUrl ? (
                    <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex flex-col items-center justify-center gap-4 p-6 border-b border-primary/10">
                      <div className="text-center space-y-2">
                        <div className="flex justify-center mb-2">
                          <div className="p-3 rounded-full bg-primary/10">
                            <Sparkles className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-foreground">3D Model Available</p>
                        <p className="text-xs text-muted-foreground max-w-xs">Experience this item in immersive 3D</p>
                      </div>
                      <Button
                        size="lg"
                        className="w-full max-w-[200px] shadow-md"
                        onClick={() => view3DModel(modelUrl, item.name)}
                        data-testid={`button-view-3d-${item.id}`}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        View in 3D
                      </Button>
                    </div>
                  ) : null}
                    <CardHeader className="space-y-3 pb-3">
                      <div className="space-y-1">
                        <CardTitle className="text-xl md:text-2xl font-bold group-hover:text-primary transition-colors duration-300 line-clamp-2 leading-tight">
                          {item.name}
                        </CardTitle>
                        {item.description && (
                          <CardDescription className="text-sm md:text-base leading-relaxed line-clamp-2 text-muted-foreground">
                            {item.description}
                          </CardDescription>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant="outline" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-primary text-primary" />
                          Popular
                        </Badge>
                        {!item.image && (
                          <Badge variant="outline" className="text-xs">
                            ${item.price}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardFooter className="pt-0 flex gap-2">
                      {modelUrl && !item.image && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 group/view"
                          onClick={() => view3DModel(modelUrl, item.name)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View 3D
                        </Button>
                      )}
                      <Button
                        className={`${modelUrl && !item.image ? 'flex-1' : 'w-full'} group/btn relative overflow-hidden bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105`}
                        onClick={() => addToCart(item)}
                      >
                        <span className="relative z-10 flex items-center">
                          <Plus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover/btn:rotate-90" />
                          Add to Cart
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer Reviews Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6 }}
        className="relative bg-gradient-to-b from-background via-primary/5 to-background py-16 md:py-20 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-foreground">
              What Our Customers Say
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl">
              Real reviews from real customers
            </p>
          </div>
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            setApi={setReviewsApi}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {reviews.map((review, index) => (
                <CarouselItem key={review.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <Card className="h-full bg-card/80 backdrop-blur-sm border-2 hover:border-primary/20 transition-all duration-300">
                      <CardHeader className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-primary border-2 border-primary/20">
                            {review.avatar}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{review.name}</CardTitle>
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? "fill-primary text-primary"
                                      : "fill-muted text-muted-foreground"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <CardDescription className="text-base leading-relaxed italic">
                          "{review.text}"
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 bg-background/90 backdrop-blur-md border-2 border-primary/20 hover:bg-background shadow-lg" />
            <CarouselNext className="right-2 bg-background/90 backdrop-blur-md border-2 border-primary/20 hover:bg-background shadow-lg" />
            {/* Carousel Dots */}
            <div className="flex justify-center gap-2 mt-8">
              {reviews.map((_, index) => (
                <button
                  key={index}
                  onClick={() => reviewsApi?.scrollTo(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    reviewsCurrent === index
                      ? "w-8 bg-primary"
                      : "w-2 bg-primary/30 hover:bg-primary/50"
                  }`}
                  aria-label={`Go to review ${index + 1}`}
                />
              ))}
            </div>
          </Carousel>
        </div>
      </motion.div>

      {/* Footer CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="relative bg-gradient-to-r from-primary via-primary/90 to-primary py-12 md:py-16 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10 space-y-6">
          <motion.div
            initial={{ scale: 0.9 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold text-primary-foreground mb-4">
              Order Now and Earn Rewards
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
              Join our loyalty program and get exclusive discounts, early access to new items, and special rewards!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                size="lg"
                variant="secondary"
                className="bg-background text-primary hover:bg-background/90 text-lg px-8 py-6 rounded-full shadow-xl hover:scale-105 transition-all duration-300 group/cta"
                onClick={() => {
                  document.getElementById("menu-content")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                <span className="flex items-center">
                  Start Ordering
                  <ChevronRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover/cta:translate-x-1" />
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-primary/10 border-2 border-primary-foreground/20 text-primary-foreground hover:bg-primary/20 text-lg px-8 py-6 rounded-full backdrop-blur-sm"
              >
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* 3D Model Viewer Dialog */}
      <Dialog open={is3DViewerOpen} onOpenChange={setIs3DViewerOpen}>
        <DialogContent className="max-w-4xl h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>{selectedItemName}</DialogTitle>
            <DialogDescription>
              Drag to rotate • Pinch to zoom • Two fingers to pan
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 p-6 pt-4">
            {selected3DModel && (
              <model-viewer
                src={selected3DModel}
                alt={selectedItemName}
                auto-rotate
                camera-controls
                shadow-intensity="1"
                exposure="1"
                style={{ width: '100%', height: '100%', minHeight: '500px' }}
                data-testid="model-viewer"
              />
            )}
          </div>
          <div className="p-6 pt-0 flex justify-end">
            <Button onClick={() => setIs3DViewerOpen(false)} data-testid="button-close-3d-viewer">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
