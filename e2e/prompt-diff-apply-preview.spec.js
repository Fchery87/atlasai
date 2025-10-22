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
(0, test_1.test)(
  "Prompt → Diff → Apply → Preview end-to-end (mocked adapter streams)",
  function (_a) {
    return __awaiter(void 0, [_a], void 0, function (_b) {
      var newInput, frame;
      var page = _b.page;
      return __generator(this, function (_c) {
        switch (_c.label) {
          case 0:
            return [4 /*yield*/, page.goto("/")];
          case 1:
            _c.sent();
            // Create project
            return [
              4 /*yield*/,
              page.getByLabel("Project name").fill("e2e-project"),
            ];
          case 2:
            // Create project
            _c.sent();
            // Use first() to get the first Create button in the Projects section
            return [
              4 /*yield*/,
              page.getByRole("button", { name: "Create" }).first().click(),
            ];
          case 3:
            // Use first() to get the first Create button in the Projects section
            _c.sent();
            // Create index.html
            return [
              4 /*yield*/,
              page.getByRole("button", { name: "Create file" }).click(),
            ];
          case 4:
            // Create index.html
            _c.sent();
            newInput = page.getByLabel("New file path");
            return [4 /*yield*/, newInput.fill("index.html")];
          case 5:
            _c.sent();
            return [4 /*yield*/, newInput.press("Enter")];
          case 6:
            _c.sent();
            // Open index.html and add minimal content
            return [
              4 /*yield*/,
              page.getByRole("button", { name: "Open index.html" }).click(),
            ];
          case 7:
            // Open index.html and add minimal content
            _c.sent();
            return [
              4 /*yield*/,
              page.keyboard.type(
                "<!doctype html><html><body><div id='root'>Hello</div></body></html>",
              ),
            ];
          case 8:
            _c.sent();
            // Save - use the Save button in the Editor panel with the specific title
            return [4 /*yield*/, page.getByTitle("Save (Ctrl/Cmd+S)").click()];
          case 9:
            // Save - use the Save button in the Editor panel with the specific title
            _c.sent();
            // Open Chat, select provider (GPT‑5 placeholder to avoid API calls)
            // Use exact match to get the select elements in the Chat panel
            return [
              4 /*yield*/,
              page.getByLabel("Provider", { exact: true }).selectOption("gpt5"),
            ];
          case 10:
            // Open Chat, select provider (GPT‑5 placeholder to avoid API calls)
            // Use exact match to get the select elements in the Chat panel
            _c.sent();
            return [
              4 /*yield*/,
              page
                .getByLabel("Model", { exact: true })
                .selectOption("gpt-5-code-preview"),
            ];
          case 11:
            _c.sent();
            // Fill prompt - this will trigger the GPT-5 placeholder to stream the expected response
            return [
              4 /*yield*/,
              page
                .getByLabel("Prompt")
                .fill("Replace Hello with World and add a style"),
            ];
          case 12:
            // Fill prompt - this will trigger the GPT-5 placeholder to stream the expected response
            _c.sent();
            // Send (GPT-5 placeholder will stream the response)
            return [
              4 /*yield*/,
              page.getByRole("button", { name: "Send" }).click(),
            ];
          case 13:
            // Send (GPT-5 placeholder will stream the response)
            _c.sent();
            // Wait for streaming to complete - check for the "Done" status
            return [
              4 /*yield*/,
              (0, test_1.expect)(page.getByText("Done")).toBeVisible({
                timeout: 5000,
              }),
            ];
          case 14:
            // Wait for streaming to complete - check for the "Done" status
            _c.sent();
            // Verify the streamed output appears in the assistant output area
            return [
              4 /*yield*/,
              (0, test_1.expect)(
                page.getByLabel("Assistant output"),
              ).toContainText("<!doctype html>"),
            ];
          case 15:
            // Verify the streamed output appears in the assistant output area
            _c.sent();
            // Stage to file (target defaults to current file)
            return [
              4 /*yield*/,
              page.getByRole("button", { name: "Stage to file" }).click(),
            ];
          case 16:
            // Stage to file (target defaults to current file)
            _c.sent();
            // Approve
            return [
              4 /*yield*/,
              page.getByRole("button", { name: "Approve" }).click(),
            ];
          case 17:
            // Approve
            _c.sent();
            // Preview should reflect change
            // Wait a moment for previewHtml rebuild
            return [4 /*yield*/, page.waitForTimeout(300)];
          case 18:
            // Preview should reflect change
            // Wait a moment for previewHtml rebuild
            _c.sent();
            frame = page.frameLocator("iframe[title='Preview']");
            return [
              4 /*yield*/,
              (0, test_1.expect)(frame.locator("#root")).toHaveText("World"),
            ];
          case 19:
            _c.sent();
            return [2 /*return*/];
        }
      });
    });
  },
);
