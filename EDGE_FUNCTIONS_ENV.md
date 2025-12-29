# Edge Functions Environment Variables

## Storage Bucket Configuration

Edge Functions use different buckets for different file types:

### Banner Functions
- Use `BANNER_BUCKET` environment variable (falls back to `STORAGE_BUCKET`, then defaults to `'banners'`)
- Default bucket: `'banners'`

### Profile Picture Functions
- Use `STORAGE_BUCKET` environment variable
- Default bucket: `'profile-pics'`

### Setting the Environment Variable

#### For Local Development

When running `supabase functions serve`, you can set the environment variables:

```bash
BANNER_BUCKET=banners STORAGE_BUCKET=profile-pics npx supabase functions serve --no-verify-jwt
```

Or export them in your shell:
```bash
export BANNER_BUCKET=banners
export STORAGE_BUCKET=profile-pics
npx supabase functions serve --no-verify-jwt
```

#### For Production

When deploying to Supabase, set the environment variable in the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **Settings**
3. Add `BANNER_BUCKET` with the value `banners` (or your custom bucket name)
4. Add `STORAGE_BUCKET` with the value `profile-pics` (or your custom bucket name)

Or use the CLI:
```bash
supabase secrets set BANNER_BUCKET=banners
supabase secrets set STORAGE_BUCKET=profile-pics
```

### Functions Using Bucket Variables

**Banner Functions** (use `BANNER_BUCKET`, default: `'banners'`):
- `upload-banner` - Uploads banner images
- `get-banner` - Retrieves banner image URLs
- `delete-banner` - Deletes banner images

**Profile Picture Functions** (use `STORAGE_BUCKET`, default: `'profile-pics'`):
- `upload-profile-picture` - Uploads profile pictures
- `get-profile-picture` - Retrieves profile picture URLs
- `delete-profile-picture` - Deletes profile pictures

### Verifying the Buckets Exist

Make sure the storage buckets exist in your Supabase instance. The buckets are created by migrations:
- `20250105000000_ensure_storage_buckets.sql` - Creates `profile-pics`, `avatars`, and `companion-images`
- `20250105000001_create_banners_bucket.sql` - Creates `banners` bucket

To verify:
1. Open Supabase Studio: http://127.0.0.1:54323
2. Go to **Storage** section
3. Verify these buckets exist:
   - `banners` (for banner images)
   - `profile-pics` (for profile pictures)
   - `avatars` (for user avatars)
   - `companion-images` (for companion images)

If they don't exist, run:
```bash
cd Galatea-AI-Supabase
npx supabase db reset
```

This will run all migrations including the ones that create the buckets.

