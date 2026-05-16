/**
 * 冷启动引导 - 首次访问用户的性格测试
 * 流程：欢迎+设置形象 → 6道性格题 → 显示结果 → 进入主页
 */
(function() {
  'use strict';

  // 题目数据（细化场景和答案）
  var QUESTIONS = [
    {
      id: 'q1', dimension: 'EI',
      text: '期末考试周结束了，你最想做的第一件事是？',
      emoji: '🎊',
      options: [
        { id: 'a', text: '🍻 叫上一群朋友去聚餐庆祝', weights: { E: 2 } },
        { id: 'b', text: '🛋️ 终于可以一个人窝在床上刷手机了', weights: { I: 2 } },
        { id: 'c', text: '👯 约一两个好朋友安静吃顿饭', weights: { I: 1, E: 1 } }
      ]
    },
    {
      id: 'q2', dimension: 'SN',
      text: '老师布置了一个开放性课题，你的第一反应是？',
      emoji: '🧩',
      options: [
        { id: 'a', text: '📖 先找参考文献和成功案例，照着来', weights: { S: 2 } },
        { id: 'b', text: '✨ 太好了！终于可以搞点不一样的', weights: { N: 2 } },
        { id: 'c', text: '🤔 先想想这个题目背后想考什么', weights: { N: 1, S: 1 } }
      ]
    },
    {
      id: 'q3', dimension: 'TF',
      text: '室友因为分手很难过，半夜找你聊天，你会？',
      emoji: '🌙',
      options: [
        { id: 'a', text: '💪 帮 ta 理性分析这段关系的问题', weights: { T: 2 } },
        { id: 'b', text: '🫂 什么都不说，先陪着 ta 哭一会', weights: { F: 2 } },
        { id: 'c', text: '🍫 买杯奶茶，边喝边听 ta 说', weights: { F: 1, T: 1 } }
      ]
    },
    {
      id: 'q4', dimension: 'JP',
      text: '下周有个重要的小组展示，你会？',
      emoji: '📊',
      options: [
        { id: 'a', text: '📅 提前一周就开始准备，列好时间表', weights: { J: 2 } },
        { id: 'b', text: '⚡ 前一天晚上灵感爆发，一气呵成', weights: { P: 2 } },
        { id: 'c', text: '📝 大纲先列好，细节到时候再说', weights: { J: 1, P: 1 } }
      ]
    },
    {
      id: 'q5', dimension: 'EI',
      text: '参加一个不太熟的人的生日聚会，你会？',
      emoji: '🎂',
      options: [
        { id: 'a', text: '🦋 主动认识新朋友，聊得很开心', weights: { E: 2 } },
        { id: 'b', text: '📱 找个角落待着，时不时看看手机', weights: { I: 2 } },
        { id: 'c', text: '🙋 跟着认识的朋友一起社交', weights: { E: 1, I: 1 } }
      ]
    },
    {
      id: 'q6', dimension: 'TF',
      text: '如果有两份实习 offer，你更倾向选？',
      emoji: '⚖️',
      options: [
        { id: 'a', text: '💰 薪资高、大厂背书、简历好看', weights: { T: 2 } },
        { id: 'b', text: '💛 团队nice、做的事有意义、开心', weights: { F: 2 } },
        { id: 'c', text: '🚀 能学到最多东西的那个', weights: { T: 1, N: 1 } }
      ]
    },
    {
      id: 'q7', dimension: 'SN',
      text: '看到一个全新的 App 创业想法，你的反应是？',
      emoji: '💡',
      options: [
        { id: 'a', text: '📊 先做市场调研，看看有没有竞品', weights: { S: 2 } },
        { id: 'b', text: '🚀 好兴奋！马上想到了十个延伸方向', weights: { N: 2 } },
        { id: 'c', text: '🧐 想想这个想法的可行性和风险', weights: { S: 1, T: 1 } }
      ]
    },
    {
      id: 'q8', dimension: 'JP',
      text: '你的手机备忘录/日历通常是？',
      emoji: '📱',
      options: [
        { id: 'a', text: '✅ 井井有条，每天的 to-do 都列好了', weights: { J: 2 } },
        { id: 'b', text: '🌊 基本空的，想到什么做什么', weights: { P: 2 } },
        { id: 'c', text: '📌 只记重要 deadline，其他随缘', weights: { P: 1, J: 1 } }
      ]
    }
  ];

  // 检查是否需要显示引导
  if (localStorage.getItem('onboardingDone') === 'true') {
    // 已完成引导，但仍需加载保存的头像和昵称到侧边栏
    try {
      var savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (savedProfile.nickname) {
        var nameEl = document.querySelector('.user-name');
        if (nameEl) nameEl.textContent = savedProfile.nickname;
      }
      if (savedProfile.avatar) {
        var avatarEl = document.querySelector('.user-avatar-placeholder');
        if (avatarEl) {
          avatarEl.textContent = savedProfile.avatar;
          avatarEl.style.fontSize = '32px';
        }
      }
    } catch(e) {}
    return;
  }

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
      '👩‍💻', '👩‍🎨', '👩‍🔬', '👩‍💼',
      '👩‍🎓', '👩‍🎤', '👩‍🚀', '👩‍⚕️',
      '👩‍🏫', '👩‍🍳', '👩‍🔧', '👩‍✈️',
      '👩‍🌾', '👩‍🚒', '🧕', '💁‍♀️'
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
      // 显示过渡页，再进入问题
      showTransition();
    });
  }

  function showTransition() {
    var card = overlay.querySelector('.ob-card');
    card.classList.add('ob-card-exit');
    setTimeout(function() {
      overlay.innerHTML = '<div class="ob-card ob-card-enter">' +
        '<div class="ob-welcome-emoji">🎯</div>' +
        '<h2 class="ob-title">接下来，了解真实的你</h2>' +
        '<p class="ob-subtitle" style="margin-bottom:16px;">回答 8 道轻松的场景题<br>帮你发现最适合的职业方向</p>' +
        '<div style="background:var(--sakura-lighter);border-radius:12px;padding:14px 18px;margin-bottom:24px;text-align:left;font-size:13px;color:var(--gray-600);line-height:1.7;">' +
          '<div style="font-weight:700;color:var(--gray-800);margin-bottom:6px;">💡 小提示</div>' +
          '<div>• 没有对错之分，选最真实的自己</div>' +
          '<div>• 不要想"应该选什么"，想"我会怎么做"</div>' +
          '<div>• 大约 1 分钟就能完成</div>' +
        '</div>' +
        '<button class="ob-btn" id="obStartQuiz">开始测试 →</button>' +
        '<div class="ob-progress-dots">' +
          '<span class="ob-dot"></span>' +
          '<span class="ob-dot ob-dot-active"></span>' +
          '<span class="ob-dot"></span>' +
        '</div>' +
      '</div>';

      document.getElementById('obStartQuiz').addEventListener('click', function() {
        showQuestion(0);
      });
    }, 300);
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
      // 更新侧边栏用户名和头像
      var nameEl = document.querySelector('.user-name');
      if (nameEl) nameEl.textContent = nickname;
      var avatarEl = document.querySelector('.user-avatar-placeholder');
      if (avatarEl && avatarData) {
        avatarEl.textContent = avatarData;
        avatarEl.style.fontSize = '32px';
      }
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
