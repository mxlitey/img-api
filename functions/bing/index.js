const BING_API = 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN';
const BING_BASE = 'https://cn.bing.com';
const TIMEOUT = 8000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function handleRequest(request) {
  const method = request.method.toUpperCase();

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Max-Age': '86400'
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (method !== 'GET' && method !== 'HEAD') {
    return jsonResponse({ error: '仅支持 GET、HEAD 和 OPTIONS 请求方法', status: 405 }, 405);
  }

  const cacheKey = new Request(request.url, { method: 'GET' });
  const cache = caches?.default;
  
  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set('X-Cache-Status', 'HIT');
      return new Response(cached.body, { status: cached.status, headers: { ...Object.fromEntries(headers), ...corsHeaders } });
    }
  }

  try {
    const apiRes = await fetchWithTimeout(BING_API);
    if (!apiRes.ok) return jsonResponse({ error: '无法获取 Bing 图片信息' }, 502);
    
    const { images } = await apiRes.json();
    if (!images?.[0]?.url) return jsonResponse({ error: '未找到图片信息' }, 404);

    const imgRes = await fetchWithTimeout(BING_BASE + images[0].url);
    if (!imgRes.ok) return jsonResponse({ error: '无法获取图片资源' }, 502);

    const headers = new Headers({
      'Content-Type': imgRes.headers.get('Content-Type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
      'X-Cache-Status': 'MISS',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      ...corsHeaders
    });

    const response = new Response(method === 'HEAD' ? null : imgRes.body, { status: 200, headers });
    
    if (cache) await cache.put(cacheKey, response.clone());
    
    return response;
  } catch (e) {
    return jsonResponse({ error: '服务器内部错误' }, 500);
  }
}

function adapt(arg0, arg1, arg2) {
  if (arg0 instanceof Request) return arg0;
  if (arg0?.request instanceof Request) return arg0.request;
  return arg0?.request;
}

export default {
  fetch: (arg0, arg1, arg2) => handleRequest(adapt(arg0, arg1, arg2))
};

export function onRequest(context) {
  return handleRequest(context.request);
}
