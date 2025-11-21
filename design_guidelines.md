# 3D Tech-Menu SaaS Design Guidelines

## Design Approach
**Reference-Based Strategy**: Drawing inspiration from Linear (dashboard clarity), Apple (3D product visualization), and Uber Eats (mobile food ordering). The dual-interface nature requires distinct but cohesive design languages:
- **Admin Interface**: Professional, efficient, data-dense
- **Customer Menu**: Immersive, tactile, appetite-appealing

## Typography

**Font Families** (Google Fonts):
- **Primary**: Inter (400, 500, 600, 700) - UI, body text, data tables
- **Display**: Space Grotesk (600, 700) - Headlines, hero sections, branding

**Hierarchy**:
- Hero/Display: text-5xl to text-7xl, font-bold, Space Grotesk
- Section Headers: text-3xl to text-4xl, font-semibold
- Card Titles: text-xl, font-semibold
- Body: text-base, font-normal
- Captions/Labels: text-sm, font-medium
- Micro-copy: text-xs

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6, p-8
- Section spacing: py-12, py-16
- Card gaps: gap-4, gap-6
- Button padding: px-6 py-3, px-8 py-4

**Grid Structure**:
- Admin Dashboard: 12-column grid, max-w-7xl container
- Menu Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Mobile: Single column, full-width cards with px-4 container

## Component Library

### Admin Dashboard Components

**Navigation**:
- Fixed left sidebar (w-64) with icon + label navigation items
- Top bar with restaurant selector dropdown, notifications, profile avatar
- Breadcrumb navigation for deep pages

**Data Tables**:
- Striped rows with hover states
- Sticky headers, sortable columns
- Action buttons (view, edit, delete) in final column
- Pagination at bottom

**Forms**:
- Full-width inputs with floating labels
- Image upload zones with drag-drop (dashed border, centered upload icon)
- Multi-image uploader showing 5 thumbnail slots (for 3D generation)
- Progress indicators for 3D generation status (percentage bar + status text)

**Status Badges**:
- Rounded-full pills: "Processing", "Ready", "Failed" with appropriate states
- Success/warning/error variants

### Customer-Facing Menu Components

**Hero Section**:
- Full-width banner with restaurant branding
- Restaurant logo, name (text-5xl), tagline
- QR code icon/badge indicating "Scan to view menu"
- Background: Subtle food photography overlay with dark gradient

**Menu Item Cards**:
- Large format cards with rounded-2xl borders
- Top: High-quality food image (aspect-ratio-4/3)
- 3D Model Trigger: Floating "View in 3D" button with blur backdrop (absolute positioned, bottom-right of image)
- Bottom section: Item name (text-2xl), description (text-sm), price (text-xl font-bold)
- "Add to Cart" button: Full-width, rounded-lg, prominent

**3D Model Viewer Modal**:
- Full-screen overlay (backdrop-blur-lg background)
- <model-viewer> component: w-full h-96 to h-screen on mobile
- Bottom sheet controls: Close, Add to Cart, item details
- Gesture hints: "Drag to rotate, pinch to zoom" tooltip on first view

**Category Tabs**:
- Horizontal scroll tabs with active state underline
- Sticky positioning below hero section
- Smooth scroll to category sections

**Cart Drawer**:
- Slide-in from right (translate-x-full to translate-x-0 transition)
- Item list with quantity controls (-, +, delete)
- Subtotal, tax breakdown
- "Place Order" CTA button at bottom

### Shared Components

**Buttons**:
- Primary: Solid, rounded-lg, px-6 py-3, font-semibold
- Secondary: Outline variant with border-2
- Ghost: Transparent with hover background
- Icon buttons: w-10 h-10, rounded-full, centered icon

**Modals**:
- Centered overlay with backdrop-blur-sm
- max-w-2xl content container
- Slide-up animation (translate-y-4 opacity-0 to translate-y-0 opacity-100)
- Close button (top-right) with × icon

**Loading States**:
- Skeleton screens for content loading
- Spinner for async actions
- Progress bars for 3D generation (animated width transition)

## Animations

**Transitions** (duration-300 ease-in-out):
- Modal/drawer entry/exit
- Hover scale on cards (hover:scale-105)
- Tab switching (fade + slide)
- Add to cart button (scale-95 on active)

**3D Viewer**:
- Smooth camera transitions when opening modal
- Rotate hint animation on load (subtle rotation back-forth)

**Micro-interactions**:
- Button press feedback (scale-95)
- Checkbox/toggle switches (slide transition)
- Notification toasts (slide-in from top)

## Images

**Hero Section**: Full-width restaurant ambiance photo (1920x800px) with dark overlay gradient (opacity-40) - showcasing dining atmosphere or signature dishes

**Menu Item Cards**: High-resolution food photography (800x600px) for each dish - professional, appetizing, well-lit shots

**Dashboard**: Icon illustrations for empty states, onboarding guides (simple, flat style)

**3D Models**: Generated .glb files displayed via <model-viewer> - no placeholder images needed