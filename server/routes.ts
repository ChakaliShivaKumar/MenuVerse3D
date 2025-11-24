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
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { readFile, writeFile, mkdir } from "fs/promises";
import { basename } from "path";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables if not already loaded
if (!process.env.REPLICATE_API_TOKEN && !process.env.DATABASE_URL) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  config({ path: path.resolve(__dirname, "..", ".env.local") });
}

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

// Initialize Replicate client (lazily to ensure env vars are loaded)
let replicate: Replicate | null = null;
function getReplicateClient(): Replicate | null {
  if (!replicate && process.env.REPLICATE_API_TOKEN) {
    replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    console.log("Replicate client initialized with token:", process.env.REPLICATE_API_TOKEN.substring(0, 10) + "...");
  }
  return replicate;
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
      // Include 3D model data in response
      const itemsWithModels = items.map((item: any) => ({
        ...item,
        model3D: item.model3D || null,
      }));
      res.json(itemsWithModels);
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

  app.post("/api/generate-3d", (req, res, next) => {
    const singleUpload = upload.single('image');
    singleUpload(req, res, (err) => {
      if (err) {
        console.error("Multer error:", err);
        if (err.name === 'MulterError') {
          return res.status(400).json({ error: `Upload error: ${err.message}. Field: ${err.field || 'unknown'}` });
        }
        return res.status(400).json({ error: err.message || "File upload error" });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const { menuItemId } = req.body;
      const file = req.file;

      if (!menuItemId) {
        return res.status(400).json({ error: "menuItemId is required" });
      }

      if (!file) {
        return res.status(400).json({ error: "1 image is required" });
      }

      const replicateClient = getReplicateClient();
      if (!replicateClient) {
        console.error("REPLICATE_API_TOKEN is not set in environment variables");
        return res.status(503).json({ error: "Replicate API not configured. Please add REPLICATE_API_TOKEN to your .env.local file." });
      }

      // Store image URL
      const imageUrl = `/uploads/images/${file.filename}`;

      // Create generation job
      const job = await storage.createGenerationJob({
        menuItemId,
        status: "pending",
        inputImages: [imageUrl],
        progress: 0,
      });

      // Start Replicate prediction asynchronously
      (async () => {
        try {
          await storage.updateGenerationJob(job.id, { status: "processing", progress: 10 });

          // Read the uploaded image file as Buffer
          const imagePath = join(imagesDir, file.filename);
          const imageBuffer = await readFile(imagePath);

          // Call Replicate API with Hunyuan3D-2 model
          const input = {
            seed: Math.floor(Math.random() * 10000),
            image: imageBuffer,
            steps: 50,
            num_chunks: 200000,
            max_facenum: 40000,
            guidance_scale: 5.5,
            octree_resolution: 512,
            remove_background: false
          };

          await storage.updateGenerationJob(job.id, { progress: 30 });

          const replicateClient = getReplicateClient();
          if (!replicateClient) {
            throw new Error("Replicate client not initialized");
          }
          
          const output = await replicateClient.run(
            "ndreca/hunyuan3d-2:0602bae6db1ce420f2690339bf2feb47e18c0c722a1f02e9db9abd774abaff5d",
            { input }
          ) as any;

          await storage.updateGenerationJob(job.id, { progress: 60 });

          // The output should have a mesh property according to the API
          const modelUrl = output?.mesh;
          
          if (!modelUrl) {
            throw new Error("No mesh URL in output from Replicate");
          }

          await storage.updateGenerationJob(job.id, { progress: 70 });

          // Download and save the GLB file from Replicate
          try {
            await mkdir(modelsDir, { recursive: true });
            
            const response = await fetch(modelUrl);
            if (!response.ok) {
              throw new Error(`Failed to download model: ${response.statusText}`);
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            
            // Pick a filename from the URL or use timestamp
            let filename = basename(new URL(modelUrl).pathname) || `model-${menuItemId}-${Date.now()}.glb`;
            // Ensure .glb extension
            if (!filename.includes('.')) {
              filename = filename + '.glb';
            }
            
            const modelPath = join(modelsDir, filename);
            await writeFile(modelPath, buffer);

            const savedModelUrl = `/uploads/models/${filename}`;

            await storage.updateGenerationJob(job.id, {
              status: "completed",
              modelUrl: savedModelUrl,
              progress: 100,
            } as any);

            // Create 3D model entry
            await storage.create3DModel({
              menuItemId,
              modelUrl: savedModelUrl,
            });

          } catch (downloadError: any) {
            console.error("Failed to download/save model:", downloadError);
            // Still save the remote URL even if download fails
            await storage.updateGenerationJob(job.id, {
              status: "completed",
              modelUrl: modelUrl, // Use remote URL if download fails
              progress: 100,
            } as any);
            
            await storage.create3DModel({
              menuItemId,
              modelUrl: modelUrl,
            });
          }

        } catch (error: any) {
          console.error("3D generation error:", error);
          
          let errorMessage = "3D generation failed";
          if (error?.response?.status === 401) {
            errorMessage = "Replicate API authentication failed. Please check your REPLICATE_API_TOKEN in .env.local";
          } else if (error?.response?.status) {
            errorMessage = `Replicate API error (${error.response.status}): ${error.message || 'Unknown error'}`;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          await storage.updateGenerationJob(job.id, {
            status: "failed",
            error: errorMessage,
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
