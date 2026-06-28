/**
 * @file atsScorer.js
 * @description Advanced modular service layer to score resumes based on realistic ATS standards.
 * Evaluates: Contact Information, Resume Structure, Skills, Experience, Projects, Education, Keywords, Achievements.
 */

const constants = require('../config/constants');
const logger = require('../utils/logger');
const rolesConfig = require('../config/rolesConfig');

// Comprehensive list of industry-relevant technical keywords (matched dynamically)
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

// Technical action verbs indicating active contribution
const actionVerbs = [
  'led', 'managed', 'developed', 'optimized', 'built', 'implemented', 'designed',
  'created', 'coordinated', 'executed', 'architected', 'spearheaded', 'automated',
  'streamlined', 'reduced', 'increased', 'improved', 'saved', 'scaled', 'initiated',
  'delivered', 'researched', 'debugged', 'mentored', 'migrated', 'refactored', 'deployed',
  'orchestrated', 'analyzed', 'documented'
];

// ATS Action/Competency keywords
const atsCoreKeywords = [
  'optimize', 'scale', 'deploy', 'integrate', 'collaborate', 'infrastructure',
  'pipeline', 'architecture', 'database', 'application', 'server', 'testing',
  'deployment', 'monitoring', 'security', 'performance', 'frontend', 'backend'
];

/**
 * Creates a robust regex for a keyword.
 * @param {string} keyword
 * @returns {RegExp}
 */
const getKeywordRegex = (keyword) => {
  const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const startBoundary = /^\w/.test(keyword) ? '\\b' : '';
  const endBoundary = /\w$/.test(keyword) ? '\\b' : '';
  return new RegExp(startBoundary + escaped + endBoundary, 'i');
};

/**
 * Scores a resume based on realistic ATS evaluation criteria with 8 required categories.
 * @param {string} text - Raw resume text content.
 * @param {string} targetRole - Target role.
 * @returns {object} - Scored results, including breakdown, strengths, weaknesses, recommendations, and missingSections.
 */
const scoreResume = (text, targetRole = 'Software Engineer') => {
  const normalizedText = text || '';

  // Resolve Target Role Configuration
  const role = rolesConfig[targetRole] || rolesConfig['Other'];
  const essentialSkills = role.essential || [];
  const recommendedSkills = role.recommended || [];
  const roleSkills = [...essentialSkills, ...recommendedSkills];
  
  const breakdown = {
    contact: 0,
    formatting: 0,
    skills: 0,
    experience: 0,
    projects: 0,
    education: 0,
    keywords: 0,
    achievements: 0
  };

  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  // Date and chronological indicators (regex to detect year ranges)
  const dateRangeRegex = /(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current|now)/i;
  const singleDateRegex = /\b(?:19|20)\d{2}\b/i;

  // ----------------------------------------------------
  // 1. Contact Information (Max 10)
  // ----------------------------------------------------
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(normalizedText);
  const hasPhone = /(?:\+?[0-9]{1,4}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/.test(normalizedText);
  const hasLocation = /location|address|zip|([A-Z][a-zA-Z\s]+,\s*[A-Z]{2,})/i.test(normalizedText);
  const hasLinkedIn = /linkedin\.com/i.test(normalizedText);

  let contactScore = 0;
  const contactDeductions = [];
  if (hasEmail) contactScore += 2.5; else contactDeductions.push('Email address');
  if (hasPhone) contactScore += 2.5; else contactDeductions.push('Phone number');
  if (hasLocation) contactScore += 2.5; else contactDeductions.push('Location details');
  if (hasLinkedIn) contactScore += 2.5; else contactDeductions.push('LinkedIn profile link');

  breakdown.contact = Math.round(contactScore);
  if (breakdown.contact === 10) {
    strengths.push('Complete contact information provided (Email, Phone, Location, and LinkedIn).');
  } else {
    weaknesses.push(`Missing essential contact elements: ${contactDeductions.join(', ')}.`);
    recommendations.push(`Add your missing contact information: ${contactDeductions.join(', ')}.`);
  }

  // ----------------------------------------------------
  // 2. Resume Structure (Max 10)
  // ----------------------------------------------------
  const hasSummaryHeader = /summary|objective|profile|about me|professional summary/i.test(normalizedText);
  const hasEducationHeader = /education|academic|degree|university|college|school/i.test(normalizedText);
  const hasSkillsHeader = /skills|technologies|languages|frameworks|tools|competencies/i.test(normalizedText);
  const hasProjectsHeader = /projects|personal projects|academic projects|portfolio/i.test(normalizedText);
  const hasExperienceHeader = /experience|work experience|employment|history|internship|professional experience/i.test(normalizedText);

  let structureScore = 0;
  if (hasSummaryHeader) structureScore += 2; else recommendations.push('Add a Professional Summary or Career Profile header.');
  if (hasEducationHeader) structureScore += 2; else weaknesses.push('Missing a standard Education section.');
  if (hasSkillsHeader) structureScore += 2; else weaknesses.push('Missing a dedicated Skills section.');
  if (hasProjectsHeader) structureScore += 2; else weaknesses.push('Missing a dedicated Projects section.');
  if (hasExperienceHeader) structureScore += 2; else weaknesses.push('Missing a standard Work Experience section.');

  breakdown.formatting = structureScore;
  if (structureScore === 10) {
    strengths.push('Excellent resume layout with all standard professional section headings.');
  }

  // ----------------------------------------------------
  // 3. Technical Skills (Max 20)
  // ----------------------------------------------------
  let essentialMatched = 0;
  let recommendedMatched = 0;
  const matchedSkillsList = [];
  const missingSkillsFromEssential = [];

  essentialSkills.forEach(skill => {
    const regex = getKeywordRegex(skill);
    if (regex.test(normalizedText)) {
      essentialMatched++;
      matchedSkillsList.push(skill);
    } else {
      missingSkillsFromEssential.push(skill);
    }
  });

  recommendedSkills.forEach(skill => {
    const regex = getKeywordRegex(skill);
    if (regex.test(normalizedText)) {
      recommendedMatched++;
      matchedSkillsList.push(skill);
    }
  });

  const skillsScore = Math.min(20, (essentialMatched * 2) + (recommendedMatched * 1));
  breakdown.skills = skillsScore;

  if (skillsScore >= 16) {
    strengths.push(`Strong alignment of core technical skills for the ${targetRole} role.`);
  } else {
    if (missingSkillsFromEssential.length > 0) {
      recommendations.push(`Add technical keywords matching the ${targetRole} target profile, such as: ${missingSkillsFromEssential.slice(0, 3).join(', ')}.`);
    }
  }

  // ----------------------------------------------------
  // 4. Experience (Max 20)
  // ----------------------------------------------------
  let experienceScore = 0;
  if (hasExperienceHeader) {
    experienceScore += 4;

    const expIndex = normalizedText.toLowerCase().search(/experience|work experience|employment|professional experience/);
    const subIndex = normalizedText.toLowerCase().slice(expIndex + 12).search(/education|projects|skills|certifications|references/);
    const expText = subIndex !== -1 
      ? normalizedText.slice(expIndex, expIndex + 12 + subIndex)
      : normalizedText.slice(expIndex);

    // Action verbs check
    let verbCount = 0;
    actionVerbs.forEach(verb => {
      if (getKeywordRegex(verb).test(expText)) verbCount++;
    });
    if (verbCount >= 5) experienceScore += 5; else recommendations.push('Incorporate strong technical action verbs into your job descriptions.');

    // Detail check
    if (expText.length > 500) experienceScore += 6; else recommendations.push('Increase descriptive details inside your professional history bullet points.');

    // Chronology timeline check
    const hasTimeline = dateRangeRegex.test(expText);
    if (hasTimeline) experienceScore += 5; else weaknesses.push('Incomplete dates or missing timeline ranges in professional experience.');
  }

  breakdown.experience = experienceScore;

  // ----------------------------------------------------
  // 5. Projects (Max 15)
  // ----------------------------------------------------
  let projectsScore = 0;
  if (hasProjectsHeader) {
    projectsScore += 3;

    const projectsIndex = normalizedText.toLowerCase().search(/projects|personal projects|academic projects/);
    const subsequentIndex = normalizedText.toLowerCase().slice(projectsIndex + 10).search(/experience|education|skills|certifications|references/);
    const projectsText = subsequentIndex !== -1 
      ? normalizedText.slice(projectsIndex, projectsIndex + 10 + subsequentIndex)
      : normalizedText.slice(projectsIndex);

    if (projectsText.length > 400) projectsScore += 4;
    
    let projTechCount = 0;
    roleSkills.forEach(keyword => {
      if (getKeywordRegex(keyword).test(projectsText)) projTechCount++;
    });
    if (projTechCount >= 3) projectsScore += 4;

    if (projectsText.length > 700) projectsScore += 4;
  }

  breakdown.projects = Math.min(15, projectsScore);

  // ----------------------------------------------------
  // 6. Education (Max 10)
  // ----------------------------------------------------
  let educationScore = 0;
  if (hasEducationHeader) {
    educationScore += 4;
    const hasDegreeKeywords = /bachelor|master|phd|b\.s|m\.s|b\.tech|m\.tech|b\.a|m\.a|bsc|msc|gpa/i.test(normalizedText);
    if (hasDegreeKeywords) educationScore += 3;
    const hasEdDate = dateRangeRegex.test(normalizedText) || singleDateRegex.test(normalizedText);
    if (hasEdDate) educationScore += 3;
  }

  breakdown.education = educationScore;

  // ----------------------------------------------------
  // 7. Keywords (Max 10)
  // ----------------------------------------------------
  let matchedCoreKeywords = 0;
  atsCoreKeywords.forEach(keyword => {
    if (getKeywordRegex(keyword).test(normalizedText)) matchedCoreKeywords++;
  });

  breakdown.keywords = Math.min(10, Math.round(matchedCoreKeywords * 1.5));

  // ----------------------------------------------------
  // 8. Achievements (Max 5)
  // ----------------------------------------------------
  // Check for quantified impact/metrics in resume text
  const metricsRegex = /(?:\d+%\s*|\$\d+|\d+\s*x\s*|reduced|optimized|improved|increased|saved|sped)/i;
  const hasMetrics = metricsRegex.test(normalizedText);
  
  if (hasMetrics) {
    breakdown.achievements = 5;
    strengths.push('Includes quantified achievements or performance-driven metrics.');
  } else {
    breakdown.achievements = 0;
    weaknesses.push('Accomplishments lack quantified business metrics or outcomes.');
    recommendations.push('Incorporate quantified achievements (e.g. percentages, database load metrics) to demonstrate concrete business impact.');
  }

  // Compute overall score deterministically by summing the 8 breakdown category scores
  const overallScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  // Collect missing sections for the UI
  const missingSections = [];
  if (!hasSummaryHeader) missingSections.push('Professional Summary');
  if (!hasEducationHeader) missingSections.push('Education');
  if (!hasSkillsHeader) missingSections.push('Technical Skills');
  if (!hasProjectsHeader) missingSections.push('Projects');
  if (!hasExperienceHeader) missingSections.push('Work Experience');

  logger.info('ATSScorer', `Deterministic Scoring Complete. Overall Score: ${overallScore}/100.`);

  return {
    overallScore,
    breakdown,
    strengths,
    weaknesses,
    recommendations,
    missingSections,
    detectedSkills: matchedSkillsList
  };
};

module.exports = {
  scoreResume
};
