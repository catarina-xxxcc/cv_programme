/**
 * 仪表盘视图 - 四角卡片环绕中心图片
 * 中间放 mainpage.png，四张功能卡片在四个角
 * 点击卡片进入对应板块详情
 */
(function() {
  'use strict';

  var backBtn = null;
  var mainArea, dashDiv, layout, leftCol, resultPanel, agentSection;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }

  function initDashboard() {
    mainArea = document.querySelector('.main-area');
    if (!mainArea) return;

    layout = mainArea.querySelector('.layout');
    leftCol = mainArea.querySelector('.left-col');
    resultPanel = mainArea.querySelector('.result-panel');
    agentSection = mainArea.querySelector('.agent-section');

    // 初始状态：隐藏原有内容
    if (layout) layout.style.display = 'none';

    // 创建仪表盘
    dashDiv = document.createElement('div');
    dashDiv.id = 'dashboardView';
    dashDiv.className = 'dashboard-view';
    dashDiv.innerHTML = buildDashboardHTML();
    mainArea.insertBefore(dashDiv, mainArea.firstChild);

    // 创建返回按钮（初始隐藏）
    backBtn = document.createElement('button');
    backBtn.className = 'detail-back-btn';
    backBtn.innerHTML = '\u2190 返回概览';
    backBtn.style.display = 'none';
    backBtn.addEventListener('click', goBack);
    mainArea.insertBefore(backBtn, layout);

    mainArea.setAttribute('data-view', 'dashboard');

    // 绑定卡片点击
    var cards = dashDiv.querySelectorAll('.dash-card');
    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        openDetail(card.getAttribute('data-panel'));
      });
    });

    // 绑定插件安装弹窗
    var btnInstall = document.getElementById('btnInstallPlugin');
    var modalOverlay = document.getElementById('pluginModalOverlay');
    var modalClose = document.getElementById('pluginModalClose');
    if (btnInstall && modalOverlay) {
      btnInstall.addEventListener('click', function() {
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
    }
    if (modalClose && modalOverlay) {
      modalClose.addEventListener('click', function() {
        modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    }
    if (modalOverlay) {
      modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
          modalOverlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    }
  }

  function buildDashboardHTML() {
    var mbti = localStorage.getItem('personalityMBTI') || '\u2014';
    var mbtiName = (window.MBTI_NAMES && window.MBTI_NAMES[mbti]) || '\u672A\u6D4B\u8BD5';

    return '<div class="dash-grid">' +
      // 左上：简历诊断
      '<div class="dash-card dash-card-1" data-panel="diagnosis" data-index="0">' +
        '<div class="dash-card-icon">\uD83D\uDCCB</div>' +
        '<div class="dash-card-content">' +
          '<h3 class="dash-card-title">\u7B80\u5386\u8BCA\u65AD</h3>' +
          '<p class="dash-card-desc">\u4E0A\u4F20\u7B80\u5386\uFF0CAI \u5E2E\u4F60\u627E\u51FA\u9519\u522B\u5B57\u3001\u8BED\u6CD5\u95EE\u9898\uFF0C\u7ED9\u51FA\u4F18\u5316\u5EFA\u8BAE</p>' +
          '<div class="dash-card-preview">' +
            '<span class="dash-tag">\u9519\u522B\u5B57\u68C0\u6D4B</span>' +
            '<span class="dash-tag">\u8BED\u6CD5\u4F18\u5316</span>' +
            '<span class="dash-tag">\u7EFC\u5408\u8BC4\u5206</span>' +
          '</div>' +
        '</div>' +
        '<div class="dash-card-arrow">\u67E5\u770B\u8BE6\u60C5 \u2192</div>' +
      '</div>' +
      // 右上：性格匹配
      '<div class="dash-card dash-card-2" data-panel="mbti" data-index="1">' +
        '<div class="dash-card-icon">\uD83E\uDDE0</div>' +
        '<div class="dash-card-content">' +
          '<h3 class="dash-card-title">\u6027\u683C & \u5C97\u4F4D\u5339\u914D</h3>' +
          '<p class="dash-card-desc">\u57FA\u4E8E MBTI \u6027\u683C\u7C7B\u578B\uFF0C\u667A\u80FD\u63A8\u8350\u6700\u9002\u5408\u7684\u804C\u4E1A\u65B9\u5411</p>' +
          '<div class="dash-card-preview">' +
            '<span class="dash-badge">' + mbti + ' ' + mbtiName + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="dash-card-arrow">\u67E5\u770B\u8BE6\u60C5 \u2192</div>' +
      '</div>' +
      // 中间图片（已删除）
      // 左下：面试辅导
      '<div class="dash-card dash-card-3" data-panel="chat" data-index="2">' +
        '<div class="dash-card-icon">\uD83D\uDCAC</div>' +
        '<div class="dash-card-content">' +
          '<h3 class="dash-card-title">\u9762\u8BD5\u8F85\u5BFC</h3>' +
          '<p class="dash-card-desc">AI \u6A21\u62DF\u9762\u8BD5\u5B98\u548C\u4F60\u5BF9\u8BDD\uFF0C\u5E2E\u4F60\u7EC3\u4E60\u56DE\u7B54\u6280\u5DE7</p>' +
          '<div class="dash-card-preview">' +
            '<span class="dash-tag">\u6A21\u62DF\u9762\u8BD5</span>' +
            '<span class="dash-tag">\u7B80\u5386\u751F\u6210</span>' +
            '<span class="dash-tag">\u8BDD\u672F\u7EC3\u4E60</span>' +
          '</div>' +
        '</div>' +
        '<div class="dash-card-arrow">\u5F00\u59CB\u7EC3\u4E60 \u2192</div>' +
      '</div>' +
      // 右下：投递追踪
      '<div class="dash-card dash-card-4" data-panel="tracking" data-index="3">' +
        '<div class="dash-card-icon">\uD83D\uDCCA</div>' +
        '<div class="dash-card-content">' +
          '<h3 class="dash-card-title">\u6295\u9012\u8FFD\u8E2A</h3>' +
          '<p class="dash-card-desc">\u8BB0\u5F55\u6BCF\u6B21\u6295\u9012\uFF0C\u53EF\u89C6\u5316\u8FFD\u8E2A\u8FDB\u5EA6\uFF0C\u667A\u80FD\u63D0\u9192</p>' +
          '<div class="dash-card-preview">' +
            '<span class="dash-tag">\u6295\u9012\u8BB0\u5F55</span>' +
            '<span class="dash-tag">\u8FDB\u5EA6\u8FFD\u8E2A</span>' +
            '<span class="dash-tag">\u667A\u80FD\u63D0\u9192</span>' +
          '</div>' +
        '</div>' +
        '<div class="dash-card-arrow">\u67E5\u770B\u6295\u9012 \u2192</div>' +
      '</div>' +
    '</div>';
  }

  function openDetail(panel) {
    dashDiv.style.display = 'none';
    backBtn.style.display = '';
    mainArea.setAttribute('data-view', 'detail');

    if (layout) {
      layout.style.display = 'grid';
      layout.style.gridTemplateColumns = '1fr';
    }

    if (leftCol) leftCol.style.display = 'none';
    if (resultPanel) resultPanel.style.display = 'none';
    if (agentSection) agentSection.style.display = 'none';
    var trackingSec = mainArea.querySelector('.tracking-section');
    if (trackingSec) trackingSec.style.display = 'none';

    if (panel === 'diagnosis') {
      if (leftCol) leftCol.style.display = '';
    } else if (panel === 'mbti') {
      if (resultPanel) resultPanel.style.display = '';
    } else if (panel === 'chat') {
      if (agentSection) agentSection.style.display = '';
    } else if (panel === 'tracking') {
      if (trackingSec) trackingSec.style.display = '';
    }

    window.scrollTo(0, 0);
  }

  function goBack() {
    if (layout) layout.style.display = 'none';
    dashDiv.style.display = '';
    backBtn.style.display = 'none';
    mainArea.setAttribute('data-view', 'dashboard');

    if (leftCol) leftCol.style.display = '';
    if (resultPanel) resultPanel.style.display = '';
    if (agentSection) agentSection.style.display = '';
    var trackingSec = mainArea.querySelector('.tracking-section');
    if (trackingSec) trackingSec.style.display = '';

    window.scrollTo(0, 0);
  }

})();
