-- =====================================================================
-- CUPIDON.RE — Historique des visites et des ouvertures de l'appli
-- À exécuter une seule fois dans Supabase → SQL Editor → Run.
--
-- Aucune donnée personnelle : pas de nom, pas d'e-mail, pas d'adresse IP,
-- pas de position. Seulement la page, la provenance, le type d'appareil
-- et un identifiant anonyme tiré au hasard dans le navigateur (il sert
-- uniquement à ne pas compter dix fois la même personne).
-- =====================================================================

create table if not exists public.visites_cupidon (
  id          bigserial primary key,
  evenement   text not null check (evenement in ('visite', 'clic_appli', 'ouverture_appli')),
  page        text,
  provenance  text,
  appareil    text,
  visiteur    text,                       -- identifiant anonyme (pas une personne identifiable)
  created_at  timestamptz not null default now()
);

create index if not exists visites_cupidon_date_idx on public.visites_cupidon (created_at desc);
create index if not exists visites_cupidon_evenement_idx on public.visites_cupidon (evenement);

alter table public.visites_cupidon enable row level security;

-- Le site (clé anon) peut UNIQUEMENT ajouter une ligne…
drop policy if exists "site ajoute une visite" on public.visites_cupidon;
create policy "site ajoute une visite"
  on public.visites_cupidon for insert to anon, authenticated
  with check (true);

-- …et personne ne peut lire la table depuis le site.
-- Romain la consulte dans Supabase → Table Editor → visites_cupidon
-- (le tableau de bord utilise un accès administrateur, pas la clé anon).

-- ─────────────────────────────────────────────────────────────────────
-- Résumé pratique : visites par jour (à lancer dans le SQL Editor)
--
-- select date(created_at at time zone 'Indian/Reunion') as jour,
--        count(*) filter (where evenement = 'visite')          as visites_site,
--        count(*) filter (where evenement like '%appli%')       as ouvertures_appli,
--        count(distinct visiteur)                              as personnes
-- from public.visites_cupidon
-- group by 1 order by 1 desc;
-- ─────────────────────────────────────────────────────────────────────
