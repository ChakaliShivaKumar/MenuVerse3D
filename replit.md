# 3D Tech-Menu SaaS

## Overview

A SaaS platform for restaurants to create AI-powered digital menus with 3D dish visualization. The system provides two distinct interfaces:

1. **Admin Dashboard** - For restaurant owners to manage menus, categories, items, and orders
2. **Public Menu** - Customer-facing QR code accessible menu with 3D model viewing capabilities

The platform enables restaurants to upload dish images and generate 3D models using AI (Replicate API), creating an immersive dining experience for customers while streamlining menu management for restaurant staff.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Client-side routing using Wouter (lightweight alternative to React Router)
- ESM module system throughout

**UI Component System:**
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS with custom design tokens following "New York" style
- Theme system supporting light/dark modes via context provider
- Custom CSS variables for consistent spacing, colors, and elevation
- Design inspired by Linear (dashboard clarity), Apple (3D visualization), and Uber Eats (mobile ordering)

**State Management:**
- TanStack Query (React Query) for server state management
- Query client configured with infinite stale time and no automatic refetching
- Local React state for UI-specific concerns (modals, forms, cart)
- Context API for theme preferences

**Key Design Decisions:**
- **Dual Interface Pattern**: Separate routing/UI for admin (`/dashboard`, `/restaurants`, etc.) vs public menu (`/menu/:restaurantId`)
- **Component Reusability**: Extensive use of shadcn/ui components ensures consistency across admin and public interfaces
- **Responsive Design**: Mobile-first approach with breakpoint-based layouts
- **3D Model Integration**: Uses Google's `model-viewer` web component for GLB/GLTF rendering

### Backend Architecture

**Server Framework:**
- Express.js with TypeScript
- ESM modules for modern JavaScript features
- Separate entry points for development (with Vite middleware) and production (static file serving)

**Development vs Production Strategy:**
- Development: Vite dev server integrated as Express middleware for HMR
- Production: Pre-built static assets served from `dist/public`
- Single codebase with environment-specific entry files (`index-dev.ts`, `index-prod.ts`)

**API Design:**
- RESTful endpoints under `/api` prefix
- CRUD operations for restaurants, categories, menu items, orders, and generation jobs
- File upload handling with multer middleware
- Request/response logging with timestamp formatting

**File Storage:**
- Local file system storage for uploaded images (`uploads/images/`)
- 3D models stored in `uploads/models/` directory
- Multer configured with 10MB file size limit and image-only filtering

**Key Architectural Patterns:**
- **Storage Layer Abstraction**: `IStorage` interface defines all data operations, implemented by database-backed storage
- **Session Management**: PostgreSQL-backed sessions using `connect-pg-simple`
- **Error Handling**: Centralized error responses with status codes and descriptive messages
- **Raw Body Access**: Custom middleware captures raw request body for webhook verification

### Database Architecture

**ORM & Database:**
- Drizzle ORM for type-safe database queries
- PostgreSQL via Neon serverless driver with WebSocket support
- Schema-first approach with Zod validation

**Schema Design:**
```
restaurants (id, name, description, logo, bannerImage, qrCode, contact info)
  ↓ (one-to-many)
categories (id, restaurantId, name, displayOrder)
  ↓ (one-to-many)
menu_items (id, restaurantId, categoryId, name, price, image, is3DEnabled)
  ↓ (one-to-one)
models_3d (id, menuItemId, modelUrl, status)

orders (id, restaurantId, customerInfo, items as JSONB, status)
generation_jobs (id, menuItemId, status, progress, replicateId)
```

**Data Relationships:**
- Cascading deletes from restaurants → categories → menu items
- Foreign key constraints ensure referential integrity
- JSONB fields for flexible order items storage

**Migration Strategy:**
- Drizzle Kit for schema migrations
- Schema defined in TypeScript (`shared/schema.ts`)
- Push-based deployment with `db:push` script

### External Dependencies

**AI/ML Services:**
- **Replicate API**: 3D model generation from images
  - Used for converting 2D dish photos into interactive 3D models
  - Asynchronous job processing with webhook callbacks
  - Status tracking via `generation_jobs` table

**Database Services:**
- **Neon Database**: Serverless PostgreSQL
  - Connection pooling with `@neondatabase/serverless`
  - WebSocket support for persistent connections
  - Environment-based connection string (`DATABASE_URL`)

**Cloud Storage (Planned):**
- Current implementation uses local file system
- Architecture supports migration to cloud storage (S3, Cloudflare R2, etc.)
- File paths stored in database allow transparent storage backend changes

**UI Component Libraries:**
- **Radix UI**: Headless component primitives (40+ components)
- **Lucide React**: Icon library for consistent iconography
- **Model Viewer**: Google's web component for 3D model rendering
- **cmdk**: Command palette component for search

**Styling & Utilities:**
- **Tailwind CSS**: Utility-first styling framework
- **class-variance-authority**: Type-safe component variants
- **clsx + tailwind-merge**: Conditional class name handling

**Form Handling:**
- **React Hook Form**: Form state management
- **Zod**: Schema validation with type inference
- **@hookform/resolvers**: Zod integration for RHF

**Development Tools:**
- **Replit Plugins**: Development banner, error overlay, cartographer (dev only)
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast bundling for production builds

**Typography:**
- **Google Fonts**: Inter (UI/body text), Space Grotesk (headlines/display)
- Font weights: 400, 500, 600, 700

**Key Integration Patterns:**
- QR code generation using `qrcode` library for restaurant menus
- Image upload with client-side preview before submission
- Polling-based status updates for async 3D generation jobs
- WebSocket-based PostgreSQL connections for low-latency queries