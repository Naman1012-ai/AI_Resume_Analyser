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

const getKeywordRegex = (keyword) => {
  const escaped = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const startBoundary = /^\w/.test(keyword) ? '\\b' : '';
  const endBoundary = /\w$/.test(keyword) ? '\\b' : '';
  return new RegExp(startBoundary + escaped + endBoundary, 'i');
};

// Comprehensive Semantic Skill Mapping Matrix
const semanticSkillMap = {
  // Database & Storage
  'sql': ['postgresql', 'mysql', 'sqlite', 'mariadb', 'oracle', 'sql server', 'mssql', 'rds'],
  'nosql': ['mongodb', 'redis', 'dynamodb', 'cassandra', 'couchdb', 'firebase', 'firestore', 'supabase', 'data persistence', 'storage layer'],
  'postgresql': ['postgres', 'pg'],
  'mongodb': ['mongo', 'document database', 'data persistence', 'storage layer', 'database design', 'nosql'],
  'redis': ['in-memory cache', 'caching store'],
  'database': ['sql', 'nosql', 'postgresql', 'mongodb', 'mysql', 'sqlite', 'redis', 'prisma', 'hibernate', 'schema', 'query', 'queries', 'indexing', 'index', 'vector db', 'vector database', 'migrations', 'database design', 'data persistence', 'storage layer'],
  'database design': ['sql', 'nosql', 'postgresql', 'mongodb', 'mysql', 'sqlite', 'redis', 'schema', 'indexing', 'migrations', 'data persistence', 'storage layer'],
  'data persistence': ['database', 'sql', 'nosql', 'postgresql', 'mongodb', 'mysql', 'redis', 'storage layer'],
  'storage layer': ['database', 'sql', 'nosql', 'postgresql', 'mongodb', 'mysql', 'redis', 'data persistence'],
  
  // APIs & Integration
  'rest api': ['restful', 'apis', 'endpoints', 'graphql', 'grpc', 'soap', 'fastapi', 'express', 'node.js', 'spring', 'express.js', 'server-side development', 'backend development'],
  'apis': ['rest api', 'restful', 'graphql', 'grpc', 'endpoints', 'endpoint'],
  'graphql': ['apollo', 'graphql api', 'graphql server'],

  // Backend & Ecosystems
  'backend': ['node.js', 'express', 'express.js', 'django', 'flask', 'fastapi', 'spring', 'apis', 'rest api', 'sql', 'nosql', 'database', 'microservices', 'server-side development', 'node.js ecosystem'],
  'backend development': ['node.js', 'express', 'express.js', 'django', 'flask', 'fastapi', 'spring', 'apis', 'rest api', 'sql', 'nosql', 'database', 'microservices', 'server-side development', 'node.js ecosystem'],
  'server-side development': ['node.js', 'express', 'express.js', 'django', 'flask', 'fastapi', 'spring', 'apis', 'rest api', 'node.js ecosystem'],
  'node.js ecosystem': ['node.js', 'express', 'express.js', 'nodejs', 'nestjs', 'npm', 'yarn'],
  'node.js': ['nodejs', 'express', 'express.js', 'nestjs', 'javascript', 'typescript', 'npm', 'yarn'],
  'express': ['expressjs', 'express.js', 'node.js', 'javascript', 'typescript', 'server-side development', 'backend development', 'node.js ecosystem'],
  'python': ['django', 'flask', 'fastapi', 'numpy', 'pandas', 'scikit-learn', 'pytorch', 'tensorflow'],
  'java': ['spring', 'springboot', 'jee', 'hibernate', 'maven', 'gradle'],
  'spring': ['springboot', 'spring boot', 'java'],
  'c++': ['cpp', 'c/c++'],
  'c#': ['dotnet', '.net', 'asp.net'],
  'git': ['github', 'gitlab', 'bitbucket', 'version control', 'commits', 'pr'],
  'docker': ['docker-compose', 'containers', 'containerization'],
  'ci/cd': ['github actions', 'jenkins', 'circleci', 'travis', 'argocd', 'pipelines'],

  // Frontend & Design
  'react': ['reactjs', 'redux', 'next.js', 'gatsby', 'context api'],
  'typescript': ['ts', 'angular', 'nestjs', 'next.js'],
  'javascript': ['js', 'es6', 'jquery', 'ajax'],
  'html': ['html5', 'xhtml', 'markup'],
  'css': ['css3', 'sass', 'scss', 'less', 'tailwind', 'bootstrap'],
  'tailwind': ['tailwind css', 'tailwindcss'],
  'responsive design': ['media queries', 'mobile-first', 'bootstrap', 'flexbox', 'grid'],
  'figma': ['sketch', 'adobe xd', 'wireframes', 'prototyping'],

  // AI & ML
  'machine learning': ['ml', 'deep learning', 'pytorch', 'tensorflow', 'scikit-learn', 'neural networks', 'llm', 'nlp', 'computer vision'],
  'deep learning': ['dl', 'pytorch', 'tensorflow', 'keras', 'neural networks', 'llm', 'transformers'],
  'pytorch': ['py-torch', 'torch'],
  'tensorflow': ['tensor-flow', 'keras'],
  'langchain': ['llm', 'agents', 'rag'],

  // Cloud & DevOps
  'aws': ['amazon web services', 's3', 'ec2', 'lambda', 'rds', 'dynamodb', 'cloudformation'],
  'gcp': ['google cloud', 'google cloud platform', 'gke', 'bigquery', 'app engine'],
  'azure': ['microsoft azure', 'azure DevOps', 'aks'],
  'kubernetes': ['k8s', 'helm', 'kubectl'],
  'microservices': ['microservice', 'distributed systems', 'service mesh', 'gRPC', 'load balancing'],
  
  // Agile & Management
  'agile': ['scrum', 'kanban', 'jira', 'confluence', 'daily standup'],
  'scrum': ['agile', 'sprint', 'scrum master'],
  'testing': ['unit testing', 'integration testing', 'jest', 'mocha', 'chai', 'cypress', 'selenium', 'playwright', 'pytest'],
  'unit testing': ['testing', 'jest', 'mocha', 'junit', 'pytest', 'unit tests'],
  'security': ['cryptography', 'aes', 'https', 'ssl', 'encryption', 'hashing', 'cors', 'owasp', 'jwt', 'auth']
};

/**
 * Checks for direct or semantic match for a skill.
 * @param {string} skill
 * @param {string} text
 * @returns {boolean}
 */
const hasSemanticSkillMatch = (skill, text) => {
  const directRegex = getKeywordRegex(skill);
  if (directRegex.test(text)) {
    return true;
  }

  const normalizedSkill = skill.toLowerCase().trim();
  const synonyms = semanticSkillMap[normalizedSkill];
  if (synonyms && synonyms.length > 0) {
    for (const syn of synonyms) {
      const synRegex = getKeywordRegex(syn);
      if (synRegex.test(text)) {
        return true;
      }
    }
  }

  return false;
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
  let resolvedRole = 'Other';
  const searchRole = targetRole.toLowerCase();
  if (searchRole.includes('backend')) resolvedRole = 'Backend Developer';
  else if (searchRole.includes('frontend')) resolvedRole = 'Frontend Developer';
  else if (searchRole.includes('full stack') || searchRole.includes('fullstack')) resolvedRole = 'Full Stack Developer';
  else if (searchRole.includes('ai') || searchRole.includes('machine learning') || searchRole.includes('ml')) resolvedRole = 'AI/ML Engineer';
  else if (searchRole.includes('data scientist')) resolvedRole = 'Data Scientist';
  else if (searchRole.includes('data analyst')) resolvedRole = 'Data Analyst';
  else if (searchRole.includes('devops')) resolvedRole = 'DevOps Engineer';
  else if (searchRole.includes('cloud')) resolvedRole = 'Cloud Engineer';
  else if (searchRole.includes('mobile') || searchRole.includes('ios') || searchRole.includes('android')) resolvedRole = 'Mobile Developer';
  else if (searchRole.includes('cyber') || searchRole.includes('security')) resolvedRole = 'Cybersecurity Analyst';
  else if (searchRole.includes('qa') || searchRole.includes('testing')) resolvedRole = 'QA Engineer';
  else if (searchRole.includes('product manager') || searchRole.includes('pm')) resolvedRole = 'Product Manager';
  else if (searchRole.includes('designer') || searchRole.includes('ui/ux') || searchRole.includes('graphic')) resolvedRole = 'UI/UX Designer';
  else if (rolesConfig[targetRole]) resolvedRole = targetRole;

  const role = rolesConfig[resolvedRole] || rolesConfig['Other'];
  const essentialSkills = role.essential || [];
  const recommendedSkills = role.recommended || [];
  const roleSkills = [...essentialSkills, ...recommendedSkills];

  // Dynamic role-agnostic property fallbacks
  const experienceTitles = role.experienceTitles || [
    'engineer', 'developer', 'analyst', 'programmer', 'architect', 'consultant',
    'specialist', 'lead', 'manager', 'designer', 'intern', 'co-op', 'apprentice', 'trainee'
  ];

  const industryKeywords = role.industryKeywords || [
    'optimization', 'scalability', 'architecture', 'infrastructure', 'deployment',
    'integration', 'security', 'collaboration', 'performance', 'monitoring',
    'testing', 'maintenance', 'development'
  ];

  const projectConcepts = role.projectConcepts || [
    { name: 'Systems Architecture', regex: /\b(?:architecture|design\s*patterns?|mvc|system\s*design|microservices?|serverless|single\s*page\s*app|spa|redux|context\s*api|state\s*management|oop|async|concurrency|multithreading|algorithms?|structures?|next\.js|nextjs|react|vue|angular|swiftui|kotlin|flutter|responsive)\b/i },
    { name: 'Authentication (JWT/OAuth)', regex: /\b(?:auth|authentication|authorization|jwt|oauth|oauth2|passport|session|sessions|cookies|token|login|signup|signin|signout|role-based|rbac)\b/i },
    { name: 'Database Design (PostgreSQL/MongoDB/Redis)', regex: /\b(?:database|postgres|postgresql|mongodb|mysql|sqlite|redis|prisma|hibernate|sql|nosql|schema|query|queries|indexing|index|vector\s*db|vector\s*database|migrations?|localstorage|sessionstorage|state|props)\b/i },
    { name: 'Security (HTTPS/CORS/Rate Limiting)', regex: /\b(?:cors|https|ssl|encryption|hashing|security|bcrypt|rate\s*limiting|sql\s*injection|xss|csrf|sanitiz|oauth|jwt)\b/i },
    { name: 'Scalability (Caching/Load Balancers/Queues)', regex: /\b(?:caching|cdn|redis|load\s*balanc|scaling|optimize|optimization|performance|lazy\s*load|code\s*split|compression|throughput|latency|uptime|cluster|kafka|rabbitmq|message\s*queue|lighthouse|page\s*speed|responsive|mobile-first)\b/i },
    { name: 'Cloud Infrastructure (AWS/GCP/Azure/Firebase)', regex: /\b(?:aws|gcp|azure|google\s*cloud|amazon\s*web|cloud\s*provider|firebase|supabase|amplify|s3|ec2|lambda|cloudflare|route53|rds|dynamodb|vercel|netlify|heroku|render)\b/i },
    { name: 'DevOps & Deployment (Docker/CI-CD/Vercel)', regex: /\b(?:docker|kubernetes|ci\/cd|github\s*actions|jenkins|vercel|netlify|heroku|render|nginx|docker-compose|k8s|argocd|ansible|terraform)\b/i },
    { name: 'Engineering Practices (Testing/Git)', regex: /\b(?:testing|unit\s*test|jest|cypress|mocha|git|github|version\s*control|agile|scrum|jira|confluence|documentation|readme|unit\s*tests?|integration\s*tests?|playwright|selenium)\b/i }
  ];

  const concepts = role.concepts || [
    { name: 'Microservices', regex: /\b(?:microservices?|distributed\s*systems?|load\s*balancing|high\s*availability|service\s*mesh|kubernetes|k8s)\b/i },
    { name: 'Message Queues', regex: /\b(?:kafka|rabbitmq|message\s*queues?|pub\s*sub|event\s*driven|sqs)\b/i },
    { name: 'AES Encryption', regex: /\b(?:aes|encryption|hashing|bcrypt|cryptography|aes\s*encryption)\b/i },
    { name: 'Redis', regex: /\b(?:redis|memcached|caching|cache)\b/i },
    { name: 'Docker', regex: /\b(?:docker|docker-compose|containers?)\b/i },
    { name: 'CI/CD', regex: /\b(?:ci\/cd|jenkins|github\s*actions|argocd|pipelines?|vercel|netlify)\b/i },
    { name: 'JWT & OAuth', regex: /\b(?:jwt|oauth|oauth2|token-based|passport)\b/i },
    { name: 'AWS & Cloud', regex: /\b(?:aws|azure|gcp|terraform|cloudformation|serverless|lambda|s3|ec2|vercel|netlify|heroku|render)\b/i },
    { name: 'Background Jobs', regex: /\b(?:background\s*(?:jobs?|processing)|concurrency|multithreading|async|worker\s*threads?|celery|bullmq)\b/i },
    { name: 'Blockchain & IPFS', regex: /\b(?:blockchain|ethereum|solidity|smart\s*contracts?|web3|ipfs|crypto)\b/i }
  ];

  const experienceCriteria = role.experienceCriteria || [
    {
      name: 'REST/GraphQL APIs & Production Systems',
      maxPoints: 4,
      evaluate: (text) => {
        let devScore = 0;
        const backendRegex = /\b(?:api|apis|rest|graphql|grpc|endpoint|endpoints|backend|server|servers|database|databases|sql|nosql|query|queries|schema|route|routes)\b/i;
        const deploymentRegex = /\b(?:automation|automated|automate|deploy|deployed|deployment|live|production|pipeline|pipelines|ci\/cd|docker|kubernetes|aws|gcp|azure|terraform)\b/i;
        if (backendRegex.test(text)) devScore += 2;
        if (deploymentRegex.test(text)) devScore += 2;
        return devScore;
      }
    },
    {
      name: 'Backend Performance Optimization & Scaling',
      maxPoints: 4,
      evaluate: (text) => {
        let optScore = 0;
        const perfRegex = /\b(?:optimize|optimized|optimizing|optimization|performance|scale|scaled|scaling|scalability|caching|redis|latency|throughput|response\s*time|refactor|refactored|refactoring)\b/i;
        const dbOptRegex = /\b(?:query\s*optimization|database\s*indexing|index|indexes|indexing|query\s*time|database\s*lock|sharding|replication|partition|pruning)\b/i;
        if (perfRegex.test(text)) optScore += 2;
        if (dbOptRegex.test(text)) optScore += 2;
        return optScore;
      }
    }
  ];
  
  const strengths = [];
  const weaknesses = [];
  const recommendations = [];

  // Date and chronological indicators (regex to detect year ranges, supporting month names on the same line)
  const dateRangeRegex = /\b(?:19|20)\d{2}\b[^\n]*\b(?:(?:19|20)\d{2}|present|current|now)\b/i;
  const singleDateRegex = /\b(?:19|20)\d{2}\b/i;

  // Extract Section Text Blocks for contextual/evidence scoring
  // Next header stop regex matching any major header starting on a line
  const nextHeaderRegex = /(?:^|\n)\s*(?:summary|objective|profile|about\s*me|professional\s*summary|experience|work\s*experience|employment|professional\s*experience|work\s*history|projects|personal\s*projects|academic\s*projects|portfolio|skills|technical\s*skills|technologies|core\s*competencies|education|academic\s*background|academic\s*history|achievements|awards|accomplishments|leadership|certifications)\b/i;

  // Helper to slice text after contact info (approx first 5 lines) to avoid matching contact links as headers
  let searchStartIndex = 0;
  const lines = normalizedText.split('\n');
  if (lines.length > 5) {
    searchStartIndex = lines.slice(0, 5).join('\n').length + 1;
  }

  const extractSectionText = (headersRegex, stopRegex) => {
    const textToSearch = normalizedText.slice(searchStartIndex);
    const match = textToSearch.match(headersRegex);
    if (!match) return '';
    const startIndex = searchStartIndex + match.index;
    const headerWordIndex = startIndex + match[0].length;
    const nextNewline = normalizedText.indexOf('\n', headerWordIndex);
    const sliceStart = nextNewline !== -1 ? nextNewline + 1 : headerWordIndex;
    const subsequentIndex = normalizedText.slice(sliceStart).search(stopRegex);
    return subsequentIndex !== -1 
      ? normalizedText.slice(startIndex, sliceStart + subsequentIndex)
      : normalizedText.slice(startIndex);
  };

  // Sections definitions
  const experienceText = extractSectionText(
    /(?:^|\n)\s*(?:experience|work\s*experience|employment|professional\s*experience|work\s*history)\b/i,
    nextHeaderRegex
  );
  
  const projectsText = extractSectionText(
    /(?:^|\n)\s*(?:projects|personal\s*projects|academic\s*projects|portfolio)\b/i,
    nextHeaderRegex
  );

  const skillsText = extractSectionText(
    /(?:^|\n)\s*(?:skills|technical\s*skills|technologies|core\s*competencies)\b/i,
    nextHeaderRegex
  );

  const educationText = extractSectionText(
    /(?:^|\n)\s*(?:education|academic\s*background|academic\s*history)\b/i,
    nextHeaderRegex
  );

  // Fallbacks: If sections aren't cleanly extracted because of headers, use whole text but track section presence
  const hasExperienceHeader = /experience|work experience|employment|history|internship|professional experience/i.test(normalizedText);
  const hasProjectsHeader = /projects|personal projects|academic projects|portfolio/i.test(normalizedText);
  const hasSkillsHeader = /skills|technologies|languages|frameworks|tools|competencies/i.test(normalizedText);
  const hasEducationHeader = /education|academic|degree|university|college|school/i.test(normalizedText);
  const hasSummaryHeader = /summary|objective|profile|about me|professional summary/i.test(normalizedText);

  // ----------------------------------------------------
  // 1. Contact Information & Profile Details (Raw Max 10)
  // ----------------------------------------------------
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(normalizedText);
  const hasPhone = /(?:\+?[0-9]{1,4}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/.test(normalizedText);
  const hasLocation = /\b(?:location|address|zip|city|state|remote|india|usa|uk|canada|germany|singapore|australia)\b|([A-Z][a-zA-Z\s]+,\s*[A-Z]{2,})/i.test(normalizedText);
  const hasLink = /linkedin\.com|github\.com|portfolio|bitbucket|gitlab|leetcode|behance|dribbble/i.test(normalizedText);

  let contactScore = 0;
  const contactDeductions = [];
  if (hasEmail) contactScore += 2.5; else contactDeductions.push('Email address');
  if (hasPhone) contactScore += 2.5; else contactDeductions.push('Phone number');
  if (hasLocation) contactScore += 2.5; else contactDeductions.push('Location details');
  if (hasLink) contactScore += 2.5; else contactDeductions.push('LinkedIn, GitHub, or Portfolio profile link');

  const rawContactScore = Math.min(10, Math.round(contactScore * 2) / 2);

  if (rawContactScore === 10) {
    strengths.push('Complete contact info and professional links (Email, Phone, Location, and Profile/Portfolio links) are present.');
  } else if (contactDeductions.length > 0) {
    weaknesses.push(`Missing profile contact details: ${contactDeductions.join(', ')}.`);
    recommendations.push(`Add the missing contact or professional profile details: ${contactDeductions.join(', ')}.`);
  }

  // ----------------------------------------------------
  // 2. Formatting & Structural Design (Raw Max 10)
  // ----------------------------------------------------
  let formattingScore = 0;
  // Standard section completeness (Up to 6 points)
  if (hasExperienceHeader) formattingScore += 2; else weaknesses.push('Missing a standard Work Experience section.');
  if (hasSkillsHeader) formattingScore += 2; else weaknesses.push('Missing a dedicated Technical Skills section.');
  if (hasEducationHeader) formattingScore += 2; else weaknesses.push('Missing a standard Education section.');

  // Professional Summary (Up to 2 points)
  if (hasSummaryHeader) formattingScore += 2; else recommendations.push('Add a Professional Summary or Profile Objective at the top of your resume.');

  // Stylistic / Layout indicators (Up to 2 points)
  const hasBullets = /\n\s*[-•*+]\s+/.test(normalizedText);
  const hasDates = dateRangeRegex.test(normalizedText);
  if (hasBullets) formattingScore += 1;
  if (hasDates) formattingScore += 1;

  const rawFormattingScore = formattingScore;

  if (rawFormattingScore === 10) {
    strengths.push('Excellent resume layout with a summary, standard headings, clear timeline ranges, and bulleted layout.');
  }

  // ----------------------------------------------------
  // 3. Skills & Match Quality (Raw Max 20)
  // ----------------------------------------------------
  let essentialMatchedCount = 0;
  let recommendedMatchedCount = 0;
  const matchedSkillsList = [];
  const missingSkillsFromEssential = [];

  essentialSkills.forEach(skill => {
    if (hasSemanticSkillMatch(skill, normalizedText)) {
      essentialMatchedCount++;
      matchedSkillsList.push(skill);
    } else {
      missingSkillsFromEssential.push(skill);
    }
  });

  recommendedSkills.forEach(skill => {
    if (hasSemanticSkillMatch(skill, normalizedText)) {
      recommendedMatchedCount++;
      matchedSkillsList.push(skill);
    }
  });

  // Calculate evidence-based skills score
  // Essential (Max 12 pts): 4+ matches = 12, 3 = 10, 2 = 7, 1 = 4, 0 = 0
  let skillsScoreEssential = 0;
  if (essentialMatchedCount >= 4) skillsScoreEssential = 12;
  else if (essentialMatchedCount === 3) skillsScoreEssential = 10;
  else if (essentialMatchedCount === 2) skillsScoreEssential = 7;
  else if (essentialMatchedCount === 1) skillsScoreEssential = 4;

  // Recommended (Max 5 pts): 3+ matches = 5, 2 = 4, 1 = 2, 0 = 0
  let skillsScoreRecommended = 0;
  if (recommendedMatchedCount >= 3) skillsScoreRecommended = 5;
  else if (recommendedMatchedCount === 2) skillsScoreRecommended = 4;
  else if (recommendedMatchedCount === 1) skillsScoreRecommended = 2;

  // Skill organization (Max 3 pts)
  let skillsOrganizationScore = 0;
  const targetText = skillsText || normalizedText;
  const hasCategories = /languages|frameworks|libraries|databases|tools|platforms|technologies|developer tools|operating systems/i.test(targetText);
  if (hasCategories) {
    skillsOrganizationScore = 3;
  } else if (hasSkillsHeader) {
    skillsOrganizationScore = 1.5;
  }

  const rawSkillsScore = Math.min(20, skillsScoreEssential + skillsScoreRecommended + skillsOrganizationScore);

  if (rawSkillsScore >= 16) {
    strengths.push(`Strong alignment of core and secondary technical skills matching the ${targetRole} target profile.`);
  } else if (missingSkillsFromEssential.length > 0) {
    recommendations.push(`Integrate key technical skills for the ${targetRole} role, such as: ${missingSkillsFromEssential.slice(0, 3).join(', ')}.`);
  }

  // ----------------------------------------------------
  // 4. Experience & Impact Metrics (Raw Max 20)
  // ----------------------------------------------------
  let experienceScore = 0;
  const expTargetText = experienceText || normalizedText;

  if (hasExperienceHeader || expTargetText.trim().length > 0) {
    // A. Title & Activity Alignment (Max 4 points)
    let activityScore = 0;
    const escapedTitles = experienceTitles.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const titleRegex = new RegExp(`\\b(?:${escapedTitles})\\b`, 'i');
    
    const internRegex = /\b(?:intern|internship|co-op|apprentice|trainee)\b/i;
    const openSourceRegex = /\b(?:open\s*source|contributor|contribution|github\s*pull\s*request|pr|pull\s*request)\b/i;
    const researchRegex = /\b(?:research\s*project|researcher|lab|academic|publication|published|conference)\b/i;
    const communityRegex = /\b(?:community|leadership|organizer|mentor|mentored|club|society|volunteer)\b/i;

    if (titleRegex.test(expTargetText)) activityScore = 4;
    else if (internRegex.test(expTargetText) || openSourceRegex.test(expTargetText) || researchRegex.test(expTargetText) || communityRegex.test(expTargetText)) activityScore = 4;
    else activityScore = 3;

    experienceScore += activityScore;

    // B & C. Role Competencies (Max 8 points)
    let criteriaScore = 0;
    experienceCriteria.forEach(crit => {
      criteriaScore += Math.min(crit.maxPoints, crit.evaluate(expTargetText));
    });
    experienceScore += criteriaScore;

    // D. Quantified Business Impact & Metrics (Max 6 points)
    let metricsScore = 0;
    
    const latencyMetricRegex = /\b(?:reduced|decreased|cut|lower)\s+latency\b|latency\s+(?:reduced|decreased|improved|by\s+\d+)\b|\b(?:latency|response\s*time)\b[^\n]*\b(?:\d+%|\d+\s*ms)\b/i;
    const perfMetricRegex = /\b(?:improved|increased|boosted|optimized)\s+performance\b|\b(?:scalable|scale)\s+systems?\b/i;
    const apiMetricRegex = /\b(?:optimized|optimized\s*api|optimized\s*apis|reduced\s*query\s*time|query\s*time\s*reduced|query\s*latency)\b/i;
    const genericMetricRegex = /\b(?:\d+%\s*|\$\d+|\d+\s*x\s*|uptime|test coverage)\b|\b\d+(?:\s*[kKmM]\+?)?\s*(?:active\s*)?(?:users|requests|queries|records|endpoints|tasks|jobs|servers|databases|gb|tb|mb|kb|percent|%)\b/i;

    let metricMatchesCount = 0;
    if (latencyMetricRegex.test(expTargetText)) metricMatchesCount++;
    if (perfMetricRegex.test(expTargetText)) metricMatchesCount++;
    if (apiMetricRegex.test(expTargetText)) metricMatchesCount++;
    if (genericMetricRegex.test(expTargetText)) metricMatchesCount++;

    if (metricMatchesCount >= 3) metricsScore = 6;
    else if (metricMatchesCount === 2) metricsScore = 4;
    else if (metricMatchesCount === 1) metricsScore = 2;

    experienceScore += metricsScore;

    // E. Leadership & Mentorship (Max 2 points)
    let leadScore = 0;
    const leadershipRegex = /\b(?:led|managed|spearheaded|coordinated|mentored|mentorship|lead|ownership|architected|collaborated|team)\b/gi;
    const leadMatches = new Set(expTargetText.toLowerCase().match(leadershipRegex) || []);
    if (leadMatches.size >= 2) {
      leadScore = 2;
    } else if (leadMatches.size === 1) {
      leadScore = 1;
    }

    experienceScore += leadScore;
  }

  const rawExperienceScore = Math.min(20, experienceScore);

  if (rawExperienceScore >= 15) {
    strengths.push('Professional history demonstrates strong role alignment, active contributions, and quantitative impact.');
  } else {
    recommendations.push('Add more metric-driven bullet points to your work history, highlighting achievements (e.g. latency, throughput, percentages).');
  }

  // ----------------------------------------------------
  // 5. Projects & Core Stack Presence (Raw Max 15)
  // ----------------------------------------------------
  let rawProjectsScore = 0;
  const projTargetText = projectsText || normalizedText;

  if (hasProjectsHeader || projTargetText.trim().length > 0) {
    // A. Evaluate Core Engineering/Product/Design Dimensions (Each yields +1 point, max 8)
    let coreScore = 0;
    projectConcepts.forEach(dim => {
      if (dim.regex.test(projTargetText)) coreScore += 1;
    });
    coreScore = Math.min(8, coreScore);

    // B. Detect Advanced Engineering/Domain Concepts (Each yields +1 point, max 7)
    let advancedScore = 0;
    const matchedConcepts = [];
    concepts.forEach(c => {
      if (c.regex.test(projTargetText)) {
        advancedScore += 1;
        matchedConcepts.push(c.name);
      }
    });
    advancedScore = Math.min(7, advancedScore);

    // Sum base score (max 15)
    let baseScore = coreScore + advancedScore;

    // C. Complexity Tier Classification
    const isCrud = /crud|to-do|todo|task\s*manager|task\s*list|tasks?|calculator|weather|blog|recipe|clone\b/i.test(projTargetText);
    const isPortfolio = /portfolio|personal\s*website|about\s*me/i.test(projTargetText);

    const applyComplexityCaps = role.applyComplexityCaps !== undefined ? role.applyComplexityCaps : true;

    if (applyComplexityCaps && (isCrud || isPortfolio) && advancedScore <= 2) {
      rawProjectsScore = Math.min(6, baseScore);
    } else if (applyComplexityCaps && advancedScore <= 4) {
      rawProjectsScore = Math.min(11.5, baseScore);
    } else {
      rawProjectsScore = Math.min(15, baseScore);
    }

    rawProjectsScore = Math.round(rawProjectsScore * 2) / 2; // Round to nearest 0.5 points
  }

  if (rawProjectsScore >= 12) {
    strengths.push('Technical projects demonstrate good architectural complexity, database usage, deployment, and security considerations.');
  }

  // ----------------------------------------------------
  // 6. Education & Academic Alignment (Raw Max 10)
  // ----------------------------------------------------
  let educationScore = 0;
  const eduTargetText = educationText || normalizedText;

  // A. Degree & Field Relevance (Up to 5 points)
  const relevantDegreeRegex = /\b(?:computer science|software engineering|information technology|data science|math|mathematics|physics|electrical engineering|electronics engineering|cs|ce|se|it|ee|ece|b\.tech|m\.tech|btech|mtech|b\.e|m\.e|b\.s|m\.s|bsc|msc|bachelor|master|phd|doctorate)\b/i;
  const bootcampRegex = /\b(?:bootcamp|udemy|coursera|nanodegree|certification|certified|credential)\b/i;
  
  if (relevantDegreeRegex.test(eduTargetText)) {
    educationScore += 5;
  } else if (bootcampRegex.test(eduTargetText)) {
    educationScore += 3.5;
  } else if (hasEducationHeader) {
    educationScore += 2;
  }

  // B. Section Structure & University Indicators (Up to 3 points)
  if (hasEducationHeader) educationScore += 2;
  const universityRegex = /\b(?:university|college|school|institute|academy|polytechnic)\b/i;
  if (universityRegex.test(eduTargetText)) educationScore += 1;

  // C. Expected / Completed Date presence (Up to 2 points)
  const hasEduDate = dateRangeRegex.test(eduTargetText) || singleDateRegex.test(eduTargetText);
  if (hasEduDate) educationScore += 2;

  const rawEducationScore = Math.min(10, educationScore);

  // ----------------------------------------------------
  // 7. Keywords Density & Gaps (Raw Max 10)
  // ----------------------------------------------------
  let keywordsScore = 0;

  // A. Primary Keywords (Max 3 points)
  // +0.5 points per matched essential target role skill
  const primaryCount = matchedSkillsList.filter(s => essentialSkills.includes(s.toLowerCase())).length;
  const primaryScore = Math.min(3, primaryCount * 0.5);
  keywordsScore += primaryScore;

  // B. Secondary Keywords (Max 2 points)
  // +0.5 points per matched recommended target role skill
  const secondaryCount = matchedSkillsList.filter(s => recommendedSkills.includes(s.toLowerCase())).length;
  const secondaryScore = Math.min(2, secondaryCount * 0.5);
  keywordsScore += secondaryScore;

  // C. Contextual Keywords (Max 2 points)
  // Core engineering domain practices present in sentence structure
  const domainPracticesRegex = /\b(?:optimization|scalability|architecture|infrastructure|deployment|integration|security|collaboration|performance|monitoring|testing|maintenance|development)\b/gi;
  const matchesDomain = new Set(normalizedText.toLowerCase().match(domainPracticesRegex) || []);
  let contextualScore = 0;
  if (matchesDomain.size >= 4) contextualScore = 2;
  else if (matchesDomain.size >= 2) contextualScore = 1;
  else if (matchesDomain.size === 1) contextualScore = 0.5;
  keywordsScore += contextualScore;

  // D. Evidence Keywords (Max 3 points)
  // Active implementation structures matching: <verb> ... <technology>
  // e.g. "Implemented secure JWT authentication using Express middleware"
  const evidenceRegex = /\b(?:implemented|designed|built|integrated|optimized|automated|migrated|scaled|secured)\b[^\n.]{1,80}\b(?:jwt|oauth|oauth2|api|apis|docker|kubernetes|aws|redis|kafka|database|postgres|mongodb|ci\/cd|pipeline|microservice|microservices|caching|security|scale)\b/gi;
  const evidenceMatches = new Set(normalizedText.toLowerCase().match(evidenceRegex) || []);
  let evidenceScore = 0;
  if (evidenceMatches.size >= 3) evidenceScore = 3;
  else if (evidenceMatches.size === 2) evidenceScore = 2;
  else if (evidenceMatches.size === 1) evidenceScore = 1;
  keywordsScore += evidenceScore;

  let rawKeywordsScore = Math.min(10, Math.round(keywordsScore * 2) / 2);

  // E. Repetition / Keyword Stuffing Penalty Cap
  // If keyword frequency is high but verb evidence is extremely low, cap the score at 4.0
  const stuffedKeywordsRegex = /\b(?:jwt|oauth|docker|kubernetes|aws|redis|kafka|database|postgres|mongodb|ci\/cd|pipeline|microservices)\b/gi;
  const totalKeywordsFrequency = (normalizedText.toLowerCase().match(stuffedKeywordsRegex) || []).length;
  if (totalKeywordsFrequency > 25 && evidenceMatches.size <= 2) {
    rawKeywordsScore = Math.min(4, rawKeywordsScore);
  }

  // ----------------------------------------------------
  // 8. Achievements & Leadership Credentials (Raw Max 5)
  // ----------------------------------------------------
  let achievementsScore = 0;

  // A. Quantifiable business metrics (Up to 2.5 points)
  const metricCheck = /(?:\d+%\s*|\$\d+|\d+\s*x\s*|latency|throughput|saved \d+ hours)/i.test(normalizedText);
  if (metricCheck) achievementsScore += 2.5;

  // B. Leadership & Professional Recognition (Up to 2.5 points)
  const recognitionRegex = /\b(?:award|scholarship|hackathon|winner|placed|publication|patent|certificate|certified|promotion|promoted|lead|spearheaded|honors|dean's list)\b/i;
  if (recognitionRegex.test(normalizedText)) achievementsScore += 2.5;

  const rawAchievementsScore = Math.min(5, Math.round(achievementsScore * 2) / 2);

  if (rawAchievementsScore === 5) {
    strengths.push('Highlights quantifiable achievements and professional leadership credentials/awards.');
  } else {
    weaknesses.push('Achievements section is weak or lacks clear leadership credentials and awards.');
  }

  // ----------------------------------------------------
  // DYNAMIC WEIGHTING & SCALING ENGINE
  // ----------------------------------------------------
  const rawMax = {
    contact: 10,
    formatting: 10,
    skills: 20,
    experience: 20,
    projects: 15,
    education: 10,
    keywords: 10,
    achievements: 5
  };

  const defaultWeights = {
    contact: 10,
    formatting: 10,
    skills: 20,
    experience: 20,
    projects: 15,
    education: 10,
    keywords: 10,
    achievements: 5
  };
  const roleWeights = role.weights || defaultWeights;

  const rawScores = {
    contact: rawContactScore,
    formatting: rawFormattingScore,
    skills: rawSkillsScore,
    experience: rawExperienceScore,
    projects: rawProjectsScore,
    education: rawEducationScore,
    keywords: rawKeywordsScore,
    achievements: rawAchievementsScore
  };

  const breakdown = {};
  Object.keys(rawScores).forEach(category => {
    const rawVal = rawScores[category];
    const maxVal = rawMax[category];
    const weightVal = roleWeights[category];
    breakdown[category] = Math.round((rawVal / maxVal) * weightVal);
  });

  // Compute overall score deterministically by summing the 8 breakdown category scores
  const overallScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  // Collect missing sections for the UI
  const missingSections = [];
  if (!hasSummaryHeader) missingSections.push('Professional Summary');
  if (!hasEducationHeader) missingSections.push('Education');
  if (!hasSkillsHeader) missingSections.push('Technical Skills');
  if (!hasProjectsHeader) missingSections.push('Projects');
  if (!hasExperienceHeader) missingSections.push('Work Experience');

  // ----------------------------------------------------
  // TRANSPARENT SCORE JUSTIFICATION ENGINE
  // ----------------------------------------------------
  const contactDetected = [];
  const contactMissing = [];
  if (hasEmail) contactDetected.push('Email'); else contactMissing.push('Email');
  if (hasPhone) contactDetected.push('Phone'); else contactMissing.push('Phone');
  if (hasLocation) contactDetected.push('Location'); else contactMissing.push('Location');
  
  const hasGithub = /github\.com/i.test(normalizedText);
  const hasLinkedin = /linkedin\.com/i.test(normalizedText);
  const hasPortfolio = /portfolio|leetcode|gitlab|bitbucket|dribbble|behance/i.test(normalizedText);

  if (hasGithub) contactDetected.push('GitHub Link'); else contactMissing.push('GitHub Link');
  if (hasLinkedin) contactDetected.push('LinkedIn Link'); else contactMissing.push('LinkedIn Link');
  if (hasPortfolio) contactDetected.push('Portfolio Link'); else contactMissing.push('Portfolio Link');

  const formattingDetected = [];
  const formattingMissing = [];
  if (hasSummaryHeader) formattingDetected.push('Professional Summary Section'); else formattingMissing.push('Professional Summary Section');
  if (hasEducationHeader) formattingDetected.push('Education Section'); else formattingMissing.push('Education Section');
  if (hasSkillsHeader) formattingDetected.push('Skills Section'); else formattingMissing.push('Skills Section');
  if (hasProjectsHeader) formattingDetected.push('Projects Section'); else formattingMissing.push('Projects Section');
  if (hasExperienceHeader) formattingDetected.push('Experience Section'); else formattingMissing.push('Experience Section');
  if (hasDates) formattingDetected.push('Standard Year/Date Chronology'); else formattingMissing.push('Standard Year/Date Chronology');
  if (hasBullets) formattingDetected.push('Bulleted Work Layout'); else formattingMissing.push('Bulleted Work Layout');

  const skillsDetected = matchedSkillsList.map(s => s.charAt(0).toUpperCase() + s.slice(1));
  const skillsMissing = [];
  essentialSkills.concat(recommendedSkills).forEach(skill => {
    if (!matchedSkillsList.includes(skill.toLowerCase())) {
      skillsMissing.push(skill.charAt(0).toUpperCase() + skill.slice(1));
    }
  });

  const experienceDetected = [];
  const experienceMissing = [];
  if (hasExperienceHeader || expTargetText.trim().length > 0) {
    const escapedTitles = experienceTitles.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const titleRegex = new RegExp(`\\b(?:${escapedTitles})\\b`, 'i');
    if (titleRegex.test(expTargetText)) experienceDetected.push('Developer/Intern Title Alignment'); else experienceMissing.push('Developer/Intern Title Alignment');

    experienceCriteria.forEach(crit => {
      const pts = Math.min(crit.maxPoints, crit.evaluate(expTargetText));
      if (pts >= crit.maxPoints / 2) {
        experienceDetected.push(crit.name);
      } else {
        experienceMissing.push(crit.name);
      }
    });

    const leadershipRegex = /\b(?:led|managed|spearheaded|coordinated|mentored|mentorship|lead|ownership|architected|collaborated|team)\b/gi;
    const leadMatches = new Set(expTargetText.toLowerCase().match(leadershipRegex) || []);
    if (leadMatches.size >= 2) {
      experienceDetected.push('Leadership & Ownership (Mentorship/Agile/Scrum)');
    } else if (leadMatches.size > 0) {
      experienceDetected.push('Team Collaboration');
      experienceMissing.push('Leadership & Ownership (Mentorship/Agile/Scrum)');
    } else {
      experienceMissing.push('Leadership & Ownership (Mentorship/Agile/Scrum)');
    }

    const impactMetricRegex = /\b(?:\d+%\s*|\$\d+|\d+\s*x\s*|latency|throughput|uptime|test coverage)\b|\b\d+(?:\s*[kKmM]\+?)?\s*(?:active\s*)?(?:users|requests|queries|records|endpoints|tasks|jobs|servers|databases|gb|tb|mb|kb|percent|%)\b|\b(?:reduced|optimized|improved|increased|saved|scaled|sped)\s+by\s+\b(?:\d+|some|several)\b/gi;
    const metricsCount = (expTargetText.match(impactMetricRegex) || []).length;
    if (metricsCount >= 2) {
      experienceDetected.push('Multiple Quantifiable Business Metrics');
    } else if (metricsCount > 0) {
      experienceDetected.push('Single Business Metric');
      experienceMissing.push('Multiple Quantifiable Business Metrics');
    } else {
      experienceMissing.push('Multiple Quantifiable Business Metrics');
    }

    if (dateRangeRegex.test(expTargetText)) experienceDetected.push('Chronological Date Ranges'); else experienceMissing.push('Chronological Date Ranges');
  } else {
    experienceMissing.push('Work Experience Section Missing');
  }

  const projectsDetected = [];
  const projectsMissing = [];
  if (hasProjectsHeader || projTargetText.trim().length > 0) {
    projectConcepts.forEach(dim => {
      if (dim.regex.test(projTargetText)) {
        projectsDetected.push(dim.name);
      } else {
        projectsMissing.push(dim.name);
      }
    });
  } else {
    projectsMissing.push('Projects Section Missing');
  }

  const educationDetected = [];
  const educationMissing = [];

  if (relevantDegreeRegex.test(eduTargetText)) {
    educationDetected.push('Relevant STEM/CS Degree');
  } else if (bootcampRegex.test(eduTargetText)) {
    educationDetected.push('Bootcamp/Technical Certification');
    educationMissing.push('Relevant STEM/CS Degree');
  } else {
    educationMissing.push('Relevant STEM/CS Degree');
  }
  if (universityRegex.test(eduTargetText)) educationDetected.push('University/College Affiliation'); else educationMissing.push('University/College Affiliation');
  if (dateRangeRegex.test(eduTargetText) || singleDateRegex.test(eduTargetText)) educationDetected.push('Expected/Completed Dates'); else educationMissing.push('Expected/Completed Dates');

  const keywordsDetected = [];
  const keywordsMissing = [];
  industryKeywords.forEach(kw => {
    if (new RegExp('\\b' + kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i').test(normalizedText)) {
      keywordsDetected.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    } else {
      keywordsMissing.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    }
  });

  const achievementsDetected = [];
  const achievementsMissing = [];
  if (metricCheck) achievementsDetected.push('Quantifiable Business Metrics'); else achievementsMissing.push('Quantifiable Business Metrics');
  if (recognitionRegex.test(normalizedText)) achievementsDetected.push('Leadership/Honors/Awards'); else achievementsMissing.push('Leadership/Honors/Awards');

  const justifications = {
    contact: {
      score: breakdown.contact,
      max: roleWeights.contact,
      detected: contactDetected,
      missing: contactMissing
    },
    formatting: {
      score: breakdown.formatting,
      max: roleWeights.formatting,
      detected: formattingDetected,
      missing: formattingMissing
    },
    skills: {
      score: breakdown.skills,
      max: roleWeights.skills,
      detected: skillsDetected,
      missing: skillsMissing
    },
    experience: {
      score: breakdown.experience,
      max: roleWeights.experience,
      detected: experienceDetected,
      missing: experienceMissing
    },
    projects: {
      score: breakdown.projects,
      max: roleWeights.projects,
      detected: projectsDetected,
      missing: projectsMissing
    },
    education: {
      score: breakdown.education,
      max: roleWeights.education,
      detected: educationDetected,
      missing: educationMissing
    },
    keywords: {
      score: breakdown.keywords,
      max: roleWeights.keywords,
      detected: keywordsDetected,
      missing: keywordsMissing
    },
    achievements: {
      score: breakdown.achievements,
      max: roleWeights.achievements,
      detected: achievementsDetected,
      missing: achievementsMissing
    }
  };

  logger.info('ATSScorer', `Deterministic Dynamic Scoring Complete. Overall Score: ${overallScore}/100.`);

  return {
    overallScore,
    breakdown,
    weights: roleWeights,
    justifications,
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
