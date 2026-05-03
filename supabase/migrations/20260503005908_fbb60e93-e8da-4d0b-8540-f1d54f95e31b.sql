
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(_user_id uuid, _amount numeric, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _new_bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not_admin'; END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'zero_amount'; END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance + _amount WHERE id = _user_id
    RETURNING wallet_balance INTO _new_bal;
  IF _new_bal IS NULL THEN RAISE EXCEPTION 'user_not_found'; END IF;
  IF _new_bal < 0 THEN
    UPDATE public.profiles SET wallet_balance = wallet_balance - _amount WHERE id = _user_id;
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  INSERT INTO public.topup_requests (user_id, amount, status, topup_type, auto_verified, reviewed_at, slip_note, verification_data)
  VALUES (_user_id, _amount, 'approved', 'admin_manual', true, now(),
          COALESCE(_note, CASE WHEN _amount > 0 THEN 'แอดมินเติมเครดิต' ELSE 'แอดมินหักเครดิต' END),
          jsonb_build_object('admin_id', auth.uid(), 'note', _note));
END;
$$;
