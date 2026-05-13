/**
 * Content Script
 * 在招聘网站页面中运行，负责检测表单并自动填充
 * 同时在网站页面注入扩展 ID 标记，让网站能检测到扩展已安装
 */

// 注入扩展 ID 标记到页面，让网站能检测到扩展
document.documentElement.setAttribute('data-resume-ext-id', chrome.runtime.id);

// 监听来自 background 的自动填充消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'autofill') {
    performAutofill();
  }
});

/**
 * 执行自动填充
 */
async function performAutofill() {
  try {
    // 从 storage 获取简历数据
    const result = await chrome.storage.local.get(['resume']);
    const resume = result.resume;
    
    if (!resume) {
      alert('请先在扩展中输入简历信息');
      return;
    }
    
    console.log('开始自动填充...', resume);
    
    // 检测并填充表单字段
    fillFormFields(resume);
    
    // 显示成功提示
    showNotification('✅ 简历信息已自动填充！');
    
  } catch (error) {
    console.error('自动填充失败:', error);
    alert('自动填充失败，请检查表单格式');
  }
}

/**
 * 填充表单字段
 */
function fillFormFields(resume) {
  // 获取页面中所有的输入框
  const inputs = document.querySelectorAll('input, textarea, select');
  
  inputs.forEach(input => {
    const fieldName = getFieldName(input);
    const fieldValue = matchResumeField(fieldName, resume);
    
    if (fieldValue) {
      fillField(input, fieldValue);
    }
  });
}

/**
 * 获取字段名称（从 name, id, placeholder, label 等属性推断）
 */
function getFieldName(input) {
  // 优先使用 name 属性
  if (input.name) return input.name.toLowerCase();
  
  // 其次使用 id
  if (input.id) return input.id.toLowerCase();
  
  // 使用 placeholder
  if (input.placeholder) return input.placeholder.toLowerCase();
  
  // 查找关联的 label
  const label = findLabelForInput(input);
  if (label) return label.toLowerCase();
  
  return '';
}

/**
 * 查找输入框关联的 label
 */
function findLabelForInput(input) {
  // 通过 for 属性关联
  if (input.id) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) return label.textContent.trim();
  }
  
  // 查找父级 label
  const parentLabel = input.closest('label');
  if (parentLabel) return parentLabel.textContent.trim();
  
  return '';
}

/**
 * 匹配简历字段
 */
function matchResumeField(fieldName, resume) {
  // 姓名匹配
  if (fieldName.includes('name') || fieldName.includes('姓名') || fieldName.includes('名字')) {
    return resume.name;
  }
  
  // 邮箱匹配
  if (fieldName.includes('email') || fieldName.includes('邮箱') || fieldName.includes('电子邮件')) {
    return resume.email;
  }
  
  // 电话匹配
  if (fieldName.includes('phone') || fieldName.includes('tel') || fieldName.includes('电话') || fieldName.includes('手机')) {
    return resume.phone;
  }
  
  // 学校匹配
  if (fieldName.includes('school') || fieldName.includes('university') || fieldName.includes('学校') || fieldName.includes('院校')) {
    return resume.education;
  }
  
  // 专业匹配
  if (fieldName.includes('major') || fieldName.includes('专业')) {
    return resume.major;
  }
  
  // 学历匹配
  if (fieldName.includes('degree') || fieldName.includes('学历')) {
    return resume.degree;
  }
  
  // 毕业时间匹配
  if (fieldName.includes('graduation') || fieldName.includes('毕业')) {
    return resume.graduationDate;
  }
  
  // 工作经验匹配
  if (fieldName.includes('experience') || fieldName.includes('工作经验') || fieldName.includes('经历')) {
    // 优先使用多段工作经验的合并文本
    if (resume.workExperiences && resume.workExperiences.length > 0) {
      return resume.workExperiences.map(exp => {
        let text = '';
        if (exp.company) text += exp.company;
        if (exp.position) text += ` - ${exp.position}`;
        if (exp.period) text += ` (${exp.period})`;
        if (exp.description) text += `\n${exp.description}`;
        return text;
      }).join('\n\n');
    }
    // 回退到单字段
    return resume.workExperience;
  }
  
  // 公司名称匹配
  if (fieldName.includes('company') || fieldName.includes('公司')) {
    if (resume.workExperiences && resume.workExperiences.length > 0) {
      return resume.workExperiences[0].company;
    }
    return '';
  }
  
  // 职位匹配
  if (fieldName.includes('position') || fieldName.includes('职位') || fieldName.includes('岗位')) {
    if (resume.workExperiences && resume.workExperiences.length > 0) {
      return resume.workExperiences[0].position;
    }
    return '';
  }
  
  // 技能匹配
  if (fieldName.includes('skill') || fieldName.includes('技能')) {
    return resume.skills;
  }
  
  // 自我介绍匹配
  if (fieldName.includes('introduction') || fieldName.includes('自我介绍') || fieldName.includes('个人简介')) {
    return resume.introduction;
  }
  
  return null;
}

/**
 * 填充字段
 */
function fillField(input, value) {
  if (input.tagName === 'SELECT') {
    // 下拉框：尝试匹配选项
    const options = Array.from(input.options);
    const matchedOption = options.find(opt => 
      opt.text.includes(value) || opt.value.includes(value)
    );
    if (matchedOption) {
      input.value = matchedOption.value;
    }
  } else if (input.type === 'checkbox' || input.type === 'radio') {
    // 复选框/单选框：暂不处理
    return;
  } else {
    // 文本输入框
    input.value = value;
    
    // 触发 input 和 change 事件（某些网站需要）
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  console.log(`已填充字段: ${getFieldName(input)} = ${value}`);
}

/**
 * 显示通知
 */
function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #FFB6C1;
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999999;
    font-size: 16px;
    font-weight: bold;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // 3秒后自动消失
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
