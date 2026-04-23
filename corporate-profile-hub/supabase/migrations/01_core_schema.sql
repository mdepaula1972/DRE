-- =========================================================
-- CORE SCHEMA: CORPORATE PROFILE HUB (SAAS MULTI-TENANT)
-- =========================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. ORGANIZATIONS (TENANTS / ACCOUNTS)
create table if not exists public.organizations (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    slug text unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    plan text default 'free' check (plan in ('free', 'pro', 'enterprise')),
    settings jsonb default '{}'::jsonb
);

-- 3. PROFILES (EXTENDING AUTH.USERS)
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    avatar_url text,
    email text unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. ORGANIZATION MEMBERSHIPS
create type public.org_role as enum ('owner', 'admin', 'editor', 'viewer');

create table if not exists public.organization_members (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    role public.org_role default 'viewer',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(organization_id, user_id)
);

-- 5. COMPANIES (PROFILES MANAGED WITHIN AN ORGANIZATION)
create table if not exists public.companies (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    legal_name text not null, -- Razão Social
    trade_name text, -- Nome Fantasia
    tax_id text not null, -- CNPJ
    state_registration text, -- Inscrição Estadual
    municipal_registration text, -- Inscrição Municipal
    cnae text,
    tax_regime text, -- Regime Tributário
    status text default 'active',
    slug text unique not null,
    is_public boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. COMPANY BRANDING (WHITE-LABEL MODULE)
create table if not exists public.company_branding (
    id uuid primary key default uuid_generate_v4(),
    company_id uuid references public.companies(id) on delete cascade unique,
    logo_url text,
    secondary_logo_url text,
    favicon_url text,
    primary_color text default '#000000', -- HEX
    secondary_color text default '#ffffff', -- HEX
    accent_color text default '#3b82f6', -- HEX
    theme_mode text default 'light' check (theme_mode in ('light', 'dark', 'dynamic')),
    visual_style text default 'institutional',
    social_links jsonb default '{}'::jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. COMPANY ADDRESSES
create table if not exists public.company_addresses (
    id uuid primary key default uuid_generate_v4(),
    company_id uuid references public.companies(id) on delete cascade,
    type text default 'main' check (type in ('main', 'branch', 'billing', 'shipping')),
    street text not null,
    number text,
    complement text,
    neighborhood text,
    city text not null,
    state text not null,
    zip_code text not null,
    country text default 'Brasil',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. COMPANY CONTACTS
create table if not exists public.company_contacts (
    id uuid primary key default uuid_generate_v4(),
    company_id uuid references public.companies(id) on delete cascade,
    department text, -- Financeiro, Comercial, etc.
    name text,
    email text,
    phone text,
    is_primary boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. COMPANY BANK DATA
create table if not exists public.company_bank_data (
    id uuid primary key default uuid_generate_v4(),
    company_id uuid references public.companies(id) on delete cascade,
    bank_code text, -- ex: 001, 341
    bank_name text,
    agency text,
    account text,
    account_type text,
    pix_key text,
    pix_type text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. COMPANY DOCUMENTS (METADATA)
create table if not exists public.company_documents (
    id uuid primary key default uuid_generate_v4(),
    company_id uuid references public.companies(id) on delete cascade,
    category text not null, -- Contrato Social, Cartão CNPJ, etc.
    name text not null,
    file_path text not null, -- Path inside Supabase Storage
    content_type text,
    size_bytes bigint,
    version integer default 1,
    valid_until date,
    status text default 'valid' check (status in ('valid', 'expiring', 'expired')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 11. AUDIT LOGS
create table if not exists public.audit_logs (
    id uuid primary key default uuid_generate_v4(),
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references public.profiles(id),
    action text not null,
    table_name text,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =========================================================
-- RLS POLICIES (ROW LEVEL SECURITY)
-- =========================================================

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.companies enable row level security;
alter table public.company_branding enable row level security;
alter table public.company_addresses enable row level security;
alter table public.company_contacts enable row level security;
alter table public.company_bank_data enable row level security;
alter table public.company_documents enable row level security;
alter table public.audit_logs enable row level security;

-- Simple helper function to get current user organization list
create or replace function public.get_user_orgs()
returns setof uuid as $$
    select organization_id from public.organization_members where user_id = auth.uid();
$$ language sql security definer;

-- Profiles: Users can only see/edit their own profile
create policy "User can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "User can update own profile" on public.profiles for update using (auth.uid() = id);

-- Organizations: Users can only see orgs they belong to
create policy "User can view member organizations" on public.organizations 
for select using (id in (select public.get_user_orgs()));

-- Companies: Multitenancy isolation
create policy "User can access member companies" on public.companies
for all using (organization_id in (select public.get_user_orgs()));

-- Branding, Addresses, Contacts, etc: Restricted via company -> organization link
create policy "User can access company sub-data" on public.company_branding
for all using (company_id in (select id from public.companies 
    where organization_id in (select public.get_user_orgs())));

-- (Repeat for other company-related tables)
create policy "Companies access check" on public.company_addresses for all using (company_id in (select id from public.companies where organization_id in (select public.get_user_orgs())));
create policy "Companies access check" on public.company_contacts for all using (company_id in (select id from public.companies where organization_id in (select public.get_user_orgs())));
create policy "Companies access check" on public.company_bank_data for all using (company_id in (select id from public.companies where organization_id in (select public.get_user_orgs())));
create policy "Companies access check" on public.company_documents for all using (company_id in (select id from public.companies where organization_id in (select public.get_user_orgs())));

-- Public Access (Specific for link sharing)
create policy "Public can view active public companies" on public.companies
for select using (is_public = true and status = 'active');

create policy "Public can view branding of public companies" on public.company_branding
for select using (company_id in (select id from public.companies where is_public = true));

-- =========================================================
-- TRIGGERS FOR PROFILES (Sync from Auth Users)
-- =========================================================

-- Create a profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.email, new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger logic with cleanup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
