export enum Category {
  PersonalCare = "personal-care",
  BathMobility = "bath-mobility",
  DailyLivingAids = "daily-living-aids",
  HealthMonitors = "health-monitors",
  MassagersComfort = "massagers-comfort",
}

export const categoryTitles: Record<Category, string> = {
  [Category.PersonalCare]: "Personal Care",
  [Category.BathMobility]: "Bath & Mobility",
  [Category.DailyLivingAids]: "Daily Living Aids",
  [Category.HealthMonitors]: "Health Monitors",
  [Category.MassagersComfort]: "Massagers & Comfort",
};
