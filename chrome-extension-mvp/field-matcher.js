/**
 * FieldMatcher - 智能字段匹配引擎
 * 通过分析 input 元素的属性和关联 label 来识别表单字段用途
 */
var FieldMatcher = (function() {
  'use strict';

  // 中英双语关键词库
  var KEYWORDS = {
    name: ['name', 'fullname', 'full_name', 'realname', 'username', '姓名', '名字', '真实姓名', '称呼'],
    phone: ['phone', 'tel', 'mobile', 'cellphone', '电话', '手机', '联系电话', '手机号', '联系方式'],
    email: ['email', 'mail', 'e-mail', '邮箱', '电子邮件', '邮件地址', '邮件'],
    education: ['school', 'university', 'college', 'education', '学校', '院校', '毕业院校', '大学'],
    major: ['major', 'specialty', 'subject', '专业', '所学专业', '学科'],
    degree: ['degree', 'qualification', '学历', '学位', '最高学历'],
    graduationDate: ['graduation', 'graduate_date', 'grad_year', '毕业时间', '毕业年份', '毕业日期'],
    workExperience: ['experience', 'work_experience', 'work_history', '工作经验', '工作经历', '实习经历', '项目经历'],
    company: ['company', 'employer', 'organization', '公司', '单位', '工作单位', '公司名称'],
    position: ['position', 'title', 'job_title', 'role', '职位', '岗位', '职务', '应聘岗位', '申请职位'],
    skills: ['skill', 'skills', 'ability', 'expertise', '技能', '专业技能', '技术能力', '擅长'],
    introduction: ['introduction', 'summary', 'about', 'bio', 'description', '自我介绍', '个人简介', '自我评价', '个人描述']
  };

  // 属性优先级（从高到低）
  var PRIORITY = ['label', 'aria-label', 'placeholder', 'name', 'id'];

  /**
   * 获取元素关联的 label 文本
   */
  function getLabelText(element) {
    // 通过 for 属性关联
    if (element.id) {
      var label = document.querySelector('label[for="' + element.id + '"]');
      if (label) return label.textContent.trim().toLowerCase();
    }
    // 父级 label
    var parent = element.closest('label');
    if (parent) return parent.textContent.trim().toLowerCase();
    // 前面的兄弟元素
    var prev = element.previousElementSibling;
    if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'DIV')) {
      var text = prev.textContent.trim();
      if (text.length < 30) return text.toLowerCase();
    }
    return '';
  }

  /**
   * 获取元素的各属性值
   */
  function getAttributes(element) {
    return {
      'label': getLabelText(element),
      'aria-label': (element.getAttribute('aria-label') || '').toLowerCase(),
      'placeholder': (element.getAttribute('placeholder') || '').toLowerCase(),
      'name': (element.getAttribute('name') || '').toLowerCase(),
      'id': (element.getAttribute('id') || '').toLowerCase()
    };
  }

  /**
   * 计算文本与关键词的匹配置信度
   */
  function matchKeywords(text, keywords) {
    if (!text) return 0;
    for (var i = 0; i < keywords.length; i++) {
      if (text === keywords[i]) return 100;
      if (text.indexOf(keywords[i]) !== -1) return 85;
      if (keywords[i].indexOf(text) !== -1 && text.length >= 2) return 70;
    }
    return 0;
  }

  /**
   * 对单个元素进行字段匹配
   * @param {HTMLElement} element
   * @returns {{ element, fieldCategory, confidence, matchedAttribute } | null}
   */
  function matchField(element) {
    var attrs = getAttributes(element);
    var bestMatch = null;

    for (var p = 0; p < PRIORITY.length; p++) {
      var attrName = PRIORITY[p];
      var attrValue = attrs[attrName];
      if (!attrValue) continue;

      var categories = Object.keys(KEYWORDS);
      for (var c = 0; c < categories.length; c++) {
        var category = categories[c];
        var confidence = matchKeywords(attrValue, KEYWORDS[category]);

        // 高优先级属性加分
        if (confidence > 0) {
          var priorityBonus = (PRIORITY.length - p) * 3;
          confidence = Math.min(100, confidence + priorityBonus);
        }

        if (confidence >= 60 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = {
            element: element,
            fieldCategory: category,
            confidence: confidence,
            matchedAttribute: attrName
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * 分析页面中所有表单元素
   * @param {HTMLElement} [root=document]
   * @returns {Array} 匹配结果数组
   */
  function analyzeFormFields(root) {
    root = root || document;
    var elements = root.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select');
    var results = [];
    var matched = {};

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      // 跳过隐藏元素
      if (el.offsetParent === null && el.type !== 'hidden') continue;

      var result = matchField(el);
      if (result && !matched[result.fieldCategory]) {
        results.push(result);
        matched[result.fieldCategory] = true;
      }
    }

    return results;
  }

  /**
   * 检测页面是否有表单元素
   */
  function hasFormFields() {
    return document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select').length > 0;
  }

  return {
    matchField: matchField,
    analyzeFormFields: analyzeFormFields,
    hasFormFields: hasFormFields,
    KEYWORDS: KEYWORDS
  };
})();
