alter table public.profiles add column if not exists must_change_password boolean not null default true;

create or replace function public.mark_own_password_changed() returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set must_change_password=false where id=auth.uid() and active;
  if not found then raise exception '账户不可用'; end if;
end; $$;

grant execute on function public.mark_own_password_changed() to authenticated;
