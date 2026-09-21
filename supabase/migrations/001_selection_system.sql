-- Apply this file in Supabase SQL Editor before creating accounts.
create type public.user_role as enum ('student', 'teacher', 'admin');
create type public.request_state as enum ('pending', 'confirmed', 'rejected', 'cancelled');
create type public.request_origin as enum ('student', 'teacher');
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, identity_no text not null unique, full_name text not null, role public.user_role not null, cohort text, is_thesis_student boolean not null default false, active boolean not null default true, created_at timestamptz not null default now());
create table public.teachers (profile_id uuid primary key references public.profiles(id) on delete cascade, active boolean not null default true, forced_capacity integer check (forced_capacity is null or forced_capacity >= 0), calculated_capacity integer not null default 0, updated_at timestamptz not null default now());
create table public.selection_requests (id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id), teacher_id uuid not null references public.profiles(id), origin public.request_origin not null, state public.request_state not null default 'pending', created_at timestamptz not null default now(), decided_at timestamptz, check (student_id <> teacher_id));
create unique index one_active_request_per_student on public.selection_requests(student_id) where state in ('pending', 'confirmed');
create index selection_requests_teacher_state_idx on public.selection_requests(teacher_id, state);
create index profiles_thesis_active_idx on public.profiles(is_thesis_student, active) where is_thesis_student and active;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active); $$;
-- Forced capacities are deducted first; the remainder is spread across active non-forced teachers.
create or replace function public.recalculate_teacher_capacities() returns void language plpgsql security definer set search_path = public as $$
declare thesis_total integer; forced_total integer; flexible_total integer; base_capacity integer; extra integer;
begin
  if not public.is_admin() then raise exception '管理员权限不足'; end if;
  select count(*) into thesis_total from public.profiles where active and is_thesis_student;
  select coalesce(sum(forced_capacity), 0) into forced_total from public.teachers where active;
  select count(*) into flexible_total from public.teachers where active and forced_capacity is null;
  if flexible_total = 0 and thesis_total > forced_total then raise exception '至少需要一位未设置强制名额的在职教师'; end if;
  base_capacity := case when flexible_total = 0 then 0 else greatest(0, thesis_total - forced_total) / flexible_total end;
  extra := case when flexible_total = 0 then 0 else mod(greatest(0, thesis_total - forced_total), flexible_total) end;
  with ranked as (select t.profile_id, row_number() over (order by p.full_name, t.profile_id) as rn from public.teachers t join public.profiles p on p.id=t.profile_id where t.active and t.forced_capacity is null)
  update public.teachers t set calculated_capacity = base_capacity + case when ranked.rn <= extra then 1 else 0 end, updated_at = now() from ranked where t.profile_id = ranked.profile_id;
  update public.teachers set calculated_capacity = forced_capacity, updated_at = now() where active and forced_capacity is not null;
end; $$;
create or replace function public.create_selection_request(target_teacher_id uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare current_profile public.profiles%rowtype; target_teacher public.teachers%rowtype; active_count integer; result_id uuid;
begin
  select * into current_profile from public.profiles where id = auth.uid() and active;
  if not found or current_profile.role <> 'student' then raise exception '仅学生可以使用此入口'; end if;
  select * into target_teacher from public.teachers where profile_id = target_teacher_id and active for update;
  if not found then raise exception '教师不可选'; end if;
  if exists (select 1 from public.selection_requests where student_id=current_profile.id and state in ('pending','confirmed')) then raise exception '该学生已有待处理或已确认的双选关系'; end if;
  select count(*) into active_count from public.selection_requests where teacher_id=target_teacher_id and state in ('pending','confirmed');
  if active_count >= target_teacher.calculated_capacity then raise exception '该教师名额已满'; end if;
  insert into public.selection_requests(student_id,teacher_id,origin) values(current_profile.id,target_teacher_id,'student') returning id into result_id; return result_id;
end; $$;
create or replace function public.teacher_invite_student(target_student_id uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare target_teacher public.teachers%rowtype; active_count integer; result_id uuid;
begin
  select * into target_teacher from public.teachers where profile_id=auth.uid() and active for update;
  if not found then raise exception '仅教师可以使用此入口'; end if;
  if not exists (select 1 from public.profiles where id=target_student_id and role='student' and active) then raise exception '学生不可选'; end if;
  if exists (select 1 from public.selection_requests where student_id=target_student_id and state in ('pending','confirmed')) then raise exception '该学生已有待处理或已确认的双选关系'; end if;
  select count(*) into active_count from public.selection_requests where teacher_id=auth.uid() and state in ('pending','confirmed');
  if active_count >= target_teacher.calculated_capacity then raise exception '你的名额已满'; end if;
  insert into public.selection_requests(student_id,teacher_id,origin) values(target_student_id,auth.uid(),'teacher') returning id into result_id; return result_id;
end; $$;
create or replace function public.decide_selection_request(request_id uuid, accept_request boolean) returns void language plpgsql security definer set search_path = public as $$
declare selection public.selection_requests%rowtype;
begin
  select * into selection from public.selection_requests where id=request_id for update;
  if not found or selection.state <> 'pending' then raise exception '该申请已被处理'; end if;
  if (selection.origin='student' and selection.teacher_id <> auth.uid()) or (selection.origin='teacher' and selection.student_id <> auth.uid()) then raise exception '只有申请接收方可以处理'; end if;
  update public.selection_requests set state=case when accept_request then 'confirmed' else 'rejected' end, decided_at=now() where id=request_id;
end; $$;
alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.selection_requests enable row level security;
create policy "active users read profiles" on public.profiles for select to authenticated using (active);
create policy "active users read teachers" on public.teachers for select to authenticated using (active);
create policy "participants read own requests" on public.selection_requests for select to authenticated using (student_id=auth.uid() or teacher_id=auth.uid() or public.is_admin());
grant usage on schema public to authenticated;
grant select on public.profiles, public.teachers, public.selection_requests to authenticated;
grant execute on function public.create_selection_request(uuid), public.teacher_invite_student(uuid), public.decide_selection_request(uuid,boolean), public.recalculate_teacher_capacities() to authenticated;
