// 扩展安装或更新时运行
chrome.runtime.onInstalled.addListener(() => {
  console.log('美团商家数据助手已安装/更新。');
});

// 点击插件图标时，打开侧边栏
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// 监听来自侧边栏或 content script 的指令
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'MEITUAN_DATA_CAPTURED') {
    console.log('[MT-Extension] Background received Meituan data:', request.url);
    // 将捕获到的数据转发给侧边栏
    chrome.runtime.sendMessage({
      action: 'updateWebApp',
      type: 'MEITUAN_DATA_UPDATED',
      data: request
    }, () => {
      if (chrome.runtime.lastError) {}
    });
  } else if (request.action === 'updateWebApp') {
    // 转发来自内容脚本的指令给侧边栏
    chrome.runtime.sendMessage(request, () => {
      if (chrome.runtime.lastError) {}
    });
  } else if (request.action === 'execute_scrape_flow') {
    console.log('[MT-Extension] Forwarding EXECUTE_SCRAPE with categories:', request.categories);
    // 转发给 content.js 执行正式采集逻辑
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'EXECUTE_SCRAPE',
          categories: request.categories
        });
      } else {
        console.error('[MT-Extension] Failed to execute scrape: No active tab found.');
      }
    });
  } else if (request.action === 'start_auto_click_flow') {
    console.log('[MT-Extension] Dispatching START_AUTO_CLICK to current tab.');
    // 转发给 content.js 开始自动点击流程
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'START_AUTO_CLICK' });
      } else {
        console.error('[MT-Extension] Failed to start scan: No active tab found.');
      }
    });
  } else if (request.action === 'scrape_from_sidebar') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, { action: "scrape_profile" }, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: 'communication_failed' });
            return;
          }
          sendResponse(response);
        });
      } else {
        sendResponse({ error: 'no_active_tab' });
      }
    });
    return true; // 异步响应
  }
  return false;
});