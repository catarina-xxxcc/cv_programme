/**
 * 冷启动引导 - 全屏图片欢迎页 + 性别/头像/昵称/身份选择
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
        '<img src="./startpage.png" class="ob-bg-img" alt="" />' +
        '<button class="ob-cta-btn" id="obStartBtn">\uD83D\uDE80 \u5F00\u542F\u9AD8\u6548\u6C42\u804C\u4E4B\u65C5 \u2192</button>' +
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
        '<div class="ob-avatar-preview" id="obAvatarPreview">\uD83E\uDDD1</div>' +
        '<h2 class="ob-profile-title">\u8BBE\u7F6E\u4F60\u7684\u4E2A\u4EBA\u4FE1\u606F</h2>' +
        '<p class="ob-profile-subtitle">\u9009\u62E9\u5934\u50CF\u3001\u6635\u79F0\u548C\u8EAB\u4EFD\uFF0C\u5F00\u59CB\u4F60\u7684\u6C42\u804C\u4E4B\u65C5</p>' +

        '<div class="ob-section-label">\u6027\u522B</div>' +
        '<div class="ob-gender-row" id="obGenderRow">' +
          '<div class="ob-gender-option" data-gender="male"><span>\uD83D\uDC66</span>\u7537\u751F</div>' +
          '<div class="ob-gender-option" data-gender="female"><span>\uD83D\uDC67</span>\u5973\u751F</div>' +
        '</div>' +

        '<div class="ob-section-label">\u5934\u50CF</div>' +
        '<div class="ob-avatar-grid" id="obAvatarGrid">' +
          '<div class="ob-avatar-option" data-avatar="\uD83E\uDDD1">\uD83E\uDDD1</div>' +
          '<div class="ob-avatar-option" data-avatar="\uD83D\uDE4B\u200D\u2642\uFE0F">\uD83D\uDE4B\u200D\u2642\uFE0F</div>' +
          '<div class="ob-avatar-option" data-avatar="\uD83D\uDE4B\u200D\u2640\uFE0F">\uD83D\uDE4B\u200D\u2640\uFE0F</div>' +
          '<div class="ob-avatar-option" data-avatar="\uD83E\uDDD1\u200D\uD83D\uDCBB">\uD83E\uDDD1\u200D\uD83D\uDCBB</div>' +
          '<div class="ob-avatar-option" data-avatar="\uD83D\uDC68\u200D\uD83C\uDF93">\uD83D\uDC68\u200D\uD83C\uDF93</div>' +
          '<div class="ob-avatar-option" data-avatar="\uD83D\uDC69\u200D\uD83C\uDF93">\uD83D\uDC69\u200D\uD83C\uDF93</div>' +
          '<div class="ob-avatar-option" data-avatar="\uD83D\uDC68\u200D\uD83D\uDCBC">\uD83D\uDC68\u200D\uD83D\uDCBC</div>' +
          '<div class="ob-avatar-option" data-avatar="\uD83D\uDC69\u200D\uD83D\uDCBC">\uD83D\uDC69\u200D\uD83D\uDCBC</div>' +
          '<div class="ob-avatar-option" data-avatar="\uD83D\uDC68\u200D\uD83D\uDD2C">\uD83D\uDC68\u200D\uD83D\uDD2C</div>' +
          '<div class="ob-avatar-option" data-avatar="\uD83D\uDC69\u200D\uD83D\uDD2C">\uD83D\uDC69\u200D\uD83D\uDD2C</div>' +
          '<div class="ob-avatar-option" data-avatar="\uD83E\uDDD1\u200D\uD83C\uDFA8">\uD83E\uDDD1\u200D\uD83C\uDFA8</div>' +
          '<div class="ob-avatar-option" data-avatar="\uD83E\uDDD1\u200D\uD83D\uDE80">\uD83E\uDDD1\u200D\uD83D\uDE80</div>' +
        '</div>' +

        '<div class="ob-section-label">\u6635\u79F0</div>' +
        '<input type="text" id="obNicknameInput" class="ob-nickname-input" placeholder="\u8F93\u5165\u4F60\u7684\u6635\u79F0..." maxlength="12" />' +

        '<div class="ob-section-label">\u5F53\u524D\u8EAB\u4EFD</div>' +
        '<div class="ob-identity-grid" id="obIdentityGrid">' +
          '<div class="ob-identity-option" data-identity="intern">\uD83C\uDF31 \u627E\u5B9E\u4E60</div>' +
          '<div class="ob-identity-option" data-identity="fresh">\uD83C\uDF93 \u5E94\u5C4A\u751F\u79CB\u62DB/\u6625\u62DB</div>' +
          '<div class="ob-identity-option" data-identity="experienced">\uD83D\uDCBC \u6709\u5DE5\u4F5C\u7ECF\u9A8C</div>' +
        '</div>' +

        '<button class="ob-finish-btn ob-btn-disabled" id="obFinishBtn">\u5B8C\u6210\u8BBE\u7F6E \u2728</button>' +
      '</div>';

    var selectedAvatar = null;
    var selectedGender = null;
    var selectedIdentity = null;
    var nicknameInput = document.getElementById('obNicknameInput');

    // Gender selection
    var genderOptions = overlay.querySelectorAll('.ob-gender-option');
    genderOptions.forEach(function(opt) {
      opt.addEventListener('click', function() {
        genderOptions.forEach(function(o) { o.classList.remove('ob-gender-active'); });
        opt.classList.add('ob-gender-active');
        selectedGender = opt.getAttribute('data-gender');
        checkCanFinish();
      });
    });

    // Avatar selection
    var avatarOptions = overlay.querySelectorAll('.ob-avatar-option');
    avatarOptions.forEach(function(opt) {
      opt.addEventListener('click', function() {
        avatarOptions.forEach(function(o) { o.classList.remove('ob-avatar-active'); });
        opt.classList.add('ob-avatar-active');
        selectedAvatar = opt.getAttribute('data-avatar');
        document.getElementById('obAvatarPreview').textContent = selectedAvatar;
        checkCanFinish();
      });
    });

    // Identity selection
    var identityOptions = overlay.querySelectorAll('.ob-identity-option');
    identityOptions.forEach(function(opt) {
      opt.addEventListener('click', function() {
        identityOptions.forEach(function(o) { o.classList.remove('ob-identity-active'); });
        opt.classList.add('ob-identity-active');
        selectedIdentity = opt.getAttribute('data-identity');
        checkCanFinish();
      });
    });

    nicknameInput.addEventListener('input', checkCanFinish);

    document.getElementById('obFinishBtn').addEventListener('click', function() {
      var nickname = nicknameInput.value.trim();
      if (!nickname || !selectedAvatar || !selectedGender || !selectedIdentity) return;
      var profileData = {
        nickname: nickname,
        avatar: selectedAvatar,
        gender: selectedGender,
        identity: selectedIdentity,
        createdAt: new Date().toISOString()
      };
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
      if (nicknameInput.value.trim() && selectedAvatar && selectedGender && selectedIdentity) {
        btn.classList.remove('ob-btn-disabled');
      } else {
        btn.classList.add('ob-btn-disabled');
      }
    }
  }

  function updateSidebar(data) {
    var avatarEl = document.querySelector('.user-avatar-placeholder');
    var nameEl = document.querySelector('.user-name');
    if (avatarEl && data.avatar) avatarEl.textContent = data.avatar;
    if (nameEl && data.nickname) nameEl.textContent = data.nickname;
  }
})();
