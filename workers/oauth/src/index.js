"use strict";
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
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
function json(body, init) {
  if (init === void 0) {
    init = {};
  }
  var headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-headers", "content-type");
  return new Response(
    JSON.stringify(body),
    __assign(__assign({}, init), { headers: headers }),
  );
}
var handler = {
  fetch: function (request, env) {
    return __awaiter(this, void 0, void 0, function () {
      var url, code, state, code_verifier, body, resp, data;
      var _a, _b;
      return __generator(this, function (_c) {
        switch (_c.label) {
          case 0:
            url = new URL(request.url);
            if (request.method === "OPTIONS") {
              return [
                2 /*return*/,
                new Response(null, {
                  headers: {
                    "access-control-allow-origin": "*",
                    "access-control-allow-headers": "content-type",
                    "access-control-allow-methods": "GET,POST,OPTIONS",
                  },
                }),
              ];
            }
            if (url.pathname === "/health") {
              return [2 /*return*/, json({ ok: true, ts: Date.now() })];
            }
            if (!(url.pathname === "/oauth/callback")) return [3 /*break*/, 3];
            code = url.searchParams.get("code");
            state =
              (_a = url.searchParams.get("state")) !== null && _a !== void 0
                ? _a
                : "";
            code_verifier =
              (_b = url.searchParams.get("code_verifier")) !== null &&
              _b !== void 0
                ? _b
                : "";
            if (!code)
              return [
                2 /*return*/,
                json({ error: "missing_code" }, { status: 400 }),
              ];
            body = new URLSearchParams({
              client_id: env.GITHUB_CLIENT_ID,
              client_secret: env.GITHUB_CLIENT_SECRET,
              code: code,
              redirect_uri: env.GITHUB_REDIRECT_URI,
              grant_type: "authorization_code",
              code_verifier: code_verifier,
            });
            return [
              4 /*yield*/,
              fetch("https://github.com/login/oauth/access_token", {
                method: "POST",
                headers: { Accept: "application/json" },
                body: body,
              }),
            ];
          case 1:
            resp = _c.sent();
            return [4 /*yield*/, resp.json()];
          case 2:
            data = _c.sent();
            if (!resp.ok || data.error) {
              return [
                2 /*return*/,
                json(
                  { error: "oauth_exchange_failed", details: data },
                  { status: 400 },
                ),
              ];
            }
            // Return access_token to client (client stores it locally)
            return [
              2 /*return*/,
              json({
                access_token: data.access_token,
                token_type: data.token_type,
                scope: data.scope,
                state: state,
              }),
            ];
          case 3:
            return [
              2 /*return*/,
              new Response("Not Found", {
                status: 404,
                headers: { "access-control-allow-origin": "*" },
              }),
            ];
        }
      });
    });
  },
};
exports.default = handler;
