DROP POLICY IF EXISTS "stock public read" ON public.product_stock;

CREATE OR REPLACE FUNCTION public.product_stock_count(_product_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.product_stock WHERE product_id = _product_id AND sold = false;
$$;

REVOKE ALL ON FUNCTION public.product_stock_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.product_stock_count(uuid) TO anon, authenticated;