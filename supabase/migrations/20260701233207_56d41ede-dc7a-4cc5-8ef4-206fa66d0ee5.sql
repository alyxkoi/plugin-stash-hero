
-- Guest checkout: allow orders with no user_id, and store the guest email
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_email text;

-- Cover images on cart + order items so we can render real thumbnails
ALTER TABLE public.cart_items
  ADD COLUMN IF NOT EXISTS cover_url text;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS cover_url text;
