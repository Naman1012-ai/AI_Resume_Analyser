/**
 * @file aiResponseValidator.js
 * @description Validates JSON schema, key presence, data types, and score ranges for LLM outputs.
 * Auto-heals missing or invalid keys/structures to ensure maximum reliability and prevent pipeline crashes.
 */

const logger = require('../utils/logger');

/**
 * Validates and auto-heals ATS Analysis response.
 * @param {object} obj - Parsed JSON object.
 * @returns {boolean} - True if valid or successfully healed.
 */
function validateAtsAnalysis(obj) {
  if (!obj || typeof obj !== 'object') {
    logger.error('AIResponseValidator', 'ATS Analysis: Result is not an object.');
    logger.error(`[aiResponseValidator] Validation failed:
  Field: ats_analysis
  Expected: object
  Received: ${JSON.stringify(obj).slice(0, 200)}`);
    return false;
  }

  // Auto-heal missing or invalid top-level keys
  if (!obj.hasOwnProperty('strengths') || !Array.isArray(obj.strengths)) {
    logger.warn('AIResponseValidator', 'ATS Analysis: Auto-healing missing or invalid "strengths" array.');
    obj.strengths = [];
  }
  if (!obj.hasOwnProperty('weaknesses') || !Array.isArray(obj.weaknesses)) {
    logger.warn('AIResponseValidator', 'ATS Analysis: Auto-healing missing or invalid "weaknesses" array.');
    obj.weaknesses = [];
  }
  if (!obj.hasOwnProperty('missingKeywords') || !Array.isArray(obj.missingKeywords)) {
    logger.warn('AIResponseValidator', 'ATS Analysis: Auto-healing missing or invalid "missingKeywords" array.');
    obj.missingKeywords = [];
  }
  if (!obj.hasOwnProperty('recommendations') || !Array.isArray(obj.recommendations)) {
    logger.warn('AIResponseValidator', 'ATS Analysis: Auto-healing missing or invalid "recommendations" array.');
    obj.recommendations = [];
  }
  if (!obj.hasOwnProperty('roleFit') || typeof obj.roleFit !== 'string') {
    logger.warn('AIResponseValidator', 'ATS Analysis: Auto-healing missing or invalid "roleFit" string.');
    obj.roleFit = "The candidate matches the general qualifications expected for the target role.";
  }
  if (!obj.hasOwnProperty('categoryExplanations') || typeof obj.categoryExplanations !== 'object' || obj.categoryExplanations === null) {
    logger.warn('AIResponseValidator', 'ATS Analysis: Auto-healing missing or invalid "categoryExplanations" object.');
    obj.categoryExplanations = {};
  }

  // Populate missing categories in explanations
  const expectedCategories = ['contact', 'formatting', 'skills', 'experience', 'projects', 'education', 'keywords', 'achievements'];
  for (const cat of expectedCategories) {
    if (!obj.categoryExplanations.hasOwnProperty(cat) || typeof obj.categoryExplanations[cat] !== 'string' || obj.categoryExplanations[cat].trim().length === 0) {
      logger.warn('AIResponseValidator', `ATS Analysis: Auto-healing missing or empty categoryExplanations for "${cat}".`);
      obj.categoryExplanations[cat] = `Based on the resume content, the ${cat} section was evaluated and scored. No severe structural issues were flagged.`;
    }
  }

  // Populate default lists if empty
  if (obj.strengths.length === 0) {
    obj.strengths.push({
      text: "Demonstrates relevant professional background and structured section formatting.",
      source_evidence: ""
    });
  }
  if (obj.weaknesses.length === 0) {
    obj.weaknesses.push("Some sections could benefit from more detailed descriptions or quantified achievements.");
  }
  if (obj.recommendations.length === 0) {
    obj.recommendations.push("Ensure your accomplishments highlight specific metrics or percentage increases where applicable.");
  }

  // Normalize strength items
  obj.strengths = obj.strengths.map(item => {
    if (item && typeof item === 'object') {
      return {
        text: typeof item.text === 'string' ? item.text : (item.source_evidence || "Strong technical competencies shown in work history."),
        source_evidence: typeof item.source_evidence === 'string' ? item.source_evidence : ""
      };
    } else if (typeof item === 'string') {
      return {
        text: item,
        source_evidence: ""
      };
    } else {
      return {
        text: "Demonstrates relevant professional background.",
        source_evidence: ""
      };
    }
  });

  return true;
}

/**
 * Validates and auto-heals Skill Gap Analysis response.
 * @param {object} obj - Parsed JSON object.
 * @returns {boolean} - True if valid or successfully healed.
 */
function validateSkillGap(obj) {
  if (!obj || typeof obj !== 'object') {
    logger.error('AIResponseValidator', 'Skill Gap: Result is not an object.');
    logger.error(`[aiResponseValidator] Validation failed:
  Field: skill_gap
  Expected: object
  Received: ${JSON.stringify(obj).slice(0, 200)}`);
    return false;
  }

  // Auto-heal missing or invalid fields
  if (!obj.hasOwnProperty('matchedSkills') || !Array.isArray(obj.matchedSkills)) {
    logger.warn('AIResponseValidator', 'Skill Gap: Auto-healing missing or invalid "matchedSkills" array.');
    obj.matchedSkills = [];
  }
  if (!obj.hasOwnProperty('missingSkills') || !Array.isArray(obj.missingSkills)) {
    logger.warn('AIResponseValidator', 'Skill Gap: Auto-healing missing or invalid "missingSkills" array.');
    obj.missingSkills = [];
  }
  if (!obj.hasOwnProperty('recommendedSkills') || !Array.isArray(obj.recommendedSkills)) {
    logger.warn('AIResponseValidator', 'Skill Gap: Auto-healing missing or invalid "recommendedSkills" array.');
    obj.recommendedSkills = [];
  }
  if (!obj.hasOwnProperty('learningRoadmap') || !Array.isArray(obj.learningRoadmap)) {
    logger.warn('AIResponseValidator', 'Skill Gap: Auto-healing missing or invalid "learningRoadmap" array.');
    obj.learningRoadmap = [];
  }

  // Normalize matchedSkills items
  obj.matchedSkills = obj.matchedSkills.map(item => {
    if (item && typeof item === 'object') {
      return {
        name: typeof item.name === 'string' ? item.name : "Technical Competency",
        source_evidence: typeof item.source_evidence === 'string' ? item.source_evidence : ""
      };
    } else if (typeof item === 'string') {
      return {
        name: item,
        source_evidence: ""
      };
    } else {
      return {
        name: "Technical Skill",
        source_evidence: ""
      };
    }
  });

  // Ensure learning roadmap is not empty
  if (obj.learningRoadmap.length === 0) {
    obj.learningRoadmap.push({
      title: "Core Technical Concepts",
      duration: "2 weeks",
      topics: ["Review primary skills listed in target role"]
    });
  }

  // Normalize learningRoadmap items
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
 * Validates and auto-heals Interview Questions response.
 * @param {object} obj - Parsed JSON object.
 * @returns {boolean} - True if valid or successfully healed.
 */
function validateInterviewQuestions(obj) {
  if (!obj || typeof obj !== 'object') {
    logger.error('AIResponseValidator', 'Interview Questions: Result is not an object.');
    logger.error(`[aiResponseValidator] Validation failed:
  Field: interview_questions
  Expected: object
  Received: ${JSON.stringify(obj).slice(0, 200)}`);
    return false;
  }

  const requiredKeys = ['technical', 'projectBased', 'behavioral', 'hrQuestions'];
  for (const key of requiredKeys) {
    if (!obj.hasOwnProperty(key) || !Array.isArray(obj[key])) {
      logger.warn('AIResponseValidator', `Interview Questions: Auto-healing missing or invalid array "${key}".`);
      obj[key] = [];
    }
  }

  // Find or create skillGap / domainKnowledge
  let gapKey = obj.hasOwnProperty('domainKnowledge') ? 'domainKnowledge' : 'skillGap';
  if (!obj.hasOwnProperty('domainKnowledge') && !obj.hasOwnProperty('skillGap')) {
    logger.warn('AIResponseValidator', 'Interview Questions: Auto-healing missing "skillGap"/"domainKnowledge".');
    obj.skillGap = [];
    gapKey = 'skillGap';
  } else if (!Array.isArray(obj[gapKey])) {
    logger.warn('AIResponseValidator', `Interview Questions: Auto-healing invalid array "${gapKey}".`);
    obj[gapKey] = [];
  }

  // Populate default items if empty
  if (obj.technical.length === 0) {
    obj.technical.push("Explain your experience with the primary technologies listed in your resume.");
  }
  if (obj.projectBased.length === 0) {
    obj.projectBased.push("Describe the architectural challenges and technical decisions in your most significant project.");
  }
  if (obj.behavioral.length === 0) {
    obj.behavioral.push("Tell me about a time you had to deal with a tight deadline or ambiguous requirements.");
  }
  if (obj.hrQuestions.length === 0) {
    obj.hrQuestions.push("Why do you want to transition or apply to this specific target role?");
  }
  if (obj[gapKey].length === 0) {
    obj[gapKey].push("What steps are you taking to bridge your identified technology gaps for this role?");
  }

  return true;
}

/**
 * Validates and auto-heals the final consolidated record before it gets stored in the database.
 * Enforces business rules like breakdown sums matching overall score.
 */
function validateConsolidatedRecord(record) {
  if (!record || typeof record !== 'object') {
    logger.error('AIResponseValidator', 'Consolidated Validation: Record is null or not an object.');
    logger.error(`[aiResponseValidator] Validation failed:
  Field: record
  Expected: object
  Received: ${JSON.stringify(record).slice(0, 200)}`);
    return false;
  }

  // 1. Verify targetRole exists
  if (!record.targetRole || typeof record.targetRole !== 'string') {
    logger.warn('AIResponseValidator', 'Consolidated Validation: Auto-healing missing targetRole.');
    record.targetRole = "Software Engineer";
  }
  
  // 2. Verify ATS Score exists and is within 0-100
  if (typeof record.score !== 'number' || record.score < 0 || record.score > 100) {
    logger.warn('AIResponseValidator', 'Consolidated Validation: Auto-healing invalid score.');
    record.score = 70;
  }
  
  // 3. Verify ATS Breakdown exists
  if (!record.breakdown || typeof record.breakdown !== 'object') {
    logger.warn('AIResponseValidator', 'Consolidated Validation: Auto-healing missing breakdown.');
    record.breakdown = {};
  }
  
  const breakdownKeys = ['contact', 'formatting', 'skills', 'experience', 'projects', 'education', 'keywords', 'achievements'];
  for (const k of breakdownKeys) {
    if (typeof record.breakdown[k] !== 'number') {
      record.breakdown[k] = 0;
    }
  }
  
  // Recalculate sum or balance the breakdown to match score
  let sum = Object.values(record.breakdown).reduce((a, b) => a + b, 0);
  if (sum !== record.score) {
    logger.warn('AIResponseValidator', `Consolidated Validation: Adjusting breakdown sum (${sum}) to match overall score (${record.score}).`);
    // Adjust achievements category or distribute difference to balance perfectly
    const diff = record.score - sum;
    record.breakdown.achievements = (record.breakdown.achievements || 0) + diff;
    if (record.breakdown.achievements < 0) {
      record.breakdown.achievements = 0;
      // Re-sum and adjust skills if achievements adjustment wasn't enough
      const newSum = Object.values(record.breakdown).reduce((a, b) => a + b, 0);
      record.breakdown.skills = (record.breakdown.skills || 0) + (record.score - newSum);
    }
  }
  
  // 4. Verify Strengths, Weaknesses, Recommendations exist and are non-empty arrays
  if (!Array.isArray(record.strengths) || record.strengths.length === 0) {
    logger.warn('AIResponseValidator', 'Consolidated Validation: Auto-healing missing strengths.');
    record.strengths = [{ text: "Well-structured resume sections and standard formatting.", source_evidence: "" }];
  }
  if (!Array.isArray(record.weaknesses) || record.weaknesses.length === 0) {
    logger.warn('AIResponseValidator', 'Consolidated Validation: Auto-healing missing weaknesses.');
    record.weaknesses = ["Could benefit from more quantified achievements."];
  }
  if (!Array.isArray(record.recommendations) || record.recommendations.length === 0) {
    logger.warn('AIResponseValidator', 'Consolidated Validation: Auto-healing missing recommendations.');
    record.recommendations = ["Highlight metric-driven achievements in your work history description."];
  }
  
  // 5. Verify recruiterFeedback (Role Fit) exists
  if (!record.recruiterFeedback || typeof record.recruiterFeedback !== 'string') {
    logger.warn('AIResponseValidator', 'Consolidated Validation: Auto-healing missing recruiterFeedback.');
    record.recruiterFeedback = "General resume optimization is recommended to better target the role.";
  }
  
  // 6. Verify Category explanations exist and contain all 8 categories
  if (!record.explanations || typeof record.explanations !== 'object') {
    logger.warn('AIResponseValidator', 'Consolidated Validation: Auto-healing missing explanations.');
    record.explanations = {};
  }
  for (const k of breakdownKeys) {
    if (typeof record.explanations[k] !== 'string' || record.explanations[k].length === 0) {
      record.explanations[k] = `Evaluation and score computed for the ${k} category. No major red flags detected.`;
    }
  }
  
  // 7. Verify detectedSkills is an array
  if (!Array.isArray(record.detectedSkills)) {
    logger.warn('AIResponseValidator', 'Consolidated Validation: Auto-healing missing detectedSkills.');
    record.detectedSkills = [];
  }
  
  // 8. Verify skillGap exists and has missingSkills array
  if (!record.skillGap || !Array.isArray(record.skillGap.missingSkills)) {
    logger.warn('AIResponseValidator', 'Consolidated Validation: Auto-healing missing skillGap.');
    record.skillGap = {
      matchedSkills: [],
      missingSkills: [],
      recommendedSkills: [],
      learningRoadmap: [{ title: "Primary Technologies", duration: "2 weeks", topics: ["Review core target role requirements"] }]
    };
  }

  return true;
}

module.exports = {
  validateAtsAnalysis,
  validateSkillGap,
  validateInterviewQuestions,
  validateConsolidatedRecord
};
