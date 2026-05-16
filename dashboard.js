/**
 * 仪表盘视图 - 三卡片概览 + 全屏切换详情
 * 默认显示仪表盘，点击卡片后切换到对应板块详情
 */
(function() {
  'use strict';

  // 等待 DOM 加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }

  function initDashboard() {
    var mainArea = document.querySelector('.main-area');
    if (!mainArea) return;

    // 隐藏原有内容
    var originalContent = mainArea.innerHTML;
    mainArea.setAttribute('data-view', 'dashboard');

    // 创建仪表盘 HTML
    var dashboardHTML = buildDashboardHTML();

    // 在 mainArea 开头插入仪表盘
    var dashDiv = document.createElement('div');
    dashDiv.id = 'dashboardView';
    dashDiv.className = 'dashboard-view';
    dashDiv.innerHTML = dashboardHTML;
    mainArea.insertBefore(dashDiv, mainArea.firstChild);

    // 把原有内容包在一个容器里
    var detailDiv = document.createElement('div');
    detailDiv.id = 'detailView';
    detailDiv.className = 'detail-view';
    detailDiv.style.display = 'none';

    // 移动原有子元素到 detailDiv
    while (mainArea.children.length > 1) {
      detailDiv.appendChild(mainArea.children[1]);
    }
    mainArea.appendChild(detailDiv);

    // 绑定卡片点击事件
    bindCardEvents(mainArea, dashDiv, detailDiv);
  }

  function buildDashboardHTML() {
    // 读取已有数据
    var mbti = localStorage.getItem('personalityMBTI') || '—';
    var mbtiName = (window.MBTI_NAMES && window.MBTI_NAMES[mbti]) || '未测试';

    return '' +
      '<div class="dash-cards">' +
        // 卡片 1：简历诊断
        '<div class="dash-card dash-card-1" data-panel="diagnosis">' +
          '<div class="dash-card-icon">📋</div>' +
          '<div class="dash-card-content">' +
            '<h3 class="dash-card-title">简历诊断</h3>' +
            '<p class="dash-card-desc">AI 分析你的简历，找出错别字、语法问题和优化建议</p>' +
            '<div class="dash-card-preview">' +
              '<span class="dash-tag">错别字检测</span>' +
              '<span class="dash-tag">语法优化</span>' +
              '<span class="dash-tag">评分</span>' +
            '</div>' +
          '</div>' +
          '<div class="dash-card-arrow">→</div>' +
        '</div>' +
        // 卡片 2：性格 & 岗位
        '<div class="dash-card dash-card-2" data-panel="mbti">' +
          '<div class="dash-card-icon">🧠</div>' +
          '<div class="dash-card-content">' +
            '<h3 class="dash-card-title">性格 & 岗位匹配</h3>' +
            '<p class="dash-card-desc">基于 MBTI 性格分析，推荐最适合你的职业方向</p>' +
            '<div class="dash-card-preview">' +
              '<span class="dash-badge">' + mbti + ' ' + mbtiName + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="dash-card-arrow">→</div>' +
        '</div>' +
        // 卡片 3：面试辅导
        '<div class="dash-card dash-card-3" data-panel="chat">' +
          '<div class="dash-card-icon">💬</div>' +
          '<div class="dash-card-content">' +
            '<h3 class="dash-card-title">面试辅导</h3>' +
            '<p class="dash-card-desc">AI 模拟面试官，帮你练习回答、提升表达能力</p>' +
            '<div class="dash-card-preview">' +
              '<span class="dash-tag">模拟面试</span>' +
              '<span class="dash-tag">简历生成</span>' +
              '<span class="dash-tag">话术练习</span>' +
            '</div>' +
          '</div>' +
          '<div class="dash-card-arrow">→</div>' +
        '</div>' +
      '</div>';
  }

  function bindCardEvents(mainArea, dashDiv, detailDiv) {
    var cards = dashDiv.querySelectorAll('.dash-card');
    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        // 切换到详情视图
        dashDiv.style.display = 'none';
        detailDiv.style.display = 'block';
        detailDiv.classList.add('detail-enter');
        mainArea.setAttribute('data-view', 'detail');

        // 添加返回按钮
        if (!detailDiv.querySelector('.detail-back-btn')) {
          var backBtn = document.createElement('button');
          backBtn.className = 'detail-back-btn';
          backBtn.innerHTML = '← 返回概览';
          backBtn.addEventListener('click', function() {
            detailDiv.style.display = 'none';
            detailDiv.classList.remove('detail-enter');
            dashDiv.style.display = 'block';
            mainArea.setAttribute('data-view', 'dashboard');
          });
          detailDiv.insertBefore(backBtn, detailDiv.firstChild);
        }

        // 滚动到对应板块
        var panel = card.getAttribute('data-panel');
        setTimeout(function() {
          var target = null;
          if (panel === 'diagnosis') target = document.getElementById('diagnosisPanel');
          else if (panel === 'mbti') target = document.querySelector('.result-panel');
          else if (panel === 'chat') target = document.querySelector('.chat-section') || document.querySelector('.agent-section');
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      });
    });
  }

})();
