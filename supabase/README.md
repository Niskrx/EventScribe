# Supabase setup

The initial schema is in `migrations/202611180001_initial_schema.sql`. It creates the user-owned tables, the new-user profile trigger, Row Level Security policies, and the private `eventscribe-files` storage bucket with user-scoped object policies.

## Applying the migration

Use one of the following once the team has selected its Supabase project:

- Apply the SQL in the Supabase Dashboard SQL Editor, or
- Initialize the Supabase CLI locally and run the project migration workflow.

Before using the application with real data, verify in the Supabase dashboard that:

1. Auth email/password is enabled.
2. The migration completed without errors.
3. RLS is enabled on every application table.
4. The `eventscribe-files` bucket is private.
5. Storage policies restrict the first path segment to the authenticated user ID.

The application remains runnable without Supabase credentials. In that mode, startup warnings explain that authentication and persistence are disabled.
