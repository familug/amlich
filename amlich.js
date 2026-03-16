// Vietnamese Lunar Calendar — Functional Core
// Algorithm based on Ho Ngoc Duc's work
// https://www.informatik.uni-leipzig.de/~duc/amlich/

const PI = Math.PI;
const INT = Math.floor;

// ========== Constants ==========

const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
const CHI_ANIMAL = ["Chuột", "Trâu", "Hổ", "Mèo", "Rồng", "Rắn", "Ngựa", "Dê", "Khỉ", "Gà", "Chó", "Lợn"];
const THANG = ["Giêng", "Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "Tám", "Chín", "Mười", "Một", "Chạp"];
const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

// 24 solar terms indexed by 15-degree ecliptic longitude sectors.
// Index = floor(ecliptic_longitude_degrees / 15), starting from vernal equinox (0°).
const TIET_KHI = [
  "Xuân phân", "Thanh minh", "Cốc vũ", "Lập hạ", "Tiểu mãn", "Mang chủng",
  "Hạ chí", "Tiểu thử", "Đại thử", "Lập thu", "Xử thử", "Bạch lộ",
  "Thu phân", "Hàn lộ", "Sương giáng", "Lập đông", "Tiểu tuyết", "Đại tuyết",
  "Đông chí", "Tiểu hàn", "Đại hàn", "Lập xuân", "Vũ thủy", "Kinh trập"
];

// ========== Julian Day Number ==========

function jdFromDate(dd, mm, yy) {
  const a = INT((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4)
         - INT(y / 100) + INT(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
  }
  return jd;
}

function jdToDate(jd) {
  let b, c;
  if (jd > 2299160) {
    const a = jd + 32044;
    b = INT((4 * a + 3) / 146097);
    c = a - INT((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = INT((4 * c + 3) / 1461);
  const e = c - INT((1461 * d) / 4);
  const m = INT((5 * e + 2) / 153);
  return [
    e - INT((153 * m + 2) / 5) + 1,
    m + 3 - 12 * INT(m / 10),
    b * 100 + d - 4800 + INT(m / 10)
  ];
}

// ========== Astronomical Calculations ==========

function newMoon(k) {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltat = T < -11
    ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
    : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return Jd1 + C1 - deltat;
}

function sunLongitude(jdn) {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L = L - PI * 2 * INT(L / (PI * 2));
  return L;
}

// 12 sectors of 30° each. Used internally for lunar month determination.
function sunLongitudeSector(dayNumber, timeZone) {
  return INT(sunLongitude(dayNumber - 0.5 - timeZone / 24) / PI * 6);
}

// 24 sectors of 15° each. Maps to the 24 tiết khí (solar terms).
function solarTermIndex(dayNumber, timeZone) {
  return INT(sunLongitude(dayNumber - 0.5 - timeZone / 24) / PI * 12);
}

function newMoonDay(k, timeZone) {
  return INT(newMoon(k) + 0.5 + timeZone / 24);
}

function lunarMonth11(yy, timeZone) {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = INT(off / 29.530588853);
  const nm = newMoonDay(k, timeZone);
  if (sunLongitudeSector(nm, timeZone) >= 9) {
    return newMoonDay(k - 1, timeZone);
  }
  return nm;
}

function leapMonthOffset(a11, timeZone) {
  const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last = 0;
  let i = 1;
  let arc = sunLongitudeSector(newMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = sunLongitudeSector(newMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

// ========== Solar to Lunar Conversion ==========

function solarToLunar(dd, mm, yy, timeZone) {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = newMoonDay(k, timeZone);
  }
  let a11 = lunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear;
  if (a11 >= monthStart) {
    lunarYear = yy;
    a11 = lunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = lunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = INT((monthStart - a11) / 29);
  let lunarLeap = 0;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    const leapOff = leapMonthOffset(a11, timeZone);
    if (diff >= leapOff) {
      lunarMonth = diff + 10;
      if (diff === leapOff) {
        lunarLeap = 1;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }
  return [lunarDay, lunarMonth, lunarYear, lunarLeap];
}

// ========== Can Chi (Heavenly Stems & Earthly Branches) ==========

function canChiYear(year) {
  return CAN[(year + 6) % 10] + " " + CHI[(year + 8) % 12];
}

function animalYear(year) {
  return CHI_ANIMAL[(year + 8) % 12];
}

function canChiMonth(month, year) {
  const canYearIdx = (year + 6) % 10;
  const chiIdx = (month + 1) % 12;
  const canStart = (canYearIdx % 5) * 2 + 2;
  const canIdx = (canStart + month - 1) % 10;
  return CAN[canIdx] + " " + CHI[chiIdx];
}

function canChiDay(dd, mm, yy) {
  const jd = jdFromDate(dd, mm, yy);
  return CAN[(jd + 9) % 10] + " " + CHI[(jd + 1) % 12];
}

// ========== Helpers ==========

// JD%7 gives 0=Mon..6=Sun; shift to 0=Sun..6=Sat to match THU[] and grid columns
function dayOfWeek(dd, mm, yy) {
  return (jdFromDate(dd, mm, yy) + 1) % 7;
}

function solarTerm(dayNumber, timeZone) {
  return TIET_KHI[solarTermIndex(dayNumber, timeZone)];
}

function isLeapYear(yy) {
  return (yy % 4 === 0 && yy % 100 !== 0) || (yy % 400 === 0);
}

function daysInSolarMonth(mm, yy) {
  const days = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return (mm === 2 && isLeapYear(yy)) ? 29 : days[mm];
}

// ========== Formatting ==========

function lunarMonthName(lm, isLeap) {
  return (isLeap ? "Nhuận " : "") + "tháng " + THANG[lm - 1];
}

function lunarDateLabel(ld, lm, isLeap) {
  if (ld === 1) {
    return (isLeap ? "N " : "") + lm + "/" + ld;
  }
  return ld < 10 ? "0" + ld : "" + ld;
}

// Days from date1 to date2. Positive = date2 is after date1.
function daysBetween(dd1, mm1, yy1, dd2, mm2, yy2) {
  return jdFromDate(dd2, mm2, yy2) - jdFromDate(dd1, mm1, yy1);
}

function daysFromTodayLabel(diff) {
  if (diff === 0) return "Hôm nay";
  if (diff > 0) return diff + " ngày nữa";
  return -diff + " ngày trước";
}

// ========== Data Generation (Pure) ==========

function calendarMonthData(mm, yy, timeZone) {
  const firstDow = dayOfWeek(1, mm, yy);
  const totalDays = daysInSolarMonth(mm, yy);
  const cells = [];

  for (let i = 0; i < firstDow; i++) {
    cells.push({ empty: true });
  }

  for (let d = 1; d <= totalDays; d++) {
    const [ld, lm, ly, lleap] = solarToLunar(d, mm, yy, timeZone);
    const dow = dayOfWeek(d, mm, yy);
    cells.push({
      day: d,
      dow,
      lunarDay: ld,
      lunarMonth: lm,
      lunarYear: ly,
      lunarLeap: !!lleap,
      lunarLabel: lunarDateLabel(ld, lm, !!lleap),
      isFirstLunarDay: ld === 1,
      isSunday: dow === 0,
      isSaturday: dow === 6,
    });
  }

  return cells;
}

function dateDetailData(dd, mm, yy, timeZone) {
  const [ld, lm, ly, lleap] = solarToLunar(dd, mm, yy, timeZone);
  const dow = dayOfWeek(dd, mm, yy);
  const jd = jdFromDate(dd, mm, yy);
  return {
    solar: { day: dd, month: mm, year: yy },
    lunar: { day: ld, month: lm, year: ly, leap: !!lleap },
    dayOfWeek: dow,
    dayOfWeekName: THU[dow],
    canChiYear: canChiYear(ly),
    animalYear: animalYear(ly),
    canChiMonth: canChiMonth(lm, ly),
    canChiDay: canChiDay(dd, mm, yy),
    solarTerm: solarTerm(jd, timeZone),
    lunarMonthName: lunarMonthName(lm, !!lleap),
  };
}

export {
  jdFromDate, jdToDate,
  newMoon, sunLongitude, sunLongitudeSector, solarTermIndex, newMoonDay,
  lunarMonth11, leapMonthOffset,
  solarToLunar,
  canChiYear, animalYear, canChiMonth, canChiDay,
  dayOfWeek, solarTerm,
  isLeapYear, daysInSolarMonth,
  lunarMonthName, lunarDateLabel,
  daysBetween, daysFromTodayLabel,
  calendarMonthData, dateDetailData,
  CAN, CHI, CHI_ANIMAL, THANG, THU, TIET_KHI,
};
