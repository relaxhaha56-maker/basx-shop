ALTER TABLE public.topup_requests
  ADD CONSTRAINT topup_amount_range CHECK (
    topup_type = 'admin_manual' OR (amount > 0 AND amount <= 100000)
  );

CREATE OR REPLACE FUNCTION public.approve_topup(_topup_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _t RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not_admin'; END IF;
  SELECT * INTO _t FROM public.topup_requests WHERE id = _topup_id AND status = 'pending' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF _t.topup_type <> 'admin_manual' AND (_t.amount <= 0 OR _t.amount > 100000) THEN
    RAISE EXCEPTION 'amount_out_of_range';
  END IF;
  UPDATE public.profiles SET wallet_balance = wallet_balance + _t.amount WHERE id = _t.user_id;
  UPDATE public.topup_requests SET status='approved', reviewed_at=now() WHERE id=_topup_id;
END;
$function$;