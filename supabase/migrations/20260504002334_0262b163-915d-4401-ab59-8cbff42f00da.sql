CREATE OR REPLACE FUNCTION public.purchase_product(_product_id uuid, _code text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _prod RECORD;
  _stock RECORD;
  _price NUMERIC;
  _discount NUMERIC := 0;
  _final_price NUMERIC;
  _bal NUMERIC;
  _order_id UUID;
  _dc_id UUID := NULL;
  _dc_code TEXT := NULL;
  _dc RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _prod FROM public.products WHERE id = _product_id AND active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;
  _price := COALESCE(_prod.discount_price, _prod.price);

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
    _dc_id := _dc.id;
    _dc_code := _dc.code;
  END IF;

  _final_price := _price - _discount;

  SELECT wallet_balance INTO _bal FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _bal IS NULL THEN RAISE EXCEPTION 'profile_not_found'; END IF;
  IF _bal < _final_price THEN RAISE EXCEPTION 'insufficient_balance'; END IF;
  SELECT * INTO _stock FROM public.product_stock WHERE product_id = _product_id AND sold = false LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RAISE EXCEPTION 'out_of_stock'; END IF;
  UPDATE public.product_stock SET sold = true WHERE id = _stock.id;
  UPDATE public.profiles SET wallet_balance = wallet_balance - _final_price WHERE id = _uid;
  INSERT INTO public.orders (user_id, product_id, product_name, price_paid, delivered_key, delivered_link, discount_code, discount_amount)
  VALUES (_uid, _prod.id, _prod.name, _final_price, _stock.key_value, _stock.link_value, _dc_code, _discount)
  RETURNING id INTO _order_id;
  RETURN _order_id;
END;
$function$;