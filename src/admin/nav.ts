import {
  CircleHelp,
  Compass,
  FileImage,
  House,
  Images,
  Info,
  LayoutDashboard,
  type LucideIcon,
  Mail,
  Megaphone,
  MapPin,
  Quote,
  Settings,
} from "lucide-react";

export type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

/**
 * Sections of the admin. Later tasks add the pages behind these links; until
 * then an unmatched path shows the admin "Not found" screen.
 */
export const ADMIN_NAV: AdminNavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/homepage", label: "Homepage", icon: House },
  { to: "/admin/about", label: "About", icon: Info },
  { to: "/admin/visit", label: "Visit page", icon: MapPin },
  { to: "/admin/attractions", label: "Attractions", icon: Compass },
  { to: "/admin/gallery", label: "Gallery", icon: Images },
  { to: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/faqs", label: "FAQs", icon: CircleHelp },
  { to: "/admin/messages", label: "Messages", icon: Mail },
  { to: "/admin/media", label: "Media", icon: FileImage },
  { to: "/admin/settings", label: "Contact & settings", icon: Settings },
];
