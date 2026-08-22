create or replace function public.admin_archive_sale_event(_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Forbidden';
  end if;

  update public.sale_events
  set status = 'archived'
  where id = _sale_id;

  if not found then
    raise exception 'Sale campaign not found';
  end if;
end;
$$;

revoke all on function public.admin_archive_sale_event(uuid) from public;
grant execute on function public.admin_archive_sale_event(uuid) to authenticated;
