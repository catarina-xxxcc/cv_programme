/**
 * AutofillEngine - 自动填充引擎
 * 调用 FieldMatcher 获取匹配结果后逐字段填充
 */
var AutofillEngine = (function() {
  'use strict';

  var originalValues = []; // 填充前的原始值快照

  /**
   * 简历字段到 FieldMatcher 类别的映射
   */
  var RESUME_FIELD_MAP = {
    name: 'name',
    phone: 'phone',
    email: 'email',
    education: 'education',
    major: 'major',
    degree: 'degree',
    graduationDate: 'graduationDate',
    workExperience: 'workExperience',
    skills: 'skills',
    introduction: 'introduction'
  };

  /**
   * 获取简历数据中对应字段的值
   */
  function getResumeValue(resumeData, category) {
    switch (category) {
      case 'name': return resumeData.name || '';
      case 'phone': return resumeData.phone || '';
      case 'email': return resumeData.email || '';
      case 'education': return resumeData.education || '';
      case 'major': return resumeData.major || '';
      case 'degree': return resumeData.degree || '';
      case 'graduationDate': return resumeData.graduationDate || '';
      case 'workExperience':
        if (resumeData.workExperiences && resumeData.workExperiences.length > 0) {
          return resumeData.workExperiences.map(function(exp) {
            var t = '';
            if (exp.company) t += exp.company;
            if (exp.position) t += ' - ' + exp.position;
            if (exp.period) t += ' (' + exp.period + ')';
            if (exp.description) t += '\n' + exp.description;
            return t;
          }).join('\n\n');
        }
        return resumeData.workExperience || '';
      case 'company':
        if (resumeData.workExperiences && resumeData.workExperiences.length > 0) {
          return resumeData.workExperiences[0].company || '';
        }
        return '';
      case 'position':
        if (resumeData.workExperiences && resumeData.workExperiences.length > 0) {
          return resumeData.workExperiences[0].position || '';
        }
        return '';
      case 'skills': return resumeData.skills || '';
      case 'introduction': return resumeData.introduction || '';
      default: return '';
    }
  }

  /**
   * 触发表单事件
   */
  function dispatchEvents(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * 填充 select 下拉框（模糊匹配）
   */
  function fillSelect(element, value) {
    if (!value) return false;
    var options = Array.from(element.options);
    var valueLower = value.toLowerCase();

    // 精确匹配
    var exact = options.find(function(opt) {
      return opt.value.toLowerCase() === valueLower || opt.text.toLowerCase() === valueLower;
    });
    if (exact) { element.value = exact.value; return true; }

    // 包含匹配
    var partial = options.find(function(opt) {
      return opt.text.toLowerCase().indexOf(valueLower) !== -1 || valueLower.indexOf(opt.text.toLowerCase()) !== -1;
    });
    if (partial) { element.value = partial.value; return true; }

    return false;
  }

  /**
   * 执行自动填充
   * @param {Object} resumeData - 简历数据
   * @returns {{ filled: Array, skipped: Array }}
   */
  function fill(resumeData) {
    originalValues = [];
    var filled = [];
    var skipped = [];

    var matches = FieldMatcher.analyzeFormFields();

    for (var i = 0; i < matches.length; i++) {
      var match = matches[i];
      var element = match.element;
      var value = getResumeValue(resumeData, match.fieldCategory);

      if (!value) {
        skipped.push({ fieldName: match.fieldCategory, reason: '简历中无此数据', element: element });
        continue;
      }

      try {
        // 保存原始值
        originalValues.push({ element: element, originalValue: element.value });

        if (element.tagName === 'SELECT') {
          var success = fillSelect(element, value);
          if (!success) {
            skipped.push({ fieldName: match.fieldCategory, reason: '无匹配选项', element: element });
            continue;
          }
        } else {
          // 尊重 maxlength
          var maxLen = element.getAttribute('maxlength');
          if (maxLen && value.length > parseInt(maxLen)) {
            value = value.substring(0, parseInt(maxLen));
          }
          element.value = value;
        }

        // 触发事件
        dispatchEvents(element);

        filled.push({ fieldName: match.fieldCategory, value: value, element: element });
      } catch (err) {
        console.error('填充字段出错:', match.fieldCategory, err);
        skipped.push({ fieldName: match.fieldCategory, reason: '填充出错: ' + err.message, element: element });
      }
    }

    return { filled: filled, skipped: skipped };
  }

  /**
   * 撤销上一次填充
   */
  function undo() {
    for (var i = 0; i < originalValues.length; i++) {
      var item = originalValues[i];
      try {
        item.element.value = item.originalValue;
        dispatchEvents(item.element);
      } catch (e) {}
    }
    originalValues = [];
  }

  return {
    fill: fill,
    undo: undo
  };
})();
