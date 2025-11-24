import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MenuItem, InsertMenuItem, insertMenuItemSchema, Restaurant, Category, GenerationJob } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Upload, X, Sparkles, Eye, Search, Filter, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

export default function MenuItems() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [is3DDialogOpen, setIs3DDialogOpen] = useState(false);
  const [is3DViewerOpen, setIs3DViewerOpen] = useState(false);
  const [selected3DModel, setSelected3DModel] = useState<string | null>(null);
  const [selectedItemName, setSelectedItemName] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurantFilter, setRestaurantFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [status3DFilter, setStatus3DFilter] = useState<string>("all");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: menuItems, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["/api/menu-items"],
  });

  const { data: restaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: generationJobs } = useQuery<GenerationJob[]>({
    queryKey: ["/api/generation-jobs"],
    refetchInterval: (query) => {
      // Only poll if there are jobs in processing state
      const jobs = query.state.data || [];
      const hasProcessingJobs = jobs.some(job => job.status === "processing" || job.status === "pending");
      return hasProcessingJobs ? 30000 : false; // Poll every 30 seconds if processing
    },
  });

  const form = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      restaurantId: "",
      categoryId: "",
      available: true,
      displayOrder: 0,
    },
  });

  const editForm = useForm<InsertMenuItem>({
    resolver: zodResolver(insertMenuItemSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertMenuItem) => {
      return await apiRequest("POST", "/api/menu-items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setIsCreateOpen(false);
      form.reset();
      setImagePreview(null);
      toast({
        title: "Menu item created",
        description: "Your menu item has been created successfully.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InsertMenuItem> }) => {
      return await apiRequest("PATCH", `/api/menu-items/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setIsEditOpen(false);
      setSelectedItem(null);
      toast({
        title: "Menu item updated",
        description: "Your menu item has been updated successfully.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/menu-items/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setIsDeleteOpen(false);
      setSelectedItem(null);
      toast({
        title: "Menu item deleted",
        description: "Your menu item has been deleted successfully.",
      });
    },
  });

  const generate3DMutation = useMutation({
    mutationFn: async (data: { menuItemId: string; image: File }) => {
      const formData = new FormData();
      formData.append("menuItemId", data.menuItemId);
      formData.append("image", data.image, data.image.name);

      const response = await fetch("/api/generate-3d", {
        method: "POST",
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Failed to generate 3D model" }));
        throw new Error(errorData.message || "Failed to generate 3D model");
      }

      return response.json();
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["/api/generation-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setIs3DDialogOpen(false);
      setUploadedImage(null);
      toast({
        title: "3D Generation Started",
        description: "Your 3D model is being generated. This may take a few minutes.",
      });
      
      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const updatedJob = await fetch(`/api/generation-jobs/${job.id}`).then(r => r.json());
          
          if (updatedJob.status === "completed") {
            clearInterval(pollInterval);
            queryClient.invalidateQueries({ queryKey: ["/api/generation-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
            toast({
              title: "3D Model Generated!",
              description: "Your 3D model is now available. Click 'View 3D Model' to see it.",
            });
          } else if (updatedJob.status === "failed") {
            clearInterval(pollInterval);
            queryClient.invalidateQueries({ queryKey: ["/api/generation-jobs"] });
            toast({
              title: "Generation Failed",
              description: updatedJob.error || "3D model generation failed.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error polling generation status:", error);
        }
      }, 30000); // Poll every 30 seconds
      
      // Clear interval after 5 minutes to avoid infinite polling
      setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start 3D generation.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUploadFor3D = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    editForm.reset({
      name: item.name,
      description: item.description || "",
      price: item.price,
      restaurantId: item.restaurantId,
      categoryId: item.categoryId || "",
      available: item.available,
      displayOrder: item.displayOrder,
    });
    setIsEditOpen(true);
  };

  const getJobForItem = (itemId: string): GenerationJob | undefined => {
    return generationJobs?.find((job) => job.menuItemId === itemId);
  };

  const view3DModel = (modelUrl: string, itemName: string) => {
    setSelected3DModel(modelUrl);
    setSelectedItemName(itemName);
    setIs3DViewerOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      processing: "default",
      completed: "default",
      failed: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized";
    return categories?.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  const getRestaurantName = (restaurantId: string) => {
    return restaurants?.find((r) => r.id === restaurantId)?.name || "Unknown";
  };

  // Get 3D status for an item
  const get3DStatus = (item: MenuItem): "none" | "processing" | "ready" | "failed" => {
    const job = getJobForItem(item.id);
    if (job) {
      if (job.status === "completed" && job.modelUrl) return "ready";
      if (job.status === "processing" || job.status === "pending") return "processing";
      if (job.status === "failed") return "failed";
    }
    // Check if item has model3D data
    const model3D = (item as any)?.model3D;
    if (model3D?.modelUrl) return "ready";
    return "none";
  };

  // Filter menu items
  const filteredMenuItems = useMemo(() => {
    if (!menuItems) return [];
    
    return menuItems.filter((item) => {
      // Search filter
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Restaurant filter
      const matchesRestaurant = restaurantFilter === "all" || item.restaurantId === restaurantFilter;
      
      // Category filter
      const matchesCategory = categoryFilter === "all" || item.categoryId === categoryFilter;
      
      // Availability filter
      const matchesAvailability = 
        availabilityFilter === "all" || 
        (availabilityFilter === "available" && item.available) ||
        (availabilityFilter === "unavailable" && !item.available);
      
      // 3D Status filter
      const item3DStatus = get3DStatus(item);
      const matches3DStatus = 
        status3DFilter === "all" ||
        (status3DFilter === "none" && item3DStatus === "none") ||
        (status3DFilter === "processing" && item3DStatus === "processing") ||
        (status3DFilter === "ready" && item3DStatus === "ready");
      
      return matchesSearch && matchesRestaurant && matchesCategory && matchesAvailability && matches3DStatus;
    });
  }, [menuItems, searchQuery, restaurantFilter, categoryFilter, availabilityFilter, status3DFilter, generationJobs]);

  // Get 3D Status Badge Component
  const get3DStatusBadge = (item: MenuItem) => {
    const status = get3DStatus(item);
    const job = getJobForItem(item.id);
    
    switch (status) {
      case "ready":
        return (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            3D Ready
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processing...
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted">
            No 3D
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
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
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold" data-testid="text-menu-items-title">
            Menu Items
          </h1>
          <p className="text-muted-foreground mt-1">Manage your menu items and 3D models</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-menu-item" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Menu Item</DialogTitle>
              <DialogDescription>
                Add a new dish to your menu
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="restaurantId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restaurant</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-restaurant">
                            <SelectValue placeholder="Select a restaurant" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {restaurants?.map((restaurant) => (
                            <SelectItem key={restaurant.id} value={restaurant.id}>
                              {restaurant.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? "" : value)} value={field.value ? field.value : "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select a category (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Grilled Salmon" {...field} data-testid="input-item-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Fresh Atlantic salmon..." {...field} value={field.value || ""} data-testid="input-item-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="19.99" {...field} data-testid="input-item-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="displayOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Order</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="available"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border p-3 space-y-0">
                        <div className="space-y-0.5">
                          <FormLabel>Available</FormLabel>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormLabel>Item Image (Optional)</FormLabel>
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </Button>
                    {imagePreview && (
                      <div className="mt-2 relative">
                        <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-md" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={() => setImagePreview(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-menu-item">
                    {createMutation.isPending ? "Creating..." : "Create Menu Item"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select value={restaurantFilter} onValueChange={setRestaurantFilter}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Restaurant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Restaurants</SelectItem>
              {restaurants?.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status3DFilter} onValueChange={setStatus3DFilter}>
            <SelectTrigger>
              <SelectValue placeholder="3D Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="none">No 3D</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="ready">3D Ready</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {menuItems && menuItems.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No menu items yet</CardTitle>
            <CardDescription>
              Create your first menu item to get started
            </CardDescription>
          </CardHeader>
        </Card>
      ) : filteredMenuItems.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No menu items found</CardTitle>
            <CardDescription>
              Try adjusting your search or filter criteria
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredMenuItems.sort((a, b) => a.displayOrder - b.displayOrder).map((item, index) => {
              const job = getJobForItem(item.id);
              const item3DStatus = get3DStatus(item);
              const model3D = (item as any)?.model3D;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <Card 
                    className="hover-elevate overflow-hidden border-2 hover:border-primary/20 transition-all duration-300 bg-card/50 backdrop-blur-sm h-full" 
                    data-testid={`card-menu-item-${item.id}`}
                  >
                    {item.image ? (
                      <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
                      </div>
                    ) : (
                      <div className="aspect-video w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="line-clamp-2 flex-1">{item.name}</CardTitle>
                        <span className="text-lg font-bold text-primary whitespace-nowrap">
                          ${item.price}
                        </span>
                      </div>
                      {item.description && (
                        <CardDescription className="line-clamp-2">
                          {item.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{getCategoryName(item.categoryId)}</Badge>
                        <Badge variant={item.available ? "default" : "secondary"}>
                          {item.available ? "Available" : "Unavailable"}
                        </Badge>
                        {/* Sample tags - you can add these to your schema later */}
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">Veg</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {getRestaurantName(item.restaurantId)}
                        </p>
                        {get3DStatusBadge(item)}
                      </div>
                      {job && job.status === "processing" && (
                        <div className="space-y-1">
                          <Progress value={job.progress || 0} className="h-2" />
                          <p className="text-xs text-muted-foreground">Generating 3D model...</p>
                        </div>
                      )}
                      {(item3DStatus === "ready" && (job?.modelUrl || model3D?.modelUrl)) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full" 
                          onClick={() => {
                            const modelUrl = job?.modelUrl || model3D?.modelUrl;
                            if (modelUrl) view3DModel(modelUrl, item.name);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View 3D Model
                        </Button>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-wrap gap-2 pt-4">
                      {item3DStatus === "none" && (
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => { setSelectedItem(item); setIs3DDialogOpen(true); }} 
                          data-testid={`button-generate-3d-${item.id}`}
                          className="flex-1"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Generate 3D
                        </Button>
                      )}
                      {item3DStatus === "processing" && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          disabled
                          className="flex-1"
                        >
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          Processing...
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(item)} data-testid={`button-edit-${item.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedItem(item); setIsDeleteOpen(true); }} data-testid={`button-delete-${item.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 3D Generation Dialog */}
      <Dialog open={is3DDialogOpen} onOpenChange={setIs3DDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate 3D Model</DialogTitle>
            <DialogDescription>
              Upload 1 image of "{selectedItem?.name}" to generate a 3D model
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <input
                ref={multiFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUploadFor3D}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => multiFileInputRef.current?.click()}
                className="w-full"
                disabled={!!uploadedImage}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploadedImage ? "Image Selected" : "Upload Image"}
              </Button>
            </div>
            {uploadedImage && (
              <div className="relative aspect-square max-w-md mx-auto">
                <img
                  src={URL.createObjectURL(uploadedImage)}
                  alt="Upload preview"
                  className="w-full h-full object-cover rounded-md"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={removeImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            {!uploadedImage && (
              <p className="text-sm text-muted-foreground text-center">
                Please upload an image to generate the 3D model
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={() => selectedItem && uploadedImage && generate3DMutation.mutate({ menuItemId: selectedItem.id, image: uploadedImage })}
              disabled={!uploadedImage || generate3DMutation.isPending}
              data-testid="button-start-generation"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {generate3DMutation.isPending ? "Starting..." : "Generate 3D Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Similar to Create */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>
              Update menu item information
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => selectedItem && updateMutation.mutate({ id: selectedItem.id, updates: data }))} className="space-y-4">
              <FormField
                control={editForm.control}
                name="restaurantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Restaurant</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a restaurant" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {restaurants?.map((restaurant) => (
                          <SelectItem key={restaurant.id} value={restaurant.id}>
                            {restaurant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "none" ? "" : value)} value={field.value ? field.value : "none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Grilled Salmon" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Fresh Atlantic salmon..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="19.99" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="available"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-3 space-y-0">
                      <div className="space-y-0.5">
                        <FormLabel>Available</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-menu-item">
                  {updateMutation.isPending ? "Updating..." : "Update Menu Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedItem?.name}" and any associated 3D models.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <Button onClick={() => setIs3DViewerOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
