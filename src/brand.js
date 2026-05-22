export const brand = {
  name: "Tolani Supply Group",
  shortName: "TSG",
  productName: "TSG Climate Supply OS",
  division: "Climate Supply Intelligence",
  tagline: "Global Logistics. Simplified.",
  promise: "China-to-Panama sourcing intelligence for smart HVAC and ESG devices.",
  lane: "China to Panama",
  locations: {
    headquarters: "Panama City, Panama",
    hub: "Colon Free Trade Zone"
  },
  contact: {
    info: "info@tolanisupplygroup.com",
    sales: "sales@tolanisupplygroup.com"
  }
};

export const platformDynamics = [
  {
    id: "tccg-work",
    name: "TCCG.work",
    shortName: "TCCG",
    role: "Project governance, field rollout, security review",
    focus: "Governance",
    accent: "ocean"
  },
  {
    id: "tolani-lab",
    name: "Tolani Lab",
    shortName: "Lab",
    role: "Device testing, energy model validation, telemetry schema",
    focus: "Validation",
    accent: "green"
  },
  {
    id: "tsg-ops",
    name: "TSG Operations",
    shortName: "TSG Ops",
    role: "Sourcing, freight, customs, supplier follow-up",
    focus: "Execution",
    accent: "steel"
  }
];

export const platformIdentity = {
  brand: {
    name: brand.name,
    shortName: brand.shortName,
    productName: brand.productName,
    division: brand.division,
    tagline: brand.tagline
  },
  lane: brand.lane,
  operatingHub: brand.locations.hub,
  dynamics: platformDynamics.map(({ id, name, role, focus }) => ({
    id,
    name,
    role,
    focus
  }))
};
