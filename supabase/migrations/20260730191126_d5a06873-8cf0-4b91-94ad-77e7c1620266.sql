create or replace function public.admin_customer_list(
  _q text default '',
  _filter text default 'all',
  _sort text default 'recent',
  _limit int default 30,
  _offset int default 0
)
returns table (
  key text,
  customer_id uuid,
  user_id uuid,
  email text,
  name text,
  has_account boolean,
  first_order_at timestamptz,
  last_order_at timestamptz,
  orders_count bigint,
  completed_count bigint,
  total_spent numeric,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  needle text := replace(replace(replace(coalesce(_q,''), '\', '\\'), '%', '\%'), '_', '\_');
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  return query
  with agg as (
    select
      c.id::text as k,
      c.id as cid,
      c.user_id as uid,
      c.email as em,
      c.name as nm,
      (c.user_id is not null or bool_or(o.user_id is not null)) as acct,
      least(c.created_at, coalesce(min(o.created_at), c.created_at)) as first_at,
      coalesce(max(o.created_at), c.created_at) as last_at,
      count(o.id) as ocount,
      count(o.id) filter (where o.status in ('completed','partial')) as ccount,
      coalesce(sum(o.total) filter (where o.status in ('completed','partial')), 0)::numeric as spent
    from public.customers c
    left join public.orders o on o.customer_id = c.id
    group by c.id, c.user_id, c.email, c.name, c.created_at
    union all
    select
      'guest:' || lower(coalesce(o.guest_email, 'unknown')) as k,
      null::uuid as cid,
      (array_agg(o.user_id) filter (where o.user_id is not null))[1] as uid,
      coalesce(o.guest_email, 'unknown') as em,
      null::text as nm,
      bool_or(o.user_id is not null) as acct,
      min(o.created_at) as first_at,
      max(o.created_at) as last_at,
      count(o.id) as ocount,
      count(o.id) filter (where o.status in ('completed','partial')) as ccount,
      coalesce(sum(o.total) filter (where o.status in ('completed','partial')), 0)::numeric as spent
    from public.orders o
    where o.customer_id is null
    group by coalesce(o.guest_email, 'unknown')
  ),
  matched as (
    select * from agg
    where (
      needle = ''
      or em ilike '%' || needle || '%'
      or coalesce(nm, '') ilike '%' || needle || '%'
    )
    and (
      _filter = 'all'
      or (_filter = 'new' and ccount <= 1)
      or (_filter = 'returning' and ccount >= 2)
    )
  )
  select
    m.k, m.cid, m.uid, m.em, m.nm, m.acct,
    m.first_at, m.last_at, m.ocount, m.ccount, m.spent,
    count(*) over () as total_count
  from matched m
  order by
    case when _sort = 'top' then m.spent end desc nulls last,
    case when _sort = 'most' then m.ccount end desc nulls last,
    case when _sort not in ('top','most') then m.last_at end desc nulls last,
    m.k
  limit greatest(1, least(coalesce(_limit,30), 200))
  offset greatest(0, coalesce(_offset,0));
end;
$$;

revoke all on function public.admin_customer_list(text, text, text, int, int) from public;
revoke all on function public.admin_customer_list(text, text, text, int, int) from anon;
grant execute on function public.admin_customer_list(text, text, text, int, int) to authenticated, service_role;

create or replace function public.admin_customer_stats()
returns table (total_customers bigint, new_this_month bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;
  return query
  select
    (select count(*) from public.customers)
      + (select count(distinct lower(coalesce(o.guest_email,'unknown')) ) from public.orders o where o.customer_id is null),
    (select count(*) from public.customers c where c.created_at >= date_trunc('month', now()));
end;
$$;

revoke all on function public.admin_customer_stats() from public;
revoke all on function public.admin_customer_stats() from anon;
grant execute on function public.admin_customer_stats() to authenticated, service_role;