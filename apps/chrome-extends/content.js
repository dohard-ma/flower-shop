// 确保脚本只运行一次
if (typeof window.contentScriptInjected === 'undefined') {
  window.contentScriptInjected = true;

  console.log('[MT-Extension] Content script injected in:', window.location.href);

  // 存储从接口截获的真实标签列表
  let latestTags = [];
  // 采集状态闸门：仅在主动启动采集任务时为 true
  let isScrapingActive = false;

  // 用于解决网络请求等待的 Promise resolve
  let pendingRequestResolve = null;
  let currentContext = { categoryName: '', pageNum: 1 };

  // 监听来自后台或侧边栏的消息
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_AUTO_CLICK') {
      scanCategories(); // 只进行预扫描
    } else if (request.action === 'EXECUTE_SCRAPE') {
      // 接收用户选定的分类列表并开始执行
      if (isScrapingActive) {
          console.warn('[MT-Extension] Scraping is already in progress.');
          return;
      }
      isScrapingActive = true;
      startMeituanAutoClickFlow(request.categories).finally(() => {
          isScrapingActive = false;
          console.log('[MT-Extension] Scraping task finished, gate closed.');
      });
    }
    sendResponse({ success: true });
  });

  /**
   * 改良后的菜单寻找逻辑：必须包含商品分类标志性的类名
   */
  const findRealMenu = (doc) => {
    const menus = doc.querySelectorAll('[role="menu"]');
    for (const m of menus) {
      // 商品分类特有的标志类名 (见于美团后台侧边栏树结构)
      if (m.querySelector('.src-components-TagTree-index_name')) {
        return m;
      }
    }
    return null;
  };

  /**
   * 预扫描分类并回传给侧边栏界面 (增加重试机制和更好的 Iframe 支持)
   */
  async function scanCategories(retries = 5) {
    console.log(`[MT-Extension] Scanning categories (Attempts left: ${retries})...`);

    const searchMenu = () => {
        // 重要：由于 manifest.json 中开启了 all_frames: true，
        // 每个 iframe 都会运行独立的 content.js 实例。
        // 我们只需让每个实例检查自己的 document，不需要跨 frame 探测。
        // 这样可以确保由“真正”包含菜单的那个实例负责上报和执行任务。
        let menu = findRealMenu(document);
        if (menu) return { menu, doc: document };
        return null;
    }

    const result = searchMenu();

    if (!result) {
      if (retries > 0) {
          console.log('[MT-Extension] Category menu not found, retrying in 1s...');
          setTimeout(() => scanCategories(retries - 1), 1000);
          return;
      }
      
      // 只有在顶层窗口且确实没找到时才上报失败，避免 iframe 中的实例干扰
      if (window.self === window.top) {
          console.error('[MT-Extension] Category menu not found after retries.');
          chrome.runtime.sendMessage({
              action: 'updateWebApp',
              type: 'SCAN_FAILED',
              message: '未找到分类菜单，请确认已进入“商品管理”页面（注意不是“商品列表”）并稍后再试。'
          });
      }
      return;
    }

    const { menu } = result;

    // 筛选有效分类
    const detectedCategories = Array.from(menu.children) // 使用 children 避开文本节点
        .map(item => {
            const nameSpan = item.querySelector('.src-components-TagTree-index_name span');
            return nameSpan ? nameSpan.innerText.trim() : null;
        })
        .filter(name => name && (latestTags.length === 0 || latestTags.includes(name)));

    console.log(`[MT-Extension] [Frame: ${window.location.host}] Detected ${detectedCategories.length} categories.`);

    // 只有在确实找到分类的情况下才上报结果
    if (detectedCategories.length > 0) {
        chrome.runtime.sendMessage({
            action: 'updateWebApp',
            type: 'CATEGORIES_DETECTED',
            categories: detectedCategories,
            count: detectedCategories.length
        });
    } else if (window.self === window.top) {
        // 如果是顶层窗口且找了一圈还是空，可能是选错了菜单或页面没加载完
        chrome.runtime.sendMessage({
            action: 'updateWebApp',
            type: 'CATEGORIES_DETECTED',
            categories: [],
            count: 0
        });
    }
  }

  /**
   * 辅助睡眠函数 (支持随机时间)
   */
  function sleep(min = 500, max = 1000) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 等待特定的网络数据返回
   */
  function waitForData(timeout = 10000) {
      return new Promise((resolve, reject) => {
          pendingRequestResolve = resolve;
          // 设置超时保护
          setTimeout(() => {
              if (pendingRequestResolve === resolve) {
                  pendingRequestResolve = null;
                  resolve(null); // 超时也返回继续，由逻辑判断
              }
          }, timeout);
      });
  }

  // 监听来自 injector.js (MAIN world) 的消息
  window.addEventListener('message', (event) => {
    if (event.source !== window || event.data.source !== 'xhs-extension-injector') return;

    if (event.data.type === 'FROM_PAGE_NETWORK_DATA') {
      const url = event.data.url;
      
      // 1. 拦截并同步真实标签列表 (始终允许，用于 UI 预扫描)
      if (url.includes('/tagList')) {
          const tagListData = event.data.payload.data?.tagList || [];
          latestTags = tagListData.map(t => t.name);
          console.log('[MT-Extension] Verified tags updated:', latestTags);
      }

      // 2. 核心数据上报闸门：仅在采集任务激活时发送商品列表
      if (isScrapingActive && url.includes('/searchListPageNew')) {
          console.log('[MT-Extension] Task active, reporting data:', url);
          
          // 如果有正在等待的请求，满足条件后 resolve
          if (pendingRequestResolve) {
              const resolve = pendingRequestResolve;
              pendingRequestResolve = null;
              resolve(event.data.payload);
          }

          // 转发数据，注入当前的分类和页码信息
          chrome.runtime.sendMessage({
            action: 'MEITUAN_DATA_CAPTURED',
            url: url,
            data: event.data.payload,
            categoryName: currentContext.categoryName,
            pageNum: currentContext.pageNum
          });
      }
    }
  });

  /**
   * 模拟点击每个分类 (正式开始采集)
   */
  async function startMeituanAutoClickFlow(selectedCategories = []) {
    console.log('[MT-Extension] Starting auto-click flow with:', selectedCategories);
    
    // 1. 获取目标文档：仅查找当前文档，不再向下探测 iframe。
    // 这样可以确保只有“真正”包含分类 Dom 的那个 frame 实例会启动执行逻辑。
    const menuEl = findRealMenu(document);
    if (!menuEl) {
      console.log('[MT-Extension] Current frame does not contain the real category menu. Skipping scrape execution.');
      return;
    }

    const targetDoc = document;

    // 2. 识别所有菜单项并寻找匹配选中的项 (保持 selectedCategories 的原始顺序)
    const allMenuItems = Array.from(menuEl.childNodes);
    const executionItems = [];
    
    // 按用户选定的顺序来查找 DOM 元素，确保任务顺序的一致性
    for (const catName of selectedCategories) {
        const item = allMenuItems.find(node => {
            const nameSpan = node.querySelector('.src-components-TagTree-index_name span');
            return nameSpan && nameSpan.innerText.trim() === catName;
        });
        if (item) executionItems.push({ item, name: catName });
    }

    if (executionItems.length === 0) {
        console.log('[MT-Extension] No matching categories found to scrape.');
        return;
    }

    // 3. 通知侧边栏清空旧列表
    chrome.runtime.sendMessage({ action: 'updateWebApp', type: 'CLEAR_SYNC_LIST' });

    for (let i = 0; i < executionItems.length; i++) {
        const { item, name: categoryName } = executionItems[i];
        
        console.log(`[MT-Extension] [Progress ${i+1}/${executionItems.length}] Processing: ${categoryName}`);
        
        currentContext = { categoryName, pageNum: 1 };
        
        // 执行点击
        const clickTarget = item.childNodes[0] || item;
        const waitPromise = waitForData(); 
        clickTarget.click();
        await waitPromise; // 等待接口返回

        // 分类切换后的保护性延迟
        await sleep(600, 1000);

        // --- 处理翻页逻辑 ---
        let hasNextPage = true;
        while (hasNextPage) {
            const nextBtn = targetDoc.querySelector('.roo-pagination li.arrow:not(.disabled) a[aria-label="Next"]');
            
            if (nextBtn) {
                currentContext.pageNum++;
                console.log(`[MT-Extension]   - Clicking next page: ${currentContext.pageNum}`);
                const pageWaitPromise = waitForData();
                nextBtn.click();
                await pageWaitPromise;
                
                // 翻页后的随机延迟
                await sleep(500, 1000);
            } else {
                console.log(`[MT-Extension]   - Reached last page of ${categoryName}`);
                hasNextPage = false;
            }
        }
    }

    alert('所选分类及对应分页数据已完成采集，即将刷新页面以重置状态。');
    window.location.reload();
  }
}