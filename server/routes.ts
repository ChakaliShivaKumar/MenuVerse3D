import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import QRCode from "qrcode";
import Replicate from "replicate";
import { 
  insertRestaurantSchema, 
  insertCategorySchema, 
  insertMenuItemSchema,
  insertOrderSchema,
  insertGenerationJobSchema,
} from "@shared/schema";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// Ensure upload directories exist
const uploadsDir = join(process.cwd(), "uploads");
const imagesDir = join(uploadsDir, "images");
const modelsDir = join(uploadsDir, "models");

[uploadsDir, imagesDir, modelsDir].forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, imagesDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1]);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize Replicate client
let replicate: Replicate | null = null;
if (process.env.REPLICATE_API_TOKEN) {
  replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files statically
  app.use('/uploads', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use('/uploads', express.static(uploadsDir));

  // ===== RESTAURANT ROUTES =====
  app.get("/api/restaurants", async (req, res) => {
    try {
      const restaurants = await storage.getAllRestaurants();
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await storage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  app.post("/api/restaurants", async (req, res) => {
    try {
      const data = insertRestaurantSchema.parse(req.body);
      const restaurant = await storage.createRestaurant(data);
      
      // Generate QR code for the restaurant menu
      const menuUrl = `${req.protocol}://${req.get('host')}/menu/${restaurant.id}`;
      const qrCodeData = await QRCode.toDataURL(menuUrl);
      
      // Update restaurant with QR code
      const updated = await storage.updateRestaurant(restaurant.id, { qrCode: qrCodeData });
      
      res.status(201).json(updated || restaurant);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create restaurant" });
    }
  });

  app.patch("/api/restaurants/:id", async (req, res) => {
    try {
      const updates = req.body;
      const restaurant = await storage.updateRestaurant(req.params.id, updates);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update restaurant" });
    }
  });

  app.delete("/api/restaurants/:id", async (req, res) => {
    try {
      await storage.deleteRestaurant(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete restaurant" });
    }
  });

  app.get("/api/restaurants/:restaurantId/categories", async (req, res) => {
    try {
      const categories = await storage.getCategoriesByRestaurant(req.params.restaurantId);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/restaurants/:restaurantId/menu-items", async (req, res) => {
    try {
      const items = await storage.getMenuItemsByRestaurant(req.params.restaurantId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  // ===== CATEGORY ROUTES =====
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create category" });
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.updateCategory(req.params.id, req.body);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete category" });
    }
  });

  // ===== MENU ITEM ROUTES =====
  app.get("/api/menu-items", async (req, res) => {
    try {
      const items = await storage.getAllMenuItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu items" });
    }
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    try {
      const item = await storage.getMenuItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch menu item" });
    }
  });

  app.post("/api/menu-items", async (req, res) => {
    try {
      const data = insertMenuItemSchema.parse(req.body);
      const item = await storage.createMenuItem(data);
      res.status(201).json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create menu item" });
    }
  });

  app.patch("/api/menu-items/:id", async (req, res) => {
    try {
      const item = await storage.updateMenuItem(req.params.id, req.body);
      if (!item) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      res.json(item);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update menu item" });
    }
  });

  app.delete("/api/menu-items/:id", async (req, res) => {
    try {
      await storage.deleteMenuItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  });

  // ===== 3D GENERATION ROUTES =====
  app.get("/api/generation-jobs", async (req, res) => {
    try {
      const jobs = await storage.getAllGenerationJobs();
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch generation jobs" });
    }
  });

  app.get("/api/generation-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getGenerationJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Generation job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch generation job" });
    }
  });

  app.post("/api/generate-3d", upload.array('images', 5), async (req, res) => {
    try {
      const { menuItemId } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!menuItemId) {
        return res.status(400).json({ error: "menuItemId is required" });
      }

      if (!files || files.length !== 5) {
        return res.status(400).json({ error: "Exactly 5 images are required" });
      }

      if (!replicate) {
        return res.status(503).json({ error: "Replicate API not configured. Please add REPLICATE_API_TOKEN." });
      }

      // Store image URLs
      const imageUrls = files.map(file => `/uploads/images/${file.filename}`);

      // Create generation job
      const job = await storage.createGenerationJob({
        menuItemId,
        status: "pending",
        inputImages: imageUrls,
        progress: 0,
      });

      // Start Replicate prediction asynchronously
      (async () => {
        try {
          await storage.updateGenerationJob(job.id, { status: "processing", progress: 10 });

          // Note: Hunyuan3D-2 model on Replicate
          // For demo purposes, we'll simulate the 3D generation
          // In production, you would use the actual Replicate API call like:
          // const prediction = await replicate.predictions.create({
          //   model: "tencent/hunyuan3d-2",
          //   input: { images: imageUrls }
          // });

          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, 3000));
          await storage.updateGenerationJob(job.id, { progress: 50 });

          await new Promise(resolve => setTimeout(resolve, 3000));
          await storage.updateGenerationJob(job.id, { progress: 80 });

          // For demo: create a placeholder model URL
          // In production, this would be the actual .glb file from Replicate
          const modelUrl = `/uploads/models/placeholder-${menuItemId}.glb`;
          
          await storage.updateGenerationJob(job.id, {
            status: "completed",
            modelUrl,
            progress: 100,
          } as any);

          // Create 3D model entry
          await storage.create3DModel({
            menuItemId,
            modelUrl,
          });

        } catch (error: any) {
          await storage.updateGenerationJob(job.id, {
            status: "failed",
            error: error.message || "3D generation failed",
          });
        }
      })();

      res.status(202).json(job);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to start 3D generation" });
    }
  });

  // ===== ORDER ROUTES =====
  app.get("/api/orders", async (req, res) => {
    try {
      const { restaurantId } = req.query;
      const orders = restaurantId
        ? await storage.getOrdersByRestaurant(restaurantId as string)
        : await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const data = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(data);
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.updateOrder(req.params.id, req.body);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to update order" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      await storage.deleteOrder(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete order" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
