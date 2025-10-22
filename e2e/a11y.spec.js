"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create(
        (typeof Iterator === "function" ? Iterator : Object).prototype,
      );
    return (
      (g.next = verb(0)),
      (g["throw"] = verb(1)),
      (g["return"] = verb(2)),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y["return"]
                  : op[0]
                    ? y["throw"] || ((t = y["return"]) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, "__esModule", { value: true });
var test_1 = require("@playwright/test");
var playwright_1 = require("@axe-core/playwright");
function runAxe(page, contextName) {
  return __awaiter(this, void 0, void 0, function () {
    var axe, results, seriousOrWorse;
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          axe = new playwright_1.default({ page: page })
            .withTags(["wcag2a", "wcag2aa"])
            .disableRules([
              // Customize rules if needed; example: color-contrast checks may be flaky under headless rendering
              // "color-contrast"
            ]);
          return [4 /*yield*/, axe.analyze()];
        case 1:
          results = _a.sent();
          seriousOrWorse = results.violations.filter(function (v) {
            return v.impact === "critical" || v.impact === "serious";
          });
          if (seriousOrWorse.length) {
            console.error(
              "[a11y ".concat(contextName, "] serious/critical:"),
              seriousOrWorse.map(function (v) {
                return v.id;
              }),
            );
          }
          // Threshold: allow 0 serious/critical
          (0, test_1.expect)(
            seriousOrWorse.length,
            "[a11y ".concat(contextName, "]"),
          ).toBe(0);
          return [2 /*return*/];
      }
    });
  });
}
test_1.test.describe("Accessibility", function () {
  (0, test_1.test)(
    "main screen and interactions meet a11y thresholds",
    function (_a) {
      return __awaiter(void 0, [_a], void 0, function (_b) {
        var page = _b.page;
        return __generator(this, function (_c) {
          switch (_c.label) {
            case 0:
              return [4 /*yield*/, page.goto("/")];
            case 1:
              _c.sent();
              // Core panels
              return [
                4 /*yield*/,
                (0, test_1.expect)(
                  page.getByRole("heading", { name: "Providers" }),
                ).toBeVisible(),
              ];
            case 2:
              // Core panels
              _c.sent();
              return [
                4 /*yield*/,
                (0, test_1.expect)(
                  page.getByRole("heading", { name: "Projects" }),
                ).toBeVisible(),
              ];
            case 3:
              _c.sent();
              return [
                4 /*yield*/,
                (0, test_1.expect)(
                  page.getByRole("heading", { name: "Files" }),
                ).toBeVisible(),
              ];
            case 4:
              _c.sent();
              return [
                4 /*yield*/,
                (0, test_1.expect)(
                  page.getByRole("heading", { name: "Editor (Monaco)" }),
                ).toBeVisible(),
              ];
            case 5:
              _c.sent();
              return [4 /*yield*/, runAxe(page, "home")];
            case 6:
              _c.sent();
              // Open command palette
              return [
                4 /*yield*/,
                page.keyboard.press(
                  process.platform === "darwin" ? "Meta+K" : "Control+K",
                ),
              ];
            case 7:
              // Open command palette
              _c.sent();
              return [
                4 /*yield*/,
                (0, test_1.expect)(page.getByRole("dialog")).toBeVisible(),
              ];
            case 8:
              _c.sent();
              return [4 /*yield*/, runAxe(page, "command-palette")];
            case 9:
              _c.sent();
              return [4 /*yield*/, page.keyboard.press("Escape")];
            case 10:
              _c.sent();
              // Snapshots panel interaction
              return [
                4 /*yield*/,
                (0, test_1.expect)(
                  page.getByRole("heading", { name: "Snapshots" }),
                ).toBeVisible(),
              ];
            case 11:
              // Snapshots panel interaction
              _c.sent();
              return [4 /*yield*/, runAxe(page, "snapshots")];
            case 12:
              _c.sent();
              // Git/Deploy section
              return [
                4 /*yield*/,
                (0, test_1.expect)(
                  page.getByRole("heading", { name: "Git" }),
                ).toBeVisible(),
              ];
            case 13:
              // Git/Deploy section
              _c.sent();
              return [
                4 /*yield*/,
                (0, test_1.expect)(
                  page.getByRole("heading", { name: "Deploy" }),
                ).toBeVisible(),
              ];
            case 14:
              _c.sent();
              return [4 /*yield*/, runAxe(page, "integrations")];
            case 15:
              _c.sent();
              return [2 /*return*/];
          }
        });
      });
    },
  );
});
