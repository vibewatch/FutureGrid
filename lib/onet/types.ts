export interface OccupationsResponse {
  occupation: OccupationSummary[];
  total?: number;
}

export interface OccupationSummary {
  code: string;
  title: string;
  tags: {
    bright_outlook: boolean;
    green: boolean;
    apprenticeship: boolean;
  };
}

export interface OccupationDetail {
  code: string;
  title: string;
  description: string;
  sample_of_reported_job_titles?: string[];
  tags: OccupationSummary["tags"];
}

export interface ScoredElement {
  id: string;
  name: string;
  description: string;
  importance: { value: number; description: string };
  level: { value: number; description: string };
}

export interface SkillGroup {
  name: string;
  element: ScoredElement[];
}

export interface TechnologyCategory {
  id: number;
  title: string;
  description: string;
  example: TechExample[];
}

export interface TechExample {
  name: string;
  hot_technology: boolean;
  in_demand: boolean;
}

export interface WorkActivity {
  id: string;
  name: string;
  description: string;
  importance: { value: number; description: string };
  level: { value: number; description: string };
}

export type AutomationRisk =
  | "Low"
  | "Medium"
  | "High"
  | "Very High";

export type SkillCategory = "Technical" | "Cognitive" | "Interpersonal" | "Administrative" | "Management";

export interface OccupationWithRisk extends OccupationSummary {
  automationRisk: AutomationRisk;
  automationProbability: number;
  growthRate: number;
  medianSalary: number;
  totalEmployment: number;
  projectedEmployment2034: number;
  topSkills: string[];
  hotTechnologies: string[];
}

export interface SectorAggregate {
  sector: string;
  avgRisk: number;
  avgGrowth: number;
  occupationCount: number;
}