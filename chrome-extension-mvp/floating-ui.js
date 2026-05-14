/**
 * FloatingUI - 浮动 UI 管理（Shadow DOM 隔离）
 * 包含：自动填充按钮、确认面板、记录投递按钮、通知
 */
var FloatingUI = (function() {
  'use strict';

  var container = null;
  var shadow = null;
  var triggerBtn = null;
  var confirmPanel = null;
  var recordBtn = null;
  var confirmTimeout = null;

  var CSS = '\
    :host { all: initial; }\
    * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; }\
    .af-trigger {\
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;\
      width: 52px; height: 52px; border-radius: 50%;\
      background: linear-gradient(135deg, #FFB7C5, #FF9DB3);\
      color: white; border: none; cursor: pointer;\
      box-shadow: 0 4px 16px rgba(255,157,179,0.4);\
      display: flex; align-items: center; justify-content: center;\
      font-size: 22px; transition: all 0.3s;\
      user-select: none;\
    }\
    .af-trigger:hover { transform: scale(1.1); box-shadow: 0 6px 24px rgba(255,157,179,0.6); }\
    .af-trigger.dragging { opacity: 0.8; transition: none; }\
    .af-confirm {\
      position: fixed; bottom: 90px; right: 24px; z-index: 2147483647;\
      background: white; border-radius: 12px; padding: 16px;\
      box-shadow: 0 8px 32px rgba(0,0,0,0.15); width: 280px;\
      animation: afSlideIn 0.3s ease;\
    }\
    @keyframes afSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }\
    .af-confirm-title { font-size: 14px; font-weight: 700; color: #333; margin-bottom: 8px; }\
    .af-confirm-stats { font-size: 12px; color: #666; margin-bottom: 8px; }\
    .af-confirm-stats span { color: #FF9DB3; font-weight: 700; }\
    .af-confirm-list { max-height: 120px; overflow-y: auto; margin-bottom: 10px; }\
    .af-confirm-item { font-size: 11px; color: #555; padding: 3px 0; border-bottom: 1px solid #f0f0f0; }\
    .af-confirm-item strong { color: #333; }\
    .af-confirm-actions { display: flex; gap: 8px; }\
    .af-btn { padding: 6px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }\
    .af-btn-undo { background: #f0f0f0; color: #666; }\
    .af-btn-undo:hover { background: #e0e0e0; }\
    .af-btn-close { background: #FFB7C5; color: white; }\
    .af-btn-close:hover { background: #FF9DB3; }\
    .af-record {\
      position: fixed; bottom: 86px; right: 24px; z-index: 2147483647;\
      background: linear-gradient(135deg, #FFB7C5, #FF9DB3);\
      color: white; border: none; border-radius: 24px;\
      padding: 8px 16px; font-size: 12px; font-weight: 600;\
      cursor: pointer; box-shadow: 0 4px 12px rgba(255,157,179,0.4);\
      animation: afSlideIn 0.3s ease; transition: all 0.2s;\
    }\
    .af-record:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,157,179,0.6); }\
    .af-dialog {\
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);\
      z-index: 2147483647; background: white; border-radius: 16px;\
      padding: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); width: 320px;\
      animation: afSlideIn 0.3s ease;\
    }\
    .af-dialog-title { font-size: 16px; font-weight: 700; color: #333; margin-bottom: 16px; }\
    .af-dialog-field { margin-bottom: 12px; }\
    .af-dialog-field label { display: block; font-size: 12px; color: #666; margin-bottom: 4px; }\
    .af-dialog-field input { width: 100%; padding: 8px 12px; border: 2px solid #FFE4E9; border-radius: 8px; font-size: 13px; outline: none; }\
    .af-dialog-field input:focus { border-color: #FFB7C5; }\
    .af-dialog-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }\
    .af-btn-save { background: #FFB7C5; color: white; padding: 8px 20px; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }\
    .af-btn-save:hover { background: #FF9DB3; }\
    .af-btn-cancel { background: #f0f0f0; color: #666; padding: 8px 20px; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; }\
    .af-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 2147483646; }\
    .af-toast {\
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);\
      z-index: 2147483647; padding: 10px 20px; border-radius: 8px;\
      font-size: 13px; font-weight: 500; animation: afSlideIn 0.3s ease;\
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);\
    }\
    .af-toast-success { background: #d4edda; color: #155724; }\
    .af-toast-error { background: #f8d7da; color: #721c24; }\
    .af-toast-info { background: #d1ecf1; color: #0c5460; }\
    .hidden { display: none !important; }\
  ';

  /**
   * 初始化 Shadow DOM 容器
   */
  function init() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'resume-autofill-ui';
    shadow = container.attachShadow({ mode: 'closed' });

    var style = document.createElement('style');
    style.textContent = CSS;
    shadow.appendChild(style);

    document.body.appendChild(container);
  }

  /**
   * 显示自动填充触发按钮 + 记录投递按钮
   */
  function showAutofillTrigger() {
    init();
    if (triggerBtn) return;

    // 填充按钮
    triggerBtn = document.createElement('button');
    triggerBtn.className = 'af-trigger';
    triggerBtn.innerHTML = '📋';
    triggerBtn.title = '一键填充简历';

    // 拖拽支持
    var isDragging = false, startX, startY, startRight, startBottom;
    triggerBtn.addEventListener('mousedown', function(e) {
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      startRight = parseInt(triggerBtn.style.right || '24');
      startBottom = parseInt(triggerBtn.style.bottom || '24');

      function onMove(ev) {
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          isDragging = true;
          triggerBtn.classList.add('dragging');
          triggerBtn.style.right = (startRight - dx) + 'px';
          triggerBtn.style.bottom = (startBottom + dy) + 'px';
        }
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        triggerBtn.classList.remove('dragging');
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    triggerBtn.addEventListener('click', function(e) {
      if (isDragging) { e.preventDefault(); return; }
      performAutofill();
    });

    shadow.appendChild(triggerBtn);

    // 记录投递按钮（始终显示，不依赖填充成功）
    showRecordButton();
  }

  /**
   * 隐藏触发按钮
   */
  function hideAutofillTrigger() {
    if (triggerBtn) { triggerBtn.remove(); triggerBtn = null; }
  }

  /**
   * 显示填充确认面板
   */
  function showConfirmation(result) {
    init();
    hideConfirmation();

    confirmPanel = document.createElement('div');
    confirmPanel.className = 'af-confirm';

    var filledCount = result.filled.length;
    var skippedCount = result.skipped.length;

    var listHTML = result.filled.map(function(item) {
      var displayValue = item.value.length > 20 ? item.value.substring(0, 20) + '...' : item.value;
      return '<div class="af-confirm-item"><strong>' + item.fieldName + '</strong>: ' + displayValue + '</div>';
    }).join('');

    confirmPanel.innerHTML = '\
      <div class="af-confirm-title">✅ 填充完成</div>\
      <div class="af-confirm-stats">成功 <span>' + filledCount + '</span> 个字段，跳过 ' + skippedCount + ' 个</div>\
      <div class="af-confirm-list">' + listHTML + '</div>\
      <div class="af-confirm-actions">\
        <button class="af-btn af-btn-undo">↩ 撤销</button>\
        <button class="af-btn af-btn-close">确认</button>\
      </div>';

    confirmPanel.querySelector('.af-btn-undo').addEventListener('click', function() {
      AutofillEngine.undo();
      hideConfirmation();
      showNotification('已撤销填充', 'info');
    });
    confirmPanel.querySelector('.af-btn-close').addEventListener('click', function() {
      hideConfirmation();
    });

    shadow.appendChild(confirmPanel);

    // 10 秒自动消失
    confirmTimeout = setTimeout(function() { hideConfirmation(); }, 10000);
  }

  function hideConfirmation() {
    if (confirmTimeout) { clearTimeout(confirmTimeout); confirmTimeout = null; }
    if (confirmPanel) { confirmPanel.remove(); confirmPanel = null; }
  }

  /**
   * 显示"记录本次投递"按钮
   */
  function showRecordButton() {
    init();
    hideRecordButton();
    recordBtn = document.createElement('button');
    recordBtn.className = 'af-record';
    recordBtn.textContent = '📌 记录本次投递';

    recordBtn.addEventListener('click', function() {
      showRecordDialog();
    });

    shadow.appendChild(recordBtn);
  }

  function hideRecordButton() {
    if (recordBtn) { recordBtn.remove(); recordBtn = null; }
  }

  /**
   * 显示记录投递确认对话框
   */
  function showRecordDialog() {
    var company = InfoExtractor.extractCompany();
    var position = InfoExtractor.extractPosition();

    var overlay = document.createElement('div');
    overlay.className = 'af-overlay';

    var dialog = document.createElement('div');
    dialog.className = 'af-dialog';
    dialog.innerHTML = '\
      <div class="af-dialog-title">📌 记录本次投递</div>\
      <div class="af-dialog-field">\
        <label>公司名称</label>\
        <input type="text" id="af-company" value="' + company.replace(/"/g, '&quot;') + '" />\
      </div>\
      <div class="af-dialog-field">\
        <label>投递职位</label>\
        <input type="text" id="af-position" value="' + position.replace(/"/g, '&quot;') + '" />\
      </div>\
      <div class="af-dialog-actions">\
        <button class="af-btn-cancel">取消</button>\
        <button class="af-btn-save">保存记录</button>\
      </div>';

    dialog.querySelector('.af-btn-cancel').addEventListener('click', function() {
      overlay.remove();
      dialog.remove();
    });

    dialog.querySelector('.af-btn-save').addEventListener('click', function() {
      var companyVal = dialog.querySelector('#af-company').value.trim();
      var positionVal = dialog.querySelector('#af-position').value.trim();

      ApplicationStorage.addRecord({
        url: window.location.href,
        pageTitle: document.title,
        company: companyVal || company,
        position: positionVal || position
      }).then(function() {
        overlay.remove();
        dialog.remove();
        hideRecordButton();
        showNotification('✅ 投递记录已保存！', 'success');
      }).catch(function(err) {
        showNotification('❌ 保存失败: ' + err.message, 'error');
      });
    });

    overlay.addEventListener('click', function() {
      overlay.remove();
      dialog.remove();
    });

    shadow.appendChild(overlay);
    shadow.appendChild(dialog);
  }

  /**
   * 显示通知
   */
  function showNotification(message, type) {
    init();
    var toast = document.createElement('div');
    toast.className = 'af-toast af-toast-' + type;
    toast.textContent = message;
    shadow.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
  }

  /**
   * 执行自动填充流程
   */
  function performAutofill() {
    chrome.storage.local.get(['resume'], function(result) {
      var resume = result.resume;
      if (!resume) {
        showNotification('请先在扩展中上传并解析简历', 'info');
        return;
      }

      var fillResult = AutofillEngine.fill(resume);

      if (fillResult.filled.length === 0) {
        showNotification('未找到可填充的表单字段', 'info');
        return;
      }

      showConfirmation(fillResult);
    });
  }

  return {
    showAutofillTrigger: showAutofillTrigger,
    hideAutofillTrigger: hideAutofillTrigger,
    showConfirmation: showConfirmation,
    showRecordButton: showRecordButton,
    hideRecordButton: hideRecordButton,
    showNotification: showNotification,
    performAutofill: performAutofill
  };
})();
