/**
 * @file groundingValidator.js
 * @description Validates that AI-generated claims, skills, recommendations, and questions are grounded in verbatim resume text or target role configurations.
 */

const logger = require('../utils/logger') || {
  info: (ctx, msg) => console.log(`[INFO] [${ctx}] ${msg}`),
  warn: (ctx, msg) => console.warn(`[WARN] [${ctx}] ${msg}`),
  error: (ctx, msg) => console.error(`[ERROR] [${ctx}] ${msg}`)
};

const rolesConfig = require('../config/rolesConfig');

// Comprehensive list of industry-relevant technical keywords to detect references
const techKeywords = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust',
  'react', 'angular', 'vue', 'svelte', 'nuxt', 'next.js', 'node.js', 'express', 'django', 'flask',
  'fastapi', 'spring', 'nestjs', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis',
  'supabase', 'firebase', 'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'git', 'github', 
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'html', 'css', 'sass', 'tailwind',
  'graphql', 'rest api', 'ci/cd', 'agile', 'scrum', 'linux', 'webpack', 'vite', 'jest', 'pytest',
  'terraform', 'ansible', 'prometheus', 'grafana', 'kafka', 'rabbitmq', 'elasticsearch', 'nginx',
  'figma', 'jira', 'confluence'
];

/**
 * Normalizes text for matching by converting to lowercase and condensing whitespace.
 */
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Checks if a substring exists verbatim in the source text.
 */
function isVerbatimInSource(substring, normalizedSource) {
  if (!substring || typeof substring !== 'string') return false;
  const normalizedSub = normalizeText(substring);
  if (normalizedSub.length < 3) return false;
  return normalizedSource.includes(normalizedSub);
}

/**
 * Verifies if any referenced technologies/skills inside a statement are grounded in the resume or target role.
 */
function verifyGrounding(statement, resumeText, targetRole) {
  if (!statement || typeof statement !== 'string') return true;
  
  const normalizedStatement = statement.toLowerCase();
  const normalizedResume = normalizeText(resumeText);
  
  const role = rolesConfig[targetRole] || rolesConfig['Other'] || { essential: [], recommended: [] };
  const roleSkills = [...(role.essential || []), ...(role.recommended || [])].map(s => s.toLowerCase());

  // Check each technology reference
  for (const tech of techKeywords) {
    const escapedTech = tech.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTech}\\b`, 'i');
    
    if (regex.test(normalizedStatement)) {
      const inResume = normalizedResume.includes(tech);
      const inRole = roleSkills.some(s => s.includes(tech) || tech.includes(s));

      if (!inResume && !inRole) {
        logger.warn('GroundingValidator', `Rejected statement containing ungrounded tech/skill reference "${tech}": "${statement}"`);
        return false;
      }
    }
  }
  return true;
}

/**
 * Validates ATS Analysis.
 * Filters strengths using verbatim checks, and filters weaknesses, recommendations, and explanations using verifyGrounding.
 */
function validateAtsAnalysis(parsed, resumeText, targetRole = 'Software Engineer') {
  const normalizedSource = normalizeText(resumeText);
  const validatedStrengths = [];
  const droppedStrengthsCount = { count: 0 };

  // 1. Validate strengths (require verbatim source_evidence)
  const strengths = parsed.strengths || [];
  for (const s of strengths) {
    if (typeof s === 'string') {
      if (isVerbatimInSource(s, normalizedSource)) {
        validatedStrengths.push(s);
      } else {
        logger.warn('GroundingValidator', 'Strength dropped because text was not found in source resume.');
        droppedStrengthsCount.count++;
      }
      continue;
    }

    const text = s.text || '';
    const evidence = s.source_evidence || '';

    if (!evidence || typeof evidence !== 'string' || evidence.trim().length < 4) {
      logger.warn('GroundingValidator', 'Strength dropped due to missing or empty source evidence.');
      droppedStrengthsCount.count++;
      continue;
    }

    if (!isVerbatimInSource(evidence, normalizedSource)) {
      logger.warn('GroundingValidator', `Strength dropped because source evidence "${evidence}" was not found verbatim in resume.`);
      droppedStrengthsCount.count++;
      continue;
    }

    // Verify any tech mentioned in the strength is grounded
    if (verifyGrounding(text, resumeText, targetRole)) {
      validatedStrengths.push(text);
    } else {
      logger.warn('GroundingValidator', `Strength "${text}" dropped because it mentioned ungrounded tech.`);
      droppedStrengthsCount.count++;
    }
  }

  // 2. Validate weaknesses (enforce grounding, replace with generic fallback if ungrounded)
  const validatedWeaknesses = [];
  for (const w of (parsed.weaknesses || [])) {
    if (verifyGrounding(w, resumeText, targetRole)) {
      validatedWeaknesses.push(w);
    } else {
      logger.warn('GroundingValidator', `Weakness "${w}" failed grounding. Repairing with fallback.`);
      validatedWeaknesses.push("Review and expand on role-specific technical requirements to ensure complete coverage.");
    }
  }

  // 3. Validate recommendations (replace with generic fallback if ungrounded)
  const validatedRecommendations = [];
  for (const r of (parsed.recommendations || [])) {
    if (verifyGrounding(r, resumeText, targetRole)) {
      validatedRecommendations.push(r);
    } else {
      logger.warn('GroundingValidator', `Recommendation "${r}" failed grounding. Repairing with fallback.`);
      validatedRecommendations.push("Focus on learning and documenting industry-standard frameworks, libraries, and tools relevant to the target role.");
    }
  }

  // 4. Validate categoryExplanations (replace with generic fallback if ungrounded)
  const validatedExplanations = {};
  const explanations = parsed.categoryExplanations || {};
  for (const key of Object.keys(explanations)) {
    const val = explanations[key];
    if (verifyGrounding(val, resumeText, targetRole)) {
      validatedExplanations[key] = val;
    } else {
      logger.warn('GroundingValidator', `Explanation for category "${key}" failed grounding. Repairing with fallback.`);
      validatedExplanations[key] = "Evaluated based on the presence and organization of standard indicators matching this category.";
    }
  }

  return {
    validated: {
      ...parsed,
      strengths: validatedStrengths,
      weaknesses: validatedWeaknesses,
      recommendations: validatedRecommendations,
      categoryExplanations: validatedExplanations
    },
    dropCount: droppedStrengthsCount.count,
    totalCount: strengths.length
  };
}

/**
 * Validates Skill Gap Analysis.
 * Filters matchedSkills using verbatim checks, and filters missing/recommended skills using target role configuration.
 */
function validateSkillGap(parsed, resumeText, targetRole = 'Software Engineer') {
  const normalizedSource = normalizeText(resumeText);
  const validatedMatched = [];
  const droppedMatchedCount = { count: 0 };

  // 1. Validate matchedSkills (require verbatim source_evidence)
  const matched = parsed.matchedSkills || [];
  for (const skill of matched) {
    if (typeof skill === 'string') {
      if (isVerbatimInSource(skill, normalizedSource)) {
        validatedMatched.push(skill);
      } else {
        droppedMatchedCount.count++;
      }
      continue;
    }

    const name = skill.name || '';
    const evidence = skill.source_evidence || '';

    if (!evidence || typeof evidence !== 'string' || evidence.trim().length < 3) {
      droppedMatchedCount.count++;
      continue;
    }

    if (!isVerbatimInSource(evidence, normalizedSource)) {
      droppedMatchedCount.count++;
      continue;
    }

    validatedMatched.push(name);
  }

  // 2. Validate missingSkills and recommendedSkills (must exist in target role skills config)
  const role = rolesConfig[targetRole] || rolesConfig['Other'] || { essential: [], recommended: [] };
  const roleSkills = [...(role.essential || []), ...(role.recommended || [])].map(s => s.toLowerCase());

  const validatedMissing = [];
  for (const skill of (parsed.missingSkills || [])) {
    if (roleSkills.some(s => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s))) {
      validatedMissing.push(skill);
    } else {
      logger.warn('GroundingValidator', `Dropped ungrounded missing skill "${skill}" for role "${targetRole}"`);
    }
  }

  const validatedRecommended = [];
  for (const skill of (parsed.recommendedSkills || [])) {
    if (roleSkills.some(s => s.includes(skill.toLowerCase()) || skill.toLowerCase().includes(s))) {
      validatedRecommended.push(skill);
    } else {
      logger.warn('GroundingValidator', `Dropped ungrounded recommended skill "${skill}" for role "${targetRole}"`);
    }
  }

  return {
    validated: {
      ...parsed,
      matchedSkills: validatedMatched,
      missingSkills: validatedMissing,
      recommendedSkills: validatedRecommended
    },
    dropCount: droppedMatchedCount.count,
    totalCount: matched.length
  };
}

/**
 * Validates Interview Questions.
 * Questions in technical, projectBased, and skillGap require verbatim source_evidence and verifyGrounding.
 */
function validateInterviewQuestions(parsed, resumeText, targetRole = 'Software Engineer') {
  const normalizedSource = normalizeText(resumeText);
  const validated = {
    technical: [],
    projectBased: [],
    skillGap: [],
    domainKnowledge: [],
    behavioral: [],
    hrQuestions: []
  };
  const droppedCount = { count: 0 };

  const categories = ['technical', 'projectBased', 'skillGap', 'domainKnowledge'];
  const exemptCategories = ['behavioral', 'hrQuestions'];

  // Process exempt categories (only require verifyGrounding)
  for (const cat of exemptCategories) {
    const list = parsed[cat] || [];
    for (const q of list) {
      const qText = typeof q === 'string' ? q : (q && q.question ? q.question : '');
      if (qText && verifyGrounding(qText, resumeText, targetRole)) {
        validated[cat].push(qText);
      }
    }
  }

  // Process grounded categories (require verbatim source_evidence + verifyGrounding)
  for (const cat of categories) {
    const list = parsed[cat] || [];
    for (const q of list) {
      if (typeof q === 'string') {
        droppedCount.count++;
        continue;
      }

      const question = q.question || '';
      const evidence = q.source_evidence || '';

      if (!evidence || typeof evidence !== 'string' || evidence.trim().length < 4) {
        droppedCount.count++;
        continue;
      }

      if (!isVerbatimInSource(evidence, normalizedSource)) {
        droppedCount.count++;
        continue;
      }

      if (verifyGrounding(question, resumeText, targetRole)) {
        validated[cat].push(question);
      } else {
        droppedCount.count++;
      }
    }
  }

  const totalGroundedCount = (parsed.technical || []).length + 
                             (parsed.projectBased || []).length + 
                             (parsed.skillGap || []).length + 
                             (parsed.domainKnowledge || []).length;

  return {
    validated,
    dropCount: droppedCount.count,
    totalCount: totalGroundedCount
  };
}

module.exports = {
  validateAtsAnalysis,
  validateSkillGap,
  validateInterviewQuestions
};
