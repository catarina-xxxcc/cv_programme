/**
 * 冷启动引导 - 首次访问用户的性格测试
 * 流程：欢迎+设置形象 → 6道性格题 → 显示结果 → 进入主页
 */
(function() {
  'use strict';

  // 题目数据
  var QUESTIONS = [
    {
      id: 'q1', dimension: 'EI',
      text: '周末你更想怎么度过？',
      emoji: '🌈',
      options: [
        { id: 'a', text: '🎉 约朋友出去浪', weights: { E: 2 } },
        { id: 'b', text: '🏠 在家追剧/打游戏', weights: { I: 2 } },
        { id: 'c', text: '☕ 去咖啡厅安静待着', weights: { I: 1 } }
      ]
    },
    {
      id: 'q2', dimension: 'SN',
      text: '做课程作业时，你更倾向于？',
      emoji: '📚',
      options: [
        { id: 'a', text: '📋 按模板一步步来，稳妥', weights: { S: 2 } },
        { id: 'b', text: '💡 自己想个创新方式', weights: { N: 2 } },
        { id: 'c', text: '🔍 先研究别人怎么做的', weights: { S: 1, N: 1 } }
      ]
    },
    {
      id: 'q3', dimension: 'TF',
      text: '朋友跟你吐槽工作不顺，你会？',
      emoji: '💬',
      options: [
        { id: 'a', text: '🧠 帮 ta 分析问题、给建议', weights: { T: 2 } },
        { id: 'b', text: '🤗 先安慰 ta、表示理解', weights: { F: 2 } }
      ]
    },
    {
      id: 'q4', dimension: 'JP',
      text: '旅行时你更喜欢？',
      emoji: '✈️',
      options: [
        { id: 'a', text: '📝 提前做好详细攻略', weights: { J: 2 } },
        { id: 'b', text: '🎲 到了再说，随心走', weights: { P: 2 } },
        { id: 'c', text: '📌 大方向定好，细节随意', weights: { J: 1, P: 1 } }
      ]
    },
    {
      id: 'q5', dimension: 'EI',
      text: '小组讨论时，你通常？',
      emoji: '🗣️',
      options: [
        { id: 'a', text: '🎤 主动发言、带节奏', weights: { E: 2 } },
        { id: 'b', text: '👂 先听别人说，想好了再开口', weights: { I: 2 } }
      ]
    },
    {
      id: 'q6', dimension: 'TF',
      text: '选实习岗位时，你更看重？',
      emoji: '💼',
      options: [
        { id: 'a', text: '📈 薪资待遇和发展前景', weights: { T: 2 } },
        { id: 'b', text: '🌱 团队氛围和工作意义', weights: { F: 2 } },
        { id: 'c', text: '🎯 能学到新技能', weights: { T: 1, N: 1 } }
      ]
    }
  ];

  // 检查是否需要显示引导
  if (localStorage.getItem('onboardingDone') === 'true') return;

  var answers = [];
  var currentQ = 0;
  var nickname = '';
  var avatarData = null;

  // 创建 overlay
  var overlay = document.createElement('div');
  overlay.id = 'onboardingOverlay';
  overlay.className = 'ob-overlay';
  overlay.innerHTML = buildProfileHTML();
  document.body.appendChild(overlay);

  // 延迟显示动画
  requestAnimationFrame(function() {
    overlay.classList.add('ob-visible');
  });

  // 绑定事件
  bindProfileEvents();

  // ===== HTML 构建 =====

  function buildProfileHTML() {
    var avatars = [
      '👩‍💻', '👨‍💻', '👩‍🎨', '👨‍🎨',
      '🧑‍🎓', '👩‍🔬', '👨‍🚀', '👩‍🎤',
      '🧑‍💼', '👩‍🏫', '👨‍🔧', '🧑‍🎨',
      '👩‍⚕️', '👨‍🍳', '🧑‍🚒', '🦸‍♀️'
    ];
    var avatarGrid = avatars.map(function(emoji) {
      return '<button class="ob-avatar-option" data-avatar="' + emoji + '">' + emoji + '</button>';
    }).join('');

    return '<div class="ob-card ob-card-enter">' +
      '<div class="ob-welcome-emoji">🌸</div>' +
      '<h2 class="ob-title">欢迎来到小小求职拿下</h2>' +
      '<p class="ob-subtitle">花 1 分钟了解你，为你推荐最合适的方向</p>' +
      '<div class="ob-avatar-selected" id="obAvatarSelected">' +
        '<span class="ob-avatar-big" id="obAvatarBig">👤</span>' +
      '</div>' +
      '<p class="ob-avatar-label">选择你的形象</p>' +
      '<div class="ob-avatar-grid" id="obAvatarGrid">' + avatarGrid + '</div>' +
      '<div class="ob-input-wrap">' +
        '<input type="text" id="obNicknameInput" class="ob-nickname-input" placeholder="输入你的昵称" maxlength="20" />' +
      '</div>' +
      '<button class="ob-btn ob-btn-disabled" id="obContinueBtn" disabled>开始探索 →</button>' +
      '<div class="ob-progress-dots">' +
        '<span class="ob-dot ob-dot-active"></span>' +
        '<span class="ob-dot"></span>' +
        '<span class="ob-dot"></span>' +
      '</div>' +
    '</div>';
  }

  function buildQuestionHTML(q, index) {
    var optionsHTML = q.options.map(function(opt) {
      return '<button class="ob-option" data-option-id="' + opt.id + '">' + opt.text + '</button>';
    }).join('');

    return '<div class="ob-card ob-card-enter">' +
      '<div class="ob-progress-bar"><div class="ob-progress-fill" style="width:' + ((index + 1) / QUESTIONS.length * 100) + '%"></div></div>' +
      '<div class="ob-q-counter">' + (index + 1) + ' / ' + QUESTIONS.length + '</div>' +
      '<div class="ob-q-emoji">' + q.emoji + '</div>' +
      '<h3 class="ob-q-text">' + q.text + '</h3>' +
      '<div class="ob-options">' + optionsHTML + '</div>' +
      '<div class="ob-progress-dots">' +
        '<span class="ob-dot"></span>' +
        '<span class="ob-dot ob-dot-active"></span>' +
        '<span class="ob-dot"></span>' +
      '</div>' +
    '</div>';
  }

  function buildResultHTML(mbti) {
    var detail = window.MBTI_DETAIL && window.MBTI_DETAIL[mbti];
    var name = window.MBTI_NAMES && window.MBTI_NAMES[mbti];
    var traits = detail ? detail.traits.join(' · ') : '';
    var color = detail ? detail.color : '#FFB7C5';

    return '<div class="ob-card ob-card-enter">' +
      '<div class="ob-result-emoji">🎊</div>' +
      '<h2 class="ob-title">测试完成！</h2>' +
      '<p class="ob-subtitle">你的性格类型是</p>' +
      '<div class="ob-mbti-badge" style="background:' + color + '20;border-color:' + color + ';color:' + color + '">' +
        '<span class="ob-mbti-code">' + mbti + '</span>' +
        '<span class="ob-mbti-name">' + (name || '') + '</span>' +
      '</div>' +
      '<div class="ob-traits">' + traits + '</div>' +
      '<p class="ob-result-hint">上传简历后，我们会对比你的性格和经历是否匹配</p>' +
      '<button class="ob-btn" id="obFinishBtn">进入主页 ✨</button>' +
      '<div class="ob-progress-dots">' +
        '<span class="ob-dot"></span>' +
        '<span class="ob-dot"></span>' +
        '<span class="ob-dot ob-dot-active"></span>' +
      '</div>' +
    '</div>';
  }

  // ===== 事件绑定 =====

  function bindProfileEvents() {
    var avatarGrid = document.getElementById('obAvatarGrid');
    var nicknameInput = document.getElementById('obNicknameInput');
    var continueBtn = document.getElementById('obContinueBtn');

    // 头像选择
    avatarGrid.addEventListener('click', function(e) {
      var btn = e.target.closest('.ob-avatar-option');
      if (!btn) return;
      // 移除其他选中状态
      avatarGrid.querySelectorAll('.ob-avatar-option').forEach(function(b) {
        b.classList.remove('ob-avatar-option-active');
      });
      btn.classList.add('ob-avatar-option-active');
      avatarData = btn.getAttribute('data-avatar');
      document.getElementById('obAvatarBig').textContent = avatarData;
      checkCanContinue();
    });

    nicknameInput.addEventListener('input', function() {
      nickname = nicknameInput.value.trim();
      checkCanContinue();
    });

    function checkCanContinue() {
      if (nickname.length > 0) {
        continueBtn.disabled = false;
        continueBtn.classList.remove('ob-btn-disabled');
      } else {
        continueBtn.disabled = true;
        continueBtn.classList.add('ob-btn-disabled');
      }
    }

    continueBtn.addEventListener('click', function() {
      if (!nickname) return;
      saveProfile();
      showQuestion(0);
    });
  }

  function bindQuestionEvents() {
    var options = overlay.querySelectorAll('.ob-option');
    options.forEach(function(btn) {
      btn.addEventListener('click', function() {
        // 选中动画
        btn.classList.add('ob-option-selected');
        // 记录答案
        var optId = btn.getAttribute('data-option-id');
        var q = QUESTIONS[currentQ];
        var selectedOpt = q.options.find(function(o) { return o.id === optId; });
        answers.push({
          questionId: q.id,
          selectedOptionId: optId,
          dimension: q.dimension,
          weights: selectedOpt.weights
        });
        // 延迟后下一题
        setTimeout(function() {
          currentQ++;
          if (currentQ < QUESTIONS.length) {
            showQuestion(currentQ);
          } else {
            showResult();
          }
        }, 500);
      });
    });
  }

  function bindResultEvents() {
    document.getElementById('obFinishBtn').addEventListener('click', function() {
      dismissOverlay();
    });
  }

  // ===== 步骤切换 =====

  function showQuestion(index) {
    var card = overlay.querySelector('.ob-card');
    card.classList.add('ob-card-exit');
    setTimeout(function() {
      overlay.innerHTML = buildQuestionHTML(QUESTIONS[index], index);
      bindQuestionEvents();
    }, 300);
  }

  function showResult() {
    var mbti = calculateMBTI();
    // 保存结果
    localStorage.setItem('personalityMBTI', mbti);
    localStorage.setItem('personalityAnswers', JSON.stringify(answers));

    var card = overlay.querySelector('.ob-card');
    card.classList.add('ob-card-exit');
    setTimeout(function() {
      overlay.innerHTML = buildResultHTML(mbti);
      bindResultEvents();
    }, 300);
  }

  function dismissOverlay() {
    localStorage.setItem('onboardingDone', 'true');
    overlay.classList.remove('ob-visible');
    overlay.classList.add('ob-hiding');
    setTimeout(function() {
      overlay.remove();
      // 更新侧边栏用户名
      var nameEl = document.querySelector('.user-name');
      if (nameEl) nameEl.textContent = nickname;
    }, 500);
  }

  // ===== 工具函数 =====

  function saveProfile() {
    var profile = { nickname: nickname, avatar: avatarData, createdAt: new Date().toISOString() };
    try {
      localStorage.setItem('userProfile', JSON.stringify(profile));
    } catch(e) {}
  }

  function calculateMBTI() {
    var scores = { E:0, I:0, S:0, N:0, T:0, F:0, J:0, P:0 };
    answers.forEach(function(a) {
      Object.keys(a.weights).forEach(function(key) {
        scores[key] += a.weights[key];
      });
    });
    // 平局时偏向 I, N, F, P（探索型）
    var ei = scores.E > scores.I ? 'E' : 'I';
    var sn = scores.S > scores.N ? 'S' : 'N';
    var tf = scores.T > scores.F ? 'T' : 'F';
    var jp = scores.J > scores.P ? 'J' : 'P';
    return ei + sn + tf + jp;
  }

})();
