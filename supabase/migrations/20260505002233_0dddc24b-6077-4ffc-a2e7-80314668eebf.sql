
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS font_heading text NOT NULL DEFAULT 'Orbitron',
  ADD COLUMN IF NOT EXISTS font_body text NOT NULL DEFAULT 'Kanit',
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hero_bg_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS hero_overlay_opacity numeric NOT NULL DEFAULT 0.6,
  ADD COLUMN IF NOT EXISTS card_style text NOT NULL DEFAULT 'classic',
  ADD COLUMN IF NOT EXISTS noise_texture boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cursor_glow boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS page_transition text NOT NULL DEFAULT 'fade',
  ADD COLUMN IF NOT EXISTS custom_css text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS scanline_effect boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS animation_speed numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS card_blur integer NOT NULL DEFAULT 0;
