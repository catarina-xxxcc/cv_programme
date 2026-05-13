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
