export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (url.pathname === "/api/hello") {
      return new Response(JSON.stringify({ message: "Hello Beijing" }), {
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (url.pathname === "/api/bing-image") {
      try {
        const bingApiUrl =
          "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1";
        const apiResponse = await fetch(bingApiUrl);

        if (!apiResponse.ok) {
          return jsonResponse({ error: "无法获取 Bing 图片信息" }, 502);
        }

        const apiData = await apiResponse.json();
        const imageInfo = apiData.images[0];

        if (!imageInfo?.url) {
          return jsonResponse({ error: "未找到图片信息" }, 404);
        }

        const imageUrl = "https://cn.bing.com" + imageInfo.url;
        const imageResponse = await fetch(imageUrl);

        if (!imageResponse.ok) {
          return jsonResponse({ error: "无法获取图片资源" }, 502);
        }

        const headers = new Headers(imageResponse.headers);
        headers.set("Cache-Control", "max-age=600");
        headers.set("Access-Control-Allow-Origin", "*");

        return new Response(imageResponse.body, {
          status: imageResponse.status,
          statusText: imageResponse.statusText,
          headers,
        });
      } catch (error) {
        return jsonResponse({ error: "服务器内部错误" }, 500);
      }
    }

    return jsonResponse({ error: "Not Found" }, 404);
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
