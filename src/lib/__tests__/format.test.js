import { amountFromMcg, groupNum, parseNum, rangeText, trimNum } from "../format";

describe("parseNum", () => {
  test("reads plain decimals", () => {
    expect(parseNum("2.5")).toBe(2.5);
    expect(parseNum(" 10 ")).toBe(10);
  });

  test("reads the comma the decimal keypad gives in many regions", () => {
    // parseFloat("2,5") is 2, which would silently change the arithmetic.
    expect(parseNum("2,5")).toBe(2.5);
    expect(parseNum("0,25")).toBe(0.25);
  });

  test("rejects anything that is not a number", () => {
    expect(parseNum("")).toBeNaN();
    expect(parseNum(null)).toBeNaN();
    expect(parseNum("abc")).toBeNaN();
    expect(parseNum("1.2.3")).toBeNaN();
  });
});

describe("number display", () => {
  test("trimNum drops trailing zeros", () => {
    expect(trimNum(2, 2)).toBe("2");
    expect(trimNum(2.5, 2)).toBe("2.5");
    expect(trimNum(0.1, 3)).toBe("0.1");
    expect(trimNum(10, 1)).toBe("10");
    expect(trimNum(NaN)).toBe("");
  });

  test("trimNum keeps the zeros that are part of a whole number", () => {
    expect(trimNum(100, 0)).toBe("100");
    expect(trimNum(10, 0)).toBe("10");
    expect(trimNum(100, 1)).toBe("100");
    expect(trimNum(0, 2)).toBe("0");
  });

  test("groupNum adds thousands separators", () => {
    expect(groupNum(2500)).toBe("2,500");
    expect(groupNum(3333.33)).toBe("3,333.3");
    expect(groupNum(1250000)).toBe("1,250,000");
    expect(groupNum(999)).toBe("999");
  });

  test("amountFromMcg converts to the chosen unit", () => {
    expect(amountFromMcg(250, "mcg")).toBe("250");
    expect(amountFromMcg(233.333, "mcg")).toBe("233.3");
    expect(amountFromMcg(2500, "mg")).toBe("2.5");
    expect(amountFromMcg(1000, "IU", 3)).toBe("3");
    expect(amountFromMcg(null)).toBe("");
  });

  test("rangeText uses words, not a dash", () => {
    expect(rangeText(250, 500, "mcg")).toBe("250 to 500 mcg");
    expect(rangeText(1.4, 1.4, "mg")).toBe("1.4 mg");
    expect(rangeText(null, 2, "mg")).toBe("2 mg");
    expect(rangeText(null, null, "mg")).toBe("");
  });
});
