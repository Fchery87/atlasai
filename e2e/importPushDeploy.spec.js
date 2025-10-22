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
(0, test_1.test)("import → push → deploy flow (mocked APIs)", function (_a) {
  return __awaiter(void 0, [_a], void 0, function (_b) {
    var page = _b.page;
    return __generator(this, function (_c) {
      switch (_c.label) {
        case 0:
          return [4 /*yield*/, page.goto("/")];
        case 1:
          _c.sent();
          // Open Integrations section panels are visible
          return [
            4 /*yield*/,
            (0, test_1.expect)(page.getByText("Git")).toBeVisible(),
          ];
        case 2:
          // Open Integrations section panels are visible
          _c.sent();
          return [
            4 /*yield*/,
            (0, test_1.expect)(page.getByText("Deploy")).toBeVisible(),
          ];
        case 3:
          _c.sent();
          // Mock GitHub zipball fetch for import
          return [
            4 /*yield*/,
            page.route(
              "https://api.github.com/repos/*/zipball/*",
              function (route) {
                var zipContent = new Uint8Array([]); // empty zip acceptable for test
                route.fulfill({
                  status: 200,
                  body: zipContent,
                  headers: { "content-type": "application/zip" },
                });
              },
            ),
          ];
        case 4:
          // Mock GitHub zipball fetch for import
          _c.sent();
          // Fill repo URL and import
          return [
            4 /*yield*/,
            page
              .getByLabel("Git repository URL")
              .fill("https://github.com/owner/repo.git"),
          ];
        case 5:
          // Fill repo URL and import
          _c.sent();
          return [
            4 /*yield*/,
            page.getByRole("button", { name: "Import" }).click(),
          ];
        case 6:
          _c.sent();
          // Mock GitHub contents API for push PUT/DELETE
          return [
            4 /*yield*/,
            page.route(
              "https://api.github.com/repos/*/contents/**",
              function (route) {
                if (
                  route.request().method() === "PUT" ||
                  route.request().method() === "DELETE"
                ) {
                  route.fulfill({ status: 200, body: JSON.stringify({}) });
                  return;
                }
                route.continue();
              },
            ),
          ];
        case 7:
          // Mock GitHub contents API for push PUT/DELETE
          _c.sent();
          // Mock GitHub trees API
          return [
            4 /*yield*/,
            page.route(
              "https://api.github.com/repos/*/git/trees/*",
              function (route) {
                route.fulfill({
                  status: 200,
                  body: JSON.stringify({ tree: [] }),
                });
              },
            ),
          ];
        case 8:
          // Mock GitHub trees API
          _c.sent();
          // Push
          return [4 /*yield*/, page.getByLabel("Branch").fill("main")];
        case 9:
          // Push
          _c.sent();
          return [
            4 /*yield*/,
            page.getByRole("button", { name: "Push changes" }).click(),
          ];
        case 10:
          _c.sent();
          // Mock Netlify create deploy and uploads
          return [
            4 /*yield*/,
            page.route(
              "https://api.netlify.com/api/v1/sites/*/deploys",
              function (route) {
                var body = {
                  id: "dep1",
                  required: ["/index.html", "/app.js"],
                  deploy_uploads_url:
                    "https://api.netlify.com/deploys/dep1/files",
                };
                route.fulfill({
                  status: 200,
                  body: JSON.stringify(body),
                  headers: { "content-type": "application/json" },
                });
              },
            ),
          ];
        case 11:
          // Mock Netlify create deploy and uploads
          _c.sent();
          return [
            4 /*yield*/,
            page.route(
              "https://api.netlify.com/deploys/dep1/files/**",
              function (route) {
                route.fulfill({ status: 200, body: "" });
              },
            ),
          ];
        case 12:
          _c.sent();
          // Mock Netlify status polling
          return [
            4 /*yield*/,
            page.route(
              "https://api.netlify.com/api/v1/deploys/dep1",
              function (route) {
                route.fulfill({
                  status: 200,
                  body: JSON.stringify({ state: "ready" }),
                  headers: { "content-type": "application/json" },
                });
              },
            ),
          ];
        case 13:
          // Mock Netlify status polling
          _c.sent();
          // Fill Netlify creds and deploy
          return [4 /*yield*/, page.getByLabel("Netlify token").fill("tok")];
        case 14:
          // Fill Netlify creds and deploy
          _c.sent();
          return [4 /*yield*/, page.getByLabel("Netlify site id").fill("site")];
        case 15:
          _c.sent();
          return [
            4 /*yield*/,
            page.getByRole("button", { name: "Deploy to Netlify" }).click(),
          ];
        case 16:
          _c.sent();
          // Expect some status log text
          return [
            4 /*yield*/,
            (0, test_1.expect)(
              page.getByText("Netlify deploy ready"),
            ).toBeVisible(),
          ];
        case 17:
          // Expect some status log text
          _c.sent();
          return [2 /*return*/];
      }
    });
  });
});
