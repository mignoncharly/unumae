-- Roadmap v2 Phase 5 — complete, bounded personal-data export.

create or replace function public.prevent_draw_precommit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;
  raise exception 'Draw precommits are append-only'
    using errcode = 'object_not_in_prerequisite_state';
end;
$$;

-- A frozen precommit membership is personal data. It must leave with the
-- account even though ordinary edits to a commitment remain forbidden. Clean
-- any orphan created between Phase 4 and this migration before validating the
-- new relationship; the committed hash remains as the non-identifying audit.
alter table public.draw_precommit_candidates
  disable trigger draw_precommit_candidates_append_only;
delete from public.draw_precommit_candidates c
where not exists (select 1 from public.profiles p where p.id = c.user_id);
alter table public.draw_precommit_candidates
  enable trigger draw_precommit_candidates_append_only;

alter table public.draw_precommit_candidates
  add constraint draw_precommit_candidates_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;

-- Version 3 already existed for translations. Phase 5 makes that version
-- truthful by adding every applicable account-linked family introduced since
-- then and by documenting the intentionally withheld security fields.
create or replace function public.export_my_data()
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  subject uuid := (select auth.uid());
  payload jsonb;
  maximum_bytes constant integer := 5 * 1024 * 1024;
begin
  if subject is null then
    raise exception 'Authentication required' using errcode = 'insufficient_privilege';
  end if;

  payload :=
    jsonb_set(public.export_my_data_phase2()::jsonb, '{schema_version}', '3'::jsonb)
    || jsonb_build_object(
      'export_scope', jsonb_build_object(
        'format', 'structured_account_export',
        'maximum_bytes', maximum_bytes,
        'withheld_categories', jsonb_build_array(
          'other_users_private_identifiers',
          'moderator_identifiers',
          'provider_credentials',
          'cryptographic_attestation_material',
          'abuse_detection_hashes_and_thresholds'
        ),
        'inventory', 'docs/PERSONAL_DATA_INVENTORY.md'
      ),
      'portrait_translations', coalesce((
        select jsonb_agg(to_jsonb(tr) - 'portrait_id' order by tr.translated_at)
        from public.portrait_element_translations tr
        join public.portraits po on po.id = tr.portrait_id
        where po.user_id = subject
      ), '[]'::jsonb),
      'question_translations', coalesce((
        select jsonb_agg(to_jsonb(tr) - 'question_id' order by tr.translated_at)
        from public.question_translations tr
        join public.questions q on q.id = tr.question_id
        join public.daily_draws d on d.id = q.draw_id
        where q.author_id = subject or d.selected_user_id = subject
      ), '[]'::jsonb),
      'notification_deliveries', coalesce((
        select jsonb_agg(jsonb_build_object(
          'category', n.category,
          'channel', n.channel,
          'status', n.status,
          'error_code', n.error_code,
          'attempted_at', n.attempted_at
        ) order by n.attempted_at)
        from public.notification_deliveries n where n.user_id = subject
      ), '[]'::jsonb),
      'reports_i_made', coalesce((
        select jsonb_agg(jsonb_build_object(
          'target_type', r.target_type,
          'reason', r.reason,
          'note', r.note,
          'status', r.status,
          'resolution_action', r.resolution_action,
          'resolution_note', r.resolution_note,
          'created_at', r.created_at,
          'resolved_at', r.resolved_at
        ) order by r.created_at)
        from public.content_reports r where r.reporter_id = subject
      ), '[]'::jsonb),
      'selection_history', coalesce((
        select jsonb_agg(jsonb_build_object(
          'selection_date', d.selection_date,
          'draw_version', d.draw_version,
          'was_candidate', exists (
            select 1 from public.draw_candidates mine
            where mine.draw_id = d.id and mine.user_id = subject
          ),
          'candidate_rank', case when exists (
            select 1 from public.draw_candidates mine
            where mine.draw_id = d.id and mine.user_id = subject
          ) then 1 + (
            select count(*) from public.draw_candidates other
            where other.draw_id = d.id and (
              public.draw_rank(d.random_seed, other.user_id), other.user_id
            ) < (
              public.draw_rank(d.random_seed, subject), subject
            )
          ) else null end,
          'was_selected', d.selected_user_id = subject,
          'human_number', case when d.selected_user_id = subject then d.human_number end,
          'status', d.selection_status,
          'candidate_pool_hash', d.candidate_pool_hash,
          'entropy_commitment', d.entropy_commitment,
          'randomness_source', d.randomness_source,
          'algorithm_version', d.algorithm_version
        ) order by d.selection_date, d.draw_version)
        from public.daily_draws d
        where d.selected_user_id = subject or exists (
          select 1 from public.draw_candidates mine
          where mine.draw_id = d.id and mine.user_id = subject
        )
      ), '[]'::jsonb),
      'selection_precommits', coalesce((
        select jsonb_agg(jsonb_build_object(
          'selection_date', p.selection_date,
          'candidate_pool_hash', p.candidate_pool_hash,
          'candidate_count', p.candidate_count,
          'entropy_commitment', p.entropy_commitment,
          'randomness_source', p.randomness_source,
          'algorithm_version', p.algorithm_version,
          'committed_at', p.committed_at
        ) order by p.selection_date)
        from public.draw_precommit_candidates c
        join public.draw_precommits p using (selection_date)
        where c.user_id = subject
      ), '[]'::jsonb),
      'account_assurance', jsonb_build_object(
        'normalized_email', (
          select jsonb_build_object(
            'value', e.normalized_email,
            'confirmed_at', e.confirmed_at,
            'updated_at', e.updated_at
          ) from public.account_email_addresses e where e.user_id = subject
        ),
        'provider_bindings', coalesce((
          select jsonb_agg(jsonb_build_object(
            'provider', b.provider,
            'provider_id', b.provider_id,
            'bound_at', b.bound_at
          ) order by b.bound_at)
          from public.provider_bindings b where b.user_id = subject
        ), '[]'::jsonb),
        'device_attestations', coalesce((
          select jsonb_agg(jsonb_build_object(
            'platform', a.platform,
            'state', a.state,
            'attested_at', a.attested_at,
            'last_verified_at', a.last_verified_at,
            'pool_bound_at', d.pool_bound_at,
            'first_seen_at', d.first_seen_at,
            'last_seen_at', d.last_seen_at
          ) order by a.attested_at)
          from public.account_device_attestations a
          join public.device_binding_flags d on d.id = a.device_flag_id
          where a.user_id = subject
        ), '[]'::jsonb),
        'network_signal_summary', jsonb_build_object(
          'count', (select count(*) from public.account_network_signals n where n.user_id = subject),
          'latest_observed_at', (select max(n.observed_at) from public.account_network_signals n where n.user_id = subject),
          'details_withheld', true
        ),
        'attestation_challenge_summary', jsonb_build_object(
          'count', (select count(*) from public.attestation_challenges c where c.user_id = subject),
          'latest_created_at', (select max(c.created_at) from public.attestation_challenges c where c.user_id = subject),
          'challenge_material_withheld', true
        ),
        'retained_device_flag_after_deletion', exists (
          select 1 from public.account_device_attestations a
          join public.device_binding_flags d on d.id = a.device_flag_id
          where a.user_id = subject and d.pool_bound_at is not null
        )
      ),
      'account_review_flags', coalesce((
        select jsonb_agg(jsonb_build_object(
          'kind', f.kind,
          'created_at', f.created_at,
          'reviewed_at', f.reviewed_at,
          'cleared_at', f.cleared_at,
          'details_withheld', f.signal_hash is not null,
          'reviews', coalesce((
            select jsonb_agg(jsonb_build_object(
              'decision', r.decision,
              'note', r.note,
              'created_at', r.created_at
            ) order by r.created_at)
            from public.account_flag_reviews r where r.flag_id = f.id
          ), '[]'::jsonb)
        ) order by f.created_at)
        from public.account_flags f where f.user_id = subject
      ), '[]'::jsonb),
      'reports_about_me', coalesce((
        select jsonb_agg(jsonb_build_object(
          'target_type', r.target_type,
          'reason', r.reason,
          'note', r.note,
          'status', r.status,
          'resolution_action', r.resolution_action,
          'resolution_note', r.resolution_note,
          'created_at', r.created_at,
          'resolved_at', r.resolved_at
        ) order by r.created_at)
        from public.content_reports r
        where (r.target_type = 'profile' and r.target_id = subject)
           or (r.target_type = 'portrait' and exists (
             select 1 from public.portraits p
             where p.id = r.target_id and p.user_id = subject
           ))
           or (r.target_type = 'question' and exists (
             select 1 from public.questions q
             join public.daily_draws d on d.id = q.draw_id
             where q.id = r.target_id
               and (q.author_id = subject or d.selected_user_id = subject)
           ))
      ), '[]'::jsonb),
      'moderation_decisions_about_me', coalesce((
        select jsonb_agg(jsonb_build_object(
          'decision', m.decision,
          'target_type', m.target_type,
          'reason', m.reason,
          'decided_at', m.decided_at
        ) order by m.decided_at)
        from public.moderation_decisions m
        where (m.target_type = 'profile' and m.target_id = subject)
           or (m.target_type = 'portrait' and exists (
             select 1 from public.portraits p
             where p.id = m.target_id and p.user_id = subject
           ))
           or (m.target_type = 'question' and exists (
             select 1 from public.questions q
             join public.daily_draws d on d.id = q.draw_id
             where q.id = m.target_id
               and (q.author_id = subject or d.selected_user_id = subject)
           ))
      ), '[]'::jsonb),
      'account_enforcement_history', coalesce((
        select jsonb_agg(jsonb_build_object(
          'target_status', j.target_status,
          'status_version', j.status_version,
          'attempt_count', j.attempt_count,
          'last_error_code', j.last_error_code,
          'created_at', j.created_at,
          'updated_at', j.updated_at,
          'completed_at', j.completed_at
        ) order by j.created_at)
        from public.account_enforcement_jobs j where j.user_id = subject
      ), '[]'::jsonb),
      'deletion_requests', coalesce((
        select jsonb_agg(jsonb_build_object(
          'requested_at', r.requested_at,
          'completed_at', r.completed_at,
          'current_stage', r.current_stage,
          'attempt_count', r.attempt_count,
          'last_error_code', r.last_error_code,
          'avatar_objects_deleted', r.avatar_objects_deleted,
          'portrait_objects_deleted', r.portrait_objects_deleted,
          'updated_at', r.updated_at
        ) order by r.requested_at)
        from public.deletion_requests r where r.user_id = subject
      ), '[]'::jsonb),
      'storage_cleanup_jobs', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket', j.bucket_id,
          'object_name', j.object_name,
          'attempt_count', j.attempt_count,
          'manual_review_at', j.manual_review_at,
          'created_at', j.created_at,
          'updated_at', j.updated_at
        ) order by j.created_at)
        from public.storage_cleanup_jobs j
        where j.object_name like subject::text || '/%'
      ), '[]'::jsonb),
      'storage_objects', coalesce((
        select jsonb_agg(jsonb_build_object(
          'bucket', o.bucket_id,
          'object_name', o.name,
          'created_at', o.created_at,
          'updated_at', o.updated_at,
          'size_bytes', nullif(o.metadata ->> 'size', '')::bigint
        ) order by o.created_at)
        from storage.objects o
        where o.bucket_id in ('avatars', 'portraits')
          and o.name like subject::text || '/%'
      ), '[]'::jsonb),
      'moderator_role', (
        select jsonb_build_object('added_at', m.added_at, 'note', m.note)
        from public.moderators m where m.user_id = subject
      )
    );

  if pg_column_size(payload) > maximum_bytes then
    raise exception 'Personal data export exceeds the 5 MiB synchronous limit'
      using errcode = 'program_limit_exceeded';
  end if;

  return payload::json;
end;
$$;

revoke execute on function public.export_my_data()
  from public, anon, authenticated;
grant execute on function public.export_my_data() to authenticated;

comment on function public.export_my_data() is
  'Schema v3 bounded account export. Security signals and third-party identifiers are minimized as documented in PERSONAL_DATA_INVENTORY.md.';
