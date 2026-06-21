export interface AutomationScore {
  socCode: string;
  occupationName: string;
  probability: number;
  riskLevel: "Low" | "Medium" | "High" | "Very High";
}

function classifyRisk(probability: number): AutomationScore["riskLevel"] {
  if (probability < 0.3) return "Low";
  if (probability < 0.6) return "Medium";
  if (probability < 0.85) return "High";
  return "Very High";
}

const AUTOMATION_SCORES: Map<string, AutomationScore> = new Map([
  ["11-1011", { socCode: "11-1011", occupationName: "Chief Executives", probability: 0.015, riskLevel: "Low" }],
  ["11-1021", { socCode: "11-1021", occupationName: "General and Operations Managers", probability: 0.16, riskLevel: "Low" }],
  ["11-2021", { socCode: "11-2021", occupationName: "Marketing Managers", probability: 0.014, riskLevel: "Low" }],
  ["11-2022", { socCode: "11-2022", occupationName: "Sales Managers", probability: 0.013, riskLevel: "Low" }],
  ["11-3012", { socCode: "11-3012", occupationName: "Administrative Services Managers", probability: 0.73, riskLevel: "High" }],
  ["11-3021", { socCode: "11-3021", occupationName: "Computer and Information Systems Managers", probability: 0.035, riskLevel: "Low" }],
  ["11-3031", { socCode: "11-3031", occupationName: "Financial Managers", probability: 0.069, riskLevel: "Low" }],
  ["11-3111", { socCode: "11-3111", occupationName: "Compensation and Benefits Managers", probability: 0.96, riskLevel: "Very High" }],
  ["11-3121", { socCode: "11-3121", occupationName: "Human Resources Managers", probability: 0.009, riskLevel: "Low" }],
  ["11-9021", { socCode: "11-9021", occupationName: "Construction Managers", probability: 0.071, riskLevel: "Low" }],
  ["13-2011", { socCode: "13-2011", occupationName: "Accountants and Auditors", probability: 0.94, riskLevel: "Very High" }],
  ["13-2051", { socCode: "13-2051", occupationName: "Financial Analysts", probability: 0.23, riskLevel: "Low" }],
  ["13-2052", { socCode: "13-2052", occupationName: "Personal Financial Advisors", probability: 0.58, riskLevel: "Medium" }],
  ["13-2072", { socCode: "13-2072", occupationName: "Loan Officers", probability: 0.98, riskLevel: "Very High" }],
  ["15-1211", { socCode: "15-1211", occupationName: "Computer Systems Analysts", probability: 0.065, riskLevel: "Low" }],
  ["15-1212", { socCode: "15-1212", occupationName: "Information Security Analysts", probability: 0.021, riskLevel: "Low" }],
  ["15-1221", { socCode: "15-1221", occupationName: "Computer and Information Research Scientists", probability: 0.015, riskLevel: "Low" }],
  ["15-1231", { socCode: "15-1231", occupationName: "Computer Network Support Specialists", probability: 0.22, riskLevel: "Low" }],
  ["15-1232", { socCode: "15-1232", occupationName: "Computer User Support Specialists", probability: 0.38, riskLevel: "Medium" }],
  ["15-1241", { socCode: "15-1241", occupationName: "Computer Network Architects", probability: 0.012, riskLevel: "Low" }],
  ["15-1244", { socCode: "15-1244", occupationName: "Network and Computer Systems Administrators", probability: 0.032, riskLevel: "Low" }],
  ["15-1251", { socCode: "15-1251", occupationName: "Computer Programmers", probability: 0.48, riskLevel: "Medium" }],
  ["15-1252", { socCode: "15-1252", occupationName: "Software Developers", probability: 0.13, riskLevel: "Low" }],
  ["15-1253", { socCode: "15-1253", occupationName: "Software Quality Assurance Analysts and Testers", probability: 0.22, riskLevel: "Low" }],
  ["15-1255", { socCode: "15-1255", occupationName: "Web Developers", probability: 0.21, riskLevel: "Low" }],
  ["15-1299", { socCode: "15-1299", occupationName: "Computer Occupations, All Other", probability: 0.04, riskLevel: "Low" }],
  ["15-2031", { socCode: "15-2031", occupationName: "Operations Research Analysts", probability: 0.017, riskLevel: "Low" }],
  ["15-2041", { socCode: "15-2041", occupationName: "Statisticians", probability: 0.22, riskLevel: "Low" }],
  ["15-2051", { socCode: "15-2051", occupationName: "Data Scientists", probability: 0.037, riskLevel: "Low" }],
  ["17-2051", { socCode: "17-2051", occupationName: "Civil Engineers", probability: 0.019, riskLevel: "Low" }],
  ["17-2061", { socCode: "17-2061", occupationName: "Computer Hardware Engineers", probability: 0.017, riskLevel: "Low" }],
  ["17-2071", { socCode: "17-2071", occupationName: "Electrical Engineers", probability: 0.1, riskLevel: "Low" }],
  ["17-2072", { socCode: "17-2072", occupationName: "Electronics Engineers", probability: 0.025, riskLevel: "Low" }],
  ["17-2112", { socCode: "17-2112", occupationName: "Industrial Engineers", probability: 0.026, riskLevel: "Low" }],
  ["17-2141", { socCode: "17-2141", occupationName: "Mechanical Engineers", probability: 0.011, riskLevel: "Low" }],
  ["19-3011", { socCode: "19-3011", occupationName: "Economists", probability: 0.43, riskLevel: "Medium" }],
  ["23-1011", { socCode: "23-1011", occupationName: "Lawyers", probability: 0.035, riskLevel: "Low" }],
  ["23-2011", { socCode: "23-2011", occupationName: "Paralegals and Legal Assistants", probability: 0.94, riskLevel: "Very High" }],
  ["25-2021", { socCode: "25-2021", occupationName: "Elementary School Teachers", probability: 0.0044, riskLevel: "Low" }],
  ["25-2031", { socCode: "25-2031", occupationName: "Secondary School Teachers", probability: 0.0078, riskLevel: "Low" }],
  ["27-1024", { socCode: "27-1024", occupationName: "Graphic Designers", probability: 0.082, riskLevel: "Low" }],
  ["27-2012", { socCode: "27-2012", occupationName: "Producers and Directors", probability: 0.023, riskLevel: "Low" }],
  ["27-3031", { socCode: "27-3031", occupationName: "Public Relations Specialists", probability: 0.18, riskLevel: "Low" }],
  ["29-1141", { socCode: "29-1141", occupationName: "Registered Nurses", probability: 0.009, riskLevel: "Low" }],
  ["29-1171", { socCode: "29-1171", occupationName: "Nurse Practitioners", probability: 0.0025, riskLevel: "Low" }],
  ["29-1215", { socCode: "29-1215", occupationName: "Family Medicine Physicians", probability: 0.0042, riskLevel: "Low" }],
  ["29-1228", { socCode: "29-1228", occupationName: "Physicians, All Other", probability: 0.0042, riskLevel: "Low" }],
  ["31-1131", { socCode: "31-1131", occupationName: "Nursing Assistants", probability: 0.33, riskLevel: "Medium" }],
  ["31-9092", { socCode: "31-9092", occupationName: "Medical Assistants", probability: 0.3, riskLevel: "Medium" }],
  ["33-3021", { socCode: "33-3021", occupationName: "Detectives and Criminal Investigators", probability: 0.34, riskLevel: "Medium" }],
  ["35-2014", { socCode: "35-2014", occupationName: "Cooks, Restaurant", probability: 0.96, riskLevel: "Very High" }],
  ["35-3023", { socCode: "35-3023", occupationName: "Fast Food and Counter Workers", probability: 0.92, riskLevel: "Very High" }],
  ["37-2011", { socCode: "37-2011", occupationName: "Janitors and Cleaners", probability: 0.66, riskLevel: "High" }],
  ["39-5012", { socCode: "39-5012", occupationName: "Hairdressers, Hairstylists, and Cosmetologists", probability: 0.11, riskLevel: "Low" }],
  ["41-1011", { socCode: "41-1011", occupationName: "First-Line Supervisors of Retail Sales Workers", probability: 0.02, riskLevel: "Low" }],
  ["41-2011", { socCode: "41-2011", occupationName: "Cashiers", probability: 0.97, riskLevel: "Very High" }],
  ["41-2031", { socCode: "41-2031", occupationName: "Retail Salespersons", probability: 0.92, riskLevel: "Very High" }],
  ["41-3091", { socCode: "41-3091", occupationName: "Sales Representatives of Services", probability: 0.02, riskLevel: "Low" }],
  ["41-4011", { socCode: "41-4011", occupationName: "Sales Representatives, Wholesale and Manufacturing", probability: 0.86, riskLevel: "Very High" }],
  ["41-4012", { socCode: "41-4012", occupationName: "Sales Representatives, Wholesale and Manufacturing, Technical", probability: 0.027, riskLevel: "Low" }],
  ["41-9022", { socCode: "41-9022", occupationName: "Real Estate Sales Agents", probability: 0.86, riskLevel: "Very High" }],
  ["41-9041", { socCode: "41-9041", occupationName: "Telemarketers", probability: 0.99, riskLevel: "Very High" }],
  ["43-1011", { socCode: "43-1011", occupationName: "First-Line Supervisors of Office Workers", probability: 0.016, riskLevel: "Low" }],
  ["43-3021", { socCode: "43-3021", occupationName: "Billing and Posting Clerks", probability: 0.97, riskLevel: "Very High" }],
  ["43-3031", { socCode: "43-3031", occupationName: "Bookkeeping, Accounting, and Auditing Clerks", probability: 0.98, riskLevel: "Very High" }],
  ["43-4051", { socCode: "43-4051", occupationName: "Customer Service Representatives", probability: 0.55, riskLevel: "Medium" }],
  ["43-4131", { socCode: "43-4131", occupationName: "Loan Interviewers and Clerks", probability: 0.96, riskLevel: "Very High" }],
  ["43-4171", { socCode: "43-4171", occupationName: "Receptionists and Information Clerks", probability: 0.96, riskLevel: "Very High" }],
  ["43-6011", { socCode: "43-6011", occupationName: "Executive Secretaries", probability: 0.86, riskLevel: "Very High" }],
  ["43-6013", { socCode: "43-6013", occupationName: "Medical Secretaries", probability: 0.81, riskLevel: "High" }],
  ["43-6014", { socCode: "43-6014", occupationName: "Secretaries and Administrative Assistants", probability: 0.86, riskLevel: "Very High" }],
  ["43-9021", { socCode: "43-9021", occupationName: "Data Entry Keyers", probability: 0.99, riskLevel: "Very High" }],
  ["43-9061", { socCode: "43-9061", occupationName: "Office Clerks, General", probability: 0.88, riskLevel: "Very High" }],
  ["45-2092", { socCode: "45-2092", occupationName: "Farmworkers and Laborers, Crop", probability: 0.87, riskLevel: "Very High" }],
  ["47-2031", { socCode: "47-2031", occupationName: "Carpenters", probability: 0.72, riskLevel: "High" }],
  ["47-2061", { socCode: "47-2061", occupationName: "Construction Laborers", probability: 0.88, riskLevel: "Very High" }],
  ["47-2111", { socCode: "47-2111", occupationName: "Electricians", probability: 0.15, riskLevel: "Low" }],
  ["49-3023", { socCode: "49-3023", occupationName: "Automotive Service Technicians and Mechanics", probability: 0.59, riskLevel: "Medium" }],
  ["51-1011", { socCode: "51-1011", occupationName: "First-Line Supervisors of Production Workers", probability: 0.016, riskLevel: "Low" }],
  ["51-2092", { socCode: "51-2092", occupationName: "Team Assemblers", probability: 0.97, riskLevel: "Very High" }],
  ["51-4041", { socCode: "51-4041", occupationName: "Machinists", probability: 0.82, riskLevel: "High" }],
  ["51-4121", { socCode: "51-4121", occupationName: "Welders, Cutters, Solderers, and Brazers", probability: 0.73, riskLevel: "High" }],
  ["53-3032", { socCode: "53-3032", occupationName: "Heavy and Tractor-Trailer Truck Drivers", probability: 0.79, riskLevel: "High" }],
  ["53-3033", { socCode: "53-3033", occupationName: "Light Truck Drivers", probability: 0.69, riskLevel: "High" }],
  ["53-7062", { socCode: "53-7062", occupationName: "Laborers and Freight, Stock Movers, Hand", probability: 0.85, riskLevel: "Very High" }],
  ["53-7065", { socCode: "53-7065", occupationName: "Stockers and Order Fillers", probability: 0.94, riskLevel: "Very High" }],
]);

export function getAutomationScore(socCode: string): AutomationScore | undefined {
  return AUTOMATION_SCORES.get(socCode);
}

export function getAllAutomationScores(): AutomationScore[] {
  return Array.from(AUTOMATION_SCORES.values());
}

export function getAutomationScoresByRisk(risk: AutomationScore["riskLevel"]): AutomationScore[] {
  return getAllAutomationScores().filter((s) => s.riskLevel === risk);
}

export { classifyRisk };