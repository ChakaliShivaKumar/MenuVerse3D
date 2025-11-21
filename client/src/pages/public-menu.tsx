import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
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
import { ShoppingCart, Plus, Minus, Trash2, Sparkles, X } from "lucide-react";
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
      return response.json();
    },
    enabled: !!restaurantId,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/restaurants", restaurantId, "categories"],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/categories`);
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
    enabled: !!restaurantId,
  });

  const { data: generationJobs } = useQuery<GenerationJob[]>({
    queryKey: ["/api/generation-jobs"],
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

  const get3DModel = (itemId: string): GenerationJob | undefined => {
    return generationJobs?.find((job) => 
      job.menuItemId === itemId && job.status === "completed" && job.modelUrl
    );
  };

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

  if (loadingRestaurant || loadingItems) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-64 bg-muted animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full" />
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {restaurant.bannerImage && (
          <img src={restaurant.bannerImage} alt={restaurant.name} className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="relative h-full max-w-7xl mx-auto px-4 flex flex-col justify-end pb-8">
          <div className="flex items-end gap-4">
            {restaurant.logo && (
              <img src={restaurant.logo} alt={`${restaurant.name} logo`} className="h-20 w-20 rounded-lg border-4 border-background shadow-lg" />
            )}
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-2" data-testid="text-restaurant-name">
                {restaurant.name}
              </h1>
              {restaurant.description && (
                <p className="text-muted-foreground text-lg max-w-2xl">
                  {restaurant.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cart Button - Fixed */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-6 right-6 rounded-full h-14 px-6 shadow-lg z-50"
            data-testid="button-open-cart"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Cart {cartItemCount > 0 && `(${cartItemCount})`}
          </Button>
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

      {/* Menu Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
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
                  {categorized[category.id]?.sort((a, b) => a.displayOrder - b.displayOrder).map((item) => {
                    const job = get3DModel(item.id);
                    return (
                      <Card key={item.id} className="overflow-hidden hover-elevate transition-all duration-300" data-testid={`card-menu-item-${item.id}`}>
                        {item.image && (
                          <div className="relative aspect-video w-full overflow-hidden">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            {job?.modelUrl && (
                              <Button
                                size="sm"
                                className="absolute bottom-2 right-2 backdrop-blur-sm bg-background/80 hover:bg-background/90"
                                onClick={() => view3DModel(job.modelUrl!, item.name)}
                                data-testid={`button-view-3d-${item.id}`}
                              >
                                <Sparkles className="h-4 w-4 mr-1" />
                                View in 3D
                              </Button>
                            )}
                          </div>
                        )}
                        <CardHeader>
                          <CardTitle className="flex items-start justify-between gap-2">
                            <span className="line-clamp-2">{item.name}</span>
                            <span className="text-lg font-bold text-primary whitespace-nowrap">
                              ${item.price}
                            </span>
                          </CardTitle>
                          {item.description && (
                            <CardDescription className="line-clamp-2">
                              {item.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardFooter>
                          <Button
                            className="w-full"
                            onClick={() => addToCart(item)}
                            data-testid={`button-add-to-cart-${item.id}`}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}

            {uncategorized.length > 0 && (
              <TabsContent value="uncategorized" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {uncategorized.sort((a, b) => a.displayOrder - b.displayOrder).map((item) => {
                    const job = get3DModel(item.id);
                    return (
                      <Card key={item.id} className="overflow-hidden hover-elevate transition-all duration-300">
                        {item.image && (
                          <div className="relative aspect-video w-full overflow-hidden">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            {job?.modelUrl && (
                              <Button
                                size="sm"
                                className="absolute bottom-2 right-2 backdrop-blur-sm bg-background/80"
                                onClick={() => view3DModel(job.modelUrl!, item.name)}
                              >
                                <Sparkles className="h-4 w-4 mr-1" />
                                View in 3D
                              </Button>
                            )}
                          </div>
                        )}
                        <CardHeader>
                          <CardTitle className="flex items-start justify-between gap-2">
                            <span className="line-clamp-2">{item.name}</span>
                            <span className="text-lg font-bold text-primary whitespace-nowrap">
                              ${item.price}
                            </span>
                          </CardTitle>
                          {item.description && (
                            <CardDescription className="line-clamp-2">
                              {item.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardFooter>
                          <Button className="w-full" onClick={() => addToCart(item)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add to Cart
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {menuItems?.filter((item) => item.available).sort((a, b) => a.displayOrder - b.displayOrder).map((item) => {
              const job = get3DModel(item.id);
              return (
                <Card key={item.id} className="overflow-hidden hover-elevate transition-all duration-300">
                  {item.image && (
                    <div className="relative aspect-video w-full overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      {job?.modelUrl && (
                        <Button
                          size="sm"
                          className="absolute bottom-2 right-2 backdrop-blur-sm bg-background/80"
                          onClick={() => view3DModel(job.modelUrl!, item.name)}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          View in 3D
                        </Button>
                      )}
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2">{item.name}</span>
                      <span className="text-lg font-bold text-primary whitespace-nowrap">
                        ${item.price}
                      </span>
                    </CardTitle>
                    {item.description && (
                      <CardDescription className="line-clamp-2">
                        {item.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardFooter>
                    <Button className="w-full" onClick={() => addToCart(item)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Cart
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

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
