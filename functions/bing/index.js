/**
 * Bing 每日一图 API - 统一边缘函数
 * 
 * 兼容平台：
 * - Cloudflare Workers
 * - 腾讯云 EdgeOne Pages
 * - 阿里云 ESA Pages
 * 
 * 三平台共同入口格式：
 * - Cloudflare: export default { fetch(request, env, ctx) }
 * - EdgeOne: onRequest(context) 或 export default { fetch }
 * - ESA: export default { fetch(request) }
 * 
 * 统一使用 ES Module fetch 入口，参数通过 arguments 动态适配
 */

// ==================== 配置常量 ====================

const BING_API_URL = 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';
const BING_BASE_URL = 'https://cn.bing.com';

const FETCH_TIMEOUT_MS = 8000;
const CACHE_TTL_S = 600;
const CACHE_STALE_S = 120;

const CORS_ALLOW_ORIGIN = '*';
const CORS_ALLOW_METHODS = 'GET, HEAD, OPTIONS';
const CORS_ALLOW_HEADERS = 'Content-Type';
const CORS_MAX_AGE = 86400;

// ==================== 错误定义 ====================

const ERROR_RESPONSES = {
  methodNotAllowed: { status: 405, message: '仅支持 GET、HEAD 和 OPTIONS 请求方法' },
  upstreamFailed: { status: 502, message: '无法获取 Bing 图片信息' },
  imageFetchFailed: { status: 502, message: '无法获取图片资源' },
  noImageData: { status: 404, message: '未找到图片信息' },
  unexpectedContentType: { status: 502, message: '上游返回了非预期的内容类型' },
  internalError: { status: 500, message: '服务器内部错误' }
};

// ==================== 工具函数 ====================

function createErrorResponse(errorKey) {
  const { status, message } = ERROR_RESPONSES[errorKey];
  return new Response(JSON.stringify({ error: message, status }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function createCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': CORS_ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': CORS_ALLOW_METHODS,
    'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
    'Access-Control-Max-Age': String(CORS_MAX_AGE)
  };
}

function createSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer-when-downgrade'
  };
}

function createImageCacheHeaders(contentType) {
  return {
    'Content-Type': contentType,
    'Cache-Control': `public, max-age=${CACHE_TTL_S}, s-maxage=${CACHE_TTL_S}, stale-while-revalidate=${CACHE_STALE_S}`,
    ...createCorsHeaders(),
    ...createSecurityHeaders()
  };
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`请求超时: ${url} (${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ==================== 缓存操作 ====================

async function getCachedImage(cacheKeyUrl) {
  try {
    const cache = caches?.default;
    if (!cache) return null;
    
    const cacheKey = new Request(cacheKeyUrl, { method: 'GET' });
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Cache-Status', 'HIT');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers
      });
    }
  } catch (e) {
    console.error('缓存读取失败:', e);
  }
  return null;
}

async function putCachedImage(cacheKeyUrl, response) {
  try {
    const cache = caches?.default;
    if (!cache) return;
    
    const cacheKey = new Request(cacheKeyUrl, { method: 'GET' });
    await cache.put(cacheKey, response.clone());
  } catch (e) {
    console.error('缓存写入失败:', e);
  }
}

// ==================== 业务逻辑 ====================

async function fetchBingImageData() {
  const apiResponse = await fetchWithTimeout(BING_API_URL, FETCH_TIMEOUT_MS);

  if (!apiResponse.ok) {
    throw { errorKey: 'upstreamFailed', statusCode: apiResponse.status };
  }

  const contentType = apiResponse.headers.get('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    throw { errorKey: 'unexpectedContentType' };
  }

  const apiData = await apiResponse.json();
  const imageInfo = apiData.images?.[0];

  if (!imageInfo?.url) {
    throw { errorKey: 'noImageData' };
  }

  return imageInfo;
}

async function fetchBingImage(imageUrl) {
  const imageResponse = await fetchWithTimeout(imageUrl, FETCH_TIMEOUT_MS);

  if (!imageResponse.ok) {
    throw { errorKey: 'imageFetchFailed', statusCode: imageResponse.status };
  }

  const contentType = imageResponse.headers.get('Content-Type') || '';
  if (!contentType.startsWith('image/')) {
    throw { errorKey: 'unexpectedContentType' };
  }

  return { response: imageResponse, contentType };
}

// ==================== 核心处理函数 ====================

async function handleRequest(request) {
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: createCorsHeaders()
    });
  }

  if (method !== 'GET' && method !== 'HEAD') {
    return createErrorResponse('methodNotAllowed');
  }

  const cacheKeyUrl = request.url;

  const cached = await getCachedImage(cacheKeyUrl);
  if (cached) return cached;

  try {
    const imageInfo = await fetchBingImageData();
    const imageUrl = BING_BASE_URL + imageInfo.url;
    const { response: imageResponse, contentType } = await fetchBingImage(imageUrl);

    const headers = new Headers(createImageCacheHeaders(contentType));
    headers.set('X-Cache-Status', 'MISS');

    const finalResponse = new Response(method === 'HEAD' ? null : imageResponse.body, {
      status: 200,
      headers
    });

    await putCachedImage(cacheKeyUrl, finalResponse);

    return finalResponse;

  } catch (error) {
    if (error?.errorKey) {
      return createErrorResponse(error.errorKey);
    }
    console.error('处理请求时发生错误:', error instanceof Error ? error.message : String(error));
    return createErrorResponse('internalError');
  }
}

// ==================== 平台入口适配 ====================

function adaptRequest(arg0, arg1, arg2) {
  if (arg0 instanceof Request) {
    return { request: arg0, env: arg1 || {}, ctx: arg2 || {} };
  }
  if (arg0?.request instanceof Request) {
    return { request: arg0.request, env: arg0.env || {}, ctx: arg0 };
  }
  return { request: arg0?.request, env: arg0?.env || {}, ctx: arg0 };
}

async function fetchHandler(arg0, arg1, arg2) {
  const { request } = adaptRequest(arg0, arg1, arg2);
  
  if (!request) {
    return createErrorResponse('internalError');
  }
  
  return handleRequest(request);
}

// ==================== 统一导出 ====================

export default { fetch: fetchHandler };

export function onRequest(context) {
  return fetchHandler(context);
}
