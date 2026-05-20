create extension if not exists pgcrypto with schema extensions;

create schema if not exists app_private;

alter default privileges in schema public revoke all on tables from anon, authenticated;

create table public.source_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('fee_sheet', 'pipeline', 'production_revenue', 'float', 'read_only_sql', 'sync_log')),
  mode text not null check (mode in ('fixture', 'read_only_live', 'legacy_import', 'manual_snapshot', 'backfill')),
  status text not null check (status in ('running', 'success', 'partial', 'failed', 'cancelled')),
  source_label text not null,
  source_version text,
  read_only boolean not null default true check (read_only is true),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table public.raw_source_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.source_batches(id) on delete restrict,
  source text not null check (source in ('fee_sheet', 'pipeline', 'production_revenue', 'float', 'read_only_sql', 'sync_log')),
  stable_source_row_key text not null,
  source_document_id text,
  source_tab text,
  source_row_number integer check (source_row_number is null or source_row_number > 0),
  source_object_id text,
  raw jsonb not null,
  content_hash text not null,
  observed_at timestamptz not null default now(),
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  created_at timestamptz not null default now(),
  unique (batch_id, stable_source_row_key)
);

create table public.parsed_facts (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('fee_sheet', 'pipeline', 'production_revenue', 'float', 'read_only_sql', 'sync_log')),
  source_layer text not null check (source_layer in ('sold', 'pipeline', 'production_revenue', 'float_raw', 'float_cache', 'float_visible', 'float_export', 'fee_sheet_parser_summary', 'read_only_sql', 'sync_log')),
  batch_id uuid not null references public.source_batches(id) on delete restrict,
  raw_row_ids uuid[] not null check (cardinality(raw_row_ids) > 0),
  job_number text,
  float_project_id text,
  scope jsonb not null default '{}'::jsonb check (jsonb_typeof(scope) = 'object'),
  dimensions jsonb not null default '{}'::jsonb check (jsonb_typeof(dimensions) = 'object'),
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  status text,
  is_additive boolean not null,
  additive_status text not null check (additive_status in ('additive', 'not_additive', 'source_summary', 'unknown_requires_review')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  lifecycle_state text not null default 'current' check (lifecycle_state in ('current', 'superseded', 'not_seen_in_latest_batch', 'deleted_by_source_evidence', 'parser_failed_latest_batch')),
  constraint read_only_sql_diagnostic_only check (source <> 'read_only_sql' or ((dimensions ->> 'diagnostic_only') = 'true')),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  created_at timestamptz not null default now(),
  superseded_by uuid references public.parsed_facts(id) on delete restrict
);

create table public.source_conflicts (
  id uuid primary key default gen_random_uuid(),
  scope jsonb not null default '{}'::jsonb check (jsonb_typeof(scope) = 'object'),
  conflict_type text not null,
  severity text not null check (severity in ('PASS', 'DATA_WARN', 'PROCESS_WARN', 'FAIL')),
  source_layers text[] not null default ARRAY[]::text[],
  fact_ids uuid[] not null default ARRAY[]::uuid[],
  raw_row_ids uuid[] not null default ARRAY[]::uuid[],
  message text not null,
  lifecycle_state text not null default 'open' check (lifecycle_state in ('open', 'acknowledged', 'source_fixed_pending_refresh', 'resolved_by_source', 'resolved_by_code', 'wont_fix_source_limitation', 'superseded')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolution_evidence text,
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  created_at timestamptz not null default now(),
  superseded_by uuid references public.source_conflicts(id) on delete restrict
);

create table public.display_contract_snapshots (
  id uuid primary key default gen_random_uuid(),
  scope jsonb not null check (jsonb_typeof(scope) = 'object'),
  contract_version integer not null check (contract_version > 0),
  generated_at timestamptz not null default now(),
  contract_hash text not null,
  source_batch_ids uuid[] not null default ARRAY[]::uuid[],
  legacy_comparison_only boolean not null default false,
  visible_rows jsonb not null check (jsonb_typeof(visible_rows) = 'array'),
  totals jsonb not null check (jsonb_typeof(totals) = 'object'),
  unsupported jsonb not null default '[]'::jsonb check (jsonb_typeof(unsupported) = 'array'),
  reconciliation jsonb not null default '[]'::jsonb check (jsonb_typeof(reconciliation) = 'array'),
  warnings jsonb not null default '[]'::jsonb check (jsonb_typeof(warnings) = 'array'),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  created_at timestamptz not null default now()
);

create function app_private.reject_raw_source_rows_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'raw_source_rows are immutable; append a new source batch instead';
end;
$$;

create table public.warning_events (
  id uuid primary key default gen_random_uuid(),
  warning_id text not null,
  status text not null check (status in ('PASS', 'DATA_WARN', 'PROCESS_WARN', 'FAIL')),
  lifecycle_state text not null check (lifecycle_state in ('open', 'acknowledged', 'source_fixed_pending_refresh', 'resolved_by_source', 'resolved_by_code', 'wont_fix_source_limitation', 'superseded')),
  source text not null check (source in ('fee_sheet', 'pipeline', 'production_revenue', 'float', 'read_only_sql', 'sync_log')),
  source_layer text not null check (source_layer in ('sold', 'pipeline', 'production_revenue', 'float_raw', 'float_cache', 'float_visible', 'float_export', 'fee_sheet_parser_summary', 'read_only_sql', 'sync_log')),
  scope jsonb not null default '{}'::jsonb check (jsonb_typeof(scope) = 'object'),
  owner text not null check (owner in ('Jade', 'Yunni', 'Production', 'Project owner', 'Tom', 'Codex', 'Unknown')),
  message text not null,
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolution_evidence text,
  created_at timestamptz not null default now(),
  superseded_by uuid references public.warning_events(id) on delete restrict
);

create table public.user_overlays (
  id uuid primary key default gen_random_uuid(),
  overlay_type text not null check (overlay_type in ('dashboard_archive', 'warning_acknowledgement', 'saved_view', 'manual_note')),
  target_type text not null,
  target_id text not null,
  scope jsonb not null default '{}'::jsonb check (jsonb_typeof(scope) = 'object'),
  before_value jsonb,
  after_value jsonb not null default '{}'::jsonb,
  reason text not null,
  actor_id uuid,
  status text not null default 'active' check (status in ('active', 'superseded', 'reverted')),
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  created_at timestamptz not null default now(),
  superseded_by uuid references public.user_overlays(id) on delete restrict
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_table text not null,
  target_id text not null,
  before_value jsonb,
  after_value jsonb,
  reason text not null,
  source_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(source_refs) = 'array'),
  created_at timestamptz not null default now()
);

alter table public.source_batches enable row level security;
alter table public.raw_source_rows enable row level security;
alter table public.parsed_facts enable row level security;
alter table public.source_conflicts enable row level security;
alter table public.display_contract_snapshots enable row level security;
alter table public.warning_events enable row level security;
alter table public.user_overlays enable row level security;
alter table public.audit_log enable row level security;

create trigger raw_source_rows_no_update
before update on public.raw_source_rows
for each row execute function app_private.reject_raw_source_rows_mutation();

create trigger raw_source_rows_no_delete
before delete on public.raw_source_rows
for each row execute function app_private.reject_raw_source_rows_mutation();

revoke all on table
  public.source_batches,
  public.raw_source_rows,
  public.parsed_facts,
  public.source_conflicts,
  public.display_contract_snapshots,
  public.warning_events,
  public.user_overlays,
  public.audit_log
from anon, authenticated;

create index source_batches_source_status_idx on public.source_batches (source, status, started_at desc);
create index raw_source_rows_batch_source_idx on public.raw_source_rows (batch_id, source);
create index raw_source_rows_source_identity_idx on public.raw_source_rows (source, stable_source_row_key);
create index parsed_facts_scope_source_idx on public.parsed_facts (source, source_layer, lifecycle_state);
create index parsed_facts_job_number_idx on public.parsed_facts (job_number) where job_number is not null;
create index parsed_facts_float_project_id_idx on public.parsed_facts (float_project_id) where float_project_id is not null;
create index source_conflicts_lifecycle_idx on public.source_conflicts (lifecycle_state, severity, last_seen_at desc);
create index warning_events_lifecycle_idx on public.warning_events (lifecycle_state, status, last_seen_at desc);
create index user_overlays_target_idx on public.user_overlays (target_type, target_id, status);
create index audit_log_target_idx on public.audit_log (target_table, target_id, created_at desc);
