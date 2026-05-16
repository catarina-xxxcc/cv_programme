/**
 * 冷启动引导 - 全屏图片欢迎页
 * startpage.png 铺满整个页面，点击"开启高效求职之旅"按钮跳转到昵称/头像设置
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
    overlay.innerHTML = '' +
      '<div class="ob-fullscreen">' +
        '<img src="./startpage.png" class="ob-bg-img" alt="小小求职拿下" />' +
        '<button class="ob-cta-btn" id="obStartBtn">🚀 开启高效求职之旅 →</button>' +
      '</div>';
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
    overlay.innerHTML = '' +
      '<div class="ob-profile">' +
        '<div class="ob-avatar-preview" id="obAvatarPreview">👤</div>' +
        '<h2 class="ob-profile-title">设置你的个人信息</h2>' +
        '<p class="ob-profile-subtitle">选择一个头像和昵称，开始你的求职之旅</p>' +
        '<div class="ob-avatar-grid">' +
          buildAvatarOptions() +
        '</div>' +
        '<input type="text" id="obNicknameInput" class="ob-nickname-input" placeholder="输入你的昵称..." maxlength="12" />' +
        '<button class="ob-finish-btn ob-btn-disabled" id="obFinishBtn">完成设置 ✨</button>' +
      '</div>';

    var avatarOptions = overlay.querySelectorAll('.ob-avatar-option');
    var selectedAvatar = null;
    var nicknameInput = document.getElementById('obNicknameInput');

    avatarOptions.forEach(function(opt) {
      opt.addEventListener('click', function() {
        avatarOptions.forEach(function(o) { o.classList.remove('ob-avatar-active'); });
        opt.classList.add('ob-avatar-active');
        selectedAvatar = opt.getAttribute('data-avatar');
        document.getElementById('obAvatarPreview').textContent = selectedAvatar;
        checkCanFinish();
      });
    });

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

  function buildAvatarOptions() {
    var avatars = ['😊', '😎', '🥰', '🤗', '💪', '🌸', '🦋', '✨', '🎀', '🐱', '🐰', '🦊'];
    return avatars.map(function(a) {
      return '<div class="ob-avatar-option" data-avatar="' + a + '">' + a + '</div>';
    }).join('');
  }

  function updateSidebar(data) {
    var avatarEl = document.querySelector('.user-avatar-placeholder');
    var nameEl = document.querySelector('.user-name');
    if (avatarEl && data.avatar) avatarEl.textContent = data.avatar;
    if (nameEl && data.nickname) nameEl.textContent = data.nickname;
  }
})();
