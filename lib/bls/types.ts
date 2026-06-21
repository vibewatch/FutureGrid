export interface BLSSeriesDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
  footnotes: { code: string; text: string }[];
  latest?: string;
}

export interface BLSSeriesCatalog {
  series_title: string;
  survey_name?: string;
  seasonality?: string;
  measure_data_type?: string;
  area?: string;
  occupation?: string;
  industry?: string;
}

export interface BLSSeriesResult {
  seriesID: string;
  catalog?: BLSSeriesCatalog;
  data: BLSSeriesDataPoint[];
}

export interface BLSResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: BLSSeriesResult[];
  };
}

export interface EmploymentProjection {
  occupationCode: string;
  occupationTitle: string;
  employment2024: number;
  employment2034: number;
  employmentChange: number;
  employmentPercentChange: number;
  medianAnnualWage: number;
  typicalEducation: string;
  workExperience: string;
  onTheJobTraining: string;
}

export interface IndustryEmployment {
  industryCode: string;
  industryName: string;
  employment: number;
  change: number;
  changePercent: number;
}