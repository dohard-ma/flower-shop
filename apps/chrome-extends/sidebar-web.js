// Web 应用 URL配置
const WEB_APP_URL = 'http://localhost:3000/dashboard/sync';

// DOM 元素
let iframe, loading, statusText;

// 状态管理
let isConnected = false;

// 加载 Web 应用
async function loadWebApp() {
    if (loading) loading.style.display = 'block';
    if (iframe) iframe.style.display = 'none';

    if (iframe) {
        iframe.onload = function () {
            setTimeout(() => {
                if (loading) loading.style.display = 'none';
                if (iframe) iframe.style.display = 'block';
                isConnected = true;
                
                if (statusText) {
                    statusText.innerText = '已连接';
                    statusText.className = 'status-connected';
                }

                // 发送就绪消息
                try {
                    iframe.contentWindow.postMessage({
                        type: 'EXTENSION_READY',
                        source: 'extension',
                        timestamp: new Date().toISOString()
                    }, '*');
                } catch (error) {
                    console.error('发送就绪消息失败', error);
                }
            }, 500);
        };

        iframe.onerror = function (error) {
            showError('同步页面加载失败，请确保 Next.js 应用正在运行 (npm run dev)');
        };

        // 开始加载
        iframe.src = `${WEB_APP_URL}?t=${new Date().getTime()}`;
    }
}

// 显示错误信息
function showError(message) {
    if (loading) {
        loading.innerHTML = `
      <div class="error-message">
        <p>${message}</p>
        <button onclick="loadWebApp()" style="padding: 8px 16px; margin-top: 10px;">重试</button>
      </div>
    `;
    }
}

// 监听来自 Web 应用的消息
function handleWebAppMessage(event) {
    // 允许来自 localhost:3000 的消息
    if (!event.origin.includes('localhost:3000') && event.origin !== new URL(WEB_APP_URL).origin) {
        return;
    }

    const { type, categories } = event.data;
    console.log('[MT-Extension] Sidebar received message from Web App:', type);
    
    // 转发消息给 background 或执行操作
    if (type === 'START_AUTO_SCRAPE') {
        chrome.runtime.sendMessage({ action: 'start_auto_click_flow' });
    } else if (type === 'START_SCRAPE_EXECUTION') {
        // 用户已选定分类，开始正式采集
        console.log('[MT-Extension] Starting execution for:', categories);
        chrome.runtime.sendMessage({ 
            action: 'execute_scrape_flow', 
            categories: categories 
        });
    }
}

// 监听来自 background script 的消息
function handleBackgroundMessage(request, sender, sendResponse) {
    if (request.action === 'updateWebApp') {
        console.log('[MT-Extension] Sidebar forwarding to Web App:', request.type);
        // 直接透传给 iframe
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
                ...request,
                source: 'extension-background',
                timestamp: new Date().toISOString()
            }, '*');
        }
    }
    sendResponse({ success: true });
}

// 初始化函数
function initialize() {
    // 获取 DOM 元素
    iframe = document.getElementById('web-app');
    loading = document.getElementById('loading');
    statusText = document.getElementById('status-text');

    // 设置事件监听器
    window.addEventListener('message', handleWebAppMessage);
    chrome.runtime.onMessage.addListener(handleBackgroundMessage);

    // 开始加载 Web 应用
    loadWebApp();

    // 设置心跳检测
    setInterval(heartbeat, 30000);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initialize);