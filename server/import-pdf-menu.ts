import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { config } from "dotenv";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, "..", ".env.local") });

// Use dynamic import for ESM compatibility
const { PDFParse } = await import("pdf-parse");

import { storage } from "./storage.js";
import QRCode from "qrcode";

interface ParsedMenuItem {
  name: string;
  description?: string;
  price: string;
  category?: string;
}

async function parsePDFMenu(pdfPath: string): Promise<ParsedMenuItem[]> {
  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const textResult = await parser.getText();
  const text = textResult.text;

  console.log("PDF text extracted, length:", text.length);
  console.log("First 1000 characters:", text.substring(0, 1000));

  const menuItems: ParsedMenuItem[] = [];
  const lines = text.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

  let currentCategory: string | undefined;
  let currentItem: Partial<ParsedMenuItem> = {};

  // Common patterns for menu parsing
  const pricePattern = /\$?\s*(\d+\.?\d*)/;
  const categoryPattern = /^(ACAI|SMOOTHIES|BOWLS|TOASTS|WRAPS|SALADS|DRINKS|EXTRAS|ADD-ONS|BOTTLED|SIGNATURE|POWER|PROTEIN|ENERGY|DETOX|GREEN|FRUIT|VEGGIE|CLASSIC|PREMIUM)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : "";

    // Check if line is a category header
    if (categoryPattern.test(line)) {
      currentCategory = line.toUpperCase();
      currentItem = {};
      continue;
    }

    // Check if line contains a price
    const priceMatch = line.match(pricePattern);
    if (priceMatch) {
      // If we have a name, this is likely a menu item
      if (currentItem.name) {
        currentItem.price = priceMatch[1];
        menuItems.push({
          name: currentItem.name,
          description: currentItem.description,
          price: currentItem.price,
          category: currentCategory,
        });
        currentItem = {};
      } else if (nextLine && !pricePattern.test(nextLine)) {
        // Price might be on a separate line, check next line for name
        currentItem.price = priceMatch[1];
      }
      continue;
    }

    // If line doesn't have a price and is not empty, it might be a name or description
    if (line.length > 2 && line.length < 100) {
      if (!currentItem.name) {
        currentItem.name = line;
      } else if (!currentItem.description) {
        currentItem.description = line;
      }
    }
  }

  // Add any remaining item
  if (currentItem.name && currentItem.price) {
    menuItems.push({
      name: currentItem.name,
      description: currentItem.description,
      price: currentItem.price,
      category: currentCategory,
    });
  }

  // Alternative parsing: look for common menu item patterns
  if (menuItems.length === 0) {
    console.log("Trying alternative parsing method...");
    
    // Split by common delimiters and look for price patterns
    const allText = text.replace(/\n/g, " ");
    const items: ParsedMenuItem[] = [];
    
    // Look for patterns like "Item Name $X.XX" or "Item Name - Description $X.XX"
    const itemPattern = /([A-Z][A-Za-z\s&'-]+?)\s*(?:[-–—]\s*)?([A-Za-z\s,()]+?)?\s*\$?(\d+\.?\d*)/g;
    let match;
    
    while ((match = itemPattern.exec(allText)) !== null) {
      const name = match[1].trim();
      const description = match[2]?.trim();
      const price = match[3];
      
      if (name.length > 2 && name.length < 80 && parseFloat(price) > 0 && parseFloat(price) < 1000) {
        items.push({
          name,
          description: description && description.length > 0 ? description : undefined,
          price,
        });
      }
    }
    
    return items;
  }

  return menuItems;
}

async function importMenu() {
  try {
    const pdfPath = path.resolve(process.cwd(), "vitality_bowls_menu.pdf");
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found at: ${pdfPath}`);
    }

    console.log("Parsing PDF menu...");
    const parsedItems = await parsePDFMenu(pdfPath);
    
    console.log(`Found ${parsedItems.length} menu items`);
    console.log("Sample items:", parsedItems.slice(0, 5));

    if (parsedItems.length === 0) {
      console.log("No menu items found. The PDF might have a different format.");
      console.log("Please check the PDF structure and adjust the parsing logic.");
      return;
    }

    // Create or find "Vitality Bowls" restaurant
    console.log("Creating/finding restaurant...");
    let restaurant = (await storage.getAllRestaurants()).find(
      (r) => r.name.toLowerCase().includes("vitality")
    );

    if (!restaurant) {
      restaurant = await storage.createRestaurant({
        name: "Vitality Bowls",
        description: "Fresh, healthy acai bowls, smoothies, and more",
      });

      // Generate QR code
      const menuUrl = `http://localhost:5000/menu/${restaurant.id}`;
      const qrCodeData = await QRCode.toDataURL(menuUrl);
      restaurant = await storage.updateRestaurant(restaurant.id, { qrCode: qrCodeData });
    }

    console.log(`Using restaurant: ${restaurant.name} (${restaurant.id})`);

    // Group items by category and create categories
    const categoryMap = new Map<string, string>(); // category name -> category id
    const categories = new Set<string>();

    parsedItems.forEach((item) => {
      if (item.category) {
        categories.add(item.category);
      }
    });

    // Create categories
    let displayOrder = 0;
    for (const categoryName of categories) {
      const existingCategory = (await storage.getCategoriesByRestaurant(restaurant.id)).find(
        (c) => c.name.toLowerCase() === categoryName.toLowerCase()
      );

      if (!existingCategory) {
        const category = await storage.createCategory({
          restaurantId: restaurant.id,
          name: categoryName,
          displayOrder: displayOrder++,
        });
        categoryMap.set(categoryName, category.id);
        console.log(`Created category: ${categoryName}`);
      } else {
        categoryMap.set(categoryName, existingCategory.id);
        console.log(`Using existing category: ${categoryName}`);
      }
    }

    // Create a default "Uncategorized" category if needed
    const uncategorizedItems = parsedItems.filter((item) => !item.category);
    if (uncategorizedItems.length > 0) {
      let uncategorizedId = categoryMap.get("Uncategorized");
      if (!uncategorizedId) {
        const existing = (await storage.getCategoriesByRestaurant(restaurant.id)).find(
          (c) => c.name.toLowerCase() === "uncategorized"
        );
        if (!existing) {
          const category = await storage.createCategory({
            restaurantId: restaurant.id,
            name: "Uncategorized",
            displayOrder: displayOrder++,
          });
          categoryMap.set("Uncategorized", category.id);
          uncategorizedId = category.id;
        } else {
          uncategorizedId = existing.id;
        }
      }
    }

    // Create menu items
    console.log("Creating menu items...");
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < parsedItems.length; i++) {
      const item = parsedItems[i];
      
      try {
        const categoryId = item.category
          ? categoryMap.get(item.category)
          : categoryMap.get("Uncategorized") || undefined;

        await storage.createMenuItem({
          restaurantId: restaurant.id,
          categoryId: categoryId || undefined,
          name: item.name,
          description: item.description,
          price: item.price,
          available: true,
          displayOrder: i,
        });
        created++;
      } catch (error: any) {
        console.error(`Error creating item "${item.name}":`, error.message);
        skipped++;
      }
    }

    console.log(`\nImport complete!`);
    console.log(`Created: ${created} menu items`);
    console.log(`Skipped: ${skipped} menu items`);
    console.log(`Categories: ${categoryMap.size}`);
  } catch (error: any) {
    console.error("Error importing menu:", error);
    process.exit(1);
  }
}

// Run the import
importMenu();
