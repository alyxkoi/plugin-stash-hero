CREATE OR REPLACE FUNCTION public.admin_customer_list(_q text DEFAULT ''::text, _filter text DEFAULT 'all'::text, _sort text DEFAULT 'recent'::text, _limit integer DEFAULT 30, _offset integer DEFAULT 0)
 RETURNS TABLE(key text, customer_id uuid, user_id uuid, email text, name text, has_account boolean, first_order_at timestamp with time zone, last_order_at timestamp with time zone, orders_count bigint, completed_count bigint, total_spent numeric, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare
  needle text := replace(replace(replace(coalesce(_q,''), '\', '\\'), '%', '\%'), '_', '\_');
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;

  return query
  with order_rows as (
    select
      lower(btrim(coalesce(nullif(o.guest_email, ''), c.email, p.email, ''))) as em,
      o.id as oid, o.created_at as created_at, o.status as status, o.total as total,
      o.refunded_amount_cents as refunded_amount_cents,
      o.customer_id as cid, o.user_id as uid,
      coalesce(
        nullif(btrim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), ''),
        nullif(btrim(c.name), ''),
        nullif(btrim(o.customer_name), ''),
        nullif(btrim(p.display_name), '')
      ) as nm
    from public.orders o
    left join public.customers c on c.id = o.customer_id
    left join public.profiles p on p.id = o.user_id
  ),
  order_agg as (
    select
      r.em as em,
      (array_agg(r.cid) filter (where r.cid is not null))[1] as cid,
      (array_agg(r.uid) filter (where r.uid is not null))[1] as uid,
      (array_agg(r.nm) filter (where r.nm is not null))[1] as nm,
      min(r.created_at) as first_at,
      max(r.created_at) as last_at,
      count(*) as ocount,
      count(*) filter (where r.status in ('completed','partial')) as ccount,
      coalesce(sum(
        greatest(0, greatest(0, round(coalesce(r.total,0) * 100)::int) - coalesce(r.refunded_amount_cents,0))::numeric / 100.0
      ) filter (where r.status in ('completed','partial')), 0)::numeric as spent
    from order_rows r
    where r.em <> ''
    group by r.em
  ),
  cust_only as (
    select
      lower(btrim(c.email)) as em,
      c.id as cid,
      c.user_id as uid,
      coalesce(
        nullif(btrim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')), ''),
        nullif(btrim(c.name), ''),
        nullif(btrim(p.display_name), '')
      ) as nm,
      c.created_at as first_at,
      c.created_at as last_at,
      0::bigint as ocount, 0::bigint as ccount, 0::numeric as spent
    from public.customers c
    left join public.profiles p on p.id = c.user_id
    where lower(btrim(c.email)) not in (select a.em from order_agg a)
      and btrim(coalesce(c.email,'')) <> ''
  ),
  agg as (
    select a.em, a.cid, a.uid, a.nm, a.first_at, a.last_at, a.ocount, a.ccount, a.spent from order_agg a
    union all
    select b.em, b.cid, b.uid, b.nm, b.first_at, b.last_at, b.ocount, b.ccount, b.spent from cust_only b
  ),
  matched as (
    select g.* from agg g
    where (needle = '' or g.em ilike '%' || needle || '%' or coalesce(g.nm, '') ilike '%' || needle || '%')
      and (_filter = 'all'
           or (_filter = 'new' and g.ocount <= 1)
           or (_filter = 'returning' and g.ocount >= 2))
  )
  select
    m.em,
    m.cid,
    m.uid,
    m.em,
    m.nm,
    (m.uid is not null),
    m.first_at,
    m.last_at,
    m.ocount,
    m.ccount,
    m.spent,
    count(*) over ()
  from matched m
  order by
    case when _sort = 'top' then m.spent end desc nulls last,
    case when _sort = 'most' then m.ocount end desc nulls last,
    case when _sort not in ('top','most') then m.last_at end desc nulls last,
    m.em
  limit greatest(1, least(coalesce(_limit,30), 200))
  offset greatest(0, coalesce(_offset,0));
end;
$function$;

CREATE INDEX IF NOT EXISTS orders_guest_email_norm_idx
  ON public.orders (lower(btrim(guest_email)));
CREATE INDEX IF NOT EXISTS orders_guest_email_norm_created_idx
  ON public.orders (lower(btrim(guest_email)), created_at);