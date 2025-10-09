# ⚽ Soccer App

A modern, responsive web application for managing soccer games, groups, and player interactions. Built with Next.js, TypeScript, and Supabase.

## ✨ Features

### 🎮 Core Functionality
- **Game Management**: Create, join, and manage soccer games
- **Group Organization**: Form and manage soccer groups
- **Season Management**: Organize games into seasons with recurring schedules
- **Player Profiles**: Comprehensive player profiles with game history
- **Real-time Updates**: Live updates for game attendance and group activities

### 🚀 Performance Optimizations
- **Progressive Loading**: Load basic content first, then enhance with detailed data
- **Smart Caching**: Aggressive caching with prefetching for instant navigation
- **Route Preloading**: Preload routes on hover for faster navigation
- **Optimistic UI**: Instant feedback with automatic rollback on errors
- **Pagination**: Efficient loading of large datasets

### 📱 User Experience
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Smooth Animations**: Framer Motion powered transitions
- **Loading States**: Comprehensive loading indicators and skeleton screens
- **Error Handling**: Graceful error recovery and user feedback
- **Accessibility**: WCAG compliant design patterns

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Lucide React** - Icon library

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication
  - Storage for images
  - Row Level Security (RLS)

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Turbopack** - Fast bundler (development)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/soccer-app.git
   cd soccer-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Run the SQL scripts in `/supabase` directory to set up your database schema
   - Configure Row Level Security policies
   - Set up storage buckets for images

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── games/             # Games listing and detail pages
│   ├── groups/            # Groups listing and detail pages
│   ├── profile/           # User profile page
│   ├── seasons/           # Season detail pages
│   └── page.tsx           # Homepage
├── components/            # Reusable React components
│   ├── auth/              # Authentication components
│   ├── groups/            # Group-related components
│   ├── ui/                # Base UI components
│   └── ...
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configurations
│   ├── cache.ts           # Caching system
│   ├── optimized-queries.ts # Optimized database queries
│   └── supabase.ts        # Supabase client
└── types/                 # TypeScript type definitions
```

## 🎯 Key Features Explained

### Progressive Loading
The app implements a two-phase loading strategy:
1. **Phase 1**: Load basic content immediately (profile info, group details)
2. **Phase 2**: Load detailed data in background (games, seasons, attendees)

### Smart Caching
- **Memory Caching**: In-memory cache for frequently accessed data
- **Prefetching**: Preload data based on user behavior
- **TTL Management**: Intelligent cache expiration
- **Batch Operations**: Efficient bulk data operations

### Optimistic UI
- **Instant Feedback**: UI updates immediately on user actions
- **Automatic Rollback**: Reverts changes if server operations fail
- **Error Recovery**: Graceful handling of network issues

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking

# Database
npm run db:reset     # Reset database (if configured)
npm run db:seed      # Seed database with sample data
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Follow the existing code style

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## 🐛 Troubleshooting

### Common Issues

**Build Errors**
- Ensure all environment variables are set
- Check TypeScript types are properly defined
- Verify all dependencies are installed

**Database Connection Issues**
- Verify Supabase credentials
- Check RLS policies are properly configured
- Ensure database schema is up to date

**Performance Issues**
- Clear browser cache
- Check network tab for failed requests
- Verify caching is working properly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Supabase](https://supabase.com/) for the backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS
- [Framer Motion](https://www.framer.com/motion/) for smooth animations
- [Lucide](https://lucide.dev/) for the beautiful icons

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Check the documentation
- Review the troubleshooting section

---

**Happy coding! ⚽🚀**