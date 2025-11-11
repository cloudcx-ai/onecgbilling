# OneCG Genesys Billing Report

A comprehensive web application for managing multiple Genesys Cloud clients and generating detailed billing reports with usage analytics.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)

## 🌟 Features

- **Multi-Client Management**: Add and manage multiple Genesys Cloud client credentials
- **Billing Period Selection**: View and select from available billing periods
- **Detailed Usage Reports**: Generate comprehensive reports showing:
  - Subscription details and type
  - 140+ usage line items with quantities and rates
  - 44+ enabled products
  - Calculated totals and cost breakdowns
- **Secure Authentication**: Session-based authentication with protected routes
- **Real-time Data**: Direct integration with Genesys Cloud API
- **Professional UI**: Clean, responsive design built with React and Tailwind CSS

## 📸 Screenshots

### Dashboard
View all your clients and select billing periods to generate reports.

### Usage Report
Detailed breakdown of all usage items, quantities, rates, and totals.

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Genesys Cloud authorization tokens for your clients

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cloudcx-ai/onecgbilling.git
   cd onecgbilling
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   # Create .env file (optional - has defaults)
   PORT=5000
   SESSION_SECRET=your-secure-random-secret
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:5000
   ```

## 🔐 Default Credentials

- **Username**: `once` or `onecg`
- **Password**: `once` or `onecg`

> ⚠️ **Important**: For production deployments, implement proper user authentication by modifying `server/routes.ts`

## 📖 Usage Guide

### Adding a Client

1. Log in to the application
2. Click the **"Add Client"** button in the sidebar
3. Enter:
   - **Client Name**: A friendly name for the client (e.g., "Clarisys Global")
   - **Authorization Token**: The Genesys Cloud API token
     - Can include "Authorization: Bearer" prefix or just the token
     - Will be automatically cleaned and formatted

### Generating a Report

1. **Select a client** from the sidebar
2. **Choose date range**:
   - **From**: Select the start month
   - **To**: Select the end month
3. **Click "Download Usage Report"**
4. View the comprehensive report with:
   - Subscription overview
   - Detailed usage table
   - Enabled products list
   - Total cost calculations

## 🏗️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **React Query** - Data fetching and caching
- **Wouter** - Routing
- **Vite** - Build tool

### Backend
- **Express** - Web server
- **TypeScript** - Type safety
- **express-session** - Session management
- **Axios** - HTTP client for Genesys API
- **Drizzle ORM** - Type-safe schema definitions

### Architecture
- **In-memory storage** - Fast client data management
- **Session-based auth** - Secure authentication
- **Proxy pattern** - Secure token handling (tokens never exposed to frontend)

## 🗂️ Project Structure

```
onecgbilling/
├── client/                 # Frontend application
│   └── src/
│       ├── components/     # React components
│       ├── pages/         # Page components
│       ├── lib/           # Utilities and config
│       └── App.tsx        # Main app component
├── server/                # Backend application
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Data storage interface
│   ├── index.ts           # Server entry point
│   └── vite.ts            # Vite integration
├── shared/                # Shared types and schemas
│   └── schema.ts          # Data models
├── package.json
├── tsconfig.json
├── vite.config.ts
└── DEPLOYMENT.md          # Deployment guide
```

## 🔧 API Integration

### Genesys Cloud API

The application integrates with Genesys Cloud API:

- **Base URL**: `https://api.euw2.pure.cloud`
- **Endpoints Used**:
  - `GET /api/v2/billing/periods?periodGranularity=month`
  - `GET /api/v2/billing/subscriptionoverview?periodEndingTimestamp={timestamp}`

### Authentication
Authorization tokens are stored securely on the backend and never exposed to the frontend. The backend acts as a proxy for all Genesys API calls.

## 📦 Production Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions including:

- Building for production
- Server setup (PM2, systemd, or Node)
- Reverse proxy configuration (Nginx/Apache)
- SSL/HTTPS setup
- Environment variables
- Monitoring and troubleshooting

### Quick Production Build

```bash
# Build the application
npm run build

# Start in production mode
NODE_ENV=production node dist/index.js
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Adding New Features

1. Update data models in `shared/schema.ts`
2. Update storage interface in `server/storage.ts`
3. Add API routes in `server/routes.ts`
4. Create/update frontend components in `client/src/components/`
5. Update pages in `client/src/pages/`

## 🔒 Security Considerations

- ✅ Session-based authentication
- ✅ Tokens stored server-side only
- ✅ CORS protection
- ✅ Input validation with Zod schemas
- ⚠️ Default credentials should be changed for production
- ⚠️ Implement proper user management for production use
- ⚠️ Use HTTPS in production
- ⚠️ Set strong SESSION_SECRET

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **OneCG Team** - Initial work

## 🙏 Acknowledgments

- [Genesys Cloud](https://www.genesys.com/platform) for the comprehensive API
- [Shadcn UI](https://ui.shadcn.com/) for the beautiful component library
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

## 📞 Support

For issues, questions, or contributions, please:
- Open an issue in this repository
- Contact the development team

## 🗺️ Roadmap

- [ ] Add user management system
- [ ] Implement data export (CSV, PDF)
- [ ] Add visual charts and analytics
- [ ] Support for multiple API regions
- [ ] Client edit and delete functionality
- [ ] Persistent database storage (PostgreSQL)
- [ ] Enhanced date range validation
- [ ] Pagination for large datasets
- [ ] Search and filter capabilities

---

**Built with ❤️ by the OneCG Team**
