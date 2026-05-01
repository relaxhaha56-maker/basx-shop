import { useSettings } from "@/hooks/useSettings";

export const Footer = () => {
  const settings = useSettings();
  return (
    <footer className="relative z-10 border-t border-border mt-20 py-8 text-center text-sm text-muted-foreground">
      <div className="container">
        © {new Date().getFullYear()} {settings?.shop_name ?? "BasX SHOP"} • All Rights Reserved
      </div>
    </footer>
  );
};
