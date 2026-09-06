CREATE TABLE public.key_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_hint text,
  key_value text,
  link_value text,
  source text,
  note text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_inbox TO authenticated;
GRANT ALL ON public.key_inbox TO service_role;
ALTER TABLE public.key_inbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "key_inbox admin all" ON public.key_inbox FOR ALL
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX key_inbox_status_idx ON public.key_inbox(status, created_at DESC);