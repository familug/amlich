import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import {
  jdFromDate, jdToDate,
  sunLongitude, sunLongitudeSector, solarTermIndex, newMoonDay,
  lunarMonth11, leapMonthOffset,
  solarToLunar,
  canChiYear, animalYear, canChiMonth, canChiDay,
  dayOfWeek, solarTerm,
  isLeapYear, daysInSolarMonth,
  lunarMonthName, lunarDateLabel,
  daysBetween, daysFromTodayLabel,
  calendarMonthData, dateDetailData,
  CAN, CHI, THU, TIET_KHI,
} from "./amlich.js";

const TZ = 7;

// ========== Julian Day Number ==========

describe("jdFromDate", () => {
  it("returns correct JD for J2000 epoch (2000-01-01)", () => {
    assert.equal(jdFromDate(1, 1, 2000), 2451545);
  });

  it("returns correct JD for Unix epoch (1970-01-01)", () => {
    assert.equal(jdFromDate(1, 1, 1970), 2440588);
  });

  it("returns correct JD for Gregorian reform date (1582-10-15)", () => {
    assert.equal(jdFromDate(15, 10, 1582), 2299161);
  });

  it("handles dates before Gregorian reform", () => {
    const jd = jdFromDate(1, 1, 1500);
    assert.equal(typeof jd, "number");
    assert.ok(jd < 2299161);
  });
});

describe("jdToDate", () => {
  it("returns correct date for J2000 JD", () => {
    assert.deepEqual(jdToDate(2451545), [1, 1, 2000]);
  });

  it("returns correct date for Unix epoch JD", () => {
    assert.deepEqual(jdToDate(2440588), [1, 1, 1970]);
  });
});

describe("jdFromDate / jdToDate roundtrip", () => {
  const dates = [
    [1, 1, 2000], [15, 6, 2024], [29, 2, 2024], [31, 12, 1999],
    [1, 3, 1900], [28, 2, 1900], [10, 2, 2024], [17, 2, 2026],
  ];
  for (const [d, m, y] of dates) {
    it(`roundtrips ${d}/${m}/${y}`, () => {
      assert.deepEqual(jdToDate(jdFromDate(d, m, y)), [d, m, y]);
    });
  }
});

// ========== Solar to Lunar Conversion ==========

describe("solarToLunar — Tết (Lunar New Year) dates", () => {
  // [solar_day, solar_month, solar_year, lunar_day, lunar_month, lunar_year, leap, canChiYear]
  const tetDates = [
    [25, 1, 2020, 1, 1, 2020, 0, "Canh Tý"],
    [12, 2, 2021, 1, 1, 2021, 0, "Tân Sửu"],
    [1,  2, 2022, 1, 1, 2022, 0, "Nhâm Dần"],
    [22, 1, 2023, 1, 1, 2023, 0, "Quý Mão"],
    [10, 2, 2024, 1, 1, 2024, 0, "Giáp Thìn"],
    [29, 1, 2025, 1, 1, 2025, 0, "Ất Tỵ"],
    [17, 2, 2026, 1, 1, 2026, 0, "Bính Ngọ"],
  ];

  for (const [sd, sm, sy, ld, lm, ly, leap, ccYear] of tetDates) {
    it(`${sd}/${sm}/${sy} → Tết ${ccYear}`, () => {
      const result = solarToLunar(sd, sm, sy, TZ);
      assert.deepEqual(result, [ld, lm, ly, leap]);
      assert.equal(canChiYear(ly), ccYear);
    });
  }
});

describe("solarToLunar — Mid-Autumn Festival", () => {
  it("Sep 17, 2024 = 15/8 lunar (Trung thu)", () => {
    assert.deepEqual(solarToLunar(17, 9, 2024, TZ), [15, 8, 2024, 0]);
  });
});

describe("solarToLunar — year boundary", () => {
  it("Dec 31, 2024 = 1/12 Giáp Thìn", () => {
    const [ld, lm, ly, leap] = solarToLunar(31, 12, 2024, TZ);
    assert.equal(ld, 1);
    assert.equal(lm, 12);
    assert.equal(ly, 2024);
    assert.equal(leap, 0);
  });

  it("Jan 1, 2025 = 2/12 Giáp Thìn (still lunar year 2024)", () => {
    const [ld, lm, ly, leap] = solarToLunar(1, 1, 2025, TZ);
    assert.equal(ld, 2);
    assert.equal(lm, 12);
    assert.equal(ly, 2024);
    assert.equal(leap, 0);
  });
});

describe("solarToLunar — leap month detection", () => {
  it("2020 has leap month 4: May 22 = 30/4 (regular), May 23 = 1/4 (leap)", () => {
    const regular = solarToLunar(22, 5, 2020, TZ);
    assert.deepEqual(regular, [30, 4, 2020, 0]);

    const leapStart = solarToLunar(23, 5, 2020, TZ);
    assert.deepEqual(leapStart, [1, 4, 2020, 1]);
  });

  it("2020 leap month 4 ends, month 5 starts Jun 21", () => {
    assert.deepEqual(solarToLunar(20, 6, 2020, TZ), [29, 4, 2020, 1]);
    assert.deepEqual(solarToLunar(21, 6, 2020, TZ), [1, 5, 2020, 0]);
  });

  it("2025 has leap month 6: Jul 25 = 1/6 (leap)", () => {
    const result = solarToLunar(25, 7, 2025, TZ);
    assert.deepEqual(result, [1, 6, 2025, 1]);
  });

  it("2025 leap month 6 ends Aug 22 = 29/6 (leap)", () => {
    const result = solarToLunar(22, 8, 2025, TZ);
    assert.deepEqual(result, [29, 6, 2025, 1]);
  });
});

describe("solarToLunar — lunar day range", () => {
  it("lunar day is always 1-30", () => {
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= daysInSolarMonth(m, 2024); d++) {
        const [ld] = solarToLunar(d, m, 2024, TZ);
        assert.ok(ld >= 1 && ld <= 30, `${d}/${m}/2024: lunar day ${ld} out of range`);
      }
    }
  });

  it("lunar month is always 1-12", () => {
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= daysInSolarMonth(m, 2024); d++) {
        const [, lm] = solarToLunar(d, m, 2024, TZ);
        assert.ok(lm >= 1 && lm <= 12, `${d}/${m}/2024: lunar month ${lm} out of range`);
      }
    }
  });
});

describe("solarToLunar — consecutive days increment lunar day", () => {
  it("lunar days increase by 1 or reset to 1 across a month", () => {
    let prev = solarToLunar(1, 1, 2024, TZ);
    for (let jd = jdFromDate(2, 1, 2024); jd <= jdFromDate(31, 12, 2024); jd++) {
      const [d, m, y] = jdToDate(jd);
      const curr = solarToLunar(d, m, y, TZ);
      const diff = curr[0] - prev[0];
      assert.ok(
        diff === 1 || curr[0] === 1,
        `${d}/${m}/${y}: lunar day jumped from ${prev[0]} to ${curr[0]}`
      );
      prev = curr;
    }
  });
});

// ========== Can Chi ==========

describe("canChiYear", () => {
  const cases = [
    [2024, "Giáp Thìn"],
    [2025, "Ất Tỵ"],
    [2023, "Quý Mão"],
    [2020, "Canh Tý"],
    [2000, "Canh Thìn"],
    [1975, "Ất Mão"],
    [1986, "Bính Dần"],
  ];
  for (const [year, expected] of cases) {
    it(`${year} = ${expected}`, () => {
      assert.equal(canChiYear(year), expected);
    });
  }

  it("cycles every 60 years", () => {
    assert.equal(canChiYear(2024), canChiYear(2024 - 60));
    assert.equal(canChiYear(2024), canChiYear(2024 + 60));
  });
});

describe("animalYear", () => {
  const cases = [
    [2024, "Rồng"],
    [2025, "Rắn"],
    [2023, "Mèo"],
    [2020, "Chuột"],
    [2021, "Trâu"],
    [2022, "Hổ"],
  ];
  for (const [year, expected] of cases) {
    it(`${year} = ${expected}`, () => {
      assert.equal(animalYear(year), expected);
    });
  }

  it("cycles every 12 years", () => {
    assert.equal(animalYear(2024), animalYear(2024 - 12));
    assert.equal(animalYear(2024), animalYear(2024 + 12));
  });
});

describe("canChiMonth", () => {
  it("month 1 of Giáp year (2024) = Bính Dần", () => {
    assert.equal(canChiMonth(1, 2024), "Bính Dần");
  });

  it("month 2 of Giáp year (2024) = Đinh Mão", () => {
    assert.equal(canChiMonth(2, 2024), "Đinh Mão");
  });

  it("month Chi always follows Dần→Sửu cycle for months 1-12", () => {
    const expectedChi = ["Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu"];
    for (let m = 1; m <= 12; m++) {
      const cc = canChiMonth(m, 2024);
      assert.ok(cc.endsWith(expectedChi[m - 1]), `month ${m}: got "${cc}", expected Chi "${expectedChi[m - 1]}"`);
    }
  });
});

describe("canChiDay", () => {
  it("Tết 2024 (Feb 10) = Giáp Thìn", () => {
    assert.equal(canChiDay(10, 2, 2024), "Giáp Thìn");
  });

  it("Tết 2025 (Jan 29) = Mậu Tuất", () => {
    assert.equal(canChiDay(29, 1, 2025), "Mậu Tuất");
  });

  it("cycles every 60 days", () => {
    const jd1 = jdFromDate(10, 2, 2024);
    const [d2, m2, y2] = jdToDate(jd1 + 60);
    assert.equal(canChiDay(10, 2, 2024), canChiDay(d2, m2, y2));
  });

  it("consecutive days have consecutive Can Chi", () => {
    for (let d = 1; d <= 28; d++) {
      const cc1 = canChiDay(d, 1, 2024);
      const cc2 = canChiDay(d + 1, 1, 2024);
      assert.notEqual(cc1, cc2);
    }
  });
});

// ========== Day of Week ==========

describe("dayOfWeek", () => {
  const cases = [
    [1, 1, 2000, 6, "Thứ Bảy"],      // Saturday
    [10, 2, 2024, 6, "Thứ Bảy"],     // Saturday
    [11, 2, 2024, 0, "Chủ nhật"],     // Sunday
    [12, 2, 2024, 1, "Thứ Hai"],      // Monday
    [29, 1, 2025, 3, "Thứ Tư"],       // Wednesday
    [17, 2, 2026, 2, "Thứ Ba"],       // Tuesday
  ];
  for (const [d, m, y, dow, name] of cases) {
    it(`${d}/${m}/${y} = ${name} (${dow})`, () => {
      assert.equal(dayOfWeek(d, m, y), dow);
      assert.equal(THU[dayOfWeek(d, m, y)], name);
    });
  }

  it("returns values 0-6", () => {
    for (let d = 1; d <= 7; d++) {
      const dow = dayOfWeek(d, 1, 2024);
      assert.ok(dow >= 0 && dow <= 6);
    }
  });

  it("week cycles every 7 days", () => {
    const dow1 = dayOfWeek(1, 1, 2024);
    const [d2, m2, y2] = jdToDate(jdFromDate(1, 1, 2024) + 7);
    assert.equal(dayOfWeek(d2, m2, y2), dow1);
  });
});

// ========== Solar Terms ==========

describe("solarTermIndex", () => {
  it("Jun 22, 2024 = Hạ chí (index 6, summer solstice)", () => {
    assert.equal(solarTermIndex(jdFromDate(22, 6, 2024), TZ), 6);
  });

  it("Dec 22, 2024 = Đông chí (index 18, winter solstice)", () => {
    assert.equal(solarTermIndex(jdFromDate(22, 12, 2024), TZ), 18);
  });

  it("returns values 0-23", () => {
    for (let m = 1; m <= 12; m++) {
      const idx = solarTermIndex(jdFromDate(15, m, 2024), TZ);
      assert.ok(idx >= 0 && idx <= 23, `month ${m}: solar term index ${idx}`);
    }
  });
});

describe("solarTerm", () => {
  it("winter solstice returns Đông chí", () => {
    assert.equal(solarTerm(jdFromDate(22, 12, 2024), TZ), "Đông chí");
  });

  it("summer solstice returns Hạ chí", () => {
    assert.equal(solarTerm(jdFromDate(22, 6, 2024), TZ), "Hạ chí");
  });

  it("always returns a valid tiết khí name", () => {
    for (let m = 1; m <= 12; m++) {
      const name = solarTerm(jdFromDate(15, m, 2024), TZ);
      assert.ok(TIET_KHI.includes(name), `month ${m}: "${name}" not in TIET_KHI`);
    }
  });
});

// ========== Leap Year & Days in Month ==========

describe("isLeapYear", () => {
  it("2024 is a leap year", () => assert.equal(isLeapYear(2024), true));
  it("2023 is not a leap year", () => assert.equal(isLeapYear(2023), false));
  it("2000 is a leap year (div by 400)", () => assert.equal(isLeapYear(2000), true));
  it("1900 is not a leap year (div by 100 but not 400)", () => assert.equal(isLeapYear(1900), false));
  it("2100 is not a leap year", () => assert.equal(isLeapYear(2100), false));
});

describe("daysInSolarMonth", () => {
  it("February leap year = 29", () => assert.equal(daysInSolarMonth(2, 2024), 29));
  it("February non-leap = 28", () => assert.equal(daysInSolarMonth(2, 2023), 28));
  it("January = 31", () => assert.equal(daysInSolarMonth(1, 2024), 31));
  it("April = 30", () => assert.equal(daysInSolarMonth(4, 2024), 30));
  it("June = 30", () => assert.equal(daysInSolarMonth(6, 2024), 30));
  it("July = 31", () => assert.equal(daysInSolarMonth(7, 2024), 31));
  it("December = 31", () => assert.equal(daysInSolarMonth(12, 2024), 31));
});

// ========== Formatting ==========

describe("lunarMonthName", () => {
  it("month 1 = tháng Giêng", () => assert.equal(lunarMonthName(1, false), "tháng Giêng"));
  it("month 12 = tháng Chạp", () => assert.equal(lunarMonthName(12, false), "tháng Chạp"));
  it("leap month 6 = Nhuận tháng Sáu", () => assert.equal(lunarMonthName(6, true), "Nhuận tháng Sáu"));
  it("non-leap has no Nhuận prefix", () => {
    assert.ok(!lunarMonthName(6, false).startsWith("Nhuận"));
  });
});

describe("lunarDateLabel", () => {
  it("day 1 shows month/day format", () => assert.equal(lunarDateLabel(1, 5, false), "5/1"));
  it("day 1 of leap month shows N prefix", () => assert.equal(lunarDateLabel(1, 6, true), "N 6/1"));
  it("day 5 shows zero-padded", () => assert.equal(lunarDateLabel(5, 3, false), "05"));
  it("day 15 shows as-is", () => assert.equal(lunarDateLabel(15, 8, false), "15"));
  it("day 30 shows as-is", () => assert.equal(lunarDateLabel(30, 1, false), "30"));
});

// ========== daysBetween & daysFromTodayLabel ==========

describe("daysBetween", () => {
  it("same date returns 0", () => {
    assert.equal(daysBetween(16, 3, 2025, 16, 3, 2025), 0);
  });

  it("next day returns 1", () => {
    assert.equal(daysBetween(16, 3, 2025, 17, 3, 2025), 1);
  });

  it("previous day returns -1", () => {
    assert.equal(daysBetween(16, 3, 2025, 15, 3, 2025), -1);
  });

  it("one week ahead returns 7", () => {
    assert.equal(daysBetween(16, 3, 2025, 23, 3, 2025), 7);
  });

  it("one week ago returns -7", () => {
    assert.equal(daysBetween(16, 3, 2025, 9, 3, 2025), -7);
  });

  it("crosses month boundary", () => {
    assert.equal(daysBetween(31, 1, 2025, 1, 2, 2025), 1);
  });

  it("crosses year boundary", () => {
    assert.equal(daysBetween(31, 12, 2024, 1, 1, 2025), 1);
  });
});

describe("daysFromTodayLabel", () => {
  it("0 returns Hôm nay", () => assert.equal(daysFromTodayLabel(0), "Hôm nay"));
  it("1 returns 1 ngày nữa", () => assert.equal(daysFromTodayLabel(1), "1 ngày nữa"));
  it("-1 returns 1 ngày trước", () => assert.equal(daysFromTodayLabel(-1), "1 ngày trước"));
  it("7 returns 7 ngày nữa", () => assert.equal(daysFromTodayLabel(7), "7 ngày nữa"));
  it("-30 returns 30 ngày trước", () => assert.equal(daysFromTodayLabel(-30), "30 ngày trước"));
});

// ========== calendarMonthData ==========

describe("calendarMonthData", () => {
  it("returns correct number of cells (padding + days)", () => {
    const cells = calendarMonthData(2, 2024, TZ);
    const firstDow = dayOfWeek(1, 2, 2024);
    assert.equal(cells.length, firstDow + 29); // Feb 2024 = 29 days
  });

  it("leading cells are empty", () => {
    const cells = calendarMonthData(2, 2024, TZ);
    const firstDow = dayOfWeek(1, 2, 2024);
    for (let i = 0; i < firstDow; i++) {
      assert.equal(cells[i].empty, true);
    }
  });

  it("non-empty cells have required fields", () => {
    const cells = calendarMonthData(2, 2024, TZ);
    const dateCells = cells.filter(c => !c.empty);
    for (const cell of dateCells) {
      assert.ok("day" in cell);
      assert.ok("dow" in cell);
      assert.ok("lunarDay" in cell);
      assert.ok("lunarMonth" in cell);
      assert.ok("lunarYear" in cell);
      assert.ok("lunarLabel" in cell);
      assert.ok("isFirstLunarDay" in cell);
      assert.ok("isSunday" in cell);
      assert.ok("isSaturday" in cell);
    }
  });

  it("days are sequential 1..N", () => {
    const cells = calendarMonthData(3, 2024, TZ);
    const days = cells.filter(c => !c.empty).map(c => c.day);
    assert.equal(days.length, 31);
    assert.equal(days[0], 1);
    assert.equal(days[30], 31);
  });

  it("Sundays have isSunday=true and dow=0", () => {
    const cells = calendarMonthData(2, 2024, TZ);
    const sundays = cells.filter(c => !c.empty && c.isSunday);
    for (const s of sundays) {
      assert.equal(s.dow, 0);
    }
  });

  it("first lunar day cells have isFirstLunarDay=true", () => {
    const cells = calendarMonthData(2, 2024, TZ);
    const firsts = cells.filter(c => !c.empty && c.isFirstLunarDay);
    assert.ok(firsts.length >= 1);
    for (const f of firsts) {
      assert.equal(f.lunarDay, 1);
    }
  });

  it("leap month cells have lunarLeap=true", () => {
    const cells = calendarMonthData(8, 2025, TZ);
    const leapCells = cells.filter(c => !c.empty && c.lunarLeap);
    assert.ok(leapCells.length > 0, "August 2025 should have leap month cells");
  });
});

// ========== dateDetailData ==========

describe("dateDetailData", () => {
  it("returns complete detail for Tết 2024", () => {
    const d = dateDetailData(10, 2, 2024, TZ);
    assert.deepEqual(d.solar, { day: 10, month: 2, year: 2024 });
    assert.deepEqual(d.lunar, { day: 1, month: 1, year: 2024, leap: false });
    assert.equal(d.dayOfWeek, 6);
    assert.equal(d.dayOfWeekName, "Thứ Bảy");
    assert.equal(d.canChiYear, "Giáp Thìn");
    assert.equal(d.animalYear, "Rồng");
    assert.equal(d.canChiMonth, "Bính Dần");
    assert.equal(d.canChiDay, "Giáp Thìn");
    assert.equal(d.lunarMonthName, "tháng Giêng");
    assert.ok(TIET_KHI.includes(d.solarTerm));
  });

  it("returns leap=true for leap month dates", () => {
    const d = dateDetailData(25, 7, 2025, TZ);
    assert.equal(d.lunar.leap, true);
    assert.equal(d.lunar.month, 6);
    assert.ok(d.lunarMonthName.startsWith("Nhuận"));
  });

  it("solarTerm is always a valid string", () => {
    for (let m = 1; m <= 12; m++) {
      const d = dateDetailData(15, m, 2024, TZ);
      assert.ok(typeof d.solarTerm === "string");
      assert.ok(d.solarTerm.length > 0);
    }
  });
});

// ========== Broader consistency checks ==========

describe("full year 2024 consistency", () => {
  it("every day converts to a valid lunar date", () => {
    for (let m = 1; m <= 12; m++) {
      const dim = daysInSolarMonth(m, 2024);
      for (let d = 1; d <= dim; d++) {
        const [ld, lm, ly, leap] = solarToLunar(d, m, 2024, TZ);
        assert.ok(ld >= 1 && ld <= 30, `${d}/${m}/2024 → ld=${ld}`);
        assert.ok(lm >= 1 && lm <= 12, `${d}/${m}/2024 → lm=${lm}`);
        assert.ok(ly >= 2023 && ly <= 2024, `${d}/${m}/2024 → ly=${ly}`);
        assert.ok(leap === 0 || leap === 1, `${d}/${m}/2024 → leap=${leap}`);
      }
    }
  });
});

describe("full year 2025 consistency (has leap month)", () => {
  it("every day converts to a valid lunar date", () => {
    let leapDays = 0;
    for (let m = 1; m <= 12; m++) {
      const dim = daysInSolarMonth(m, 2025);
      for (let d = 1; d <= dim; d++) {
        const [ld, lm, ly, leap] = solarToLunar(d, m, 2025, TZ);
        assert.ok(ld >= 1 && ld <= 30);
        assert.ok(lm >= 1 && lm <= 12);
        if (leap) leapDays++;
      }
    }
    assert.ok(leapDays > 0, "2025 should have leap month days");
    assert.ok(leapDays >= 29 && leapDays <= 30, `leap month should be 29-30 days, got ${leapDays}`);
  });
});
