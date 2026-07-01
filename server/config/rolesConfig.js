/**
 * @file rolesConfig.js
 * @description Centralized roles configuration for Target Role Driven ATS Analysis.
 * Defines essential (primary), recommended (secondary) skills, and dynamic category weights for each job role.
 * Easily extensible to add new job roles.
 */

const rolesConfig = {
  'Software Engineer': {
    essential: ['javascript', 'python', 'java', 'c++', 'sql', 'git', 'rest api', 'docker'],
    recommended: ['typescript', 'node.js', 'aws', 'ci/cd', 'unit testing', 'agile'],
    weights: { contact: 10, formatting: 10, skills: 20, experience: 20, projects: 15, education: 10, keywords: 10, achievements: 5 }
  },
  'Frontend Developer': {
    essential: ['react', 'javascript', 'html', 'css', 'typescript', 'tailwind', 'sass', 'redux'],
    recommended: ['angular', 'vue', 'next.js', 'webpack', 'vite', 'figma', 'responsive design', 'accessibility'],
    weights: { contact: 5, formatting: 10, skills: 20, experience: 20, projects: 25, education: 5, keywords: 10, achievements: 5 }
  },
  'Backend Developer': {
    essential: ['node.js', 'express', 'python', 'java', 'spring', 'sql', 'postgresql', 'mongodb'],
    recommended: ['mysql', 'redis', 'apis', 'rest api', 'grpc', 'microservices', 'docker', 'authentication'],
    weights: { contact: 5, formatting: 5, skills: 25, experience: 20, projects: 25, education: 5, keywords: 10, achievements: 5 }
  },
  'Full Stack Developer': {
    essential: ['react', 'node.js', 'javascript', 'typescript', 'sql', 'postgresql', 'mongodb', 'rest api'],
    recommended: ['express', 'aws', 'docker', 'ci/cd', 'redux', 'tailwind', 'git', 'authentication'],
    weights: { contact: 5, formatting: 5, skills: 25, experience: 20, projects: 25, education: 5, keywords: 10, achievements: 5 }
  },
  'AI/ML Engineer': {
    essential: ['python', 'tensorflow', 'pytorch', 'machine learning', 'deep learning', 'numpy', 'pandas', 'scikit-learn'],
    recommended: ['mlops', 'nlp', 'computer vision', 'keras', 'huggingface', 'langchain', 'docker', 'sql'],
    weights: { contact: 5, formatting: 5, skills: 25, experience: 15, projects: 25, education: 10, keywords: 10, achievements: 5 }
  },
  'Data Scientist': {
    essential: ['python', 'sql', 'pandas', 'numpy', 'scikit-learn', 'machine learning', 'statistics', 'data analysis'],
    recommended: ['r', 'tableau', 'powerbi', 'spark', 'hadoop', 'data visualization', 'matplotlib', 'seaborn'],
    weights: { contact: 5, formatting: 5, skills: 25, experience: 20, projects: 20, education: 10, keywords: 10, achievements: 5 }
  },
  'Data Analyst': {
    essential: ['sql', 'powerbi', 'excel', 'statistics', 'data visualization', 'python', 'pandas', 'tableau'],
    recommended: ['data analysis', 'reporting', 'dashboard', 'cleaning', 'mysql', 'spreadsheets', 'analytics'],
    weights: { contact: 10, formatting: 5, skills: 20, experience: 20, projects: 15, education: 10, keywords: 15, achievements: 5 }
  },
  'DevOps Engineer': {
    essential: ['docker', 'kubernetes', 'ci/cd', 'jenkins', 'terraform', 'aws', 'gcp', 'azure'],
    recommended: ['ansible', 'linux', 'bash', 'shell scripting', 'git', 'prometheus', 'grafana', 'nginx'],
    weights: { contact: 5, formatting: 5, skills: 25, experience: 20, projects: 20, education: 5, keywords: 15, achievements: 5 }
  },
  'Cloud Engineer': {
    essential: ['aws', 'gcp', 'azure', 'cloud', 'terraform', 'docker', 'kubernetes', 'networking'],
    recommended: ['ci/cd', 'security', 'monitoring', 'linux', 'iam', 's3', 'serverless', 'lambda'],
    weights: { contact: 5, formatting: 5, skills: 25, experience: 20, projects: 20, education: 5, keywords: 15, achievements: 5 }
  },
  'Mobile Developer': {
    essential: ['swift', 'swiftui', 'kotlin', 'android', 'ios', 'react native', 'flutter', 'java'],
    recommended: ['objective-c', 'mobile', 'apis', 'cocoapods', 'gradle', 'xcode', 'app store', 'play store'],
    weights: { contact: 5, formatting: 5, skills: 25, experience: 20, projects: 25, education: 5, keywords: 10, achievements: 5 }
  },
  'Cybersecurity Analyst': {
    essential: ['security', 'cybersecurity', 'penetration', 'cryptography', 'network security', 'owasp', 'firewall', 'infosec'],
    recommended: ['siem', 'soc', 'vulnerability', 'wireshark', 'linux', 'threat modeling', 'incident response'],
    weights: { contact: 5, formatting: 5, skills: 25, experience: 20, projects: 15, education: 10, keywords: 15, achievements: 5 }
  },
  'QA Engineer': {
    essential: ['testing', 'selenium', 'cypress', 'jest', 'automation', 'qa', 'manual testing', 'bug tracking'],
    recommended: ['postman', 'apis', 'javascript', 'python', 'ci/cd', 'jira', 'agile', 'test cases'],
    weights: { contact: 10, formatting: 10, skills: 20, experience: 20, projects: 15, education: 10, keywords: 10, achievements: 5 }
  },
  'Product Manager': {
    essential: ['product management', 'roadmap', 'agile', 'scrum', 'jira', 'wireframing', 'analytics', 'user stories'],
    recommended: ['strategy', 'leadership', 'communication', 'sql', 'market research', 'ux', 'kpis', 'goal setting'],
    weights: { contact: 5, formatting: 10, skills: 15, experience: 30, projects: 15, education: 10, keywords: 10, achievements: 5 },
    experienceTitles: ['product manager', 'project manager', 'pm', 'lead', 'director', 'intern', 'associate pm'],
    industryKeywords: ['strategy', 'roadmap', 'sprint', 'user research', 'kpis', 'analytics', 'collaboration', 'launch', 'requirements'],
    applyComplexityCaps: false,
    concepts: [],
    projectConcepts: [
      { name: 'Roadmapping', regex: /\b(?:roadmap|strategy|product\s*lifecycle|gantt|planning|vision)\b/i },
      { name: 'Agile & Sprints', regex: /\b(?:agile|scrum|jira|trello|kanban|sprints?|user\s*stories)\b/i },
      { name: 'Analytics & KPIs', regex: /\b(?:metrics|kpis|sql|google\s*analytics|amplitude|excel|data-driven)\b/i },
      { name: 'UX & Prototyping', regex: /\b(?:ux|ui|wirefram|mockup|prototype|user\s*research|figma|personas)\b/i },
      { name: 'Stakeholder Alignment', regex: /\b(?:cross-functional|stakeholders?|engineering|marketing|sales|leadership)\b/i },
      { name: 'Launch & GTM', regex: /\b(?:launch|go-to-market|gtm|release|delivery|ship)\b/i }
    ],
    experienceCriteria: [
      {
        name: 'core_pm',
        maxPoints: 4,
        evaluate: (text) => {
          let pmScore = 0;
          const roadmapRegex = /\b(?:roadmap|strategy|planning|prd|requirements|backlog|user\s*stories|specifications|specs)\b/i;
          const lifecycleRegex = /\b(?:launch|release|delivery|ship|execution|scrum|sprint|agile|sprints)\b/i;
          if (roadmapRegex.test(text)) pmScore += 2;
          if (lifecycleRegex.test(text)) pmScore += 2;
          return pmScore;
        }
      },
      {
        name: 'analysis',
        maxPoints: 4,
        evaluate: (text) => {
          let analysisScore = 0;
          const metricsRegex = /\b(?:analytics|kpis|metrics|conversion|funnel|retention|growth|acquisition)\b/i;
          const userResearchRegex = /\b(?:user\s*research|interviews|surveys|feedback|ux|usability|customer)\b/i;
          if (metricsRegex.test(text)) analysisScore += 2;
          if (userResearchRegex.test(text)) analysisScore += 2;
          return analysisScore;
        }
      }
    ]
  },
  'UI/UX Designer': {
    essential: ['figma', 'ui/ux', 'design', 'wireframing', 'prototyping', 'user research', 'photoshop', 'illustrator'],
    recommended: ['sketch', 'adobe', 'interaction design', 'typography', 'user testing', 'css', 'html', 'design system'],
    weights: { contact: 5, formatting: 15, skills: 20, experience: 15, projects: 25, education: 10, keywords: 5, achievements: 5 },
    experienceTitles: ['designer', 'ux researcher', 'ui developer', 'intern', 'lead', 'artist'],
    industryKeywords: ['wireframe', 'prototype', 'research', 'usability', 'typography', 'branding', 'accessibility', 'sitemap'],
    applyComplexityCaps: false,
    concepts: [],
    projectConcepts: [
      { name: 'Wireframing & Layouts', regex: /\b(?:wirefram|mockup|layout|blueprint|sketch)\b/i },
      { name: 'Interactive Prototyping', regex: /\b(?:prototype|interactive|figma|invision|marvel|clickable)\b/i },
      { name: 'User Testing', regex: /\b(?:user\s*research|user\s*testing|interviews?|personas|usability|heuristics?)\b/i },
      { name: 'Design Systems', regex: /\b(?:design\s*system|design\s*systems|tokens?|component\s*library|consistency)\b/i },
      { name: 'Visual Design', regex: /\b(?:typography|color\s*palette|branding|vector|illustrator|photoshop)\b/i },
      { name: 'Responsive Design', regex: /\b(?:responsive|mobile-first|adaptive|fluid|grid|flexbox|media\s*queries)\b/i }
    ],
    experienceCriteria: [
      {
        name: 'core_design',
        maxPoints: 4,
        evaluate: (text) => {
          let designScore = 0;
          const wireframeRegex = /\b(?:wireframe|wireframes|wireframing|mockup|mockups|layout|layouts|typography|visual|color|sketch)\b/i;
          const prototypingRegex = /\b(?:prototype|prototypes|prototyping|figma|interactive|adobe|sketch|invision)\b/i;
          if (wireframeRegex.test(text)) designScore += 2;
          if (prototypingRegex.test(text)) designScore += 2;
          return designScore;
        }
      },
      {
        name: 'ux_methods',
        maxPoints: 4,
        evaluate: (text) => {
          let uxScore = 0;
          const researchRegex = /\b(?:user\s*research|user\s*testing|usability|interviews|heuristics|personas|feedback)\b/i;
          const systemRegex = /\b(?:design\s*system|design\s*systems|tokens|components|library|consistency|standards)\b/i;
          if (researchRegex.test(text)) uxScore += 2;
          if (systemRegex.test(text)) uxScore += 2;
          return uxScore;
        }
      }
    ]
  },
  'Other': {
    essential: ['javascript', 'python', 'java', 'sql', 'git', 'communication', 'problem solving', 'teamwork'],
    recommended: ['agile', 'documentation', 'testing', 'apis', 'project management'],
    weights: { contact: 10, formatting: 10, skills: 20, experience: 20, projects: 15, education: 10, keywords: 10, achievements: 5 }
  }
};

module.exports = rolesConfig;
