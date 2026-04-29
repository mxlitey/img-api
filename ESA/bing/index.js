export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/hello") {
      return new Response(JSON.stringify({ message: "Hello Beijing" }), {
        headers: { "content-type": "application/json" },
      });
    }

    // Bing 每日图片代理
    if (url.pathname === "/api/bing-image") {
      try {
        // 1. 请求 Bing 每日图片接口，获取图片信息
        const bingApiUrl =
          "https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1";
        const apiResponse = await fetch(bingApiUrl);

        if (!apiResponse.ok) {
          return new Response("无法获取 Bing 图片信息", { status: 502 });
        }

        const apiData = await apiResponse.json();

        // 2. 解析图片路径（拼接完整 URL）
        const imageInfo = apiData.images[0];
        if (!imageInfo || !imageInfo.url) {
          return new Response("未找到图片信息", { status: 404 });
        }

        const imageUrl = "https://cn.bing.com" + imageInfo.url;

        // 3. 请求图片资源
        const imageResponse = await fetch(imageUrl);

        if (!imageResponse.ok) {
          return new Response("无法获取图片资源", { status: 502 });
        }

        // 4. 构建响应，复制原始图片响应的状态和头部
        const headers = new Headers(imageResponse.headers);

        // 设置缓存策略：10分钟（600秒）
        headers.set("Cache-Control", "max-age=600");

        // 添加跨域支持
        headers.set("Access-Control-Allow-Origin", "*");

        // 返回图片给客户端
        return new Response(imageResponse.body, {
          status: imageResponse.status,
          statusText: imageResponse.statusText,
          headers: headers,
        });
      } catch (error) {
        console.error("处理请求时发生错误:", error);
        return new Response("服务器内部错误", { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
};
