
-- 1. Discount codes table
CREATE TABLE public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percent', -- 'percent' or 'amount'
  discount_value NUMERIC NOT NULL DEFAULT 0,
  product_id UUID, -- NULL = applies to all products
  max_uses INTEGER, -- NULL = unlimited
  uses_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discount public read" ON public.discount_codes FOR SELECT USING (true);
CREATE POLICY "discount admin write" ON public.discount_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Topup requests: add slip image, type, voucher
ALTER TABLE public.topup_requests
  ADD COLUMN IF NOT EXISTS slip_url TEXT,
  ADD COLUMN IF NOT EXISTS topup_type TEXT NOT NULL DEFAULT 'bank',
  ADD COLUMN IF NOT EXISTS voucher_url TEXT,
  ADD COLUMN IF NOT EXISTS auto_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_data JSONB;

-- 3. Site settings: add automation switches & truemoney number
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS easyslip_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS truemoney_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS truemoney_phone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_account_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_account_number TEXT NOT NULL DEFAULT '';

-- 4. Orders: discount tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_code TEXT,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC NOT NULL DEFAULT 0;

-- 5. Update purchase_product RPC to accept discount code
CREATE OR REPLACE FUNCTION public.purchase_product(_product_id UUID, _code TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _prod RECORD;
  _stock RECORD;
  _price NUMERIC;
  _discount NUMERIC := 0;
  _final_price NUMERIC;
  _bal NUMERIC;
  _order_id UUID;
  _dc RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _prod FROM public.products WHERE id = _product_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
  _price := COALESCE(_prod.discount_price, _prod.price);

  -- Apply discount code if provided
  IF _code IS NOT NULL AND length(trim(_code)) > 0 THEN
    SELECT * INTO _dc FROM public.discount_codes
      WHERE upper(code) = upper(trim(_code)) AND active = true
        AND (expires_at IS NULL OR expires_at > now())
        AND (max_uses IS NULL OR uses_count < max_uses)
        AND (product_id IS NULL OR product_id = _product_id)
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid_code'; END IF;
    IF _dc.discount_type = 'percent' THEN
      _discount := round(_price * _dc.discount_value / 100, 2);
    ELSE
      _discount := _dc.discount_value;
    END IF;
    IF _discount > _price THEN _discount := _price; END IF;
    UPDATE public.discount_codes SET uses_count = uses_count + 1 WHERE id = _dc.id;
  END IF;

  _final_price := _price - _discount;

  SELECT wallet_balance INTO _bal FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _bal < _final_price THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  SELECT * INTO _stock FROM public.product_stock WHERE product_id = _product_id AND sold = false LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RAISE EXCEPTION 'out_of_stock'; END IF;
  UPDATE public.product_stock SET sold = true WHERE id = _stock.id;
  UPDATE public.profiles SET wallet_balance = wallet_balance - _final_price WHERE id = _uid;
  INSERT INTO public.orders (user_id, product_id, product_name, price_paid, delivered_key, delivered_link, discount_code, discount_amount)
  VALUES (_uid, _prod.id, _prod.name, _final_price, _stock.key_value, _stock.link_value,
    CASE WHEN _dc.id IS NOT NULL THEN _dc.code ELSE NULL END, _discount)
  RETURNING id INTO _order_id;
  RETURN _order_id;
END;
$$;

-- 6. Wallet credit RPC (used by edge functions to auto top-up)
CREATE OR REPLACE FUNCTION public.credit_wallet(_user_id UUID, _amount NUMERIC, _topup_id UUID, _verification JSONB)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET wallet_balance = wallet_balance + _amount WHERE id = _user_id;
  UPDATE public.topup_requests
    SET status = 'approved', auto_verified = true, reviewed_at = now(), verification_data = _verification
    WHERE id = _topup_id AND status = 'pending';
END;
$$;

-- 7. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('slips', 'slips', false)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
  ON CONFLICT (id) DO NOTHING;

-- Slips: user can upload to own folder, view own; admin can view all
CREATE POLICY "slips user upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'slips' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "slips user read" ON storage.objects FOR SELECT
  USING (bucket_id = 'slips' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin'::app_role)));
CREATE POLICY "slips admin all" ON storage.objects FOR ALL
  USING (bucket_id = 'slips' AND has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (bucket_id = 'slips' AND has_role(auth.uid(),'admin'::app_role));

-- Products: public read, admin write
CREATE POLICY "products public read" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "products admin write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'products' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "products admin update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'products' AND has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "products admin delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'products' AND has_role(auth.uid(),'admin'::app_role));
