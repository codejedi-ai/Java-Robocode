# Galatea AI - Shared Supabase Backend

This is the **shared Supabase backend** used by all Galatea AI applications.

## Quick Start

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
npm run start
# OR
npx supabase start
```

### Serve Edge Functions

In a **separate terminal**, run:

```bash
npm run functions:serve
# OR
npx supabase functions serve --no-verify-jwt
```

**Keep this terminal running!** This serves all Edge Functions locally.

### Run Migrations

```bash
npm run reset
# OR
npx supabase db reset
```

This will:
- Run all migrations in order
- Create all storage buckets
- Set up all tables and policies

## Storage Buckets

The following buckets are created automatically:

- `banners` - For banner images
- `profile-pics` - For profile pictures
- `avatars` - For user avatars
- `companion-images` - For companion images

## Edge Functions

### Banner Functions
- `upload-banner` - Upload banner images
- `get-banner` - Get banner URL
- `delete-banner` - Delete banner

### Profile Picture Functions
- `upload-profile-picture` - Upload profile pictures
- `get-profile-picture` - Get profile picture URL
- `delete-profile-picture` - Delete profile picture

### Table Creation Functions
- `create-table-user-banners` - Creates user_banners table
- `create-table-user-profile-pics` - Creates user_profile_pics table

## Environment Variables

See [EDGE_FUNCTIONS_ENV.md](./EDGE_FUNCTIONS_ENV.md) for details on configuring storage bucket names.

## Development

### View Database Status

```bash
npm run status
# OR
npx supabase status
```

### View Logs

```bash
npm run logs
# OR
npx supabase logs
```

### Open Supabase Studio

```bash
npm run studio
# OR open http://127.0.0.1:54323
```

## Production Deployment

### Link to Production Project

```bash
supabase link --project-ref your-project-ref
```

### Push Migrations

```bash
npm run migrate
# OR
npx supabase db push
```

### Deploy Functions

```bash
npm run functions:deploy:all
# OR
npx supabase functions deploy --no-verify-jwt --all
```

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common issues and solutions.

