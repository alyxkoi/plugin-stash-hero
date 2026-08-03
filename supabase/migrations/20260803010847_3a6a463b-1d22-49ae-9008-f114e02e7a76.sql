CREATE OR REPLACE FUNCTION public.admin_customer_list(_q text DEFAULT ''::text, _filter text DEFAULT 'all'::text, _sort text DEFAULT 'recent'::text, _limit integer DEFAULT 30, _offset integer DEFAULT 0)
 RETURNS TABLE(key text, customer_id uuid, user_id uuid, email text, name text, has_account boolean, first_order_at timestamp with time zone, last_order_at timestamp with time zone, orders_count bigint, completed_count bigint, total_spent numeric, total_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      o.id, o.created_at, o.status, o.total, o.refunded_amount_cents,
      o.customer_id, o.user_id,
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
      em,
      (array_agg(customer_id) filter (where customer_id is not null))[1] as cid,
      (array_agg(user_id) filter (where user_id is not null))[1] as uid,
      (array_agg(nm) filter (where nm is not null))[1] as nm,
      min(created_at) as first_at,
      max(created_at) as last_at,
      count(*) as ocount,
      count(*) filter (where status in ('completed','partial')) as ccount,
      coalesce(sum(
        greatest(0, greatest(0, round(coalesce(total,0) * 100)::int) - coalesce(refunded_amount_cents,0))::numeric / 100.0
      ) filter (where status in ('completed','partial')), 0)::numeric as spent
    from order_rows
    where em <> ''
    group by em
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
    where lower(btrim(c.email)) not in (select em from order_agg)
      and btrim(coalesce(c.email,'')) <> ''
  ),
  agg as (
    select em, cid, uid, nm, first_at, last_at, ocount, ccount, spent from order_agg
    union all
    select em, cid, uid, nm, first_at, last_at, ocount, ccount, spent from cust_only
  ),
  matched as (
    select * from agg
    where (needle = '' or em ilike '%' || needle || '%' or coalesce(nm, '') ilike '%' || needle || '%')
      and (_filter = 'all'
           or (_filter = 'new' and ocount <= 1)
           or (_filter = 'returning' and ocount >= 2))
  )
  select
    m.em as key,
    m.cid as customer_id,
    m.uid as user_id,
    m.em as email,
    m.nm as name,
    (m.uid is not null) as has_account,
    m.first_at as first_order_at,
    m.last_at as last_order_at,
    m.ocount as orders_count,
    m.ccount as completed_count,
    m.spent as total_spent,
    count(*) over () as total_count
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

REVOKE ALL ON FUNCTION public.admin_customer_list(text, text, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_customer_list(text, text, text, integer, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_customer_stats()
 RETURNS TABLE(total_customers bigint, new_this_month bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'not authorized';
  end if;
  return query
  with emails as (
    select normalized_email as em, min(created_at) as first_at
    from public.order_customer_identity
    group by normalized_email
    union all
    select lower(btrim(c.email)), c.created_at
    from public.customers c
    where btrim(coalesce(c.email,'')) <> ''
      and lower(btrim(c.email)) not in (select normalized_email from public.order_customer_identity)
  )
  select count(*)::bigint,
         count(*) filter (
           where date_trunc('month', first_at at time zone 'America/Chicago')
               = date_trunc('month', now() at time zone 'America/Chicago')
         )::bigint
  from emails;
end;
$function$;

REVOKE ALL ON FUNCTION public.admin_customer_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_customer_stats() TO authenticated;
