/**
 * 投递追踪 - 侧边栏 Tab 切换 + 投递记录展示
 * 通过 postMessage 从 Chrome 扩展读取投递记录
 */
(function() {
  'use strict';

  // Tab 切换
  var sidebarTabs = document.querySelectorAll('.sidebar-tab[data-sidebar-tab]');
  var sidebarContents = document.querySelectorAll('.sidebar-tab-content');

  sidebarTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      sidebarTabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');

      var target = tab.getAttribute('data-sidebar-tab');
      sidebarContents.forEach(function(c) { c.classList.remove('active'); });

      if (target === 'resume') {
        document.getElementById('sidebarResumeTab').classList.add('active');
      } else {
        document.getElementById('sidebarTrackingTab').classList.add('active');
        loadTrackingData();
      }
    });
  });

  // 通信：向扩展请求数据
  var pendingRequests = {};
  var reqCounter = 0;

  window.addEventListener('message', function(event) {
    if (event.source !== window) return;
    if (!event.data || event.data.type !== 'RESUME_EXT_RESPONSE') return;
    var id = event.data.requestId;
    if (pendingRequests[id]) {
      pendingRequests[id](event.data.response);
      delete pendingRequests[id];
    }
  });

  function sendToExtension(payload) {
    return new Promise(function(resolve, reject) {
      var extId = document.documentElement.getAttribute('data-resume-ext-id');
      if (!extId) { reject(new Error('扩展未安装')); return; }

      var id = 'track_' + (++reqCounter);
      var timeout = setTimeout(function() {
        delete pendingRequests[id];
        reject(new Error('超时'));
      }, 5000);

      pendingRequests[id] = function(response) {
        clearTimeout(timeout);
        resolve(response);
      };

      window.postMessage({ type: 'RESUME_EXT_MSG', requestId: id, payload: payload }, '*');
    });
  }

  // 加载投递数据
  function loadTrackingData() {
    sendToExtension({ action: 'getApplicationRecords' }).then(function(res) {
      if (res && res.success && res.data) {
        renderTrackingList(res.data);
        renderStats(res.data);
      }
    }).catch(function() {
      // 扩展未安装，显示空状态
      renderTrackingList([]);
      renderStats([]);
    });
  }

  // 渲染统计
  function renderStats(records) {
    document.getElementById('trackingTotal').textContent = records.length;

    // 本周
    var now = new Date();
    var weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    var weekCount = records.filter(function(r) { return new Date(r.date) >= weekStart; }).length;
    document.getElementById('trackingWeek').textContent = weekCount;

    // 待回复（已投递状态）
    var pending = records.filter(function(r) { return r.status === '已投递'; }).length;
    document.getElementById('trackingPending').textContent = pending;
  }

  // 渲染投递列表
  function renderTrackingList(records) {
    var container = document.getElementById('trackingList');

    if (!records || records.length === 0) {
      container.innerHTML = '<div class="tracking-empty"><div class="tracking-empty-icon">📭</div><div class="tracking-empty-text">还没有投递记录</div><div class="tracking-empty-hint">使用插件在招聘网站填充简历后<br>点击"记录本次投递"即可追踪</div></div>';
      return;
    }

    var html = records.map(function(record) {
      var date = new Date(record.date);
      var dateStr = (date.getMonth() + 1) + '/' + date.getDate();
      var statusClass = 'tracking-status tracking-status-' + record.status;

      return '<div class="tracking-card" data-record-id="' + record.id + '">' +
        '<div class="tracking-card-header">' +
          '<span class="tracking-company">' + (record.company || '未知公司') + '</span>' +
          '<span class="tracking-date">' + dateStr + '</span>' +
        '</div>' +
        '<div class="tracking-position">' + (record.position || '未知职位') + '</div>' +
        '<span class="' + statusClass + '">' + record.status + '</span>' +
        '<div class="tracking-card-actions">' +
          '<button onclick="updateTrackingStatus(\'' + record.id + '\')">更新状态</button>' +
          '<button onclick="deleteTrackingRecord(\'' + record.id + '\')">删除</button>' +
        '</div>' +
      '</div>';
    }).join('');

    container.innerHTML = html;
  }

  // 更新状态
  window.updateTrackingStatus = function(id) {
    var statuses = ['已投递', '待面试', '已面试', '已录用', '已拒绝'];
    var choice = prompt('选择新状态：\n1. 已投递\n2. 待面试\n3. 已面试\n4. 已录用\n5. 已拒绝\n\n输入数字：');
    if (!choice) return;
    var idx = parseInt(choice) - 1;
    if (idx < 0 || idx >= statuses.length) return;

    sendToExtension({
      action: 'updateApplicationRecord',
      id: id,
      data: { status: statuses[idx] }
    }).then(function() {
      loadTrackingData();
    });
  };

  // 删除记录
  window.deleteTrackingRecord = function(id) {
    if (!confirm('确定删除这条投递记录吗？')) return;
    sendToExtension({
      action: 'deleteApplicationRecord',
      id: id
    }).then(function() {
      loadTrackingData();
    });
  };

})();
