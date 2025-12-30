// 这个脚本运行在页面的 "main world" 上下文中
(function () {
    // 防止重复注入
    if (window.__INTERCEPTOR_INJECTED__) return;
    window.__INTERCEPTOR_INJECTED__ = true;

    console.log('[MT-Extension] Injector loaded in world:', window.location.href);

    // 1. 拦截 XMLHttpRequest
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this._url = url;
        return originalOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () {
            try {
                const url = this._url ? this._url.toString() : '';
                if (
                    url.includes('/reuse/sc/product/retail/r/tagList') ||
                    url.includes('/reuse/sc/product/retail/r/searchListPageNew')
                ) {
                    const responseData = JSON.parse(this.responseText);
                    const dataStr = JSON.stringify(responseData);
                    console.log(`[MT-Extension] Captured XHR: ${url} | Data Length: ${dataStr.length}`);
                    
                    window.postMessage({
                        type: 'FROM_PAGE_NETWORK_DATA',
                        source: 'xhs-extension-injector',
                        url: url,
                        payload: responseData
                    }, '*');
                }
            } catch (e) { }
        });
        return originalSend.apply(this, arguments);
    };

    // 2. 拦截 fetch
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch(...args);
        const url = (args[0] instanceof Request ? args[0].url : args[0]).toString();

        if (
            url.includes('/reuse/sc/product/retail/r/tagList') ||
            url.includes('/reuse/sc/product/retail/r/searchListPageNew')
        ) {
            try {
                const clone = response.clone();
                const data = await clone.json();
                const dataStr = JSON.stringify(data);
                console.log(`[MT-Extension] Captured Fetch: ${url} | Data Length: ${dataStr.length}`);

                window.postMessage({
                    type: 'FROM_PAGE_NETWORK_DATA',
                    source: 'xhs-extension-injector',
                    url: url,
                    payload: data
                }, '*');
            } catch (e) { }
        }
        return response;
    };
})();