/**
 * @file aiResponseValidator.js
 * @description Validates JSON schema, key presence, data types, and score ranges for LLM outputs.
 */

const logger = require('../utils/logger');

/**
 * Validates ATS Analysis response.
 * @param {object} obj - Parsed JSON object.
 * @returns {boolean} - True if valid.
 */
function validateAtsAnalysis(obj) {
  if (!obj || typeof obj !== 'object') {
    logger.error('AIResponseValidator', 'ATS Analysis: Result is not an object.');
    return false;
  }

  const requiredKeys = ['strengths', 'weaknesses', 'missingKeywords', 'recommendations', 'roleFit', 'categoryExplanations'];
  for (const key of requiredKeys) {
    if (!obj.hasOwnProperty(key)) {
      logger.error('AIResponseValidator', `ATS Analysis: Missing required key "${key}"`);
      return false;
    }
  }

  // Validate categoryExplanations object keys
  const expectedCategories = ['contact', 'formatting', 'skills', 'experience', 'projects', 'education', 'keywords', 'achievements'];
  if (typeof obj.categoryExplanations !== 'object' || obj.categoryExplanations === null) {
    logger.error('AIResponseValidator', 'ATS Analysis: categoryExplanations is not an object.');
    return false;
  }
  for (const cat of expectedCategories) {
    if (!obj.categoryExplanations.hasOwnProperty(cat) || typeof obj.categoryExplanations[cat] !== 'string' || obj.categoryExplanations[cat].trim().length === 0) {
      logger.error('AIResponseValidator', `ATS Analysis: categoryExplanations is missing or has empty string for category "${cat}"`);
      return false;
    }
  }

  // Validate roleFit
  if (typeof obj.roleFit !== 'string' || obj.roleFit.trim().length === 0) {
    logger.error('AIResponseValidator', 'ATS Analysis: Invalid roleFit type or empty value.');
    return false;
  }

  // Normalize single strings to arrays if necessary
  if (typeof obj.strengths === 'string') obj.strengths = [obj.strengths];
  if (typeof obj.weaknesses === 'string') obj.weaknesses = [obj.weaknesses];
  if (typeof obj.missingKeywords === 'string') obj.missingKeywords = [obj.missingKeywords];
  if (typeof obj.recommendations === 'string') obj.recommendations = [obj.recommendations];

  // Validate arrays
  if (!Array.isArray(obj.strengths) || obj.strengths.length === 0) {
    logger.error('AIResponseValidator', 'ATS Analysis: strengths must be a non-empty array.');
    return false;
  }
  if (!Array.isArray(obj.weaknesses) || obj.weaknesses.length === 0) {
    logger.error('AIResponseValidator', 'ATS Analysis: weaknesses must be a non-empty array.');
    return false;
  }
  if (!Array.isArray(obj.missingKeywords)) {
    logger.error('AIResponseValidator', 'ATS Analysis: missingKeywords must be an array.');
    return false;
  }
  if (!Array.isArray(obj.recommendations) || obj.recommendations.length === 0) {
    logger.error('AIResponseValidator', 'ATS Analysis: recommendations must be a non-empty array.');
    return false;
  }

  // Validate strengths elements (must be object with text/source_evidence or string)
  for (const item of obj.strengths) {
    if (typeof item === 'object' && item !== null) {
      if (typeof item.text !== 'string' || typeof item.source_evidence !== 'string') {
        logger.error('AIResponseValidator', 'ATS Analysis: strengths item is missing text or source_evidence properties.');
        return false;
      }
    } else if (typeof item !== 'string') {
      logger.error('AIResponseValidator', 'ATS Analysis: strengths item must be a string or object.');
      return false;
    }
  }

  return true;
}

/**
 * Validates Skill Gap Analysis response.
 * @param {object} obj - Parsed JSON object.
 * @returns {boolean} - True if valid.
 */
function validateSkillGap(obj) {
  if (!obj || typeof obj !== 'object') {
    logger.error('AIResponseValidator', 'Skill Gap: Result is not an object.');
    return false;
  }

  const requiredKeys = ['matchedSkills', 'missingSkills', 'recommendedSkills', 'learningRoadmap'];
  for (const key of requiredKeys) {
    if (!obj.hasOwnProperty(key)) {
      logger.error('AIResponseValidator', `Skill Gap: Missing required key "${key}"`);
      return false;
    }
  }

  // Normalize
  if (typeof obj.matchedSkills === 'string') obj.matchedSkills = [obj.matchedSkills];
  if (typeof obj.missingSkills === 'string') obj.missingSkills = [obj.missingSkills];
  if (typeof obj.recommendedSkills === 'string') obj.recommendedSkills = [obj.recommendedSkills];
  if (typeof obj.learningRoadmap === 'string') obj.learningRoadmap = [obj.learningRoadmap];

  if (!Array.isArray(obj.matchedSkills)) {
    logger.error('AIResponseValidator', 'Skill Gap: matchedSkills must be an array.');
    return false;
  }
  if (!Array.isArray(obj.missingSkills)) {
    logger.error('AIResponseValidator', 'Skill Gap: missingSkills must be an array.');
    return false;
  }
  if (!Array.isArray(obj.recommendedSkills)) {
    logger.error('AIResponseValidator', 'Skill Gap: recommendedSkills must be an array.');
    return false;
  }
  if (!Array.isArray(obj.learningRoadmap) || obj.learningRoadmap.length === 0) {
    logger.error('AIResponseValidator', 'Skill Gap: learningRoadmap must be a non-empty array.');
    return false;
  }

  // Normalize learningRoadmap items into structured objects
  obj.learningRoadmap = obj.learningRoadmap.map((item, idx) => {
    if (item && typeof item === 'object') {
      return {
        title: item.title || `Phase ${idx + 1}`,
        duration: item.duration || '2 weeks',
        topics: Array.isArray(item.topics) ? item.topics : (item.topics ? [item.topics] : [])
      };
    }
    
    if (typeof item === 'string') {
      const match = item.match(/^(?:Phase\s+\d+:\s*)?([^(]+)(?:\(([^)]+)\))?/i);
      let title = item;
      let duration = '2 weeks';
      if (match) {
        title = match[1].trim();
        if (match[2]) {
          duration = match[2].trim();
        }
      }
      
      let topics = [];
      const topicsMatch = title.match(/(?:using|with|in)\s+([^,.]+)/i);
      if (topicsMatch) {
        topics = topicsMatch[1].split(/(?:,|\band\b)/).map(t => t.trim()).filter(Boolean);
      }
      if (topics.length === 0) {
        topics = [title];
      }
      
      return { title, duration, topics };
    }
    
    return {
      title: `Phase ${idx + 1}`,
      duration: '2 weeks',
      topics: []
    };
  });

  return true;
}

/**
 * Validates Interview Questions response.
 * @param {object} obj - Parsed JSON object.
 * @returns {boolean} - True if valid.
 */
function validateInterviewQuestions(obj) {
  if (!obj || typeof obj !== 'object') {
    logger.error('AIResponseValidator', 'Interview Questions: Result is not an object.');
    return false;
  }

  const requiredKeys = ['technical', 'projectBased', 'skillGap', 'behavioral', 'hrQuestions'];
  for (const key of requiredKeys) {
    if (!obj.hasOwnProperty(key)) {
      logger.error('AIResponseValidator', `Interview Questions: Missing required key "${key}"`);
      return false;
    }
  }

  // Normalize
  if (typeof obj.technical === 'string') obj.technical = [obj.technical];
  if (typeof obj.projectBased === 'string') obj.projectBased = [obj.projectBased];
  if (typeof obj.skillGap === 'string') obj.skillGap = [obj.skillGap];
  if (typeof obj.behavioral === 'string') obj.behavioral = [obj.behavioral];
  if (typeof obj.hrQuestions === 'string') obj.hrQuestions = [obj.hrQuestions];

  for (const key of requiredKeys) {
    if (!Array.isArray(obj[key]) || obj[key].length === 0) {
      logger.error('AIResponseValidator', `Interview Questions: "${key}" must be a non-empty array.`);
      return false;
    }
  }

  return true;
}

/**
 * Validates the final consolidated record before it gets stored in the database.
 * Enforces business rules like breakdown sums matching overall score.
 */
function validateConsolidatedRecord(record) {
  if (!record || typeof record !== 'object') {
    logger.error('AIResponseValidator', 'Consolidated Validation: Record is null or not an object.');
    return false;
  }

  // 1. Verify targetRole exists
  if (!record.targetRole || typeof record.targetRole !== 'string') {
    logger.error('AIResponseValidator', 'Consolidated Validation: Missing or invalid targetRole.');
    return false;
  }
  
  // 2. Verify ATS Score exists and is within 0-100
  if (typeof record.score !== 'number' || record.score < 0 || record.score > 100) {
    logger.error('AIResponseValidator', `Consolidated Validation: Invalid ATS score (${record.score}).`);
    return false;
  }
  
  // 3. Verify ATS Breakdown exists and breakdown totals equal overall score
  if (!record.breakdown || typeof record.breakdown !== 'object') {
    logger.error('AIResponseValidator', 'Consolidated Validation: Missing breakdown object.');
    return false;
  }
  const breakdownKeys = ['contact', 'structure', 'skills', 'experience', 'projects', 'education', 'keywords', 'achievements'];
  const hasAllBreakdownKeys = breakdownKeys.every(k => typeof record.breakdown[k] === 'number');
  if (!hasAllBreakdownKeys) {
    logger.error('AIResponseValidator', 'Consolidated Validation: Breakdown is missing required category scores.');
    return false;
  }
  
  const sum = Object.values(record.breakdown).reduce((a, b) => a + b, 0);
  if (sum !== record.score) {
    logger.error('AIResponseValidator', `Consolidated Validation: Breakdown sum (${sum}) does not match overall score (${record.score}).`);
    return false;
  }
  
  // 4. Verify Strengths, Weaknesses, Recommendations exist and are non-empty arrays
  if (!Array.isArray(record.strengths) || record.strengths.length === 0) {
    logger.error('AIResponseValidator', 'Consolidated Validation: strengths is missing or empty.');
    return false;
  }
  if (!Array.isArray(record.weaknesses) || record.weaknesses.length === 0) {
    logger.error('AIResponseValidator', 'Consolidated Validation: weaknesses is missing or empty.');
    return false;
  }
  if (!Array.isArray(record.recommendations) || record.recommendations.length === 0) {
    logger.error('AIResponseValidator', 'Consolidated Validation: recommendations is missing or empty.');
    return false;
  }
  
  // 5. Verify recruiterFeedback (Role Fit) exists
  if (!record.recruiterFeedback || typeof record.recruiterFeedback !== 'string') {
    logger.error('AIResponseValidator', 'Consolidated Validation: Missing recruiterFeedback.');
    return false;
  }
  
  // 6. Verify Category explanations exist and contain all 8 categories
  if (!record.explanations || typeof record.explanations !== 'object') {
    logger.error('AIResponseValidator', 'Consolidated Validation: Missing explanations object.');
    return false;
  }
  const hasAllExplanations = breakdownKeys.every(k => typeof record.explanations[k] === 'string' && record.explanations[k].length > 0);
  if (!hasAllExplanations) {
    logger.error('AIResponseValidator', 'Consolidated Validation: Explanations are missing or empty for category scores.');
    return false;
  }
  
  // 7. Verify detectedSkills is an array
  if (!Array.isArray(record.detectedSkills)) {
    logger.error('AIResponseValidator', 'Consolidated Validation: detectedSkills must be an array.');
    return false;
  }
  
  // 8. Verify skillGap exists and has missingSkills array
  if (!record.skillGap || !Array.isArray(record.skillGap.missingSkills)) {
    logger.error('AIResponseValidator', 'Consolidated Validation: Missing or invalid skillGap.');
    return false;
  }

  return true;
}

module.exports = {
  validateAtsAnalysis,
  validateSkillGap,
  validateInterviewQuestions,
  validateConsolidatedRecord
};
