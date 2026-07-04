import React, { useState, useMemo } from "react";
import { useGetMenu, usePlaceOrder, getGetMenuQueryKey } from "@workspace/api-client-react";
import type { MenuItem } from "@workspace/api-client-react/src/generated/api.schemas";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, ShoppingBag, Plus, Minus, Trash2, MapPin, Phone, Instagram, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

// Assets
import heroImage from "@assets/1783165982523_1783167214608.png";

const orderFormSchema = z.object({
  customerName: z.string().min(2, "Name is required"),
  customerPhone: z.string().optional(),
  customerNote: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

interface CartItem extends MenuItem {
  quantity: number;
}

export default function Home() {
  const { data: menuItems, isLoading: isMenuLoading } = useGetMenu();
  const placeOrder = usePlaceOrder();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerNote: "",
    },
  });

  const menuByCategory = useMemo(() => {
    if (!menuItems) return {};
    return menuItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [menuItems]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    toast({
      title: "Added to cart",
      description: `${item.name} added.`,
      duration: 2000,
    });
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          const newQty = Math.max(1, i.quantity + delta);
          return { ...i, quantity: newQty };
        }
        return i;
      })
    );
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cart]);

  const onSubmit = (data: OrderFormValues) => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add some items to your order first.",
        variant: "destructive",
      });
      return;
    }

    placeOrder.mutate(
      {
        data: {
          customerName: data.customerName,
          customerPhone: data.customerPhone || null,
          customerNote: data.customerNote || null,
          items: cart.map((item) => ({
            menuItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      {
        onSuccess: () => {
          setCart([]);
          form.reset();
          setIsSuccessDialogOpen(true);
        },
        onError: () => {
          toast({
            title: "Order Failed",
            description: "There was a problem placing your order. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground pb-20 md:pb-0">
      {/* Header Banner */}
      <div className="w-full bg-primary overflow-hidden relative">
        <div className="absolute inset-0 bg-black/20 z-10" />
        <img 
          src={heroImage} 
          alt="Crave Republic Flier" 
          className="w-full h-64 md:h-96 object-cover object-center opacity-90"
        />
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-6 bg-gradient-to-t from-black/80 to-transparent">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2 tracking-tight">
            Crave Republic
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-lg mb-6">
            Warm, appetizing, and bold. The best shawarma, fries, and fresh juice in Abuja.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-white/90">
            <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Phone className="w-4 h-4" /> 07037325337
            </span>
            <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <MapPin className="w-4 h-4" /> Lugbe, Abuja
            </span>
            <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Instagram className="w-4 h-4" /> @craverepublicabuja
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row gap-10">
        
        {/* Menu Section */}
        <div className="flex-1">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Our Menu</h2>
            <p className="text-muted-foreground">Select your favorites to add them to your cart.</p>
          </div>

          {isMenuLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(menuByCategory).map(([category, items]) => (
                <div key={category} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-2xl font-bold border-b border-primary/20 pb-3 mb-6 flex items-center gap-3">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-md text-sm uppercase tracking-wider">
                      {category}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((item) => (
                      <Card key={item.id} className="overflow-hidden group hover:shadow-md transition-all duration-300 border-primary/10 hover:border-primary/30">
                        <CardContent className="p-5 flex flex-col h-full">
                          <div className="flex justify-between items-start mb-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                                {item.name}
                              </h4>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="font-bold text-primary whitespace-nowrap bg-primary/5 px-2 py-1 rounded">
                              {formatNaira(item.price)}
                            </div>
                          </div>
                          
                          <div className="mt-auto pt-4 flex justify-end">
                            <Button 
                              onClick={() => addToCart(item)}
                              variant="secondary"
                              className="rounded-full font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                              size="sm"
                              data-testid={`button-add-to-cart-${item.id}`}
                            >
                              <Plus className="w-4 h-4 mr-1" /> Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart & Checkout Section */}
        <div className="w-full lg:w-96 shrink-0 lg:sticky lg:top-8 h-fit space-y-6">
          <Card className="border-primary/20 shadow-lg shadow-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2 rounded-full text-primary">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold">Your Cart</h2>
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground flex flex-col items-center">
                  <ShoppingBag className="w-12 h-12 mb-3 text-muted-foreground/30" />
                  <p>Your cart is empty.</p>
                  <p className="text-sm mt-1">Add some delicious items from the menu!</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-secondary/30 p-3 rounded-lg animate-in slide-in-from-right-2">
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-sm truncate" title={item.name}>{item.name}</h5>
                        <p className="text-primary font-semibold text-sm">{formatNaira(item.price * item.quantity)}</p>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-background border rounded-md px-1 shrink-0">
                        <button 
                          type="button"
                          className="p-1 hover:text-primary transition-colors text-muted-foreground"
                          onClick={() => updateQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                        <button 
                          type="button"
                          className="p-1 hover:text-primary transition-colors text-muted-foreground"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <button 
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-muted-foreground hover:text-destructive shrink-0 p-1 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-primary">{formatNaira(cartTotal)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card className="border-primary/20 shadow-lg shadow-primary/5">
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">Delivery Details</h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="080..." {...field} className="bg-background" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customerNote"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any special instructions?" 
                            {...field} 
                            className="bg-background resize-none"
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-bold shadow-md hover:shadow-lg transition-all"
                    disabled={cart.length === 0 || placeOrder.isPending}
                    data-testid="button-submit-order"
                  >
                    {placeOrder.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                        Placing Order...
                      </>
                    ) : (
                      `Place Order • ${formatNaira(cartTotal)}`
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">Order Received!</DialogTitle>
            <DialogDescription className="text-center text-base mt-2">
              Thank you for choosing Crave Republic. We're preparing your sizzling order right now!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center mt-6">
            <Button 
              type="button" 
              size="lg"
              className="w-full font-bold"
              onClick={() => setIsSuccessDialogOpen(false)}
            >
              Back to Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
