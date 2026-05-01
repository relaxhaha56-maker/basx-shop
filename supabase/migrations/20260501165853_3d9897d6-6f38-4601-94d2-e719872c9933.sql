
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(),'admin'));

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)), COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Site settings (single row, key=1)
CREATE TABLE public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  shop_name TEXT NOT NULL DEFAULT 'BasX SHOP',
  primary_hue INTEGER NOT NULL DEFAULT 210,
  accent_hue INTEGER NOT NULL DEFAULT 200,
  particle_type TEXT NOT NULL DEFAULT 'snow',
  particle_count INTEGER NOT NULL DEFAULT 60,
  particle_speed NUMERIC NOT NULL DEFAULT 1,
  particle_enabled BOOLEAN NOT NULL DEFAULT true,
  bank_name TEXT NOT NULL DEFAULT 'ธนาคารกสิกรไทย',
  bank_account_number TEXT NOT NULL DEFAULT '000-0-00000-0',
  bank_account_name TEXT NOT NULL DEFAULT 'BasX Shop',
  discord_url TEXT NOT NULL DEFAULT 'https://discord.gg/6Gev7X9xVF',
  banner_text TEXT NOT NULL DEFAULT 'ยินดีต้อนรับสู่ BasX SHOP',
  CONSTRAINT single_row CHECK (id = 1)
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings admin write" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.site_settings (id) VALUES (1);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  platform TEXT, -- android/ios/pc
  sort_order INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "cat admin write" ON public.categories FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.categories (name, slug, platform, sort_order) VALUES
  ('Android Mods','android','android',1),
  ('iOS Mods','ios','ios',2),
  ('PC Cheats','pc','pc',3),
  ('Free Fire','freefire',NULL,4),
  ('RoV / MOBA','rov',NULL,5);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_price NUMERIC(12,2),
  delivery_type TEXT NOT NULL DEFAULT 'key', -- key, link, key_link
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prod public read" ON public.products FOR SELECT USING (true);
CREATE POLICY "prod admin write" ON public.products FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Stock items (one per code/link pair)
CREATE TABLE public.product_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  key_value TEXT,
  link_value TEXT,
  sold BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock admin all" ON public.product_stock FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  price_paid NUMERIC(12,2) NOT NULL,
  delivered_key TEXT,
  delivered_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Topup requests
CREATE TABLE public.topup_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  slip_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending/approved/rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own topups" ON public.topup_requests FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "create own topup" ON public.topup_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin update topup" ON public.topup_requests FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- Announcements
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann public read" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "ann admin write" ON public.announcements FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Purchase RPC: atomic stock + wallet + order
CREATE OR REPLACE FUNCTION public.purchase_product(_product_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _prod RECORD;
  _stock RECORD;
  _price NUMERIC;
  _bal NUMERIC;
  _order_id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _prod FROM public.products WHERE id = _product_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
  _price := COALESCE(_prod.discount_price, _prod.price);
  SELECT wallet_balance INTO _bal FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _bal < _price THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  SELECT * INTO _stock FROM public.product_stock WHERE product_id = _product_id AND sold = false LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RAISE EXCEPTION 'out_of_stock'; END IF;
  UPDATE public.product_stock SET sold = true WHERE id = _stock.id;
  UPDATE public.profiles SET wallet_balance = wallet_balance - _price WHERE id = _uid;
  INSERT INTO public.orders (user_id, product_id, product_name, price_paid, delivered_key, delivered_link)
  VALUES (_uid, _prod.id, _prod.name, _price, _stock.key_value, _stock.link_value)
  RETURNING id INTO _order_id;
  RETURN _order_id;
END;
$$;

-- Approve topup RPC
CREATE OR REPLACE FUNCTION public.approve_topup(_topup_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _t RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_admin'; END IF;
  SELECT * INTO _t FROM public.topup_requests WHERE id = _topup_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance + _t.amount WHERE id = _t.user_id;
  UPDATE public.topup_requests SET status='approved', reviewed_at=now() WHERE id=_topup_id;
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
