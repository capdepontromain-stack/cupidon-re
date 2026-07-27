-- =====================================================================
-- CUPIDON RENCONTRES — J'aime, matchs, messages privés et salons
-- À exécuter UNE FOIS dans Supabase : Dashboard → SQL Editor → New query
-- → coller tout ce fichier → Run.
--
-- Ce script est SANS DANGER pour l'existant : il ne fait que CRÉER de
-- nouvelles choses (il ne touche ni aux profils, ni à Pull Up Hub).
-- Il complète sql/cupidon-auth.sql, qui doit avoir été passé avant.
--
-- Principe de sécurité : tout est fermé par défaut (RLS). Personne ne
-- peut lire les messages de quelqu'un d'autre, même en trafiquant
-- l'application depuis son navigateur — c'est la base de données
-- elle-même qui refuse.
-- =====================================================================


-- ─────────────────────────────────────────────────────────────────────
-- 1. LES « J'AIME » ET LES « JE PASSE »
--    Une ligne par décision. Un match n'existe que si les DEUX
--    personnes se sont mutuellement aimées.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.likes_cupidon (
  auteur_id  uuid not null references auth.users(id) on delete cascade,
  cible_id   uuid not null references auth.users(id) on delete cascade,
  decision   text not null check (decision in ('aime','passe','superlike')),
  cree_le    timestamptz not null default now(),
  primary key (auteur_id, cible_id),
  constraint likes_cupidon_pas_soi_meme check (auteur_id <> cible_id)
);

comment on table public.likes_cupidon is
  'Décisions de swipe. Un match = deux lignes « aime » croisées.';

create index if not exists idx_likes_cupidon_cible on public.likes_cupidon(cible_id);

alter table public.likes_cupidon enable row level security;

-- On voit ses propres décisions, et les « aime » reçus (pour calculer
-- les matchs). On ne voit jamais les « passe » que les autres ont faits
-- sur soi : inutile et blessant.
drop policy if exists "cupidon: voir ses likes" on public.likes_cupidon;
create policy "cupidon: voir ses likes"
  on public.likes_cupidon for select
  to authenticated
  using (
    auteur_id = auth.uid()
    or (cible_id = auth.uid() and decision in ('aime','superlike'))
  );

drop policy if exists "cupidon: donner son like" on public.likes_cupidon;
create policy "cupidon: donner son like"
  on public.likes_cupidon for insert
  to authenticated
  with check (auteur_id = auth.uid());

drop policy if exists "cupidon: changer son like" on public.likes_cupidon;
create policy "cupidon: changer son like"
  on public.likes_cupidon for update
  to authenticated
  using (auteur_id = auth.uid())
  with check (auteur_id = auth.uid());

drop policy if exists "cupidon: retirer son like" on public.likes_cupidon;
create policy "cupidon: retirer son like"
  on public.likes_cupidon for delete
  to authenticated
  using (auteur_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────
-- 2. LES MATCHS
--    Vue calculée : pas de table à tenir à jour, donc pas de risque
--    d'incohérence. Un match apparaît dès que le « aime » est réciproque.
-- ─────────────────────────────────────────────────────────────────────
create or replace view public.matchs_cupidon
with (security_invoker = true) as
select
  a.auteur_id                    as user_id,
  a.cible_id                     as autre_id,
  greatest(a.cree_le, b.cree_le) as depuis_le
from public.likes_cupidon a
join public.likes_cupidon b
  on b.auteur_id = a.cible_id
 and b.cible_id  = a.auteur_id
where a.decision in ('aime','superlike')
  and b.decision in ('aime','superlike');

comment on view public.matchs_cupidon is
  'Matchs réciproques, calculés à la volée depuis likes_cupidon.';


-- ─────────────────────────────────────────────────────────────────────
-- 3. LES MESSAGES PRIVÉS
--    On ne peut écrire qu'à une personne avec qui on a matché.
--    C'est vérifié par la base, pas seulement par l'application.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.messages_cupidon (
  id            bigint generated always as identity primary key,
  expediteur_id uuid not null references auth.users(id) on delete cascade,
  destinataire_id uuid not null references auth.users(id) on delete cascade,
  texte         text not null check (length(trim(texte)) between 1 and 2000),
  lu            boolean not null default false,
  cree_le       timestamptz not null default now(),
  constraint messages_cupidon_pas_soi_meme check (expediteur_id <> destinataire_id)
);

comment on table public.messages_cupidon is
  'Messages privés. Réservés aux personnes qui ont matché.';

create index if not exists idx_messages_cupidon_paire
  on public.messages_cupidon(expediteur_id, destinataire_id, cree_le);
create index if not exists idx_messages_cupidon_dest
  on public.messages_cupidon(destinataire_id, lu);

-- Vrai si les deux personnes ont matché (« aime » réciproque).
create or replace function public.cupidon_ont_matche(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.likes_cupidon l1
    join public.likes_cupidon l2
      on l2.auteur_id = l1.cible_id and l2.cible_id = l1.auteur_id
    where l1.auteur_id = a and l1.cible_id = b
      and l1.decision in ('aime','superlike')
      and l2.decision in ('aime','superlike')
  );
$$;

alter table public.messages_cupidon enable row level security;

drop policy if exists "cupidon: lire ses messages" on public.messages_cupidon;
create policy "cupidon: lire ses messages"
  on public.messages_cupidon for select
  to authenticated
  using (expediteur_id = auth.uid() or destinataire_id = auth.uid());

-- Écrire : seulement en son nom, et seulement à un match.
drop policy if exists "cupidon: envoyer un message" on public.messages_cupidon;
create policy "cupidon: envoyer un message"
  on public.messages_cupidon for insert
  to authenticated
  with check (
    expediteur_id = auth.uid()
    and public.cupidon_ont_matche(auth.uid(), destinataire_id)
  );

-- Seul le destinataire peut marquer un message comme lu.
drop policy if exists "cupidon: marquer lu" on public.messages_cupidon;
create policy "cupidon: marquer lu"
  on public.messages_cupidon for update
  to authenticated
  using (destinataire_id = auth.uid())
  with check (destinataire_id = auth.uid());

-- Chacun peut effacer un message qu'il a écrit.
drop policy if exists "cupidon: effacer son message" on public.messages_cupidon;
create policy "cupidon: effacer son message"
  on public.messages_cupidon for delete
  to authenticated
  using (expediteur_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────
-- 4. LES SALONS DE DISCUSSION
--    Messages de groupe, visibles par tous les membres connectés.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.messages_salon_cupidon (
  id        bigint generated always as identity primary key,
  salon     text not null check (salon in ('general','18-25','26-35','36-45','46plus')),
  auteur_id uuid not null references auth.users(id) on delete cascade,
  texte     text not null check (length(trim(texte)) between 1 and 1000),
  cree_le   timestamptz not null default now()
);

comment on table public.messages_salon_cupidon is
  'Messages des salons de discussion, ouverts à tous les membres.';

create index if not exists idx_messages_salon_cupidon
  on public.messages_salon_cupidon(salon, cree_le desc);

alter table public.messages_salon_cupidon enable row level security;

drop policy if exists "cupidon salon: lire" on public.messages_salon_cupidon;
create policy "cupidon salon: lire"
  on public.messages_salon_cupidon for select
  to authenticated
  using (true);

drop policy if exists "cupidon salon: ecrire" on public.messages_salon_cupidon;
create policy "cupidon salon: ecrire"
  on public.messages_salon_cupidon for insert
  to authenticated
  with check (auteur_id = auth.uid());

drop policy if exists "cupidon salon: effacer son message" on public.messages_salon_cupidon;
create policy "cupidon salon: effacer son message"
  on public.messages_salon_cupidon for delete
  to authenticated
  using (auteur_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────
-- 5. LES SIGNALEMENTS ET LES BLOCAGES
--    Obligatoire sur une appli de rencontres : chacun doit pouvoir
--    bloquer et signaler quelqu'un.
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.blocages_cupidon (
  auteur_id uuid not null references auth.users(id) on delete cascade,
  cible_id  uuid not null references auth.users(id) on delete cascade,
  cree_le   timestamptz not null default now(),
  primary key (auteur_id, cible_id)
);

alter table public.blocages_cupidon enable row level security;

drop policy if exists "cupidon: voir ses blocages" on public.blocages_cupidon;
create policy "cupidon: voir ses blocages"
  on public.blocages_cupidon for select
  to authenticated using (auteur_id = auth.uid());

drop policy if exists "cupidon: bloquer" on public.blocages_cupidon;
create policy "cupidon: bloquer"
  on public.blocages_cupidon for insert
  to authenticated with check (auteur_id = auth.uid());

drop policy if exists "cupidon: debloquer" on public.blocages_cupidon;
create policy "cupidon: debloquer"
  on public.blocages_cupidon for delete
  to authenticated using (auteur_id = auth.uid());

create table if not exists public.signalements_cupidon (
  id        bigint generated always as identity primary key,
  auteur_id uuid not null references auth.users(id) on delete cascade,
  cible_id  uuid references auth.users(id) on delete set null,
  motif     text not null,
  details   text,
  traite    boolean not null default false,
  cree_le   timestamptz not null default now()
);

alter table public.signalements_cupidon enable row level security;

-- On peut signaler, et relire ses propres signalements. Le traitement
-- se fait côté Supabase (tableau de bord).
drop policy if exists "cupidon: signaler" on public.signalements_cupidon;
create policy "cupidon: signaler"
  on public.signalements_cupidon for insert
  to authenticated with check (auteur_id = auth.uid());

drop policy if exists "cupidon: voir ses signalements" on public.signalements_cupidon;
create policy "cupidon: voir ses signalements"
  on public.signalements_cupidon for select
  to authenticated using (auteur_id = auth.uid());


-- ─────────────────────────────────────────────────────────────────────
-- 6. TEMPS RÉEL
--    Pour que les messages arrivent sans rafraîchir la page.
-- ─────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages_cupidon'
  ) then
    alter publication supabase_realtime add table public.messages_cupidon;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages_salon_cupidon'
  ) then
    alter publication supabase_realtime add table public.messages_salon_cupidon;
  end if;
end $$;


-- =====================================================================
-- Terminé. Vérification rapide : les requêtes ci-dessous doivent
-- renvoyer 0 (aucune donnée, mais les tables existent).
-- =====================================================================
select
  (select count(*) from public.likes_cupidon)          as likes,
  (select count(*) from public.messages_cupidon)       as messages_prives,
  (select count(*) from public.messages_salon_cupidon) as messages_salons,
  (select count(*) from public.blocages_cupidon)       as blocages;
