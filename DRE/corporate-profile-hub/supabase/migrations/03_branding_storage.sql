-- =========================================================
-- BRANDING STORAGE: CORPORATE PROFILE HUB
-- =========================================================

-- 1. Create the bucket for company branding (Logos)
-- This bucket is PUBLIC to allow logos to be visible in shared links.
insert into storage.buckets (id, name, public)
values ('company-branding', 'company-branding', true)
on conflict (id) do nothing;

-- 2. RLS for branding objects
-- Authenticated users can upload if they belong to the organization (folder name matches org_id)
-- Path pattern: logos/{organization_id}/{filename}

create policy "Authenticated users can upload logos"
on storage.objects for insert
with check (
  bucket_id = 'company-branding' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[2] in (
    select organization_id::text from public.organization_members where user_id = auth.uid()
  )
);

create policy "Authenticated users can update their own logos"
on storage.objects for update
using (
  bucket_id = 'company-branding' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[2] in (
    select organization_id::text from public.organization_members where user_id = auth.uid()
  )
);

create policy "Authenticated users can delete their own logos"
on storage.objects for delete
using (
  bucket_id = 'company-branding' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[2] in (
    select organization_id::text from public.organization_members where user_id = auth.uid()
  )
);

-- Public access policy for viewing logos (essential for white-labeling and sharing)
create policy "Public access to view logos"
on storage.objects for select
using ( bucket_id = 'company-branding' );
