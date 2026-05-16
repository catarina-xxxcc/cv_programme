/**
 * 仪表盘视图 - Apple Cover Flow 3D 轮播 + 全屏切换详情
 * 
 * 重要：.agent-section 在 .layout 内部（是 .layout 的子元素）
 * 所以显示面试辅导时，layout 必须可见，只隐藏 left-col 和 result-panel
 */
(function() {
  'use strict';

  var currentIndex = 0;
  var cards = [];
  var dots = [];
  var isAnimating = false;
  var backBtn = null;

  // 缓存 DOM 引用
  var mainArea, dashDiv, layout, leftCol, resultPanel, agentSection;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
  } else {
    initDashboard();
  }

  function initDashboard() {
    mainArea = document.querySelector('.main-area');
    if (!mainArea) return;

    // 获取原有元素引用（不移动它们）
    layout = mainArea.querySelector('.layout');
    leftCol = mainArea.querySelector('.left-col');
    resultPanel = mainArea.querySelector('.result-panel');
    agentSection = mainArea.querySelector('.agent-section');
    var trackingSection = mainArea.querySelector('.tracking-section');

    // 初始状态：隐藏原有内容，显示仪表盘
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
    backBtn.innerHTML = '← 返回概览';
    backBtn.style.display = 'none';
    backBtn.addEventListener('click', goBack);
    mainArea.insertBefore(backBtn, layout);

    mainArea.setAttribute('data-view', 'dashboard');

    // 初始化 Cover Flow
    cards = Array.from(dashDiv.querySelectorAll('.dash-card'));
    dots = Array.from(dashDiv.querySelectorAll('.cflow-dot'));
    updateCoverFlow();
    bindEvents();

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
    var mbti = localStorage.getItem('personalityMBTI') || '—';
    var mbtiName = (window.MBTI_NAMES && window.MBTI_NAMES[mbti]) || '未测试';

    return '' +
      '<div class="dash-cards">' +
        '<button class="cflow-nav cflow-nav-left" aria-label="上一张">\u2039</button>' +
        '<div class="dash-card dash-card-1" data-panel="diagnosis" data-index="0">' +
          '<div class="dash-card-icon">\uD83D\uDCCB</div>' +
          '<div class="dash-card-content">' +
            '<h3 class="dash-card-title">简历诊断</h3>' +
            '<p class="dash-card-desc">上传简历，AI 帮你找出错别字、语法问题，给出优化建议和评分</p>' +
            '<div class="dash-card-preview">' +
              '<span class="dash-tag">错别字检测</span>' +
              '<span class="dash-tag">语法优化</span>' +
              '<span class="dash-tag">综合评分</span>' +
            '</div>' +
          '</div>' +
          '<div class="dash-card-arrow">点击进入 \u2192</div>' +
        '</div>' +
        '<div class="dash-card dash-card-2" data-panel="mbti" data-index="1">' +
          '<div class="dash-card-icon">\uD83E\uDDE0</div>' +
          '<div class="dash-card-content">' +
            '<h3 class="dash-card-title">性格 & 岗位匹配</h3>' +
            '<p class="dash-card-desc">基于你的 MBTI 性格类型，智能推荐最适合的职业方向和岗位</p>' +
            '<div class="dash-card-preview">' +
              '<span class="dash-badge">' + mbti + ' ' + mbtiName + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="dash-card-arrow">点击进入 \u2192</div>' +
        '</div>' +
        '<div class="dash-card dash-card-3" data-panel="chat" data-index="2">' +
          '<div class="dash-card-icon">\uD83D\uDCAC</div>' +
          '<div class="dash-card-content">' +
            '<h3 class="dash-card-title">面试辅导</h3>' +
            '<p class="dash-card-desc">AI 模拟面试官和你对话，帮你练习回答技巧、提升表达能力</p>' +
            '<div class="dash-card-preview">' +
              '<span class="dash-tag">模拟面试</span>' +
              '<span class="dash-tag">简历生成</span>' +
              '<span class="dash-tag">话术练习</span>' +
            '</div>' +
          '</div>' +
          '<div class="dash-card-arrow">开始练习 \u2192</div>' +
        '</div>' +
        '<div class="dash-card dash-card-4" data-panel="tracking" data-index="3">' +
          '<div class="dash-card-icon">\uD83D\uDCCA</div>' +
          '<div class="dash-card-content">' +
            '<h3 class="dash-card-title">投递追踪</h3>' +
            '<p class="dash-card-desc">记录每次投递，可视化追踪进度，智能提醒超时和转化率</p>' +
            '<div class="dash-card-preview">' +
              '<span class="dash-tag">投递记录</span>' +
              '<span class="dash-tag">进度追踪</span>' +
              '<span class="dash-tag">智能提醒</span>' +
            '</div>' +
          '</div>' +
          '<div class="dash-card-arrow">查看投递 \u2192</div>' +
        '</div>' +
        '<button class="cflow-nav cflow-nav-right" aria-label="下一张">\u203A</button>' +
      '</div>' +
      '<div class="cflow-indicators">' +
        '<span class="cflow-dot" data-index="0"></span>' +
        '<span class="cflow-dot" data-index="1"></span>' +
        '<span class="cflow-dot" data-index="2"></span>' +
        '<span class="cflow-dot" data-index="3"></span>' +
      '</div>';
  }

  // ===== Cover Flow 逻辑 =====

  function updateCoverFlow() {
    var total = cards.length; // 4
    cards.forEach(function(card, i) {
      card.classList.remove('cflow-left', 'cflow-center', 'cflow-right', 'cflow-hidden');
      var offset = (i - currentIndex + total) % total;
      if (offset === 0) card.classList.add('cflow-center');
      else if (offset === 1) card.classList.add('cflow-right');
      else if (offset === total - 1) card.classList.add('cflow-left');
      else card.classList.add('cflow-hidden');
    });
    dots.forEach(function(dot, i) {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  function goTo(index) {
    if (isAnimating || index === currentIndex) return;
    var total = cards.length;
    if (index < 0) index = total - 1;
    if (index >= total) index = 0;
    isAnimating = true;
    currentIndex = index;
    updateCoverFlow();
    setTimeout(function() { isAnimating = false; }, 600);
  }

  // ===== 详情切换 =====

  function openDetail(panel) {
    // 隐藏仪表盘
    dashDiv.style.display = 'none';
    backBtn.style.display = '';
    mainArea.setAttribute('data-view', 'detail');

    // 显示 layout（因为所有面板都在 layout 里面）
    if (layout) {
      layout.style.display = 'grid';
      layout.style.gridTemplateColumns = '1fr';
    }

    // 先隐藏 layout 里的所有直接子面板
    if (leftCol) leftCol.style.display = 'none';
    if (resultPanel) resultPanel.style.display = 'none';
    if (agentSection) agentSection.style.display = 'none';
    var trackingSec = mainArea.querySelector('.tracking-section');
    if (trackingSec) trackingSec.style.display = 'none';

    // 只显示目标面板
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
    // 隐藏所有详情内容
    if (layout) layout.style.display = 'none';

    // 显示仪表盘
    dashDiv.style.display = '';
    backBtn.style.display = 'none';
    mainArea.setAttribute('data-view', 'dashboard');

    // 恢复子元素默认状态
    if (leftCol) leftCol.style.display = '';
    if (resultPanel) resultPanel.style.display = '';
    if (agentSection) agentSection.style.display = '';
    var trackingSec = mainArea.querySelector('.tracking-section');
    if (trackingSec) trackingSec.style.display = '';

    window.scrollTo(0, 0);
  }

  // ===== 事件绑定 =====

  function bindEvents() {
    // 点击卡片
    cards.forEach(function(card) {
      card.addEventListener('click', function() {
        var idx = parseInt(card.getAttribute('data-index'));
        if (idx === currentIndex) {
          openDetail(card.getAttribute('data-panel'));
        } else {
          goTo(idx);
        }
      });
    });

    // 指示器
    dots.forEach(function(dot) {
      dot.addEventListener('click', function() {
        goTo(parseInt(dot.getAttribute('data-index')));
      });
    });

    // 箭头
    var leftNav = dashDiv.querySelector('.cflow-nav-left');
    var rightNav = dashDiv.querySelector('.cflow-nav-right');
    if (leftNav) leftNav.addEventListener('click', function(e) { e.stopPropagation(); goTo(currentIndex - 1); });
    if (rightNav) rightNav.addEventListener('click', function(e) { e.stopPropagation(); goTo(currentIndex + 1); });

    // 键盘
    document.addEventListener('keydown', function(e) {
      if (mainArea.getAttribute('data-view') !== 'dashboard') return;
      if (e.key === 'ArrowLeft') goTo(currentIndex - 1);
      if (e.key === 'ArrowRight') goTo(currentIndex + 1);
    });

    // 触摸滑动
    var startX = 0;
    var dashCards = dashDiv.querySelector('.dash-cards');
    dashCards.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive: true });
    dashCards.addEventListener('touchend', function(e) {
      var diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goTo(currentIndex - 1);
        else goTo(currentIndex + 1);
      }
    }, { passive: true });

    // 鼠标拖拽
    var mouseDown = false, mouseStartX = 0;
    dashCards.addEventListener('mousedown', function(e) { mouseDown = true; mouseStartX = e.clientX; });
    document.addEventListener('mouseup', function(e) {
      if (!mouseDown) return;
      mouseDown = false;
      var diff = e.clientX - mouseStartX;
      if (Math.abs(diff) > 60) {
        if (diff > 0) goTo(currentIndex - 1);
        else goTo(currentIndex + 1);
      }
    });
  }

})();
