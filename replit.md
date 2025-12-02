# Multi-Camera Tennis Match Viewer

## Overview

A web application for viewing tennis matches from multiple synchronized camera angles. Users can seamlessly switch between 4 different camera perspectives (Court View, Player 1, Player 2, and Net View) while maintaining synchronized playback across all angles. The interface emphasizes video-first design with familiar media player controls inspired by YouTube and Netflix patterns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**UI Component Library**: shadcn/ui built on Radix UI primitives with Tailwind CSS for styling. This provides accessible, customizable components following the "new-york" style variant.

**State Management**: React hooks for local component state, with TanStack Query (React Query) for server state management and data fetching.

**Routing**: wouter for lightweight client-side routing.

**Design System**:
- Tailwind CSS with custom configuration extending spacing units (2, 4, 8)
- CSS variables for theming with light/dark mode support
- Custom color palette using HSL values with CSS variable fallbacks
- Responsive breakpoints with mobile-first approach (lg breakpoint at ~1024px)

**Video Player Architecture**:
- Custom multi-video synchronization using HTML5 video elements
- Main video player (70% viewport width on desktop, 16:9 aspect ratio)
- Thumbnail grid (30% viewport width on desktop, stacked vertically)
- Timeline controls with scrubbing capability
- Mobile-responsive layout switching to stacked configuration below lg breakpoint

### Backend Architecture

**Server Framework**: Express.js with TypeScript running on Node.js.

**API Pattern**: RESTful API structure with routes prefixed under `/api`.

**Build Process**: 
- ESBuild for server-side bundling with selective dependency bundling (allowlist approach)
- Vite for client-side bundling
- Production build outputs to `dist/` directory

**Development Environment**:
- HMR (Hot Module Replacement) via Vite middleware
- Request/response logging middleware
- Runtime error overlay in development mode

**Storage Layer**: In-memory storage implementation (`MemStorage` class) with interface-based design (`IStorage`) allowing future database integration. Currently supports basic user CRUD operations.

### Data Storage Solutions

**Current Implementation**: In-memory storage using JavaScript Map structures for rapid prototyping.

**Database Configuration**: 
- Drizzle ORM configured for PostgreSQL integration
- Schema defined in `shared/schema.ts` with users table
- Migration support via drizzle-kit
- Neon Database serverless driver configured (@neondatabase/serverless)
- Connection via DATABASE_URL environment variable

**Schema Design**:
- Users table with UUID primary keys, username, and password fields
- Zod validation schemas for type-safe inserts

### Authentication and Authorization

**Session Management**: Express-session configured with support for:
- PostgreSQL session store (connect-pg-simple) for production
- In-memory store (memorystore) for development
- Cookie-based session handling

**Strategy**: Infrastructure prepared for Passport.js with local authentication strategy, though not fully implemented in current codebase.

### External Dependencies

**UI Component Dependencies**:
- Radix UI primitives for accessible component foundations (dialogs, dropdowns, tooltips, sliders, etc.)
- Lucide React for iconography
- class-variance-authority for component variant management
- embla-carousel-react for carousel functionality
- react-day-picker for calendar/date selection
- cmdk for command palette interface

**Data Management**:
- TanStack Query v5 for asynchronous state management
- React Hook Form with Zod resolvers for form validation
- date-fns for date manipulation

**Styling**:
- Tailwind CSS with PostCSS
- tailwind-merge and clsx for conditional class composition

**Development Tools**:
- Replit-specific plugins for development banner, error overlay, and cartographer
- TypeScript with strict mode enabled
- Path aliases configured (@/, @shared/, @assets/)

**Video Storage** (Future Integration):
- Placeholder configuration in code comments suggests Cloudflare R2 for video file hosting
- Current implementation uses local `/videos` directory

### Design Philosophy

**Video-First Interface**: Maximizes screen real estate for video content with minimal chrome.

**System-Based Approach**: Draws patterns from established video platforms (YouTube, Netflix) for instant user recognition and familiarity.

**Zero-Friction Switching**: Seamless camera angle transitions without playback interruption.

**Responsive Design**: Adapts between desktop side-by-side layout and mobile stacked layout based on viewport size.