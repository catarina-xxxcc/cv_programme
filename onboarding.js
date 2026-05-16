/**
 * 冷启动引导 - 欢迎页 + 昵称/头像选择
 * 首次访问显示欢迎页，完成后存储用户信息到 localStorage
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'userProfile';

  // 检查是否已完成引导
  var profile = localStorage.getItem(STORAGE_KEY);
  if (profile) {
    // 已完成引导，更新侧边栏显示
    try {
      var data = JSON.parse(profile);
      updateSidebar(data);
    } catch(e) {}
    return;
  }

  // 首次访问：显示欢迎页
  showWelcomePage();

  function showWelcomePage() {
    var overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.className = 'ob-overlay ob-visible';
    overlay.innerHTML = buildWelcomeHTML();
    document.body.appendChild(overlay);

    // 隐藏主内容
    var mainArea = document.querySelector('.main-area');
    var sidebar = document.querySelector('.profile-sidebar');
    if (mainArea) mainArea.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';

    // 绑定开始按钮
    document.getElementById('obStartBtn').addEventListener('click', function() {
      showProfileSetup(overlay);
    });
  }

  function showProfileSetup(overlay) {
    overlay.innerHTML = buildProfileHTML();

    // 绑定头像选择
    var avatarOptions = overlay.querySelectorAll('.ob-avatar-option');
    var selectedAvatar = null;
    avatarOptions.forEach(function(opt) {
      opt.addEventListener('click', function() {
        avatarOptions.forEach(function(o) { o.classList.remove('ob-avatar-active'); });
        opt.classList.add('ob-avatar-active');
        selectedAvatar = opt.getAttribute('data-avatar');
        document.getElementById('obAvatarPreview').textContent = selectedAvatar;
        checkCanFinish();
      });
    });

    // 绑定昵称输入
    var nicknameInput = document.getElementById('obNicknameInput');
    nicknameInput.addEventListener('input', checkCanFinish);

    // 绑定完成按钮
    document.getElementById('obFinishBtn').addEventListener('click', function() {
      var nickname = nicknameInput.value.trim();
      if (!nickname || !selectedAvatar) return;

      // 保存用户信息
      var profileData = {
        nickname: nickname,
        avatar: selectedAvatar,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));

      // 淡出引导
      overlay.classList.add('ob-hiding');
      setTimeout(function() {
        overlay.remove();
        // 显示主内容
        var mainArea = document.querySelector('.main-area');
        var sidebar = document.querySelector('.profile-sidebar');
        if (mainArea) mainArea.style.display = '';
        if (sidebar) sidebar.style.display = '';
        updateSidebar(profileData);
      }, 500);
    });

    function checkCanFinish() {
      var btn = document.getElementById('obFinishBtn');
      var nickname = nicknameInput.value.trim();
      if (nickname && selectedAvatar) {
        btn.classList.remove('ob-btn-disabled');
      } else {
        btn.classList.add('ob-btn-disabled');
      }
    }
  }

  function buildWelcomeHTML() {
    return '' +
      '<div class="ob-welcome">' +
        '<div class="ob-welcome-header">' +
          '<img src="./girls.png" class="ob-girl-img" alt="" />' +
          '<h1 class="ob-welcome-title">小小求职拿下！</h1>' +
          '<p class="ob-welcome-subtitle">AI 帮你优化简历、匹配岗位、模拟面试、追踪投递进度<br>让求职更高效，更有方向</p>' +
        '</div>' +
        '<div class="ob-features">' +
          '<div class="ob-feature"><span class="ob-feature-icon">📋</span><div><strong>简历诊断</strong><span>AI 优化建议</span></div></div>' +
          '<div class="ob-feature"><span class="ob-feature-icon">🧠</span><div><strong>性格 & 岗位匹配</strong><span>智能推荐方向</span></div></div>' +
          '<div class="ob-feature"><span class="ob-feature-icon">💬</span><div><strong>面试辅导</strong><span>模拟面试练习</span></div></div>' +
          '<div class="ob-feature"><span class="ob-feature-icon">📊</span><div><strong>投递追踪</strong><span>可视化进度管理</span></div></div>' +
        '</div>' +
        '<div class="ob-preview">' +
          '<div class="ob-preview-card ob-preview-1"><div class="ob-preview-title">📋 简历诊断报告</div><div class="ob-preview-score">86</div><div class="ob-preview-label">综合评分</div></div>' +
          '<div class="ob-preview-card ob-preview-2"><div class="ob-preview-title">🧠 性格匹配</div><div class="ob-preview-radar">⭐</div><div class="ob-preview-label">五维分析</div></div>' +
          '<div class="ob-preview-card ob-preview-3"><div class="ob-preview-title">💬 模拟面试</div><div class="ob-preview-chat">🎤</div><div class="ob-preview-label">AI 对话</div></div>' +
          '<div class="ob-preview-card ob-preview-4"><div class="ob-preview-title">📊 投递追踪</div><div class="ob-preview-chart">32</div><div class="ob-preview-label">已投递</div></div>' +
        '</div>' +
        '<button class="ob-start-btn" id="obStartBtn">开始使用 →</button>' +
      '</div>';
  }

  function buildProfileHTML() {
    var avatars = ['😊', '😎', '🥰', '🤗', '💪', '🌸', '🦋', '✨', '🎀', '🐱', '🐰', '🦊'];
    var avatarHTML = avatars.map(function(a) {
      return '<div class="ob-avatar-option" data-avatar="' + a + '">' + a + '</div>';
    }).join('');

    return '' +
      '<div class="ob-profile">' +
        '<div class="ob-profile-header">' +
          '<div class="ob-avatar-preview" id="obAvatarPreview">👤</div>' +
          '<h2 class="ob-profile-title">设置你的个人信息</h2>' +
          '<p class="ob-profile-subtitle">选择一个头像和昵称，开始你的求职之旅</p>' +
        '</div>' +
        '<div class="ob-avatar-grid">' + avatarHTML + '</div>' +
        '<div class="ob-nickname-wrap">' +
          '<input type="text" id="obNicknameInput" class="ob-nickname-input" placeholder="输入你的昵称..." maxlength="12" />' +
        '</div>' +
        '<button class="ob-finish-btn ob-btn-disabled" id="obFinishBtn">完成设置 ✨</button>' +
      '</div>';
  }

  function updateSidebar(data) {
    // 更新侧边栏头像和昵称
    var avatarEl = document.querySelector('.sidebar-avatar');
    var nameEl = document.querySelector('.sidebar-username');
    if (avatarEl && data.avatar) avatarEl.textContent = data.avatar;
    if (nameEl && data.nickname) nameEl.textContent = data.nickname;
  }

})();
