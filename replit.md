# OneCG Genesys Billing Report

## Overview
A web application for managing multiple Genesys Cloud clients and generating comprehensive billing reports. The application integrates with Genesys Cloud API to fetch billing periods and subscription overview data.

## Purpose
Enable users to:
- Manage multiple Genesys Cloud client credentials
- View billing periods for each client
- Generate detailed subscription reports with usage analytics
- Track prepaid and monthly usage across product groups

## Current State
**Status**: MVP Complete and Functional

The application is fully functional with:
- ✅ Session-based authentication (username: once/onecg, password: once/onecg)
- ✅ Protected routes with authentication guards
- ✅ Client management (add, list, select)
- ✅ Genesys API integration for billing data
- ✅ Beautiful, responsive UI with professional design
- ✅ Loading and error states throughout
- ✅ Date range selection and Unix timestamp conversion
- ✅ Comprehensive billing report display

## Recent Changes
- **2025-10-24**: Initial MVP implementation
  - Implemented session-based authentication with express-session
  - Created client management system with in-memory storage
  - Built Genesys API proxy endpoints for secure token handling
  - Designed professional dashboard UI with sidebar navigation
  - Added billing period selection and report generation
  - Implemented authentication guards on all protected routes
  - Added proper loading and error states throughout the application

## Project Architecture

### Frontend (React + TypeScript)
- **Pages**: 
  - `/login` - Authentication page
  - `/dashboard` - Main application with sidebar and billing reports
- **Components**:
  - `AppSidebar` - Client list navigation using Shadcn sidebar primitives
  - `AddClientDialog` - Form to add new clients
  - `BillingReport` - Date selection and report display
- **State Management**: React Query for server state
- **Styling**: Tailwind CSS + Shadcn UI components

### Backend (Express + TypeScript)
- **Authentication**: Session-based with express-session
- **Storage**: In-memory storage (MemStorage) for clients
- **API Routes**:
  - `POST /api/auth/login` - Login with hardcoded credentials
  - `GET /api/auth/check` - Check authentication status
  - `POST /api/auth/logout` - Logout and destroy session
  - `GET /api/clients` - Fetch all clients (protected)
  - `POST /api/clients` - Create new client (protected)
  - `GET /api/billing/periods` - Proxy to Genesys API for billing periods (protected)
  - `GET /api/billing/subscription` - Proxy to Genesys API for subscription overview (protected)

### Data Model
- **Client**: `{ id, name, authToken }`
- **BillingPeriod**: `{ startDate, endDate }`
- **SubscriptionOverview**: Complete subscription data with product groups, usage details

## User Preferences
- Clean, professional design following Linear/Material Design principles
- Inter font for UI text, JetBrains Mono for technical data
- Consistent spacing and color scheme
- Minimal animations, focus on functionality
- Data-first approach with clear visual hierarchy

## Key Features

### Authentication
- Hardcoded credentials for MVP: `once/onecg` / `once/onecg`
- Session-based auth with secure cookies
- Protected routes redirect to login when unauthenticated
- Auth check on dashboard mount

### Client Management
- Add clients with name and Genesys Cloud authorization token
- Tokens stored securely in backend, not exposed to client
- Client list in sidebar with active state indication
- Loading and error states for client operations

### Billing Reports
1. Select client from sidebar
2. Fetch available billing periods from Genesys API
3. Choose date range (From/To) using month-year dropdowns
4. Convert endDate to Unix timestamp (periodEndingTimestamp)
5. Fetch subscription overview data
6. Display comprehensive report with:
   - Summary cards (subscription name, type, currency, ID)
   - Billing period details with formatted dates
   - Product groups with prepaid and monthly usage tables

### API Integration
- Genesys Cloud API Base: `https://api.euw2.pure.cloud`
- Endpoints:
  - `/api/v2/billing/periods?periodGranularity=month`
  - `/api/v2/billing/subscriptionoverview?periodEndingTimestamp={timestamp}`
- Authorization tokens passed via Bearer header
- Proxy pattern to keep tokens secure

## Technical Details

### Date Conversion
```javascript
const date = new Date(endDate);
const periodEndingTimestamp = date.getTime();
```

### Error Handling
- Network errors caught and displayed to user
- Invalid credentials show error toast
- Failed API calls show descriptive error messages
- Retry options for failed operations

### Security
- Tokens never exposed to frontend
- All client/billing routes require authentication
- Sessions expire after 24 hours
- Secure cookies in production

## Dependencies
- **Frontend**: React, React Query, Wouter, Shadcn UI, Tailwind CSS, date-fns
- **Backend**: Express, express-session, Axios, Drizzle ORM/Zod
- **Development**: TypeScript, Vite, tsx

## Running the Application
The application runs on port 5000 (both frontend and backend).
- Start: `npm run dev`
- The workflow "Start application" is configured to run this command
- Application available at `http://localhost:5000`

## Environment Variables
- `SESSION_SECRET`: Secret key for session encryption (has default for MVP)
- `PORT`: Application port (defaults to 5000)

## Future Enhancements (Post-MVP)
- Replace hardcoded auth with proper user management
- Add persistent database storage (PostgreSQL)
- Implement client edit and delete functionality
- Add data export (CSV, PDF)
- Create visual charts for billing analytics
- Add date range validation
- Implement pagination for large datasets
- Add search and filter for clients
- Support multiple API regions
