import personalCareDesktop from "../../public/images/personal-care-bg-img-desktop.png";
import personalCareTablet from "../../public/images/personal-care-bg-img-tablet.png";
import personalCareMobile from "../../public/images/personal-care-bg-img-mobile.png";
import bathroomSafetyDesktop from "../../public/images/bath-mobility-bg-img-desktop.png";
import bathroomSafetyTablet from "../../public/images/bath-mobility-bg-img-tablet.png";
import bathroomSafetyMobile from "../../public/images/bath-mobility-bg-img-mobile.png";
import dailyLivingDesktop from "../../public/images/daily-living-aids-bg-img-desktop.png";
import dailyLivingTablet from "../../public/images/daily-living-aids-bg-img-tablet.png";
import dailyLivingMobile from "../../public/images/daily-living-aids-bg-img-mobile.png";
import healthMonitoringDesktop from "../../public/images/health-monitors-bg-img-desktop.png";
import healthMonitoringTablet from "../../public/images/health-monitors-bg-img-tablet.png";
import healthMonitoringMobile from "../../public/images/health-monitors-bg-img-mobile.png";
import comfortDesktop from "../../public/images/massagers-comfort-bg-img-desktop.png";
import comfortTablet from "../../public/images/massagers-comfort-bg-img-tablet.png";
import comfortMobile from "../../public/images/massagers-comfort-bg-img-mobile.png";


export const HeroSectionData = [
  {
    id: "personal-care",
    category: "Personal Care",
    image: {
      desktop: personalCareDesktop,
      tablet: personalCareTablet,
      mobile: personalCareMobile,
    },
    heading: "Everyday care & personal comfort.",
    description:
      "Protective underwear, pads, and hygiene essentials for you and those you care for.",
    cta: {
      label: "Shop Personal Care",
      href: "/collections/personal-care",
    },
    secondaryCta: { label: "Shop All Products", href: "/shop" },
  },
  {
    id: "bath-mobility",
    category: "Bath & Mobility",
    image: {
      desktop: bathroomSafetyDesktop,
      tablet: bathroomSafetyTablet,
      mobile: bathroomSafetyMobile,
    },
    heading: "More comfort & more confidence.",
    description:
      "Explore shower chairs, grab bars, and mobility aids for everyday support.",
    cta: {
      label: "Shop Bath & Mobility",
      href: "/collections/bath-mobility",
    },
    secondaryCta: { label: "Shop All Products", href: "/shop" },
  },
  {
    id: "daily-living-aids",
    category: "Daily Living Aids",
    image: {
      desktop: dailyLivingDesktop,
      tablet: dailyLivingTablet,
      mobile: dailyLivingMobile,
    },
    heading: "Make everyday tasks easier.",
    description:
      "Discover magnifiers, reachers, and practical tools that simplify daily routines.",
    cta: {
      label: "Shop Daily Living",
      href: "/collections/daily-living-aids",
    },
    secondaryCta: { label: "Shop All Products", href: "/shop" },
  },
  {
    id: "health-monitors",
    category: "Health Monitors",
    image: {
      desktop: healthMonitoringDesktop,
      tablet: healthMonitoringTablet,
      mobile: healthMonitoringMobile,
    },
    heading: "Stay on top of your health.",
    description:
      "Explore blood pressure monitors and simple tools for tracking your health at home.",
    cta: {
      label: "Shop Health Monitors",
      href: "/collections/health-monitors",
    },
    secondaryCta: { label: "Shop All Products", href: "/shop" },
  },
  {
    id: "massagers-comfort",
    category: "Massagers & Comfort",
    image: {
      desktop: comfortDesktop,
      tablet: comfortTablet,
      mobile: comfortMobile,
    },
    heading: "Make time for your comfort.",
    description:
      "Discover massagers and relaxation essentials for a little more ease at home.",
    cta: {
      label: "Shop Comfort Essentials",
      href: "/collections/massagers-comfort",
    },
    secondaryCta: { label: "Shop All Products", href: "/shop" },
  },
] as const;
