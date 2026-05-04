
DROP FUNCTION IF EXISTS public.purchase_product(uuid);

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS hero_title text NOT NULL DEFAULT 'BasX SHOP',
  ADD COLUMN IF NOT EXISTS hero_subtitle text NOT NULL DEFAULT 'ร้านเติมเกม & ไอเทมดิจิทัล ส่งของไว 24 ชม.',
  ADD COLUMN IF NOT EXISTS footer_text text NOT NULL DEFAULT '© BasX SHOP — ขับเคลื่อนด้วยใจ',
  ADD COLUMN IF NOT EXISTS glow_intensity numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS button_radius integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS background_hue integer NOT NULL DEFAULT 222,
  ADD COLUMN IF NOT EXISTS gradient_style text NOT NULL DEFAULT 'diagonal',
  ADD COLUMN IF NOT EXISTS show_announcement_bar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS announcement_bar_text text NOT NULL DEFAULT '🎉 เปิดร้านแล้ว! ส่งสินค้าทันทีหลังชำระ';
