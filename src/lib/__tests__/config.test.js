// FEATURES.calculator and FEATURES.doseFigures are off on iOS and on everywhere
// else. Platform.OS is read when the module is first loaded, so each case loads
// a fresh copy of config.js under a different platform.

function loadConfig(os) {
  let config;
  jest.isolateModules(() => {
    jest.doMock("react-native", () => ({ Platform: { OS: os } }));
    config = require("../config");
  });
  jest.dontMock("react-native");
  return config;
}

describe("feature switches", () => {
  test("are off on iOS", () => {
    const { FEATURES, COPY } = loadConfig("ios");
    expect(FEATURES.calculator).toBe(false);
    expect(FEATURES.doseFigures).toBe(false);
    // The wording follows the switch: no sentence on iOS mentions the calculator.
    expect(COPY.freeStays).toBe("The library stays free.");
    expect(COPY.freeTier).toBe("Library");
  });

  test.each(["android", "web"])("are on on %s", (os) => {
    const { FEATURES, COPY } = loadConfig(os);
    expect(FEATURES.calculator).toBe(true);
    expect(FEATURES.doseFigures).toBe(true);
    expect(COPY.freeStays).toBe("The library and the calculator stay free.");
    expect(COPY.freeTier).toBe("Library and calculator");
  });

  test("are plain booleans, safe to use in a condition or a spread", () => {
    const { FEATURES } = loadConfig("android");
    expect(typeof FEATURES.calculator).toBe("boolean");
    expect(typeof FEATURES.doseFigures).toBe("boolean");
  });
});
