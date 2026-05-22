import { platformDynamics } from "./brand.js";

export const destinations = [
  {
    id: "panama-city",
    name: "Panama City retrofit program",
    port: "Balboa / Panama City",
    country: "PA",
    gridKgCo2PerKwh: 0.21,
    customsBufferRate: 0.035,
    ftzHandlingRate: 0.018,
    defaultElectricityRate: 0.18,
    climate: "Hot-humid coastal"
  },
  {
    id: "colon-ftz",
    name: "Colon Free Zone redistribution",
    port: "Colon FTZ",
    country: "PA",
    gridKgCo2PerKwh: 0.21,
    customsBufferRate: 0.02,
    ftzHandlingRate: 0.028,
    defaultElectricityRate: 0.17,
    climate: "Port and warehouse"
  },
  {
    id: "david-chiriqui",
    name: "David / Chiriqui resilient cooling",
    port: "Balboa plus inland delivery",
    country: "PA",
    gridKgCo2PerKwh: 0.21,
    customsBufferRate: 0.04,
    ftzHandlingRate: 0.012,
    defaultElectricityRate: 0.19,
    climate: "Warm inland"
  }
];

export const origins = [
  {
    id: "shenzhen",
    name: "Shenzhen smart controls cluster",
    port: "Yantian / Shenzhen",
    qualityLeadDays: 6,
    exportDocFee: 420
  },
  {
    id: "guangzhou",
    name: "Guangzhou HVAC assembly belt",
    port: "Nansha / Guangzhou",
    qualityLeadDays: 7,
    exportDocFee: 390
  },
  {
    id: "ningbo",
    name: "Ningbo efficient components lane",
    port: "Ningbo-Zhoushan",
    qualityLeadDays: 5,
    exportDocFee: 460
  }
];

export const routes = [
  {
    id: "ocean-balanced",
    mode: "Ocean FCL/LCL",
    name: "Balanced ocean lane",
    daysMin: 24,
    daysMax: 34,
    baseFreight: 2900,
    cbmRate: 42,
    kgCo2PerCbm: 18,
    reliability: 84,
    notes: "Best default for HVAC hardware and mixed ESG kits."
  },
  {
    id: "ocean-low-carbon",
    mode: "Ocean optimized",
    name: "Lower-carbon consolidated lane",
    daysMin: 31,
    daysMax: 42,
    baseFreight: 3150,
    cbmRate: 37,
    kgCo2PerCbm: 13,
    reliability: 81,
    notes: "Slower route with better consolidation and lower freight emissions."
  },
  {
    id: "air-pilot",
    mode: "Air pilot",
    name: "Pilot batch air lane",
    daysMin: 7,
    daysMax: 12,
    baseFreight: 2200,
    cbmRate: 420,
    kgCo2PerCbm: 220,
    reliability: 88,
    notes: "Use for prototypes, critical sensors, or factory acceptance samples."
  }
];

export const products = [
  {
    id: "smart-vrf",
    name: "Smart inverter VRF package",
    category: "HVAC",
    hsCode: "8415.90",
    unitCost: 1640,
    cbm: 0.82,
    weightKg: 92,
    installHours: 8,
    importDutyPa: 0.08,
    targetSeer: 22,
    baselineSeer: 13,
    cybersecurityLevel: "Gateway plus signed OTA firmware",
    description: "Efficient cooling hardware with remote metering and predictive maintenance hooks."
  },
  {
    id: "iaq-sensor-kit",
    name: "IAQ and occupancy sensor kit",
    category: "ESG device",
    hsCode: "9027.10",
    unitCost: 86,
    cbm: 0.018,
    weightKg: 0.9,
    installHours: 0.5,
    importDutyPa: 0.03,
    targetSeer: null,
    baselineSeer: null,
    cybersecurityLevel: "Device identity and encrypted MQTT",
    description: "CO2, PM2.5, VOC, temperature, humidity, and occupancy telemetry for healthier buildings."
  },
  {
    id: "smart-meter-pack",
    name: "Panel-level smart meter pack",
    category: "ESG device",
    hsCode: "9028.30",
    unitCost: 124,
    cbm: 0.026,
    weightKg: 1.4,
    installHours: 1.2,
    importDutyPa: 0.02,
    targetSeer: null,
    baselineSeer: null,
    cybersecurityLevel: "Signed firmware and local fail-safe logging",
    description: "Metering pack for energy baselining, fault detection, and ESG reporting."
  },
  {
    id: "retrofit-gateway",
    name: "HVAC retrofit gateway",
    category: "Controls",
    hsCode: "8537.10",
    unitCost: 210,
    cbm: 0.04,
    weightKg: 2.2,
    installHours: 1.5,
    importDutyPa: 0.05,
    targetSeer: null,
    baselineSeer: null,
    cybersecurityLevel: "BACnet isolation, OTA signing, and edge rules",
    description: "Controls bridge for existing equipment, demand response, and lab-to-field experiments."
  }
];

export const suppliers = [
  {
    id: "dragon-cool",
    name: "DragonCool Controls",
    region: "Shenzhen",
    supports: ["smart-vrf", "retrofit-gateway", "iaq-sensor-kit"],
    unitCostMultiplier: 1.02,
    reliability: 89,
    esgScore: 76,
    warrantyMonths: 36,
    leadTimeDays: 28,
    moq: 20,
    certifications: ["ISO 9001", "RoHS", "CE", "BACnet"],
    strengths: ["Controls firmware", "English engineering support", "Small pilot batches"],
    risks: ["Higher gateway cost", "Needs firmware escrow before scale"]
  },
  {
    id: "pearl-river-hvac",
    name: "Pearl River HVAC Works",
    region: "Guangzhou",
    supports: ["smart-vrf"],
    unitCostMultiplier: 0.94,
    reliability: 82,
    esgScore: 68,
    warrantyMonths: 24,
    leadTimeDays: 35,
    moq: 50,
    certifications: ["ISO 9001", "CE"],
    strengths: ["Competitive equipment pricing", "High assembly capacity"],
    risks: ["Longer QA window", "Requires third-party controls validation"]
  },
  {
    id: "ningbo-meter-lab",
    name: "Ningbo Meter Lab",
    region: "Ningbo",
    supports: ["smart-meter-pack", "iaq-sensor-kit", "retrofit-gateway"],
    unitCostMultiplier: 0.98,
    reliability: 86,
    esgScore: 82,
    warrantyMonths: 30,
    leadTimeDays: 24,
    moq: 100,
    certifications: ["ISO 14001", "RoHS", "CE", "IEC 62053"],
    strengths: ["Metering accuracy", "Packaging reduction", "Fast samples"],
    risks: ["MOQ pressure for small pilots"]
  },
  {
    id: "future-comfort",
    name: "FutureComfort Systems",
    region: "Shenzhen",
    supports: ["smart-vrf", "smart-meter-pack", "retrofit-gateway"],
    unitCostMultiplier: 1.08,
    reliability: 91,
    esgScore: 88,
    warrantyMonths: 48,
    leadTimeDays: 31,
    moq: 30,
    certifications: ["ISO 9001", "ISO 14001", "CE", "RoHS", "Cyber Essentials"],
    strengths: ["Best ESG posture", "Integrated metering", "Strong warranty"],
    risks: ["Premium pricing"]
  }
];

export const complianceLibrary = [
  {
    id: "classification",
    label: "Confirm HS classification and Panama duty treatment",
    owner: "TSG customs",
    evidence: "Customs broker memo, product datasheet, tariff snapshot"
  },
  {
    id: "factory-audit",
    label: "Complete supplier audit and production sample inspection",
    owner: "Tolani Lab",
    evidence: "Factory audit report, sample test results, photo log"
  },
  {
    id: "cybersecurity",
    label: "Review firmware, connectivity, and device identity controls",
    owner: "TCCG.work security",
    evidence: "SBOM, firmware signing proof, network diagram"
  },
  {
    id: "energy-performance",
    label: "Validate cooling efficiency and ESG measurement assumptions",
    owner: "Tolani Lab",
    evidence: "Performance certificate, metering plan, calibration evidence"
  },
  {
    id: "shipping-docs",
    label: "Prepare commercial invoice, packing list, bill of lading, and insurance certificate",
    owner: "TSG operations",
    evidence: "Document packet linked to shipment"
  }
];

export const syncTargets = [
  ...platformDynamics.map(({ id, name, role, focus }) => ({
    id,
    name,
    role,
    focus
  }))
];
