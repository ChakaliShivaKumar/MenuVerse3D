# 3D Tech-Menu SaaS

A cutting-edge SaaS platform for restaurants to create AI-powered digital menus with stunning 3D dish visualization. Customers scan a QR code to view interactive menus with 3D models, while restaurant owners get a powerful admin dashboard for menu management and order tracking.

## Features

### For Restaurant Owners
- **Restaurant Management** - Create and manage restaurant profiles with QR codes for menu access
- **Menu Categories** - Organize dishes into custom categories with display ordering
- **Menu Items** - Add dishes with descriptions, prices, images, and availability status
- **3D Model Generation** - Upload 5 images of a dish from different angles to automatically generate interactive 3D models using AI (Replicate's Hunyuan3D-2)
- **Order Management** - View and track customer orders with status updates (pending, confirmed, preparing, ready, completed, cancelled)
- **QR Code Generation** - Automatic QR code generation linking customers to your digital menu
- **Real-time Status Tracking** - Monitor 3D model generation progress and order updates

### For Customers
- **Mobile-First Menu** - Responsive, touch-optimized interface for browsing menus
- **3D Model Viewer** - Rotate, zoom, and interact with 3D dish models using Google's model-viewer
- **Category Navigation** - Browse dishes organized by category with smooth animations
- **Order Cart** - Add items to cart with quantity controls
- **Checkout** - Submit orders with customer information and special notes
- **Responsive Design** - Works seamlessly on phones, tablets, and desktops

## Tech Stack

### Frontend
- **React 18** - Modern component library with TypeScript
- **Vite** - Lightning-fast build tool and dev server
- **Tailwind CSS** - Utility-first styling with extensive animations
- **shadcn/ui** - Beautiful, accessible component library built on Radix UI
- **React Hook Form** - Efficient form state management
- **TanStack Query** - Powerful server state management
- **Wouter** - Lightweight client-side router
- **model-viewer** - Google's web component for 3D model rendering

### Backend
- **Express.js** - Fast, minimalist web framework
- **TypeScript** - Type-safe JavaScript
- **Drizzle ORM** - Type-safe SQL query builder
- **PostgreSQL** - Reliable relational database via Neon
- **Multer** - File upload handling
- **Replicate API** - AI-powered 3D model generation
- **QRCode.js** - QR code generation

### Development Tools
- **Node.js 20** - JavaScript runtime
- **tsx** - TypeScript execution for development
- **Zod** - Schema validation with type inference
- **ESBuild** - Fast bundling for production

## Getting Started

### Prerequisites
- Node.js 20 or higher
- PostgreSQL database (Neon recommended for serverless)
- Replicate API token (for 3D model generation)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd 3d-tech-menu
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   DATABASE_URL=postgresql://...your-neon-database-url...
   SESSION_SECRET=your-random-secret-key-here
   REPLICATE_API_TOKEN=your-replicate-api-token
   ```

4. **Push database schema**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

## Project Structure

```
3d-tech-menu/
├── client/                          # Frontend React application
│   └── src/
│       ├── pages/                   # Page components (admin & public views)
│       │   ├── restaurants.tsx       # Restaurant management
│       │   ├── categories.tsx        # Category management
│       │   ├── menu-items.tsx        # Menu item CRUD & 3D generation
│       │   ├── orders.tsx            # Order management dashboard
│       │   └── public-menu.tsx       # Customer-facing menu view
│       ├── components/               # Reusable UI components
│       │   └── ui/                   # shadcn/ui components
│       ├── lib/                      # Utility functions & API client
│       └── App.tsx                   # Main routing component
├── server/                           # Backend Express application
│   ├── routes.ts                     # API endpoint definitions
│   ├── storage.ts                    # Database access layer
│   ├── app.ts                        # Express app configuration
│   ├── index-dev.ts                  # Development entry point
│   └── index-prod.ts                 # Production entry point
├── shared/                           # Shared types and schemas
│   └── schema.ts                     # Database schema & Zod validators
├── uploads/                          # Local file storage for images & models
│   ├── images/                       # User-uploaded dish images
│   └── models/                       # Generated 3D models (.glb files)
└── design_guidelines.md              # Design system documentation
```

## API Endpoints

### Restaurants
- `GET /api/restaurants` - List all restaurants
- `GET /api/restaurants/:id` - Get restaurant details
- `POST /api/restaurants` - Create new restaurant
- `PATCH /api/restaurants/:id` - Update restaurant
- `DELETE /api/restaurants/:id` - Delete restaurant

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories/:id` - Get category details
- `GET /api/restaurants/:restaurantId/categories` - Get categories for a restaurant
- `POST /api/categories` - Create category
- `PATCH /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Menu Items
- `GET /api/menu-items` - List all menu items
- `GET /api/menu-items/:id` - Get menu item details
- `GET /api/restaurants/:restaurantId/menu-items` - Get items for a restaurant
- `POST /api/menu-items` - Create menu item
- `PATCH /api/menu-items/:id` - Update menu item
- `DELETE /api/menu-items/:id` - Delete menu item

### 3D Generation
- `POST /api/generate-3d` - Start 3D model generation from images
- `GET /api/generation-jobs` - List generation job status

### Orders
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id` - Update order status
- `GET /api/orders/:id` - Get order details

### Static Files
- `GET /uploads/:path` - Serve uploaded images and 3D models

## Usage

### For Restaurant Owners

1. **Create a Restaurant**
   - Navigate to Restaurants page
   - Click "Add Restaurant"
   - Enter restaurant name, description, contact info
   - QR code is automatically generated

2. **Set Up Menu Categories**
   - Go to Menu Categories
   - Create categories (e.g., Appetizers, Main Courses, Desserts)
   - Set display order for organization

3. **Add Menu Items**
   - Go to Menu Items
   - Click "Add Menu Item"
   - Select restaurant and category
   - Enter item name, description, price
   - Upload an optional item image

4. **Generate 3D Models**
   - Click "Generate 3D" on a menu item
   - Upload 5 images of the dish from different angles
   - Wait for AI to process (typically 2-5 minutes)
   - View the generated 3D model

5. **Share Menu with Customers**
   - Display the QR code in your restaurant
   - Customers scan it to access the digital menu

### For Customers

1. **Scan QR Code**
   - Scan the restaurant's QR code with your smartphone
   - Automatically opens the digital menu

2. **Browse Menu**
   - Swipe through categories
   - View dish descriptions, prices, and images

3. **View 3D Models**
   - Tap on dishes with 3D models
   - Rotate and zoom to examine the dish from all angles

4. **Place Order**
   - Add items to your cart
   - Adjust quantities
   - Enter your name, phone, and any special requests
   - Submit order

5. **Track Order**
   - View order confirmation
   - Restaurant staff updates order status in real-time

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run db:push` - Sync database schema with changes
- `npm run db:studio` - Open Drizzle Studio to inspect database

### Project Architecture

**Frontend:**
- Mobile-first responsive design
- Client-side routing with Wouter
- TanStack Query for efficient server state management
- Optimistic updates and cache invalidation
- Toast notifications for user feedback
- Loading skeletons and error states

**Backend:**
- RESTful API with clear separation of concerns
- Storage layer abstraction for data operations
- Zod schema validation on all inputs
- Multer for secure file uploads
- Async job processing for 3D generation

**Database:**
- Type-safe Drizzle ORM queries
- PostgreSQL with UUID primary keys
- Foreign key relationships with cascading deletes
- JSONB for flexible order item storage

## Design System

The application follows a cohesive design system inspired by:
- **Linear** - Dashboard clarity and information hierarchy
- **Apple** - Smooth animations and 3D interactions
- **Uber Eats** - Mobile ordering experience

### Color Palette
- Primary colors for key actions and CTAs
- Semantic colors for status indicators
- Accessible contrast ratios throughout
- Dark mode support with CSS variables

### Typography
- **Display Font**: Space Grotesk (Headlines, 24-32px)
- **Body Font**: Inter (Text, 14-16px)
- Font weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

## Performance Optimizations

- Image lazy loading for dish photos
- Optimized bundle size (~45KB gzipped)
- Server-side query caching via TanStack Query
- CDN-ready static asset delivery
- Fast database queries with proper indexing
- Efficient 3D model streaming

## Security

- Database secrets managed via environment variables
- CORS configured for frontend-backend communication
- Input validation on all API endpoints
- File upload restrictions (images only, 10MB max)
- SQL injection prevention via parameterized queries
- Session management with secure HTTP-only cookies

## Roadmap

- [ ] Payment integration (Stripe)
- [ ] Email notifications for orders
- [ ] Analytics dashboard for restaurants
- [ ] Multi-language menu support
- [ ] Table management system
- [ ] Customer loyalty programs
- [ ] Advanced inventory tracking
- [ ] AI-powered menu recommendations
- [ ] Real-time order notifications

## Troubleshooting

### 3D Generation Takes Too Long
- Generation typically takes 2-5 minutes depending on image quality
- Ensure images are well-lit and clearly show the dish from different angles
- Check Replicate API token is valid

### Database Connection Issues
- Verify DATABASE_URL is correctly set
- Check PostgreSQL is running
- For Neon, ensure IP whitelist is configured

### Image Upload Fails
- Verify file is an image (JPG, PNG, WebP)
- Check file size is under 10MB
- Ensure uploads/ directory exists with write permissions

## Contributing

This is a Replit-hosted project. To contribute:

1. Make changes to the codebase
2. Test thoroughly in development mode
3. Ensure all types are correct with TypeScript
4. Test responsive design on mobile devices
5. Commit with clear, descriptive messages

## License

MIT - Open source for restaurant use

## Support

For issues or questions:
- Check the troubleshooting section above
- Review API endpoint documentation
- Examine browser console for error messages
- Check server logs in the terminal

## Acknowledgments

- Replicate API for 3D model generation
- Google Model Viewer for 3D rendering
- shadcn/ui for component library
- Drizzle ORM for type-safe queries
- All open-source dependencies
