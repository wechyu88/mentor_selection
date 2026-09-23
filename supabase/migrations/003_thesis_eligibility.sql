create or replace function public.create_selection_request(target_teacher_id uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare current_profile public.profiles%rowtype; target_teacher public.teachers%rowtype; active_count integer; result_id uuid;
begin
  select * into current_profile from public.profiles where id = auth.uid() and active;
  if not found or current_profile.role <> 'student' then raise exception '仅学生可以使用此入口'; end if;
  if not current_profile.is_thesis_student then raise exception '你不在本次毕业论文双选名单中'; end if;
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
  if not exists (select 1 from public.profiles where id=target_student_id and role='student' and active and is_thesis_student) then raise exception '学生不可选'; end if;
  if exists (select 1 from public.selection_requests where student_id=target_student_id and state in ('pending','confirmed')) then raise exception '该学生已有待处理或已确认的双选关系'; end if;
  select count(*) into active_count from public.selection_requests where teacher_id=auth.uid() and state in ('pending','confirmed');
  if active_count >= target_teacher.calculated_capacity then raise exception '你的名额已满'; end if;
  insert into public.selection_requests(student_id,teacher_id,origin) values(target_student_id,auth.uid(),'teacher') returning id into result_id; return result_id;
end; $$;
