-- =====================================================================
-- CUPIDON RENCONTRES — Comptes membres, profils, photos, journal
-- À exécuter UNE FOIS dans Supabase : Dashboard → SQL Editor → New query
-- → coller tout ce fichier → Run.
-- Ce script est SANS DANGER pour les tables existantes (Pull Up Hub,
-- inscriptions_cupidon) : il ne fait que CRÉER de nouvelles choses.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. PROFILS DES MEMBRES
--    Une ligne par membre, reliée au compte (auth.users).
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.profils_cupidon (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  prenom         text not null,
  genre          text check (genre in ('homme','femme','nonbinaire','nonprecise')),
  date_naissance date,
  situation      text check (situation in ('resident','vacances','bientot')),
  ville          text,
  recherche      text[] default '{}',
  personnalite   text check (personnalite in ('maison','mixte','sortir')),
  premier_rdv    text check (premier_rdv in ('rapide','jours','semaines')),
  interets       text[] default '{}',
  profil_type    text,
  description    text,
  avatar         jsonb,
  photos         text[] default '{}',
  statut         text not null default 'actif'
                 check (statut in ('actif','suspendu','suppression_demandee')),
  cree_le        timestamptz not null default now(),
  modifie_le     timestamptz not null default now()
);

comment on table public.profils_cupidon is
  'Profils des membres Cupidon Rencontres (questionnaire, avatar, photos).';

-- Mise à jour automatique de modifie_le
create or replace function public.cupidon_touch_modifie_le()
returns trigger language plpgsql as $$
begin
  new.modifie_le := now();
  return new;
end $$;

drop trigger if exists trg_profils_cupidon_touch on public.profils_cupidon;
create trigger trg_profils_cupidon_touch
  before update on public.profils_cupidon
  for each row execute function public.cupidon_touch_modifie_le();

-- Sécurité RLS : chacun gère SA ligne ; les membres connectés voient
-- uniquement les profils actifs (jamais les suspendus / en suppression).
alter table public.profils_cupidon enable row level security;

drop policy if exists "cupidon: voir les profils actifs" on public.profils_cupidon;
create policy "cupidon: voir les profils actifs"
  on public.profils_cupidon for select
  to authenticated
  using (statut = 'actif' or user_id = auth.uid());

drop policy if exists "cupidon: creer son profil" on public.profils_cupidon;
create policy "cupidon: creer son profil"
  on public.profils_cupidon for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "cupidon: modifier son profil" on public.profils_cupidon;
create policy "cupidon: modifier son profil"
  on public.profils_cupidon for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Pas de règle DELETE : la suppression définitive est réservée à l'équipe
-- (clé service_role), après une demande du membre (statut suppression_demandee).

-- ─────────────────────────────────────────────────────────────────────
-- 2. JOURNAL DES CONNEXIONS
--    Trace simple des connexions (appareil + date) pour la sécurité.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.journal_connexions_cupidon (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users(id) on delete cascade,
  appareil text,
  cree_le  timestamptz not null default now()
);

alter table public.journal_connexions_cupidon enable row level security;

drop policy if exists "cupidon: noter sa connexion" on public.journal_connexions_cupidon;
create policy "cupidon: noter sa connexion"
  on public.journal_connexions_cupidon for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "cupidon: voir ses connexions" on public.journal_connexions_cupidon;
create policy "cupidon: voir ses connexions"
  on public.journal_connexions_cupidon for select
  to authenticated
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- 3. PHOTOS DE PROFIL (Supabase Storage)
--    Bucket privé : chaque membre écrit uniquement dans SON dossier,
--    les membres connectés peuvent voir les photos (liens signés).
-- ─────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos-cupidon', 'photos-cupidon', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "cupidon photos: lire" on storage.objects;
create policy "cupidon photos: lire"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'photos-cupidon');

drop policy if exists "cupidon photos: deposer dans son dossier" on storage.objects;
create policy "cupidon photos: deposer dans son dossier"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos-cupidon' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "cupidon photos: remplacer dans son dossier" on storage.objects;
create policy "cupidon photos: remplacer dans son dossier"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos-cupidon' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "cupidon photos: supprimer dans son dossier" on storage.objects;
create policy "cupidon photos: supprimer dans son dossier"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos-cupidon' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────
-- Fin. Vérification rapide (doit renvoyer 2 lignes) :
--   select tablename from pg_tables where tablename like '%cupidon%';
-- =====================================================================
