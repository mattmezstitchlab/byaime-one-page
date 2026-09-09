"use strict";
/**
 * Clerk Frontend API Proxy Middleware
 *
 * Proxies Clerk Frontend API requests through your domain, enabling Clerk
 * authentication on custom domains and .replit.app deployments without
 * requiring CNAME DNS configuration.
 *
 * AUTH CONFIGURATION: To manage users, enable/disable login providers
 * (Google, GitHub, etc.), change app branding, or configure OAuth credentials,
 * use the Auth pane in the workspace toolbar. There is no external Clerk
 * dashboard — all auth configuration is done through the Auth pane.
 *
 * IMPORTANT:
 * - Only active in production (Clerk proxying doesn't work for dev instances)
 * - Must be mounted BEFORE express.json() middleware
 *
 * Usage in app.ts:
 *   import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
 *   app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLERK_PROXY_PATH = void 0;
exports.getClerkProxyHost = getClerkProxyHost;
exports.clerkProxyMiddleware = clerkProxyMiddleware;
var http_proxy_middleware_1 = require("http-proxy-middleware");
var CLERK_FAPI = 'https://frontend-api.clerk.dev';
exports.CLERK_PROXY_PATH = '/api/__clerk';
/**
 * Returns the first effective public hostname for the given request,
 * preferring x-forwarded-host over the Host header so callers behind a
 * proxy see the original client-facing host.
 *
 * x-forwarded-host can take three shapes:
 *   - undefined (no proxy involved)
 *   - a single string (one proxy hop)
 *   - a comma-delimited string when an upstream appended rather than
 *     replaced the header (Node folds duplicate headers this way), or a
 *     string[] in some Express typings
 * In the multi-value case, the leftmost value is the original client-
 * facing host. Take that one in all forms. Exported so that app.ts
 * (clerkMiddleware callback) and this proxy middleware agree on which
 * hostname is canonical — otherwise multi-domain/custom-domain flows
 * break.
 */
function getClerkProxyHost(req) {
    var _a, _b;
    var forwarded = req.headers['x-forwarded-host'];
    var raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    var firstHop = (_a = raw === null || raw === void 0 ? void 0 : raw.split(',')[0]) === null || _a === void 0 ? void 0 : _a.trim();
    return firstHop || ((_b = req.headers.host) === null || _b === void 0 ? void 0 : _b.trim()) || undefined;
}
function clerkProxyMiddleware() {
    // Only run proxy in production — Clerk proxying doesn't work for dev instances
    if (process.env.NODE_ENV !== 'production') {
        return function (_req, _res, next) { return next(); };
    }
    var secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
        return function (_req, _res, next) { return next(); };
    }
    return (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: CLERK_FAPI,
        changeOrigin: true,
        // Take over the response so it can be re-sent with a Content-Length (see
        // proxyRes); the deployment edge rejects chunked proxied responses.
        selfHandleResponse: true,
        pathRewrite: function (path) {
            return path.replace(new RegExp("^".concat(exports.CLERK_PROXY_PATH)), '');
        },
        on: {
            proxyReq: function (proxyReq, req) {
                var _a, _b, _c;
                var protocol = req.headers['x-forwarded-proto'] || 'https';
                var host = getClerkProxyHost(req) || '';
                var proxyUrl = "".concat(protocol, "://").concat(host).concat(exports.CLERK_PROXY_PATH);
                proxyReq.setHeader('Clerk-Proxy-Url', proxyUrl);
                proxyReq.setHeader('Clerk-Secret-Key', secretKey);
                var xff = req.headers['x-forwarded-for'];
                var clientIp = ((_b = (_a = (Array.isArray(xff) ? xff[0] : xff)) === null || _a === void 0 ? void 0 : _a.split(',')[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
                    ((_c = req.socket) === null || _c === void 0 ? void 0 : _c.remoteAddress) ||
                    '';
                if (clientIp) {
                    proxyReq.setHeader('X-Forwarded-For', clientIp);
                }
            },
            // Clerk's dynamic Frontend API responses (/v1/environment, /v1/client,
            // JWKS, ...) arrive without a Content-Length, so relaying them would use
            // Transfer-Encoding: chunked — which the deployment edge (Cloud Run)
            // rejects, turning the app's 200 into a 500. Buffer only those so they can
            // be re-sent with a Content-Length; the body is forwarded untouched so
            // Content-Encoding is preserved. Length-known responses (e.g. /npm/*
            // assets) and body-less responses stream through without buffering.
            proxyRes: function (proxyRes, req, res) {
                var _a;
                var headers = __assign({}, proxyRes.headers);
                // Transfer-Encoding/Connection are hop-by-hop (RFC 7230 §6.1).
                delete headers['transfer-encoding'];
                delete headers['connection'];
                delete headers['keep-alive'];
                var status = (_a = proxyRes.statusCode) !== null && _a !== void 0 ? _a : 502;
                // Content-Length is forbidden on 1xx/204; HEAD/304 may keep theirs.
                if (status < 200 || status === 204) {
                    delete headers['content-length'];
                }
                var bodyless = req.method === 'HEAD' ||
                    status < 200 ||
                    status === 204 ||
                    status === 304;
                if (headers['content-length'] !== undefined || bodyless) {
                    res.writeHead(status, headers);
                    // Headers are already sent, so abort the response if the upstream
                    // stream errors mid-pipe (e.g. ECONNRESET) rather than leaving an
                    // unhandled 'error' or a hung client.
                    proxyRes.on('error', function () { return res.destroy(); });
                    proxyRes.pipe(res);
                    return;
                }
                var chunks = [];
                proxyRes.on('data', function (chunk) { return chunks.push(chunk); });
                proxyRes.on('end', function () {
                    var body = Buffer.concat(chunks);
                    headers['content-length'] = String(body.length);
                    res.writeHead(status, headers);
                    res.end(body);
                });
                proxyRes.on('error', function () {
                    if (!res.headersSent) {
                        // Set a length so the empty 502 isn't sent chunked (which the
                        // deployment edge would reject just like the original response).
                        res.writeHead(502, { 'content-length': '0' });
                    }
                    res.end();
                });
            },
        },
    });
}
//# sourceMappingURL=clerkProxyMiddleware.js.map