var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-ipYVRm/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// functions/bing/index.js
var BING_API_URL = "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN";
var BING_BASE_URL = "https://cn.bing.com";
var FETCH_TIMEOUT_MS = 8e3;
var CACHE_TTL_S = 600;
var CACHE_STALE_S = 120;
var CORS_ALLOW_ORIGIN = "*";
var CORS_ALLOW_METHODS = "GET, HEAD, OPTIONS";
var CORS_ALLOW_HEADERS = "Content-Type";
var CORS_MAX_AGE = 86400;
var ERROR_RESPONSES = {
  methodNotAllowed: { status: 405, message: "\u4EC5\u652F\u6301 GET\u3001HEAD \u548C OPTIONS \u8BF7\u6C42\u65B9\u6CD5" },
  upstreamFailed: { status: 502, message: "\u65E0\u6CD5\u83B7\u53D6 Bing \u56FE\u7247\u4FE1\u606F" },
  imageFetchFailed: { status: 502, message: "\u65E0\u6CD5\u83B7\u53D6\u56FE\u7247\u8D44\u6E90" },
  noImageData: { status: 404, message: "\u672A\u627E\u5230\u56FE\u7247\u4FE1\u606F" },
  unexpectedContentType: { status: 502, message: "\u4E0A\u6E38\u8FD4\u56DE\u4E86\u975E\u9884\u671F\u7684\u5185\u5BB9\u7C7B\u578B" },
  internalError: { status: 500, message: "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF" }
};
function createErrorResponse(errorKey) {
  const { status, message } = ERROR_RESPONSES[errorKey];
  return new Response(JSON.stringify({ error: message, status }), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
__name(createErrorResponse, "createErrorResponse");
function createCorsHeaders(method = "GET") {
  return {
    "Access-Control-Allow-Origin": CORS_ALLOW_ORIGIN,
    "Access-Control-Allow-Methods": CORS_ALLOW_METHODS,
    "Access-Control-Allow-Headers": CORS_ALLOW_HEADERS,
    "Access-Control-Max-Age": String(CORS_MAX_AGE)
  };
}
__name(createCorsHeaders, "createCorsHeaders");
function createSecurityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer-when-downgrade"
  };
}
__name(createSecurityHeaders, "createSecurityHeaders");
function createImageCacheHeaders(contentType) {
  return {
    "Content-Type": contentType,
    "Cache-Control": `public, max-age=${CACHE_TTL_S}, s-maxage=${CACHE_TTL_S}, stale-while-revalidate=${CACHE_STALE_S}`,
    ...createCorsHeaders(),
    ...createSecurityHeaders()
  };
}
__name(createImageCacheHeaders, "createImageCacheHeaders");
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`\u8BF7\u6C42\u8D85\u65F6: ${url} (${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
__name(fetchWithTimeout, "fetchWithTimeout");
async function getCachedImage(request, cacheKeyUrl) {
  const cache = caches.default;
  const cacheKey = new Request(cacheKeyUrl, { method: "GET" });
  const cachedResponse = await cache.match(cacheKey);
  if (cachedResponse) {
    const headers = new Headers(cachedResponse.headers);
    headers.set("X-Cache-Status", "HIT");
    return new Response(cachedResponse.body, {
      status: cachedResponse.status,
      headers
    });
  }
  return null;
}
__name(getCachedImage, "getCachedImage");
async function putCachedImage(cacheKeyUrl, response) {
  const cache = caches.default;
  const cacheKey = new Request(cacheKeyUrl, { method: "GET" });
  await cache.put(cacheKey, response.clone());
}
__name(putCachedImage, "putCachedImage");
async function fetchBingImageData(env) {
  const apiUrl = env?.BING_API_URL || BING_API_URL;
  const apiResponse = await fetchWithTimeout(apiUrl, FETCH_TIMEOUT_MS);
  if (!apiResponse.ok) {
    throw { errorKey: "upstreamFailed", statusCode: apiResponse.status };
  }
  const contentType = apiResponse.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) {
    throw { errorKey: "unexpectedContentType" };
  }
  const apiData = await apiResponse.json();
  const imageInfo = apiData.images?.[0];
  if (!imageInfo?.url) {
    throw { errorKey: "noImageData" };
  }
  return imageInfo;
}
__name(fetchBingImageData, "fetchBingImageData");
async function fetchBingImage(imageUrl) {
  const imageResponse = await fetchWithTimeout(imageUrl, FETCH_TIMEOUT_MS);
  if (!imageResponse.ok) {
    throw { errorKey: "imageFetchFailed", statusCode: imageResponse.status };
  }
  const contentType = imageResponse.headers.get("Content-Type") || "";
  if (!contentType.startsWith("image/")) {
    throw { errorKey: "unexpectedContentType" };
  }
  return { response: imageResponse, contentType };
}
__name(fetchBingImage, "fetchBingImage");
async function handleFetch(request, env, ctx) {
  const method = request.method.toUpperCase();
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders("OPTIONS")
    });
  }
  if (method !== "GET" && method !== "HEAD") {
    return createErrorResponse("methodNotAllowed");
  }
  const cacheKeyUrl = request.url;
  try {
    const cached = await getCachedImage(request, cacheKeyUrl);
    if (cached) return cached;
    const imageInfo = await fetchBingImageData(env);
    const baseUrl = env?.BING_BASE_URL || BING_BASE_URL;
    const imageUrl = baseUrl + imageInfo.url;
    const { response: imageResponse, contentType } = await fetchBingImage(imageUrl);
    const headers = new Headers(createImageCacheHeaders(contentType));
    headers.set("X-Cache-Status", "MISS");
    const finalResponse = new Response(method === "HEAD" ? null : imageResponse.body, {
      status: 200,
      headers
    });
    await putCachedImage(cacheKeyUrl, finalResponse);
    return finalResponse;
  } catch (error) {
    if (error?.errorKey) {
      return createErrorResponse(error.errorKey);
    }
    console.error("\u5904\u7406\u8BF7\u6C42\u65F6\u53D1\u751F\u9519\u8BEF:", error instanceof Error ? error.message : String(error));
    return createErrorResponse("internalError");
  }
}
__name(handleFetch, "handleFetch");
var bing_default = { fetch: handleFetch };

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-ipYVRm/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = bing_default;

// ../../AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-ipYVRm/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default,
  handleFetch as onRequest
};
//# sourceMappingURL=index.js.map
