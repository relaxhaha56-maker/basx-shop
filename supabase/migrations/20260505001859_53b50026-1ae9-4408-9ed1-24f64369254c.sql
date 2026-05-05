
-- 1) Lock down SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_topup(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.credit_wallet(uuid, numeric, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.product_stock_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purchase_product(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.product_stock_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_product(uuid, text) TO authenticated;

-- 2) Storage: slips bucket — restrict listing/reading to owner or admin
DROP POLICY IF EXISTS "slips owner read" ON storage.objects;
DROP POLICY IF EXISTS "slips owner insert" ON storage.objects;
DROP POLICY IF EXISTS "slips admin all" ON storage.objects;

CREATE POLICY "slips owner read" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'slips' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));

CREATE POLICY "slips owner insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'slips' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "slips admin all" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'slips' AND public.has_role(auth.uid(),'admin'))
WITH CHECK (bucket_id = 'slips' AND public.has_role(auth.uid(),'admin'));

-- 3) Audit log table
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_id uuid,
  details jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit admin read" ON public.admin_audit_log;
CREATE POLICY "audit admin read" ON public.admin_audit_log
FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Only via SECURITY DEFINER functions; no direct insert
DROP POLICY IF EXISTS "audit no direct insert" ON public.admin_audit_log;

-- 4) Hook audit into admin_adjust_wallet
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(_user_id uuid, _amount numeric, _note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _new_bal numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not_admin'; END IF;
  IF _amount = 0 THEN RAISE EXCEPTION 'zero_amount'; END IF;
  IF abs(_amount) > 1000000 THEN RAISE EXCEPTION 'amount_too_large'; END IF;

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

  INSERT INTO public.admin_audit_log (actor_id, action, target_id, details)
  VALUES (auth.uid(), 'wallet_adjust', _user_id, jsonb_build_object('amount', _amount, 'note', _note, 'new_balance', _new_bal));
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_topup(uuid) TO authenticated;

-- 5) Prevent role escalation already handled by trigger; ensure attached
DROP TRIGGER IF EXISTS prevent_self_role_change_trg ON public.user_roles;
CREATE TRIGGER prevent_self_role_change_trg
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();

-- 6) Rate limit table for sensitive actions (purchase, topup)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.rate_limits(user_id, action, created_at DESC);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rl admin read" ON public.rate_limits;
CREATE POLICY "rl admin read" ON public.rate_limits FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
