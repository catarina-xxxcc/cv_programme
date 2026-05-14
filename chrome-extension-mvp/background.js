/**
 * Background Service Worker
 * 负责管理简历数据存储 + 接收网站消息
 */

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveResume') {
    chrome.storage.local.set({ resume: request.data }, () => {
      console.log('简历已保存:', request.data);
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'getResume') {
    chrome.storage.local.get(['resume'], (result) => {
      sendResponse({ resume: result.resume || null });
    });
    return true;
  }
  
  if (request.action === 'triggerAutofill') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'autofill' });
      }
    });
    sendResponse({ success: true });
    return true;
  }

  // 解析截图（通过 DeepSeek Vision API）
  if (request.action === 'parseScreenshot') {
    parseScreenshotWithAI(request.imageBase64, request.apiKey)
      .then(data => sendResponse({ success: true, data: data }))
      .catch(err => sendResponse({ success: false, message: err.message }));
    return true;
  }
});

// 监听来自网站的外部消息（externally_connectable）
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log('收到外部消息:', request.action, '来自:', sender.url);
  
  // 检测扩展是否存在（ping）
  if (request.action === 'ping') {
    sendResponse({ success: true, version: chrome.runtime.getManifest().version });
    return true;
  }
  
  // 保存解析后的简历数据到扩展 storage
  if (request.action === 'saveResume') {
    chrome.storage.local.set({ resume: request.data }, () => {
      console.log('从网站保存简历:', request.data);
      sendResponse({ success: true, message: '简历已保存到扩展' });
    });
    return true;
  }
  
  // 获取扩展中存储的简历数据
  if (request.action === 'getResume') {
    chrome.storage.local.get(['resume'], (result) => {
      sendResponse({ success: true, resume: result.resume || null });
    });
    return true;
  }
  
  // 获取 API Key
  if (request.action === 'getApiKey') {
    chrome.storage.local.get(['deepseekApiKey'], (result) => {
      sendResponse({ success: true, apiKey: result.deepseekApiKey || null });
    });
    return true;
  }
  
  // 保存 API Key
  if (request.action === 'saveApiKey') {
    chrome.storage.local.set({ deepseekApiKey: request.apiKey }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  sendResponse({ success: false, message: '未知操作' });
  return true;
});

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('简历自动填充扩展已安装 v' + chrome.runtime.getManifest().version);
});

/**
 * 用 DeepSeek Vision API 解析截图，提取公司和职位信息
 */
async function parseScreenshotWithAI(imageBase64, apiKey) {
  // 去掉 data:image/xxx;base64, 前缀
  const base64Data = imageBase64.replace(/^data:image\/[^;]+;base64,/, '');

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个截图信息提取助手。用户会上传求职投递成功的截图，请从中提取公司名称和投递的职位名称。只返回JSON格式：{"company":"公司名","position":"职位名"}'
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/png;base64,${base64Data}` }
            },
            {
              type: 'text',
              text: '请从这张截图中提取：1. 公司名称 2. 投递的职位名称。只返回JSON：{"company":"...","position":"..."}'
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    // 如果 vision 不支持，回退到纯文本 OCR 方式
    if (err.error && err.error.message && err.error.message.includes('image')) {
      throw new Error('当前 API 不支持图片识别，请手动输入');
    }
    throw new Error(err.error?.message || `API 错误 ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // 提取 JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      company: parsed.company || '未识别',
      position: parsed.position || '未识别'
    };
  }

  throw new Error('AI 响应格式错误');
}
