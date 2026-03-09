

## Problem

The previous fix split the Google login into two paths: `lovable.auth.signInWithOAuth` for preview and `supabase.auth.signInWithOAuth` for the published domain. However, Lovable Cloud manages Google OAuth credentials through its auth-bridge — the Supabase project itself has no Google OAuth secret configured, causing the "Unsupported provider: missing OAuth secret" error on the published URL.

## Fix

**Remove the environment split.** Always use `lovable.auth.signInWithOAuth("google", ...)` regardless of environment. The Lovable auth-bridge handles Google OAuth for all domains.

### `src/pages/Login.tsx`
- Remove the `isPreview` check in `handleGoogleLogin`
- Always call `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
- Remove the `else` branch that calls `supabase.auth.signInWithOAuth`

This is a ~10-line change in a single file.

