// ============================================
// Skill Categorization Dictionaries for ATS
// ============================================
// Used to categorize JD keywords into meaningful buckets
// with different weights for scoring.

const TECHNICAL_SKILLS = new Set([
  // Programming Languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'golang',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r',
  'matlab', 'perl', 'dart', 'lua', 'haskell', 'elixir', 'clojure',

  // Web Frameworks & Libraries
  'react', 'reactjs', 'react.js', 'angular', 'angularjs', 'vue', 'vuejs',
  'vue.js', 'next.js', 'nextjs', 'nuxt', 'nuxtjs', 'svelte', 'express',
  'expressjs', 'express.js', 'fastapi', 'flask', 'django', 'spring',
  'spring boot', 'springboot', 'rails', 'laravel', 'nestjs', 'nest.js',
  'gatsby', 'remix',

  // Mobile
  'react native', 'flutter', 'ios', 'android', 'swiftui', 'jetpack compose',

  // Databases
  'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'cassandra',
  'dynamodb', 'firebase', 'firestore', 'supabase', 'sqlite', 'oracle',
  'mariadb', 'neo4j', 'elasticsearch', 'couchdb',

  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s',
  'terraform', 'ansible', 'jenkins', 'ci/cd', 'cicd', 'github actions',
  'gitlab ci', 'circleci', 'travis ci', 'nginx', 'apache',
  'serverless', 'lambda', 'cloudformation', 'helm', 'istio',

  // Data & ML
  'machine learning', 'deep learning', 'artificial intelligence', 'ai', 'ml',
  'nlp', 'natural language processing', 'computer vision', 'tensorflow',
  'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy', 'spark',
  'hadoop', 'kafka', 'airflow', 'tableau', 'power bi', 'data science',
  'data engineering', 'data analytics', 'big data', 'etl',

  // Tools & Technologies
  'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence',
  'postman', 'swagger', 'graphql', 'rest', 'restful', 'api',
  'microservices', 'monolith', 'websocket', 'grpc', 'rabbitmq',
  'sqs', 'sns', 'oauth', 'jwt', 'saml', 'sso',

  // Concepts
  'data structures', 'algorithms', 'oop', 'object oriented',
  'functional programming', 'design patterns', 'solid', 'dry',
  'tdd', 'bdd', 'unit testing', 'integration testing', 'e2e testing',
  'agile', 'scrum', 'kanban', 'devops', 'devsecops', 'sre',
  'system design', 'distributed systems', 'concurrency', 'multithreading',
  'caching', 'load balancing', 'dns', 'cdn', 'tcp/ip', 'http', 'https',
  'linux', 'unix', 'shell scripting', 'bash',

  // Frontend
  'html', 'html5', 'css', 'css3', 'sass', 'scss', 'less', 'tailwind',
  'tailwindcss', 'bootstrap', 'material ui', 'webpack', 'vite',
  'babel', 'eslint', 'prettier', 'storybook', 'figma',

  // Security
  'cybersecurity', 'penetration testing', 'owasp', 'encryption',
  'ssl', 'tls', 'firewall', 'vpn', 'iam',
]);

const SOFT_SKILLS = new Set([
  'leadership', 'communication', 'teamwork', 'collaboration',
  'problem solving', 'problem-solving', 'critical thinking',
  'analytical', 'creativity', 'innovation', 'adaptability',
  'flexibility', 'time management', 'self-motivated', 'self motivated',
  'detail oriented', 'detail-oriented', 'attention to detail',
  'interpersonal', 'presentation', 'negotiation', 'conflict resolution',
  'mentoring', 'coaching', 'decision making', 'decision-making',
  'strategic thinking', 'stakeholder management', 'cross-functional',
  'cross functional', 'multitasking', 'prioritization', 'initiative',
  'proactive', 'ownership', 'accountability', 'empathy',
  'emotional intelligence', 'customer focus', 'customer-focused',
]);

const EDUCATION_KEYWORDS = new Set([
  'bachelor', 'bachelors', "bachelor's", 'master', 'masters', "master's",
  'phd', 'ph.d', 'doctorate', 'mba', 'b.tech', 'btech', 'm.tech', 'mtech',
  'b.e', 'be', 'm.e', 'me', 'b.sc', 'bsc', 'm.sc', 'msc',
  'b.ca', 'bca', 'm.ca', 'mca', 'b.com', 'bcom',
  'computer science', 'computer engineering', 'information technology',
  'electrical engineering', 'electronics', 'mechanical engineering',
  'software engineering', 'data science',
  'certification', 'certified', 'certificate', 'diploma',
  'aws certified', 'azure certified', 'google certified',
  'pmp', 'cka', 'ckad', 'ccna', 'ccnp', 'comptia',
  'gpa', 'cgpa', 'percentage', 'first class', 'distinction',
  'university', 'college', 'institute', 'iit', 'nit', 'iiit',
]);

const EXPERIENCE_KEYWORDS = new Set([
  'experience', 'years', 'year', 'professional',
  'internship', 'intern', 'fresher', 'entry level', 'entry-level',
  'mid level', 'mid-level', 'senior', 'junior', 'lead', 'principal',
  'staff', 'architect', 'manager', 'director', 'vp',
  'full time', 'full-time', 'part time', 'part-time', 'contract',
  'freelance', 'remote', 'hybrid', 'onsite', 'on-site',
  'startup', 'enterprise', 'fortune 500', 'mnc',
  'project', 'product', 'portfolio', 'client', 'vendor',
  'delivered', 'managed', 'developed', 'built', 'designed',
  'implemented', 'deployed', 'maintained', 'optimized',
  'scaled', 'migrated', 'automated', 'reduced', 'increased',
  'improved', 'achieved', 'launched', 'led', 'coordinated',
]);

// Weight multipliers for scoring
const CATEGORY_WEIGHTS = {
  technical: 3.0,
  experience: 2.0,
  education: 1.5,
  soft: 1.0,
};

module.exports = {
  TECHNICAL_SKILLS,
  SOFT_SKILLS,
  EDUCATION_KEYWORDS,
  EXPERIENCE_KEYWORDS,
  CATEGORY_WEIGHTS,
};
