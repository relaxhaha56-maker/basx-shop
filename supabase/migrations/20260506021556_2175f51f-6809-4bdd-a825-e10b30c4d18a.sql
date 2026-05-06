
ALTER TABLE public.private_settings
  ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT DEFAULT '';

UPDATE public.private_settings p
SET bank_name = COALESCE(NULLIF(p.bank_name,''), s.bank_name),
    bank_account_number = COALESCE(NULLIF(p.bank_account_number,''), s.bank_account_number),
    bank_account_name = COALESCE(NULLIF(p.bank_account_name,''), s.bank_account_name)
FROM public.site_settings s WHERE p.id = 1 AND s.id = 1;

ALTER TABLE public.site_settings
  DROP COLUMN IF EXISTS bank_name,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_account_name;

CREATE OR REPLACE FUNCTION public.get_payment_info()
RETURNS TABLE(bank_name TEXT, bank_account_number TEXT, bank_account_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT bank_name, bank_account_number, bank_account_name
  FROM public.private_settings WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public.get_payment_info() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_payment_info() TO authenticated;
