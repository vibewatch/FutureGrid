/**
 * tests/warn-adapters.test.ts
 *
 * Fixture/contract tests for WARN source adapter parsers.
 * Each parseXX() function is exercised against a small but structurally faithful
 * fixture that pins the parser's column-mapping contract.
 *
 * Includes a PA regression test: parsePA() must yield records with effectiveDate
 * set and noticeDate=null (PA has no explicit notice/received date on the page).
 *
 * Drift-detection: feeding a fixture with a renamed/missing required header must
 * cause the parser to throw or return 0 records.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";

import {
  parseWI,
  parseOR,
  parseOH,
  parseGA,
  parseTN,
  parseKY,
  parseVA,
  parseNC,
  parseIN,
  parseMD,
  parsePA,
  parseCA,
  parseNJ,
  parseTX,
  parseNY,
  parseIA,
} from "../scripts/build-warn.mjs";

const FIXTURES_DIR = path.resolve(process.cwd(), "tests/fixtures/warn");

function readFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
}

interface WarnRecord {
  company: string;
  county: string | null;
  city: string | null;
  employees: number;
  noticeDate: string | null;
  effectiveDate: string | null;
  layoffType: string | null;
  state: string;
  stateName: string;
}

// ─── Helper to build ExcelJS workbooks for XLSX adapter tests ─────────────────

async function makeWorkbook(
  sheetName: string,
  headers: string[],
  rows: (string | number | null)[][],
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(headers);
  for (const row of rows) ws.addRow(row);
  return wb;
}

// ─── WI ───────────────────────────────────────────────────────────────────────

describe("parseWI", () => {
  it("parses 3 rows from wi.json fixture", () => {
    const records = parseWI(readFixture("wi.json")) as WarnRecord[];
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.company).toBeTruthy();
      expect(r.employees).toBeGreaterThan(0);
      expect(r.state).toBe("WI");
      expect(r.stateName).toBe("Wisconsin");
    }
  });

  it("parses correct values for first record", () => {
    const [r] = parseWI(readFixture("wi.json")) as WarnRecord[];
    expect(r.company).toBe("Acme Manufacturing");
    expect(r.employees).toBe(125);
    expect(r.city).toBe("Milwaukee");
    expect(r.county).toBe("Milwaukee");
    expect(r.noticeDate).toBe("2024-01-15");
    expect(r.effectiveDate).toBe("2024-03-01");
  });

  it("drops to 0 records when required headers are missing (drift guard)", () => {
    const badFixture = JSON.stringify({
      values: [
        ["Employer_Name", "Location", "Workers_Affected", "Date_Received"],
        ["Acme Corp", "Milwaukee", "125", "20240115"],
      ],
    });
    const records = parseWI(badFixture) as WarnRecord[];
    expect(records).toHaveLength(0);
  });
});

// ─── OR ───────────────────────────────────────────────────────────────────────

describe("parseOR", () => {
  it("parses 3 rows from or.json fixture", () => {
    const records = parseOR(readFixture("or.json")) as WarnRecord[];
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.company).toBeTruthy();
      expect(r.employees).toBeGreaterThan(0);
      expect(r.state).toBe("OR");
      expect(r.stateName).toBe("Oregon");
    }
  });

  it("parses correct values for first record", () => {
    const [r] = parseOR(readFixture("or.json")) as WarnRecord[];
    expect(r.company).toBe("Oregon Tech Corp");
    expect(r.employees).toBe(200);
    expect(r.city).toBe("Portland");
    expect(r.noticeDate).toBe("2024-01-10");
    expect(r.effectiveDate).toBe("2024-03-01");
  });

  it("throws when JSON is empty array (drift guard)", () => {
    expect(() => parseOR("[]")).toThrow("OR: no rows in Socrata response");
  });
});

// ─── OH ───────────────────────────────────────────────────────────────────────

describe("parseOH", () => {
  it("parses 3 rows from oh.csv fixture", () => {
    const records = parseOH(readFixture("oh.csv")) as WarnRecord[];
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.company).toBeTruthy();
      expect(r.employees).toBeGreaterThan(0);
      expect(r.state).toBe("OH");
    }
  });

  it("parses correct values for first record", () => {
    const [r] = parseOH(readFixture("oh.csv")) as WarnRecord[];
    expect(r.company).toBe("Ohio Steel Corp");
    expect(r.employees).toBe(250);
    expect(r.city).toBe("Cleveland");
    expect(r.noticeDate).toBe("2024-01-15");
    expect(r.effectiveDate).toBe("2024-03-01");
  });

  it("drops to 0 records when required headers are missing (drift guard)", () => {
    const bad = "employer,workers,date\nAcme,100,2024-01-01\n";
    const records = parseOH(bad) as WarnRecord[];
    expect(records).toHaveLength(0);
  });
});

// ─── GA ───────────────────────────────────────────────────────────────────────

describe("parseGA", () => {
  it("parses 3 rows from ga.csv fixture", () => {
    const records = parseGA(readFixture("ga.csv")) as WarnRecord[];
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.company).toBeTruthy();
      expect(r.employees).toBeGreaterThan(0);
      expect(r.state).toBe("GA");
    }
  });

  it("maps separation date to both noticeDate and effectiveDate", () => {
    const [r] = parseGA(readFixture("ga.csv")) as WarnRecord[];
    expect(r.company).toBe("Georgia Paper Mill");
    expect(r.employees).toBe(300);
    expect(r.city).toBe("Atlanta");
    expect(r.county).toBe("Fulton");
    expect(r.noticeDate).toBe("2024-01-15");
    expect(r.effectiveDate).toBe("2024-01-15");
  });

  it("drops to 0 records when company column is missing (drift guard)", () => {
    const bad = "id,employer,city,county,est. impact,separation date\n1,Acme,Atlanta,Fulton,100,2024-01-15\n";
    const records = parseGA(bad) as WarnRecord[];
    expect(records).toHaveLength(0);
  });
});

// ─── TN ───────────────────────────────────────────────────────────────────────

describe("parseTN", () => {
  it("parses 3 rows from tn.csv fixture", () => {
    const records = parseTN(readFixture("tn.csv")) as WarnRecord[];
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.company).toBeTruthy();
      expect(r.employees).toBeGreaterThan(0);
      expect(r.state).toBe("TN");
    }
  });

  it("parses correct fields for first record", () => {
    const [r] = parseTN(readFixture("tn.csv")) as WarnRecord[];
    expect(r.company).toBe("Tennessee Auto Parts");
    expect(r.employees).toBe(175);
    expect(r.city).toBe("Nashville");
    expect(r.county).toBe("Davidson");
    expect(r.noticeDate).toBe("2024-01-15");
    expect(r.effectiveDate).toBe("2024-03-01");
  });

  it("drops to 0 records when employee column is missing (drift guard)", () => {
    const bad = "Notice Date,Effective Date,Company,City,County,Layoff/Closure\n01/15/2024,03/01/2024,Acme,Nashville,Davidson,Layoff\n";
    const records = parseTN(bad) as WarnRecord[];
    expect(records).toHaveLength(0);
  });
});

// ─── KY ───────────────────────────────────────────────────────────────────────

describe("parseKY", () => {
  it("parses 3 rows from ky.csv fixture", () => {
    const records = parseKY(readFixture("ky.csv")) as WarnRecord[];
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.company).toBeTruthy();
      expect(r.employees).toBeGreaterThan(0);
      expect(r.state).toBe("KY");
    }
  });

  it("parses correct fields for first record", () => {
    const [r] = parseKY(readFixture("ky.csv")) as WarnRecord[];
    expect(r.company).toBe("Kentucky Auto Corp");
    expect(r.employees).toBe(200);
    expect(r.county).toBe("Jefferson");
    expect(r.city).toBeNull();
    expect(r.noticeDate).toBe("2024-01-15");
    expect(r.effectiveDate).toBe("2024-03-01");
  });

  it("drops to 0 records when company column is missing (drift guard)", () => {
    const bad = "Date Received,Region,County,Employer,NAICS,Workers,Type,Projected Date\n01/15/2024,R1,Jefferson,Acme,,200,Layoff,03/01/2024\n";
    const records = parseKY(bad) as WarnRecord[];
    expect(records).toHaveLength(0);
  });
});

// ─── VA ───────────────────────────────────────────────────────────────────────

describe("parseVA", () => {
  it("parses 3 rows from va.csv fixture", () => {
    const records = parseVA(readFixture("va.csv")) as WarnRecord[];
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.company).toBeTruthy();
      expect(r.employees).toBeGreaterThan(0);
      expect(r.state).toBe("VA");
    }
  });

  it("parses correct fields for first record", () => {
    const [r] = parseVA(readFixture("va.csv")) as WarnRecord[];
    expect(r.company).toBe("Virginia Tech Solutions");
    expect(r.employees).toBe(175);
    expect(r.city).toBe("Arlington");
    expect(r.noticeDate).toBe("2024-01-15");
    expect(r.effectiveDate).toBe("2024-03-01");
  });

  it("throws when required headers are missing (drift guard)", () => {
    const bad = "Org_Name,Filing_Date,Impact_Date,Headcount,Address,Action_Type\nAcme Corp,01/15/2024,03/01/2024,100,\"Richmond, VA 23219\",Layoff\n";
    expect(() => parseVA(bad)).toThrow("VA: no valid records in WARN CSV");
  });
});

// ─── NC ───────────────────────────────────────────────────────────────────────

describe("parseNC", () => {
  it("parses 3 rows from nc.csv fixture", () => {
    const records = parseNC(readFixture("nc.csv")) as WarnRecord[];
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.company).toBeTruthy();
      expect(r.employees).toBeGreaterThan(0);
      expect(r.state).toBe("NC");
    }
  });

  it("parses correct fields for first record", () => {
    const [r] = parseNC(readFixture("nc.csv")) as WarnRecord[];
    expect(r.company).toBe("NC Auto Corp");
    expect(r.employees).toBe(200);
    expect(r.county).toBe("Mecklenburg");
    expect(r.city).toBe("Charlotte");
    expect(r.noticeDate).toBe("2024-01-15");
    expect(r.effectiveDate).toBe("2024-03-01");
  });

  it("drops to 0 records when company column is missing (drift guard)", () => {
    const bad = "County,Date of Notice,Effective Date,Employer,WARN Type,Workers,City\nMecklenburg,01/15/2024,03/01/2024,Acme Corp,Layoff,200,Charlotte\n";
    const records = parseNC(bad) as WarnRecord[];
    expect(records).toHaveLength(0);
  });
});

// ─── IN ───────────────────────────────────────────────────────────────────────

describe("parseIN", () => {
  it("parses 3 rows from in.html fixture", () => {
    const records = parseIN(readFixture("in.html")) as WarnRecord[];
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.company).toBeTruthy();
      expect(r.employees).toBeGreaterThan(0);
      expect(r.state).toBe("IN");
    }
  });

  it("parses correct fields for first record", () => {
    const [r] = parseIN(readFixture("in.html")) as WarnRecord[];
    expect(r.company).toBe("Hoosier Auto Parts Inc");
    expect(r.employees).toBe(150);
    expect(r.city).toBe("Indianapolis");
    expect(r.noticeDate).toBe("2024-01-15");
    expect(r.effectiveDate).toBe("2024-03-01");
  });

  it("throws when required headers are missing (drift guard)", () => {
    const bad = `<table><tr><th>Employer</th><th>Workers</th><th>Filed</th></tr>
    <tr><td>Acme Corp</td><td>100</td><td>01/15/2024</td></tr></table>`;
    expect(() => parseIN(bad)).toThrow("IN: current WARN table not found");
  });
});

// ─── MD ───────────────────────────────────────────────────────────────────────

describe("parseMD", () => {
  it("parses 3 rows from md.html fixture", () => {
    const records = parseMD(readFixture("md.html")) as WarnRecord[];
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.company).toBeTruthy();
      expect(r.employees).toBeGreaterThan(0);
      expect(r.state).toBe("MD");
    }
  });

  it("parses correct fields for first record", () => {
    const [r] = parseMD(readFixture("md.html")) as WarnRecord[];
    expect(r.company).toBe("Maryland Steel Corp");
    expect(r.employees).toBe(200);
    expect(r.county).toBe("Baltimore City");
    expect(r.noticeDate).toBe("2024-01-15");
    expect(r.effectiveDate).toBe("2024-03-01");
  });

  it("extracts city from location string", () => {
    const [r] = parseMD(readFixture("md.html")) as WarnRecord[];
    // Location is "1234 Industrial Way, Baltimore, MD 21201"
    expect(r.city).toBe("Baltimore");
  });

  it("returns empty array when required headers are missing (drift guard)", () => {
    const bad = `<table><tr><th>Employer</th><th>Location</th><th>Workers</th></tr>
    <tr><td>Acme</td><td>Baltimore, MD</td><td>100</td></tr></table>`;
    const records = parseMD(bad) as WarnRecord[];
    expect(records).toHaveLength(0);
  });
});

// ─── PA (regression: effectiveDate set, noticeDate null) ──────────────────────

describe("parsePA", () => {
  it("parses 3 records from pa.html fixture", () => {
    const records = parsePA(readFixture("pa.html")) as WarnRecord[];
    expect(records).toHaveLength(3);
    for (const r of records) {
      expect(r.company).toBeTruthy();
      expect(r.employees).toBeGreaterThan(0);
      expect(r.state).toBe("PA");
    }
  });

  it("regression: noticeDate is null, effectiveDate is set for all records", () => {
    const records = parsePA(readFixture("pa.html")) as WarnRecord[];
    for (const r of records) {
      expect(r.noticeDate).toBeNull();
      expect(r.effectiveDate).not.toBeNull();
      expect(r.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("parses correct fields for first record", () => {
    const [r] = parsePA(readFixture("pa.html")) as WarnRecord[];
    expect(r.company).toBe("Keystone Manufacturing Corp");
    expect(r.employees).toBe(150);
    expect(r.county).toBe("Allegheny");
    expect(r.noticeDate).toBeNull();
    expect(r.effectiveDate).toBe("2024-03-01");
  });

  it("throws when no accordion items found (drift guard)", () => {
    const bad = `<div class="some-other-class"><span>Company</span><p># Affected: 100</p></div>`;
    expect(() => parsePA(bad)).toThrow("PA: no valid records in WARN accordion");
  });
});

// ─── CA (XLSX via ExcelJS workbook) ───────────────────────────────────────────

describe("parseCA", () => {
  it("parses workbook with real-style CA headers", async () => {
    const wb = await makeWorkbook("Detailed WARN Activity", [
      "Company", "County", "Layoff/Closure", "No. of Employees", "Address", "Notice Date", "Effective Date",
    ], [
      ["Acme Corp", "Los Angeles", "Layoff", 150, "123 Main St, Los Angeles, CA 90001", "01/15/2024", "03/01/2024"],
      ["Beta Inc", "San Francisco", "Closure", 75, "456 Market St, San Francisco, CA 94105", "02/20/2024", "04/15/2024"],
      ["Gamma LLC", "San Diego", "Layoff", 200, "789 Harbor Dr, San Diego, CA 92101", "03/10/2024", "05/01/2024"],
    ]);

    const records = parseCA(wb) as WarnRecord[];
    expect(records).toHaveLength(3);
    expect(records[0].company).toBe("Acme Corp");
    expect(records[0].employees).toBe(150);
    expect(records[0].county).toBe("Los Angeles");
    expect(records[0].city).toBe("Los Angeles");
    expect(records[0].noticeDate).toBe("2024-01-15");
    expect(records[0].effectiveDate).toBe("2024-03-01");
    expect(records[0].state).toBe("CA");
    expect(records[0].stateName).toBe("California");
  });

  it("throws when company/employees headers are missing (drift guard)", async () => {
    const wb = await makeWorkbook("Sheet1", [
      "Employer", "Region", "Type", "Count", "Addr", "Filed", "Effective",
    ], [
      ["Acme Corp", "LA", "Layoff", 150, "123 Main St, LA, CA 90001", "01/15/2024", "03/01/2024"],
    ]);
    expect(() => parseCA(wb)).toThrow("CA: header row not found");
  });
});

// ─── NJ (XLSX via ExcelJS workbook, sheet-name-derived year) ─────────────────

describe("parseNJ", () => {
  it("parses multi-sheet workbook with year-based notice dates", async () => {
    const wb = new ExcelJS.Workbook();
    const ws2024 = wb.addWorksheet("2024 WARN Notices");
    ws2024.addRow(["Company", "City", "County", "Month Posted", "Workers Affected", "Effective Date", "Type"]);
    ws2024.addRow(["NJ Steel Corp", "Newark", "Essex", "January", 200, "03/01/2024", "Layoff"]);
    ws2024.addRow(["Atlantic Retail", "Trenton", "Mercer", "February", 75, "04/15/2024", "Closure"]);

    const records = parseNJ(wb) as WarnRecord[];
    expect(records).toHaveLength(2);
    expect(records[0].company).toBe("NJ Steel Corp");
    expect(records[0].employees).toBe(200);
    expect(records[0].city).toBe("Newark");
    expect(records[0].county).toBe("Essex");
    expect(records[0].noticeDate).toBe("2024-01-01");
    expect(records[0].state).toBe("NJ");
    expect(records[0].stateName).toBe("New Jersey");
  });

  it("throws when no valid records found (drift guard)", () => {
    const wb = new ExcelJS.Workbook();
    // Sheet name without a year pattern → skipped by parseNJ; no records produced
    const ws = wb.addWorksheet("WARN Notices");
    ws.addRow(["Company", "City", "County", "Month Posted", "Workers Affected", "Effective Date"]);
    ws.addRow(["NJ Corp", "Newark", "Essex", "January", 100, "03/01/2024"]);
    expect(() => parseNJ(wb)).toThrow("NJ: no valid records after processing all sheets");
  });
});

// ─── TX (XLSX via ExcelJS workbook) ───────────────────────────────────────────

describe("parseTX", () => {
  it("parses workbook with TX-style BLN headers", async () => {
    const wb = await makeWorkbook("TX Data", [
      "job_site_name", "city_name", "county_name", "total_layoff_number", "notice_date", "layoff_date", "layoff_reason_description",
    ], [
      ["Texas Steel Corp", "Houston", "Harris", 300, "01/15/2024", "03/01/2024", "Plant Closure"],
      ["Lone Star Retail", "Dallas", "Dallas", 150, "02/20/2024", "04/15/2024", "Permanent Layoff"],
      ["Gulf Coast Manufacturing", "Beaumont", "Jefferson", 200, "03/10/2024", "05/01/2024", "Layoff"],
    ]);

    const records = parseTX(wb) as WarnRecord[];
    expect(records).toHaveLength(3);
    expect(records[0].company).toBe("Texas Steel Corp");
    expect(records[0].employees).toBe(300);
    expect(records[0].city).toBe("Houston");
    expect(records[0].county).toBe("Harris");
    expect(records[0].noticeDate).toBe("2024-01-15");
    expect(records[0].effectiveDate).toBe("2024-03-01");
    expect(records[0].state).toBe("TX");
  });

  it("returns 0 records when job_site column is missing (drift guard)", async () => {
    const wb = await makeWorkbook("TX Data", [
      "employer_name", "city", "county", "total_layoff_number", "notice_date", "layoff_date",
    ], [
      ["Texas Corp", "Houston", "Harris", 100, "01/15/2024", "03/01/2024"],
    ]);
    const records = parseTX(wb) as WarnRecord[];
    expect(records).toHaveLength(0);
  });
});

// ─── NY (XLSX via ExcelJS workbook) ───────────────────────────────────────────

describe("parseNY", () => {
  it("parses workbook with NY-style BLN headers", async () => {
    const wb = await makeWorkbook("NY Data", [
      "company", "notice date", "number affected", "region", "plant closing/layoff/closure", "effective date",
    ], [
      ["NY Steel Corp", "01/15/2024", 250, "New York City", "Plant Closing", "03/01/2024"],
      ["Hudson Retail LLC", "02/20/2024", 100, "Long Island", "Layoff", "04/15/2024"],
      ["Empire Manufacturing", "03/10/2024", 175, "Western NY", "Closure", "05/01/2024"],
    ]);

    const records = parseNY(wb) as WarnRecord[];
    expect(records).toHaveLength(3);
    expect(records[0].company).toBe("NY Steel Corp");
    expect(records[0].employees).toBe(250);
    expect(records[0].county).toBe("New York City");
    expect(records[0].noticeDate).toBe("2024-01-15");
    expect(records[0].effectiveDate).toBe("2024-03-01");
    expect(records[0].state).toBe("NY");
    expect(records[0].stateName).toBe("New York");
  });

  it("returns 0 records when company and employees columns are missing (drift guard)", async () => {
    const wb = await makeWorkbook("NY Data", [
      "employer", "date", "workers", "district",
    ], [
      ["NY Corp", "01/15/2024", 100, "NYC"],
    ]);
    const records = parseNY(wb) as WarnRecord[];
    expect(records).toHaveLength(0);
  });
});

// ─── IA (XLSX via ExcelJS workbook, multi-sheet) ──────────────────────────────

describe("parseIA", () => {
  it("parses multi-sheet workbook with IA-style headers", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("FY2024");
    ws.addRow(["Company", "City", "County", "Emp #", "Notice Date", "Layoff Date", "Notice Type"]);
    ws.addRow(["Iowa Steel Corp", "Des Moines", "Polk", 200, "01/15/2024", "03/01/2024", "Permanent"]);
    ws.addRow(["Hawkeye Retail Inc", "Cedar Rapids", "Linn", 75, "02/20/2024", "04/15/2024", "Closure"]);
    ws.addRow(["Corn Belt Manufacturing", "Davenport", "Scott", 150, "03/10/2024", "05/01/2024", "Layoff"]);

    const records = parseIA(wb) as WarnRecord[];
    expect(records).toHaveLength(3);
    expect(records[0].company).toBe("Iowa Steel Corp");
    expect(records[0].employees).toBe(200);
    expect(records[0].city).toBe("Des Moines");
    expect(records[0].county).toBe("Polk");
    expect(records[0].noticeDate).toBe("2024-01-15");
    expect(records[0].effectiveDate).toBe("2024-03-01");
    expect(records[0].state).toBe("IA");
    expect(records[0].stateName).toBe("Iowa");
  });

  it("throws when no valid records found (drift guard)", () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("FY2024");
    ws.addRow(["Employer", "Location", "Workers", "Date Filed"]);
    ws.addRow(["Iowa Corp", "Des Moines", 100, "01/15/2024"]);
    expect(() => parseIA(wb)).toThrow("IA: no valid records after processing workbook");
  });
});
