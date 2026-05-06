
-- 1) Private settings table for sensitive verification fields
CREATE TABLE IF NOT EXISTS public.private_settings (
  id integer PRIMARY KEY DEFAULT 1,
  expected_account_name text NOT NULL DEFAULT '',
  expected_account_number text NOT NULL DEFAULT '',
  truemoney_phone text NOT NULL DEFAULT '',
  CONSTRAINT private_settings_singleton CHECK (id = 1)
);

INSERT INTO public.private_settings (id, expected_account_name, expected_account_number, truemoney_phone)
SELECT 1, COALESCE(expected_account_name,''), COALESCE(expected_account_number,''), COALESCE(truemoney_phone,'')
FROM public.site_settings WHERE id = 1
ON CONFLICT (id) DO UPDATE SET
  expected_account_name = EXCLUDED.expected_account_name,
  expected_account_number = EXCLUDED.expected_account_number,
  truemoney_phone = EXCLUDED.truemoney_phone;

ALTER TABLE public.private_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "private settings admin all" ON public.private_settings;
CREATE POLICY "private settings admin all" ON public.private_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop the sensitive columns from the public site_settings table
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS expected_account_name;
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS expected_account_number;
ALTER TABLE public.site_settings DROP COLUMN IF EXISTS truemoney_phone;

-- 2) Remove public read on discount_codes
DROP POLICY IF EXISTS "discount public read" ON public.discount_codes;

-- 3) Remove product_stock from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.product_stock;

-- 4) Remove storage listing on the public products bucket
DROP POLICY IF EXISTS "products public read" ON storage.objects;
