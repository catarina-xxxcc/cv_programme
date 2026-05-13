/**
 * 智能简历解析器 - 网站与 Chrome 扩展通信版
 * 流程：网站上传文件 → 本地解析 → 结果存到扩展 chrome.storage → 网页显示结果
 * 如果扩展未安装，引导用户安装
 */
(function() {
  'use strict';

  // ====== 你的扩展 ID（安装后在 chrome://extensions 查看） ======
  // 用户需要在这里填入自己的扩展 ID，或者我们用 try-catch 检测
  var EXTENSION_ID = null; // 会在运行时自动检测

  // --- 元素引用 ---
  var parserModalOverlay = document.getElementById('parserModalOverlay');
  var settingsModalOverlay = document.getElementById('settingsModalOverlay');
  var btnSmartParser = document.getElementById('btnSmartParser');
  var parserCloseBtn = document.getElementById('parserCloseBtn');
  var settingsCloseBtn = document.getElementById('settingsCloseBtn');
  var parserTabs = document.querySelectorAll('.parser-tab[data-parser-tab]');
  var parserUploadTab = document.getElementById('parserUploadTab');
  var parserManualTab = document.getElementById('parserManualTab');
  var parserUploadArea = document.getElementById('parserUploadArea');
  var parserFileInput = document.getElementById('parserFileInput');
  var parserFileInfo = document.getElementById('parserFileInfo');
  var parserFileName = document.getElementById('parserFileName');
  var parserFileSize = document.getElementById('parserFileSize');
  var parserParseBtn = document.getElementById('parserParseBtn');
  var parserEditBtn = document.getElementById('parserEditBtn');
  var parserSettingsBtn = document.getElementById('parserSettingsBtn');
  var parserLoading = document.getElementById('parserLoading');
  var parserStatus = document.getElementById('parserStatus');
  var parserPreview = document.getElementById('parserPreview');
  var parserManualForm = document.getElementById('parserManualForm');
  var parserFormStatus = document.getElementById('parserFormStatus');
  var settingsApiKey = document.getElementById('settingsApiKey');
  var settingsTestBtn = document.getElementById('settingsTestBtn');
  var settingsSaveBtn = document.getElementById('settingsSaveBtn');
  var settingsStatus = document.getElementById('settingsStatus');

  var parserSelectedFile = null;
  var libsLoaded = false;
  var extensionConnected = false;

  // --- Toast ---
  function showToast(message, type) {
    var toast = document.createElement('div');
    toast.className = 'parser-toast ' + type;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(function() { toast.classList.add('show'); });
    setTimeout(function() {
      toast.classList.remove('show');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  function showStatusMsg(el, message, type) {
    el.textContent = message;
    el.className = 'parser-status-msg ' + type;
    el.style.display = 'block';
  }
  function hideStatusMsg(el) { el.style.display = 'none'; }

  // --- 扩展通信 ---
  function sendToExtension(message) {
    return new Promise(function(resolve, reject) {
      if (!EXTENSION_ID) {
        reject(new Error('扩展未连接'));
        return;
      }
      try {
        chrome.runtime.sendMessage(EXTENSION_ID, message, function(response) {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // 检测扩展是否安装 - 通过 content script 注入的标记检测
  function detectExtension() {
    return new Promise(function(resolve) {
      // 方法1：检查 content script 是否注入了标记
      if (document.documentElement.getAttribute('data-resume-ext-id')) {
        EXTENSION_ID = document.documentElement.getAttribute('data-resume-ext-id');
        resolve(true);
        return;
      }
      // 方法2：尝试已知的扩展 ID（如果用户手动设置了）
      var savedId = localStorage.getItem('extensionId');
      if (savedId) {
        EXTENSION_ID = savedId;
        try {
          chrome.runtime.sendMessage(savedId, { action: 'ping' }, function(response) {
            if (chrome.runtime.lastError || !response) {
              EXTENSION_ID = null;
              resolve(false);
            } else {
              resolve(true);
            }
          });
        } catch (e) {
          EXTENSION_ID = null;
          resolve(false);
        }
        return;
      }
      resolve(false);
    });
  }

  // --- 模态框 ---
  function openParserModal() {
    parserModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadLibraries();
    prefillManualForm();
    // 检测扩展状态
    detectExtension().then(function(connected) {
      extensionConnected = connected;
      if (connected) {
        showStatusMsg(parserStatus, '✅ 已连接 Chrome 扩展，解析结果将同步到插件', 'success');
        setTimeout(function() { hideStatusMsg(parserStatus); }, 2000);
      }
    });
  }
  function closeParserModal() {
    parserModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  function openSettingsModal() {
    settingsModalOverlay.classList.add('active');
    // 优先从扩展获取 API Key
    if (extensionConnected) {
      sendToExtension({ action: 'getApiKey' }).then(function(res) {
        if (res && res.apiKey) settingsApiKey.value = res.apiKey;
        else settingsApiKey.value = localStorage.getItem('deepseekApiKey') || '';
      }).catch(function() {
        settingsApiKey.value = localStorage.getItem('deepseekApiKey') || '';
      });
    } else {
      settingsApiKey.value = localStorage.getItem('deepseekApiKey') || '';
    }
    hideStatusMsg(settingsStatus);
  }
  function closeSettingsModal() {
    settingsModalOverlay.classList.remove('active');
  }

  btnSmartParser.addEventListener('click', openParserModal);
  parserCloseBtn.addEventListener('click', closeParserModal);
  settingsCloseBtn.addEventListener('click', closeSettingsModal);
  parserModalOverlay.addEventListener('click', function(e) {
    if (e.target === parserModalOverlay) closeParserModal();
  });
  settingsModalOverlay.addEventListener('click', function(e) {
    if (e.target === settingsModalOverlay) closeSettingsModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      if (settingsModalOverlay.classList.contains('active')) closeSettingsModal();
      else if (parserModalOverlay.classList.contains('active')) closeParserModal();
    }
  });

  // --- Tab 切换 ---
  parserTabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      parserTabs.forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      if (tab.dataset.parserTab === 'upload') {
        parserUploadTab.classList.add('active');
        parserManualTab.classList.remove('active');
      } else {
        parserUploadTab.classList.remove('active');
        parserManualTab.classList.add('active');
        prefillManualForm();
      }
    });
  });

  parserSettingsBtn.addEventListener('click', openSettingsModal);

  // --- 文件上传 ---
  parserUploadArea.addEventListener('click', function() { parserFileInput.click(); });
  parserFileInput.addEventListener('change', function(e) {
    if (e.target.files[0]) handleParserFile(e.target.files[0]);
  });
  parserUploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    parserUploadArea.classList.add('dragover');
  });
  parserUploadArea.addEventListener('dragleave', function() {
    parserUploadArea.classList.remove('dragover');
  });
  parserUploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    parserUploadArea.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleParserFile(e.dataTransfer.files[0]);
  });

  function handleParserFile(file) {
    var ext = file.name.split('.').pop().toLowerCase();
    if (['pdf', 'docx', 'txt'].indexOf(ext) === -1) {
      showStatusMsg(parserStatus, '不支持的文件格式，请上传 PDF、DOCX 或 TXT 文件', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showStatusMsg(parserStatus, '文件过大，请上传小于 10MB 的文件', 'error');
      return;
    }
    parserSelectedFile = file;
    parserFileName.textContent = '\u{1F4CE} ' + file.name;
    parserFileSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
    parserFileInfo.style.display = 'block';
    parserParseBtn.disabled = false;
    hideStatusMsg(parserStatus);
    // 自动开始解析
    startParsing();
  }

  // --- 动态加载库 ---
  function loadLibraries() {
    if (libsLoaded) return Promise.resolve();
    return new Promise(function(resolve) {
      var loaded = 0;
      function check() { if (++loaded >= 2) { libsLoaded = true; resolve(); } }
      if (typeof pdfjsLib === 'undefined') {
        var s1 = document.createElement('script');
        s1.src = 'libs/pdf.min.js';
        s1.onload = function() {
          if (typeof pdfjsLib !== 'undefined') pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
          check();
        };
        s1.onerror = check;
        document.head.appendChild(s1);
      } else { check(); }
      if (typeof mammoth === 'undefined') {
        var s2 = document.createElement('script');
        s2.src = 'libs/mammoth.browser.min.js';
        s2.onload = check;
        s2.onerror = check;
        document.head.appendChild(s2);
      } else { check(); }
    });
  }

  // --- 文本提取 ---
  async function extractPdfText(file) {
    if (typeof pdfjsLib === 'undefined') throw new Error('PDF 库未加载');
    var ab = await file.arrayBuffer();
    var pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    var text = '';
    for (var i = 1; i <= pdf.numPages; i++) {
      var page = await pdf.getPage(i);
      var tc = await page.getTextContent();
      text += tc.items.map(function(item) { return item.str; }).join(' ') + '\n';
    }
    return text;
  }
  async function extractDocxText(file) {
    if (typeof mammoth === 'undefined') throw new Error('DOCX 库未加载');
    var ab = await file.arrayBuffer();
    var result = await mammoth.extractRawText({ arrayBuffer: ab });
    return result.value;
  }
  function readTxtFile(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function(e) { resolve(e.target.result); };
      reader.onerror = function() { reject(new Error('文件读取失败')); };
      reader.readAsText(file, 'UTF-8');
    });
  }

  // --- AI 解析 ---
  async function parseWithAI(text, apiKey) {
    var prompt = '你是一个专业的简历解析助手。请从以下简历文本中提取结构化信息，并以 JSON 格式返回。\n\n简历文本：\n' + text + '\n\n请提取：name, email, phone, education, major, degree, graduationDate, workExperiences(数组,每项含company/position/period/description), workExperience(合并文本), skills(分号分隔), skillsDetailed(分类对象), introduction。\n只返回JSON。';
    var response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是简历解析助手，返回纯JSON。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1, max_tokens: 2000
      })
    });
    if (!response.ok) throw new Error('API 调用失败：' + response.status);
    var data = await response.json();
    var content = data.choices[0].message.content;
    var match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI 响应格式错误');
    var parsed = JSON.parse(match[0]);
    var defaults = { name:'',email:'',phone:'',education:'',major:'',degree:'',graduationDate:'',workExperiences:[],workExperience:'',skills:'',skillsDetailed:{},introduction:'' };
    return Object.assign({}, defaults, parsed);
  }

  // --- 正则解析 ---
  function parseWithRegex(text) {
    var data = { name:'',email:'',phone:'',education:'',major:'',degree:'',graduationDate:'',workExperiences:[],workExperience:'',skills:'',skillsDetailed:{},introduction:'' };
    var lines = text.split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>0;});
    var emailMatch = text.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) data.email = emailMatch[1];
    var phoneMatch = text.match(/1[3-9]\d{9}/);
    if (phoneMatch) data.phone = phoneMatch[0];
    if (lines.length > 0) {
      var parts = lines[0].split(/[\s|｜]+/);
      for (var p = 0; p < parts.length; p++) {
        var c = parts[p].trim();
        if (c.length >= 2 && c.length <= 10 && c.indexOf('@') === -1 && !/\d{6,}/.test(c)) { data.name = c; break; }
      }
    }
    var eduMatch = text.match(/([^\d\s]{2,10}(?:大学|学院))/);
    if (eduMatch) data.education = eduMatch[1];
    var degreeMatch = text.match(/(博士|硕士|本科|大专)/);
    if (degreeMatch) data.degree = degreeMatch[1];
    var skillsSection = text.match(/(?:技能|Skills?)[\s\S]{0,500}/i);
    if (skillsSection) {
      var cats = skillsSection[0].match(/([^\n:：]{2,12})[:：]([^\n]{5,150})/g);
      if (cats) {
        var allSkills = [];
        cats.forEach(function(cat) {
          var m = cat.match(/([^\n:：]{2,12})[:：]([^\n]{5,150})/);
          if (m && !/自我评价|自我介绍/i.test(m[1])) { data.skillsDetailed[m[1].trim()] = m[2].trim(); allSkills.push(m[2].trim()); }
        });
        data.skills = allSkills.join('；');
      }
    }
    var workMatch = text.match(/(?:实习|工作经历|工作经验)[\s\S]{0,400}/i);
    if (workMatch) data.workExperience = workMatch[0].substring(0, 300);
    var introMatch = text.match(/(?:自我评价|自我介绍)[:：\s]*([^\n]{20,200})/i);
    if (introMatch) data.introduction = introMatch[1].trim();
    return data;
  }

  // --- 主解析流程 ---
  parserParseBtn.addEventListener('click', function() { startParsing(); });

  async function startParsing() {
    if (!parserSelectedFile) return;
    parserLoading.style.display = 'block';
    parserParseBtn.disabled = true;
    parserPreview.style.display = 'none';
    parserEditBtn.style.display = 'none';
    hideStatusMsg(parserStatus);

    try {
      await loadLibraries();
      var text = '';
      var ext = parserSelectedFile.name.split('.').pop().toLowerCase();
      if (ext === 'pdf') text = await extractPdfText(parserSelectedFile);
      else if (ext === 'docx' || ext === 'doc') text = await extractDocxText(parserSelectedFile);
      else text = await readTxtFile(parserSelectedFile);
      if (!text || text.trim().length === 0) throw new Error('文件内容为空');

      // 获取 API Key（优先从扩展，其次 localStorage）
      var apiKey = localStorage.getItem('deepseekApiKey');
      if (extensionConnected) {
        try {
          var res = await sendToExtension({ action: 'getApiKey' });
          if (res && res.apiKey) apiKey = res.apiKey;
        } catch(e) {}
      }

      var resumeData;
      if (apiKey) {
        try {
          resumeData = await parseWithAI(text, apiKey);
        } catch (e) {
          console.error('AI失败:', e);
          showStatusMsg(parserStatus, '⚠️ AI 解析失败，使用备用方案', 'warning');
          resumeData = parseWithRegex(text);
        }
      } else {
        showStatusMsg(parserStatus, '💡 配置 DeepSeek API 可获得更准确的解析', 'info');
        resumeData = parseWithRegex(text);
      }

      // 保存到 localStorage（网页本地）
      localStorage.setItem('resume', JSON.stringify(resumeData));

      // 同步到 Chrome 扩展
      if (extensionConnected) {
        try {
          await sendToExtension({ action: 'saveResume', data: resumeData });
          showToast('✅ 解析完成，已同步到 Chrome 扩展！', 'success');
        } catch (e) {
          showToast('✅ 解析完成（扩展同步失败，已保存到本地）', 'info');
        }
      } else {
        showToast('✅ 解析完成！安装 Chrome 扩展可在其他网站自动填充', 'success');
      }

      // 显示预览
      renderPreview(resumeData);
      parserPreview.style.display = 'block';
      parserEditBtn.style.display = 'inline-block';

      var missing = [];
      if (!resumeData.name) missing.push('姓名');
      if (!resumeData.email) missing.push('邮箱');
      if (!resumeData.phone) missing.push('电话');
      if (missing.length > 0) {
        showStatusMsg(parserStatus, '⚠️ 部分信息未提取到：' + missing.join('、') + '，请点击"编辑"补充', 'warning');
      }
    } catch (err) {
      console.error('解析失败:', err);
      showStatusMsg(parserStatus, '❌ ' + err.message, 'error');
    } finally {
      parserLoading.style.display = 'none';
      parserParseBtn.disabled = false;
    }
  }

  // --- 预览 ---
  function renderPreview(data) {
    var fields = [
      { label:'姓名', key:'name', required:true },
      { label:'邮箱', key:'email', required:true },
      { label:'电话', key:'phone', required:true },
      { label:'学校', key:'education' },
      { label:'专业', key:'major' },
      { label:'学历', key:'degree' },
      { label:'毕业时间', key:'graduationDate' }
    ];
    var html = '<div style="margin-bottom:10px;font-weight:700;color:var(--sakura-primary);">解析结果预览' + (extensionConnected ? ' <span style="font-size:11px;color:#4CAF50;">● 已同步扩展</span>' : '') + '</div>';
    fields.forEach(function(f) {
      var val = data[f.key] || '';
      html += '<div class="preview-item"><div class="preview-label">' + f.label + (f.required?' *':'') + ':</div><div class="preview-value' + (val?'':' empty') + '">' + (val||'未提取') + '</div></div>';
    });
    if (data.workExperiences && data.workExperiences.length > 0) {
      html += '<div class="preview-item"><div class="preview-label">工作经验:</div><div class="preview-value">' + data.workExperiences.length + ' 段</div></div>';
      data.workExperiences.forEach(function(exp, i) {
        html += '<div class="preview-card"><div class="preview-card-title">' + (i+1) + '. ' + (exp.company||'') + '</div><div class="preview-card-detail">';
        if (exp.position) html += '<div>职位：' + exp.position + '</div>';
        if (exp.period) html += '<div>时间：' + exp.period + '</div>';
        html += '</div></div>';
      });
    } else if (data.workExperience) {
      html += '<div class="preview-item"><div class="preview-label">工作经验:</div><div class="preview-value">' + data.workExperience.substring(0,80) + '</div></div>';
    }
    if (data.skillsDetailed && Object.keys(data.skillsDetailed).length > 0) {
      Object.entries(data.skillsDetailed).forEach(function(entry) {
        html += '<div class="preview-skill-category"><strong>' + entry[0] + ':</strong> <span>' + entry[1] + '</span></div>';
      });
    } else if (data.skills) {
      html += '<div class="preview-item"><div class="preview-label">技能:</div><div class="preview-value">' + data.skills + '</div></div>';
    }
    parserPreview.innerHTML = html;
  }

  // --- 编辑 ---
  parserEditBtn.addEventListener('click', function() {
    document.querySelector('[data-parser-tab="manual"]').click();
  });

  // --- 手动填写 ---
  function prefillManualForm() {
    try {
      var saved = JSON.parse(localStorage.getItem('resume') || '{}');
      document.getElementById('parserName').value = saved.name || '';
      document.getElementById('parserEmail').value = saved.email || '';
      document.getElementById('parserPhone').value = saved.phone || '';
      document.getElementById('parserEducation').value = saved.education || '';
      document.getElementById('parserMajor').value = saved.major || '';
      document.getElementById('parserDegree').value = saved.degree || '';
      document.getElementById('parserGradDate').value = saved.graduationDate || '';
      document.getElementById('parserWorkExp').value = saved.workExperience || '';
      document.getElementById('parserSkills').value = saved.skills || '';
      document.getElementById('parserIntro').value = saved.introduction || '';
    } catch(e) {}
  }

  parserManualForm.addEventListener('submit', function(e) {
    e.preventDefault();
    hideStatusMsg(parserFormStatus);
    var name = document.getElementById('parserName').value.trim();
    var email = document.getElementById('parserEmail').value.trim();
    var phone = document.getElementById('parserPhone').value.trim();
    if (!name || !email || !phone) {
      showStatusMsg(parserFormStatus, '请填写必填字段（姓名、邮箱、电话）', 'error');
      return;
    }
    var resumeData = {
      name: name, email: email, phone: phone,
      education: document.getElementById('parserEducation').value.trim(),
      major: document.getElementById('parserMajor').value.trim(),
      degree: document.getElementById('parserDegree').value,
      graduationDate: document.getElementById('parserGradDate').value.trim(),
      workExperience: document.getElementById('parserWorkExp').value.trim(),
      skills: document.getElementById('parserSkills').value.trim(),
      introduction: document.getElementById('parserIntro').value.trim()
    };
    localStorage.setItem('resume', JSON.stringify(resumeData));
    if (extensionConnected) {
      sendToExtension({ action: 'saveResume', data: resumeData }).catch(function(){});
    }
    showToast('✅ 简历保存成功！', 'success');
    setTimeout(function() { closeParserModal(); }, 1200);
  });

  // --- 设置 ---
  settingsSaveBtn.addEventListener('click', function() {
    var key = settingsApiKey.value.trim();
    if (!key.startsWith('sk-')) {
      showStatusMsg(settingsStatus, 'API Key 应以 sk- 开头', 'error');
      return;
    }
    localStorage.setItem('deepseekApiKey', key);
    if (extensionConnected) {
      sendToExtension({ action: 'saveApiKey', apiKey: key }).catch(function(){});
    }
    showStatusMsg(settingsStatus, '✅ 已保存', 'success');
  });

  settingsTestBtn.addEventListener('click', async function() {
    var key = settingsApiKey.value.trim();
    if (!key.startsWith('sk-')) { showStatusMsg(settingsStatus, 'API Key 应以 sk- 开头', 'error'); return; }
    settingsTestBtn.disabled = true;
    settingsTestBtn.textContent = '测试中...';
    try {
      var r = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
        body:JSON.stringify({model:'deepseek-chat',messages:[{role:'user',content:'hi'}],max_tokens:5})
      });
      if (r.ok) showStatusMsg(settingsStatus, '✅ 连接成功！', 'success');
      else showStatusMsg(settingsStatus, '❌ 失败：' + r.status, 'error');
    } catch(e) {
      showStatusMsg(settingsStatus, '❌ 网络错误', 'error');
    } finally {
      settingsTestBtn.disabled = false;
      settingsTestBtn.textContent = '测试连接';
    }
  });

})();
