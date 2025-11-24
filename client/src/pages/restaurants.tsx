import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Restaurant, InsertRestaurant, insertRestaurantSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Eye, QrCode, Pencil, Trash2, Search, Filter, MapPin, Phone, Mail, Building2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Restaurants() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: restaurants, isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  // Filter restaurants
  const filteredRestaurants = useMemo(() => {
    if (!restaurants) return [];
    
    return restaurants.filter((restaurant) => {
      const matchesSearch = 
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        restaurant.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // For now, all restaurants are "active" - you can add a status field later
      const matchesStatus = statusFilter === "all" || statusFilter === "active";
      
      return matchesSearch && matchesStatus;
    });
  }, [restaurants, searchQuery, statusFilter]);

  const form = useForm<InsertRestaurant>({
    resolver: zodResolver(insertRestaurantSchema),
    defaultValues: {
      name: "",
      description: "",
      address: "",
      phone: "",
      email: "",
    },
  });

  const editForm = useForm<InsertRestaurant>({
    resolver: zodResolver(insertRestaurantSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertRestaurant) => {
      return await apiRequest("POST", "/api/restaurants", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: "Restaurant created",
        description: "Your restaurant has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create restaurant.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Partial<InsertRestaurant> }) => {
      return await apiRequest("PATCH", `/api/restaurants/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setIsEditOpen(false);
      setSelectedRestaurant(null);
      toast({
        title: "Restaurant updated",
        description: "Your restaurant has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update restaurant.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/restaurants/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setIsDeleteOpen(false);
      setSelectedRestaurant(null);
      toast({
        title: "Restaurant deleted",
        description: "Your restaurant has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete restaurant.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    editForm.reset({
      name: restaurant.name,
      description: restaurant.description || "",
      address: restaurant.address || "",
      phone: restaurant.phone || "",
      email: restaurant.email || "",
    });
    setIsEditOpen(true);
  };

  const handleDelete = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsDeleteOpen(true);
  };

  const handleViewQr = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setIsQrOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-full mt-2" />
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
          <h1 className="text-3xl md:text-4xl font-display font-bold" data-testid="text-restaurants-title">
            Restaurants
          </h1>
          <p className="text-muted-foreground mt-1">Manage your restaurant accounts</p>
        </div>
        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <SheetTrigger asChild>
            <Button data-testid="button-create-restaurant" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Restaurant
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <SheetHeader className="pb-6 border-b">
                <SheetTitle className="text-2xl">Create Restaurant</SheetTitle>
                <SheetDescription>
                  Add a new restaurant to your 3D Tech-Menu platform
                </SheetDescription>
              </SheetHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6 mt-6">
                  {/* Basic Info Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2">
                      <div className="h-px flex-1 bg-border" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h3>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Restaurant Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Joe's Diner" 
                              {...field} 
                              data-testid="input-restaurant-name"
                              className="h-10"
                            />
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
                          <FormLabel className="text-sm font-medium">Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="A cozy family restaurant serving fresh, locally-sourced ingredients..." 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-restaurant-description"
                              className="min-h-[100px] resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Contact Details Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2">
                      <div className="h-px flex-1 bg-border" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Details</h3>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Phone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="+1 (555) 123-4567" 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-restaurant-phone"
                                className="h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="contact@restaurant.com" 
                                {...field} 
                                value={field.value || ""} 
                                data-testid="input-restaurant-email"
                                className="h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123 Main St, City, State 12345" 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-restaurant-address"
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <SheetFooter className="gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending} 
                      data-testid="button-submit-restaurant" 
                      className="w-full sm:w-auto"
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Restaurant"
                      )}
                    </Button>
                  </SheetFooter>
                </form>
              </Form>
            </motion.div>
          </SheetContent>
        </Sheet>
      </motion.div>

      {/* Search and Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, address, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {restaurants && restaurants.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No restaurants yet</CardTitle>
            <CardDescription>
              Create your first restaurant to get started with 3D Tech-Menu
            </CardDescription>
          </CardHeader>
        </Card>
      ) : filteredRestaurants.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No restaurants found</CardTitle>
            <CardDescription>
              Try adjusting your search or filter criteria
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <AnimatePresence>
            {filteredRestaurants.map((restaurant, index) => (
              <motion.div
                key={restaurant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Card 
                  className="hover-elevate border-2 hover:border-primary/20 transition-all duration-300 bg-card/50 backdrop-blur-sm h-full" 
                  data-testid={`card-restaurant-${restaurant.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="flex items-center gap-2 mb-2">
                          <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                          <span className="line-clamp-1">{restaurant.name}</span>
                        </CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                            Active
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {restaurant.description && (
                      <CardDescription className="line-clamp-2 mt-2">
                        {restaurant.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {restaurant.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-muted-foreground line-clamp-1">{restaurant.address}</p>
                      </div>
                    )}
                    {restaurant.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-muted-foreground">{restaurant.phone}</p>
                      </div>
                    )}
                    {restaurant.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <p className="text-muted-foreground line-clamp-1">{restaurant.email}</p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.href = `/menu/${restaurant.id}`} 
                      data-testid={`button-view-menu-${restaurant.id}`}
                      className="flex-1 sm:flex-initial"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Menu
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewQr(restaurant)} 
                      data-testid={`button-view-qr-${restaurant.id}`}
                      className="flex-1 sm:flex-initial"
                    >
                      <QrCode className="h-4 w-4 mr-1" />
                      QR Code
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(restaurant)} 
                      data-testid={`button-edit-${restaurant.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(restaurant)} 
                      data-testid={`button-delete-${restaurant.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Edit Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <SheetHeader className="pb-6 border-b">
                <SheetTitle className="text-2xl">Edit Restaurant</SheetTitle>
                <SheetDescription>
                  Update restaurant information
                </SheetDescription>
              </SheetHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit((data) => selectedRestaurant && updateMutation.mutate({ id: selectedRestaurant.id, updates: data }))} className="space-y-6 mt-6">
                  {/* Basic Info Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2">
                      <div className="h-px flex-1 bg-border" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h3>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Restaurant Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Joe's Diner" 
                              {...field} 
                              data-testid="input-edit-name"
                              className="h-10"
                            />
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
                          <FormLabel className="text-sm font-medium">Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="A cozy family restaurant serving fresh, locally-sourced ingredients..." 
                              {...field} 
                              value={field.value || ""} 
                              data-testid="input-edit-description"
                              className="min-h-[100px] resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Contact Details Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2">
                      <div className="h-px flex-1 bg-border" />
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Contact Details</h3>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={editForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Phone</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="+1 (555) 123-4567" 
                                {...field} 
                                value={field.value || ""}
                                className="h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={editForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium">Email</FormLabel>
                            <FormControl>
                              <Input 
                                type="email" 
                                placeholder="contact@restaurant.com" 
                                {...field} 
                                value={field.value || ""}
                                className="h-10"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={editForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="123 Main St, City, State 12345" 
                              {...field} 
                              value={field.value || ""}
                              className="h-10"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <SheetFooter className="gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending} 
                      data-testid="button-update-restaurant" 
                      className="w-full sm:w-auto"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        "Update Restaurant"
                      )}
                    </Button>
                  </SheetFooter>
                </form>
              </Form>
            </motion.div>
          </SheetContent>
      </Sheet>

      {/* QR Code Dialog */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menu QR Code - {selectedRestaurant?.name}</DialogTitle>
            <DialogDescription>
              Scan this QR code to view the restaurant menu
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-6">
            {selectedRestaurant?.qrCode ? (
              <img src={selectedRestaurant.qrCode} alt="Menu QR Code" className="w-64 h-64" data-testid="img-qr-code" />
            ) : (
              <div className="w-64 h-64 bg-muted flex items-center justify-center rounded-md">
                <p className="text-sm text-muted-foreground text-center px-4">
                  QR code will be generated automatically
                </p>
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Menu URL: {window.location.origin}/menu/{selectedRestaurant?.id}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedRestaurant?.name}" and all associated menu items, categories, and orders. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedRestaurant && deleteMutation.mutate(selectedRestaurant.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
