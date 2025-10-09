# Soccer App

A modern web application for managing soccer games, seasons, and group events. Built with Next.js, Supabase, and Stripe.

## Features

- 🎮 **Game Management** - Create and manage individual soccer games
- 📅 **Season Management** - Organize recurring games into seasons
- 👥 **Group System** - Create and join soccer groups
- 💳 **Payment Processing** - Integrated Stripe payments for game/season tickets
- 📊 **Attendance Tracking** - Track who's attending each game
- 🖼️ **Image Uploads** - Upload group and profile photos
- 👤 **Player Profiles** - Manage your player profile and preferences
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (anonymous mode)
- **Payments**: Stripe
- **Storage**: Supabase Storage
- **Animations**: Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- A Supabase account
- A Stripe account

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd soccer-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Set up the database:

Run the SQL migration file in your Supabase SQL editor:
```bash
# In Supabase Dashboard > SQL Editor
# Run: COMPLETE_DATABASE_MIGRATION.sql
```

5. Set up Supabase Storage:

Run the storage policies in your Supabase SQL editor:
```bash
# In Supabase Dashboard > SQL Editor
# Run: setup-storage-policies.sql
```

6. Run the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Database Setup

The database schema includes:
- `players` - User profiles
- `groups` - Soccer groups/organizations
- `games` - Individual game events
- `seasons` - Recurring game series
- `game_attendees` - Game attendance tracking
- `season_attendees` - Season membership tracking
- `season_game_attendance` - Specific game attendance for season members

See `COMPLETE_DATABASE_MIGRATION.sql` for the full schema.

## Storage Setup

The app uses Supabase Storage for:
- Group photos (bucket: `photos/group-photos/`)
- Player profile photos (stored as base64 in database)

Make sure to run `setup-storage-policies.sql` to enable public uploads.

## Stripe Setup

1. Create a Stripe account
2. Get your API keys from the Stripe Dashboard
3. Set up webhook endpoints for:
   - `checkout.session.completed`
   - Point to: `https://your-domain.com/api/confirm-payment`

## Project Structure

```
soccer-app/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── api/               # API routes
│   │   ├── games/             # Game pages
│   │   ├── groups/            # Group pages
│   │   ├── seasons/           # Season pages
│   │   └── profile/           # Profile page
│   ├── components/            # React components
│   │   ├── auth/             # Authentication components
│   │   ├── games/            # Game-related components
│   │   ├── groups/           # Group-related components
│   │   ├── profile/          # Profile components
│   │   └── ui/               # UI components
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom hooks
│   └── lib/                  # Utility libraries
├── public/                   # Static assets
├── migrations/               # Database migrations
└── *.sql                     # SQL setup files
```

## Documentation

- `COMPLETE_SETUP_GUIDE.md` - Comprehensive setup instructions
- `EMAIL_SETUP.md` - Email configuration guide
- `database-schema.sql` - Database schema reference

## Environment Variables

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
- `NEXT_PUBLIC_APP_URL` - Your app's URL

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Add all environment variables
4. Deploy!

The app is configured for Vercel deployment with `vercel.json`.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for your own purposes.
