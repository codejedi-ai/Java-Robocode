# Galatea AI - Shared Supabase Backend

This is the **shared Supabase backend** repository for all Galatea AI applications. All database and storage operations are handled through Edge Functions for security, consistency, and centralized logic.

## 🏗️ Architecture Design

### Core Principles

1. **All Data Operations Through Edge Functions**
   - ❌ **NEVER** access the database directly from client applications
   - ❌ **NEVER** access storage buckets directly from client applications
   - ✅ **ALWAYS** use Edge Functions for all database and storage operations
   - ✅ Edge Functions handle authentication, validation, and business logic

2. **Automatic Resource Creation**
   - On first launch, an initialization function creates all required tables and resources
   - No manual migrations needed for new Supabase instances
   - Tables are created automatically when Edge Functions are called

3. **Centralized Logic**
   - All business logic lives in Edge Functions
   - Consistent error handling and validation
   - Single source of truth for data operations

## 🚀 First-Time Setup

### For a Blank Supabase Environment

When setting up a new Supabase instance, you have two options:

#### Option 1: Run Migrations (Recommended)

```bash
# Start Supabase
cd Galatea-AI-Supabase
npx supabase start

# Run migrations (creates all tables and buckets)
npx supabase db reset
```

This will run all migrations including:
- `20250105000000_ensure_storage_buckets.sql` - Creates storage buckets
- `20250105000001_create_banners_bucket.sql` - Creates banners bucket with policies
- `20250105000002_initial_schema.sql` - Creates all database tables, indexes, and RLS policies

#### Option 2: Use Initialize Edge Function

```bash
# Start Supabase
cd Galatea-AI-Supabase
npx supabase start

# Start Edge Functions server
npx supabase functions serve --no-verify-jwt

# In another terminal, call the initialization function
curl -X POST http://127.0.0.1:54321/functions/v1/initialize \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json"
```

Or from your application:

```typescript
import { edgeFunctions } from '@/lib/edge-functions'

// Call on app startup (only needed if migrations weren't run)
await edgeFunctions.initialize()
```

The initialization function will:
- Create all required storage buckets (avatars, banners, companion-images, profile-pics)
- Create all required database tables (via create_table RPC functions)
- Set up Row Level Security (RLS) policies
- Create indexes and constraints

**Note:** The initialize function is a fallback. It's recommended to use migrations (`npx supabase db reset`) for production setups.

## 📁 Project Structure

```
Galatea-AI-Supabase/
├── README.md                    # This file
├── SUPABASE_CONFIGURATION.md    # Complete configuration documentation
├── config.toml                  # Supabase project configuration
├── package.json                 # NPM scripts for Supabase management
├── migrations/                  # Database migrations
│   ├── 20250105000000_ensure_storage_buckets.sql
│   └── 20250105000001_create_banners_bucket.sql
└── supabase/
    └── functions/               # Edge Functions
        ├── initialize/          # Initial setup function (creates all tables/resources)
        ├── get-companions/      # Get companions
        ├── create-companion/    # Create companion
        ├── update-companion/    # Update companion
        ├── delete-companion/    # Delete companion
        ├── get-user-profile/    # Get user profile/preferences/stats
        ├── update-user-profile/ # Update profile/preferences/stats
        ├── ensure-user-profile/ # Ensure user profile exists
        ├── get-conversations/   # Get conversations
        ├── send-message/        # Send message
        ├── mark-messages-read/  # Mark messages as read
        ├── update-conversation-status/ # Update conversation status
        ├── get-matches/         # Get matches
        ├── deactivate-match/    # Deactivate match
        ├── process-swipe/        # Process swipe decisions
        ├── get-recommended-companions/ # Get recommended companions
        ├── upload-avatar/        # Upload avatar
        ├── upload-profile-picture/ # Upload profile picture
        ├── upload-banner/       # Upload banner
        ├── get-profile-picture/ # Get profile picture
        ├── get-banner/          # Get banner
        ├── delete-profile-picture/ # Delete profile picture
        ├── delete-banner/       # Delete banner
        ├── create-table-user-banners/ # Create user_banners table
        └── create-table-user-profile-pics/ # Create user_profile_pics table
```

## 🗄️ Database Tables

The following tables are created automatically:

### User Tables
- `user_profiles` - User profile information
- `user_preferences` - User matching preferences
- `user_stats` - User engagement statistics
- `user_profile_pics` - Profile picture metadata
- `user_banners` - Banner image metadata

### Companion Tables
- `companions` - AI companion profiles
- `swipe_decisions` - User swipe history
- `matches` - User-companion matches
- `conversations` - Chat sessions
- `messages` - Individual messages

### Other Tables
- `memory_entries` - Companion memory entries (if applicable)

## 📦 Storage Buckets

The following storage buckets are created automatically:

1. **`avatars`** - User avatar images
2. **`banners`** - User banner images (5MB limit)
3. **`companion-images`** - AI companion profile images
4. **`profile-pics`** - User profile pictures (5MB limit)

## ⚡ Edge Functions

### Initialization

**`initialize`** (POST)
- Creates all database tables
- Creates all storage buckets
- Sets up RLS policies
- Creates database functions and triggers
- **Call this once when setting up a new Supabase instance**

### Database Operations

All database operations go through Edge Functions:

- **Companions:** `get-companions`, `create-companion`, `update-companion`, `delete-companion`, `get-recommended-companions`
- **User Profiles:** `get-user-profile`, `update-user-profile`, `ensure-user-profile`
- **Conversations:** `get-conversations`, `send-message`, `mark-messages-read`, `update-conversation-status`
- **Matches:** `get-matches`, `deactivate-match`
- **Swipes:** `process-swipe`
- **Table Creation:** `create-table-user-banners`, `create-table-user-profile-pics`

### File Operations

All file operations go through Edge Functions:

- **Upload:** `upload-avatar`, `upload-profile-picture`, `upload-banner`
- **Get:** `get-profile-picture`, `get-banner`
- **Delete:** `delete-profile-picture`, `delete-banner`

## 🔐 Security Model

### Authentication
- All Edge Functions require user authentication via JWT token
- Functions validate the user's identity before processing requests
- Service role key is only used server-side within Edge Functions

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Storage buckets have RLS policies for user-specific access

### Data Validation
- All input is validated in Edge Functions
- File uploads are validated for type and size
- Business logic is enforced server-side

## 📝 Usage from Applications

### Client-Side Usage

Applications should use the Edge Functions client library:

```typescript
import { edgeFunctions } from '@/lib/edge-functions'

// Get companions
const companions = await edgeFunctions.getCompanions()

// Get user profile
const profile = await edgeFunctions.getUserProfile()

// Update profile
await edgeFunctions.updateUserProfile({ display_name: 'New Name' })

// Upload avatar
const url = await edgeFunctions.uploadAvatar(file)

// Send message
await edgeFunctions.sendMessage(conversationId, 'Hello!')
```

### Direct Edge Function Calls

If needed, you can call Edge Functions directly:

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const token = await getAuthToken()

const response = await fetch(`${supabaseUrl}/functions/v1/get-companions`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
})

const result = await response.json()
```

## 🛠️ Development

### Prerequisites

- Node.js (v18 or later)
- Docker Desktop
- Supabase CLI

### Install Supabase CLI

```bash
npm install -g supabase
```

### Start Local Supabase

```bash
cd Galatea-AI-Supabase
npx supabase start
```

### Start Edge Functions Server

In a **separate terminal**, run:

```bash
cd Galatea-AI-Supabase
npm run functions:serve
# OR
npx supabase functions serve --no-verify-jwt
```

**Keep this terminal running!** This serves all Edge Functions locally.

### Run Migrations

```bash
npx supabase db reset
```

This will:
- Run all migrations in order
- Create all storage buckets
- Set up all tables and policies

### View Database

Open Supabase Studio:
```bash
open http://127.0.0.1:54323
# OR
npm run studio
```

## 🚀 Production Deployment

### Link to Production Project

```bash
supabase link --project-ref your-project-ref
```

### Push Migrations

```bash
npx supabase db push
```

### Deploy Edge Functions

```bash
npm run functions:deploy:all
# OR
npx supabase functions deploy --no-verify-jwt --all
```

### Set Environment Variables

In Supabase Dashboard → Edge Functions → Settings, set:
- `STORAGE_BUCKET` = `profile-pics`
- `BANNER_BUCKET` = `banners`

Or via CLI:
```bash
supabase secrets set STORAGE_BUCKET=profile-pics
supabase secrets set BANNER_BUCKET=banners
```

### Initialize Production Instance

After deploying, call the initialization function once:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/initialize \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## 📚 Available Scripts

```bash
# Start Supabase
npm run start
# OR
npx supabase start

# Stop Supabase
npm run stop
# OR
npx supabase stop

# Check Status
npm run status
# OR
npx supabase status

# Reset Database
npm run reset
# OR
npx supabase db reset

# Push Migrations
npm run migrate
# OR
npx supabase db push

# View Logs
npm run logs
# OR
npx supabase logs

# Open Studio
npm run studio
# OR
open http://127.0.0.1:54323

# Serve Edge Functions
npm run functions:serve
# OR
npx supabase functions serve --no-verify-jwt

# Deploy All Functions
npm run functions:deploy:all
# OR
npx supabase functions deploy --no-verify-jwt --all
```

## 🔄 Adding New Features

### Adding a New Edge Function

1. Create a new directory in `supabase/functions/`:
   ```bash
   mkdir -p supabase/functions/my-new-function
   ```

2. Create `index.ts` with the function logic:
   ```typescript
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

   const corsHeaders = {
     'Access-Control-Allow-Origin': '*',
     'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
   }

   serve(async (req) => {
     // Your function logic here
   })
   ```

3. Add the function to client libraries in applications

### Adding a New Table

1. Add table creation to the `initialize` Edge Function
2. Create a `create-table-{table-name}` Edge Function
3. Update client libraries to use the new table

### Adding a New Storage Bucket

1. Add bucket creation to the `initialize` Edge Function
2. Create upload/get/delete Edge Functions for the bucket
3. Update client libraries

## 📖 Documentation

- **Configuration:** See `SUPABASE_CONFIGURATION.md` for complete configuration details
- **Edge Functions:** See `EDGE_FUNCTIONS_ENV.md` for environment variable configuration
- **Migration Guide:** See `EDGE_FUNCTIONS_MIGRATION.md` for migration details

## ⚠️ Important Notes

1. **Never expose service role key** - Only use it server-side in Edge Functions
2. **Always validate input** - Edge Functions should validate all user input
3. **Use RLS policies** - Never bypass RLS, always use user-authenticated clients for storage
4. **Handle errors gracefully** - Return meaningful error messages to clients
5. **Log operations** - Use console.log/console.error for debugging (visible in Supabase logs)

## 🐛 Troubleshooting

### Edge Functions Not Working

1. Check if Edge Functions server is running:
   ```bash
   npm run functions:serve
   ```

2. Check Edge Functions logs:
   ```bash
   npx supabase functions logs
   ```

3. Verify environment variables are set

### Tables Not Found

1. Call the initialization function:
   ```bash
   curl -X POST http://127.0.0.1:54321/functions/v1/initialize \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

2. Or run migrations:
   ```bash
   npx supabase db reset
   ```

### Storage Buckets Not Found

1. Check if buckets exist in Supabase Studio
2. Call the initialization function
3. Or run migrations manually

## 📞 Support

For issues or questions:
1. Check the documentation files
2. Review Edge Functions logs
3. Check Supabase Studio for database/storage status

---

**Remember:** All data operations must go through Edge Functions. Never access the database or storage directly from client applications!
