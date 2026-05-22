
-- ========== Helpers ==========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ========== Roles ==========
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== Profiles ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  location TEXT,
  marketing_prefs JSONB NOT NULL DEFAULT '{"marketing":true,"sales":true,"updates":true,"wishlist":true,"receipts":true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== Products ==========
CREATE TYPE public.product_status AS ENUM ('published', 'draft', 'archived');

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  maker TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_type TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  daws TEXT[] NOT NULL DEFAULT '{}',
  formats TEXT[] NOT NULL DEFAULT '{}',
  version TEXT,
  file_size TEXT,
  zip_file_name TEXT,
  zip_url TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  compare_at_price NUMERIC(10,2),
  tagline TEXT,
  description TEXT,
  cover_gradient TEXT,
  status public.product_status NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  is_free BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_category ON public.products(category);

CREATE POLICY "Anyone reads published products" ON public.products FOR SELECT USING (status = 'published');
CREATE POLICY "Admins manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== Customers ==========
CREATE TYPE public.customer_status AS ENUM ('active', 'refunded', 'banned');

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  status public.customer_status NOT NULL DEFAULT 'active',
  primary_source TEXT,
  notes TEXT,
  total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own customer record" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage customers" ON public.customers FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== Orders ==========
CREATE TYPE public.order_status AS ENUM ('completed', 'refunded', 'partial', 'pending');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_code TEXT,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  stripe_id TEXT,
  status public.order_status NOT NULL DEFAULT 'pending',
  utm_source TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  refund_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_slug TEXT,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  cover_gradient TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Admins manage order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== Sale events ==========
CREATE TYPE public.sale_event_status AS ENUM ('active', 'scheduled', 'ended', 'draft');
CREATE TYPE public.sale_scope AS ENUM ('all', 'selected');

CREATE TABLE public.sale_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  headline TEXT,
  subheadline TEXT,
  discount_pct INTEGER NOT NULL DEFAULT 0,
  scope public.sale_scope NOT NULL DEFAULT 'all',
  theme_color TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status public.sale_event_status NOT NULL DEFAULT 'draft',
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads visible sale events" ON public.sale_events FOR SELECT USING (status IN ('active','scheduled','ended'));
CREATE POLICY "Admins manage sale events" ON public.sale_events FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_sale_events_updated BEFORE UPDATE ON public.sale_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sale_event_products (
  sale_event_id UUID NOT NULL REFERENCES public.sale_events(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  PRIMARY KEY (sale_event_id, product_id)
);
ALTER TABLE public.sale_event_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads sale event products" ON public.sale_event_products FOR SELECT USING (true);
CREATE POLICY "Admins manage sale event products" ON public.sale_event_products FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== Discount codes ==========
CREATE TYPE public.discount_type AS ENUM ('percent', 'flat');
CREATE TYPE public.discount_status AS ENUM ('active', 'expired', 'disabled');

CREATE TABLE public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type public.discount_type NOT NULL,
  value NUMERIC(10,2) NOT NULL,
  usage_limit INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  status public.discount_status NOT NULL DEFAULT 'active',
  applies_to TEXT NOT NULL DEFAULT 'All products',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage discount codes" ON public.discount_codes FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_discount_codes_updated BEFORE UPDATE ON public.discount_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== Abandoned carts ==========
CREATE TABLE public.abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_guest BOOLEAN NOT NULL DEFAULT true,
  items_count INTEGER NOT NULL DEFAULT 0,
  item_summary TEXT,
  cart_value NUMERIC(12,2) NOT NULL DEFAULT 0,
  abandoned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage abandoned carts" ON public.abandoned_carts FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== Campaigns ==========
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  recipients INTEGER NOT NULL DEFAULT 0,
  open_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  click_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage campaigns" ON public.campaigns FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========== Saved items (wishlist) ==========
CREATE TABLE public.saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price_at_save NUMERIC(10,2),
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
ALTER TABLE public.saved_items ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_saved_items_user ON public.saved_items(user_id);

CREATE POLICY "Users manage own saved items" ON public.saved_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read saved items" ON public.saved_items FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ========== Library downloads ==========
CREATE TABLE public.library_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version TEXT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.library_downloads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_library_downloads_user ON public.library_downloads(user_id);

CREATE POLICY "Users view own downloads" ON public.library_downloads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own downloads" ON public.library_downloads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all downloads" ON public.library_downloads FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
