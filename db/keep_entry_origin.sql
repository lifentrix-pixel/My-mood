-- Trigger function on public.time_entries (BEFORE UPDATE), live in Supabase project dfjmuykhbqicpngxpbbe.
-- 2026-11-16: an app upload (anon role) can no longer undo a hand correction.
-- Rows with end_source 'manual' keep their times, activity, sub-activity,
-- tracking mode and end_uncertain unless the update says end_source 'manual_edit'.
-- Updates made directly in the database (daycheck, chat) are not affected.
-- Rollback: run the "previous version" block at the bottom instead.
create or replace function public.keep_entry_origin()
 returns trigger
 language plpgsql
as $function$
begin
  if new.end_source = 'manual_edit' then
    -- an explicit hand edit from review: accept the new times, store as manual
    new.end_source := 'manual';
    return new;
  end if;
  if old.source is not null and old.source <> 'phone_app' and new.source = 'phone_app' then
    new.source := old.source;
    new.notes  := old.notes;
    if coalesce(old.sub_activity,'') ~* '^end of' then new.sub_activity := old.sub_activity; end if;
    if old.tracking_mode = 'marker' then new.tracking_mode := old.tracking_mode; end if;
    new.end_source := old.end_source;
    new.start_time := old.start_time;
    new.end_time := old.end_time;
    new.activity_id := old.activity_id;
    new.local_date := old.local_date;
  elsif old.end_source = 'manual' and current_user = 'anon' then
    -- a row corrected by hand stays as corrected when the app re-uploads its old copy
    new.start_time := old.start_time;
    new.end_time := coalesce(old.end_time, new.end_time);
    new.activity_id := old.activity_id;
    new.sub_activity := old.sub_activity;
    new.sub_activity_id := old.sub_activity_id;
    new.sub_sub_activity := old.sub_sub_activity;
    new.sub_sub_activity_id := old.sub_sub_activity_id;
    new.tracking_mode := old.tracking_mode;
    new.end_source := old.end_source;
    new.end_uncertain := old.end_uncertain;
  elsif old.end_source = 'manual' and old.end_time is not null then
    -- an end time fixed by hand stays, even if something else re-uploads its old one
    new.end_time := old.end_time;
    new.end_source := old.end_source;
  end if;
  return new;
end $function$;

/* previous version (before 2026-11-16), for rollback:
create or replace function public.keep_entry_origin()
 returns trigger language plpgsql as $function$
begin
  if new.end_source = 'manual_edit' then
    new.end_source := 'manual';
    return new;
  end if;
  if old.source is not null and old.source <> 'phone_app' and new.source = 'phone_app' then
    new.source := old.source;
    new.notes  := old.notes;
    if coalesce(old.sub_activity,'') ~* '^end of' then new.sub_activity := old.sub_activity; end if;
    if old.tracking_mode = 'marker' then new.tracking_mode := old.tracking_mode; end if;
    new.end_source := old.end_source;
    new.start_time := old.start_time;
    new.end_time := old.end_time;
    new.activity_id := old.activity_id;
    new.local_date := old.local_date;
  elsif old.end_source = 'manual' and old.end_time is not null then
    new.end_time := old.end_time;
    new.end_source := old.end_source;
  end if;
  return new;
end $function$;
*/
