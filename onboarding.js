/**
 * 冷启动引导 - 欢迎页 + 昵称/头像选择
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'userProfile';

  var profile = localStorage.getItem(STORAGE_KEY);
  if (profile) {
    try { updateSidebar(JSON.parse(profile)); } catch(e) {}
    return;
  }

  showWelcomePage();

  function showWelcomePage() {
    var overlay = document.createElement('div');
    overlay.id = 'onboardingOverlay';
    overlay.className = 'ob-overlay ob-visible';
    overlay.innerHTML = buildWelcomeHTML();
    document.body.appendChild(overlay);

    var mainArea = document.querySelector('.main-area');
    var sidebar = document.querySelector('.profile-sidebar');
    if (mainArea) mainArea.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';

    document.getElementById('obStartBtn').addEventListener('click', function() {
      showProfileSetup(overlay);
    });
  }

  function showProfileSetup(overlay) {
    overlay.innerHTML = buildProfileHTML();
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
    var nicknameInput = document.getElementById('obNicknameInput');
    nicknameInput.addEventListener('input', checkCanFinish);
    document.getElementById('obFinishBtn').addEventListener('click', function() {
      var nickname = nicknameInput.value.trim();
      if (!nickname || !selectedAvatar) return;
      var profileData = { nickname: nickname, avatar: selectedAvatar, createdAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));
      overlay.classList.add('ob-hiding');
      setTimeout(function() {
        overlay.remove();
        var mainArea = document.querySelector('.main-area');
        var sidebar = document.querySelector('.profile-sidebar');
        if (mainArea) mainArea.style.display = '';
        if (sidebar) sidebar.style.display = '';
        updateSidebar(profileData);
      }, 500);
    });
    function checkCanFinish() {
      var btn = document.getElementById('obFinishBtn');
      if (nicknameInput.value.trim() && selectedAvatar) btn.classList.remove('ob-btn-disabled');
      else btn.classList.add('ob-btn-disabled');
    }
  }

  function buildWelcomeHTML() {
    return '' +
    '<div class="ob-welcome">' +
      // 顶部标题区
      '<div class="ob-hero">' +
        '<div class="ob-hero-text">' +
          '<h1 class="ob-title">小小求职<span class="ob-title-accent">拿下</span>！</h1>' +
          '<p class="ob-subtitle">AI 帮你优化简历、匹配岗位、模拟面试、追踪投递进度<br>让求职更高效，更有方向</p>' +
        '</div>' +
        '<img src="./girls.png" class="ob-hero-img" alt="" />' +
      '</div>' +

      // 四个功能图标
      '<div class="ob-features">' +
        '<div class="ob-feat"><div class="ob-feat-icon ob-feat-pink">📋</div><div class="ob-feat-info"><strong>简历诊断</strong><span>AI 优化建议</span></div></div>' +
        '<div class="ob-feat"><div class="ob-feat-icon ob-feat-purple">🧠</div><div class="ob-feat-info"><strong>性格 & 岗位匹配</strong><span>智能推荐方向</span></div></div>' +
        '<div class="ob-feat"><div class="ob-feat-icon ob-feat-blue">💬</div><div class="ob-feat-info"><strong>面试辅导</strong><span>模拟面试练习</span></div></div>' +
        '<div class="ob-feat"><div class="ob-feat-icon ob-feat-green">📊</div><div class="ob-feat-info"><strong>投递追踪</strong><span>可视化进度管理</span></div></div>' +
      '</div>' +

      // 产品预览 - 直接用图片 + 3D 透视
      '<div class="ob-dashboard-preview">' +
        '<img src="./startpage.png" class="ob-preview-img" alt="产品预览" />' +
      '</div>' +

      // 底部导航图标
      '<div class="ob-nav-icons">' +
        '<div class="ob-nav-icon">📋</div>' +
        '<div class="ob-nav-icon">🧠</div>' +
        '<div class="ob-nav-icon">💬</div>' +
        '<div class="ob-nav-icon">📊</div>' +
      '</div>' +

      // 开始按钮
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
      '<div class="ob-avatar-preview" id="obAvatarPreview">👤</div>' +
      '<h2 class="ob-profile-title">设置你的个人信息</h2>' +
      '<p class="ob-profile-subtitle">选择一个头像和昵称，开始你的求职之旅</p>' +
      '<div class="ob-avatar-grid">' + avatarHTML + '</div>' +
      '<input type="text" id="obNicknameInput" class="ob-nickname-input" placeholder="输入你的昵称..." maxlength="12" />' +
      '<button class="ob-finish-btn ob-btn-disabled" id="obFinishBtn">完成设置 ✨</button>' +
    '</div>';
  }

  function updateSidebar(data) {
    var avatarEl = document.querySelector('.sidebar-avatar');
    var nameEl = document.querySelector('.sidebar-username');
    if (avatarEl && data.avatar) avatarEl.textContent = data.avatar;
    if (nameEl && data.nickname) nameEl.textContent = data.nickname;
  }
})();
