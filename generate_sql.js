const fs = require('fs');

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val.toString();
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${val}'`;
}

function getId(title) {
  return title.replace(/\s+/g, '-').toLowerCase().slice(0, 25);
}

const prepResources = [
  { title: 'Quantitative Aptitude by R.S. Aggarwal — Key Concepts', description: 'Master profit/loss, time & work, percentages, ratios, and number series.', url: 'https://www.indiabix.com/aptitude/questions-and-answers/', category: 'APTITUDE', platform: 'IndiaBIX', sortOrder: 1 },
  { title: 'Aptitude Practice — Placement Season', description: 'Company-wise aptitude questions from TCS, Infosys, Wipro, and more.', url: 'https://www.geeksforgeeks.org/aptitude-questions-and-answers/', category: 'APTITUDE', platform: 'GeeksforGeeks', sortOrder: 2 },
  { title: 'PrepInsta Aptitude Questions', description: 'Topic-wise aptitude practice with shortcuts and tricks.', url: 'https://prepinsta.com/aptitude/', category: 'APTITUDE', platform: 'PrepInsta', sortOrder: 3 },
  { title: 'LeetCode — Top Interview 150', description: 'Curated list of 150 must-solve problems covering arrays, strings, trees, graphs, and dynamic programming.', url: 'https://leetcode.com/studyplan/top-interview-150/', category: 'CODING', platform: 'LeetCode', sortOrder: 1 },
  { title: 'Striver\'s SDE Sheet', description: '191 problems organized by topic — the gold standard for placement prep DSA.', url: 'https://takeuforward.org/interviews/strivers-sde-sheet-top-coding-interview-problems/', category: 'CODING', platform: 'TakeUForward', sortOrder: 2 },
  { title: 'NeetCode 150', description: 'Grouped by pattern: sliding window, two pointers, backtracking, etc.', url: 'https://neetcode.io/practice', category: 'CODING', platform: 'NeetCode', sortOrder: 3 },
  { title: 'HackerRank Interview Preparation Kit', description: 'Warm-up challenges, data structures, algorithms, and problem solving.', url: 'https://www.hackerrank.com/interview/interview-preparation-kit', category: 'CODING', platform: 'HackerRank', sortOrder: 4 },
  { title: 'Verbal Ability — IndiaBIX', description: 'Practice questions on reading comprehension, sentence correction, para jumbles.', url: 'https://www.indiabix.com/verbal-ability/questions-and-answers/', category: 'VERBAL', platform: 'IndiaBIX', sortOrder: 1 },
  { title: 'English Grammar & Vocabulary for Placements', description: 'Key grammar rules and vocabulary building for verbal sections.', url: 'https://www.geeksforgeeks.org/verbal-ability/', category: 'VERBAL', platform: 'GeeksforGeeks', sortOrder: 2 },
  { title: 'Logical Reasoning — IndiaBIX', description: 'Blood relations, seating arrangements, coding-decoding, and syllogisms.', url: 'https://www.indiabix.com/logical-reasoning/questions-and-answers/', category: 'LOGICAL', platform: 'IndiaBIX', sortOrder: 1 },
  { title: 'Puzzles & Logical Reasoning — GeeksforGeeks', description: 'Popular logical puzzles asked in tech company interviews.', url: 'https://www.geeksforgeeks.org/puzzles/', category: 'LOGICAL', platform: 'GeeksforGeeks', sortOrder: 2 },
  { title: 'OS, DBMS, CN — Core CS Concepts', description: 'Revision notes for Operating Systems, DBMS, and Computer Networks.', url: 'https://www.geeksforgeeks.org/gate-cs-notes-gq/', category: 'TECHNICAL', platform: 'GeeksforGeeks', sortOrder: 1 },
  { title: 'System Design Primer', description: 'Learn how to design large-scale systems — essential for senior roles.', url: 'https://github.com/donnemartin/system-design-primer', category: 'TECHNICAL', platform: 'GitHub', sortOrder: 2 },
  { title: 'OOPs Concepts for Interviews', description: 'Encapsulation, inheritance, polymorphism, abstraction with examples.', url: 'https://www.geeksforgeeks.org/object-oriented-programming-oops-concept-in-java/', category: 'TECHNICAL', platform: 'GeeksforGeeks', sortOrder: 3 },
];

const resumeAssets = [
  { title: 'Single Column ATS-Friendly Template', type: 'TEMPLATE', description: 'Clean, single-column resume template optimized for Applicant Tracking Systems. No graphics, no tables, just structured sections.', fileUrl: 'https://docs.google.com/document/d/1wdkS3BxMkfP6IKvMg3_dmqxQEiPBfXqb/edit' },
  { title: 'Two-Column Modern ATS Template', type: 'TEMPLATE', description: 'A modern two-column layout that still passes ATS parsing. Skills sidebar with experience timeline.', fileUrl: 'https://docs.google.com/document/d/1mJQ8BxYeC_wPqLHPmH3Wj2yZ4TdPsN8e/edit' },
  { title: 'Fresher Resume Template', type: 'TEMPLATE', description: 'Designed for fresh graduates — emphasizes projects, internships, and education over experience.', fileUrl: 'https://docs.google.com/document/d/1gKgP8wLfM3hZqY3r5Xs2yTvBfQ9nDcJm/edit' },
  { title: 'Action Verbs — Technical Roles', type: 'ACTION_WORDS', description: 'Power verbs categorized for software engineering, data science, and IT roles.', content: { development: ['Architected', 'Built', 'Coded', 'Debugged', 'Deployed', 'Developed', 'Engineered', 'Implemented', 'Integrated', 'Migrated', 'Optimized', 'Programmed', 'Refactored', 'Shipped'], leadership: ['Coordinated', 'Directed', 'Led', 'Managed', 'Mentored', 'Orchestrated', 'Oversaw', 'Spearheaded', 'Supervised'], analysis: ['Analyzed', 'Assessed', 'Audited', 'Benchmarked', 'Evaluated', 'Investigated', 'Measured', 'Modeled', 'Quantified', 'Researched', 'Tested', 'Validated'], communication: ['Advised', 'Collaborated', 'Consulted', 'Documented', 'Presented', 'Proposed', 'Recommended', 'Reported', 'Trained'], achievement: ['Accelerated', 'Achieved', 'Boosted', 'Delivered', 'Enhanced', 'Exceeded', 'Improved', 'Increased', 'Launched', 'Pioneered', 'Reduced', 'Streamlined', 'Transformed'] } },
  { title: 'Action Verbs — Non-Technical & Management Roles', type: 'ACTION_WORDS', description: 'Power verbs for business, marketing, finance, and HR roles.', content: { strategy: ['Authored', 'Conceptualized', 'Designed', 'Devised', 'Formulated', 'Initiated', 'Planned', 'Strategized'], operations: ['Administered', 'Consolidated', 'Established', 'Executed', 'Facilitated', 'Organized', 'Processed', 'Restructured'], growth: ['Amplified', 'Cultivated', 'Drove', 'Expanded', 'Generated', 'Grew', 'Maximized', 'Scaled'], finance: ['Allocated', 'Budgeted', 'Calculated', 'Forecasted', 'Negotiated', 'Procured', 'Projected', 'Reconciled'] } },
];

let sql = `-- Seed Data for Placement Preparation Portal\n\n`;
sql += `INSERT INTO "prep_resources" ("id", "title", "description", "url", "category", "platform", "sortOrder", "updatedAt") VALUES\n`;
const prepRows = prepResources.map(r => `  (${escapeSql(getId(r.title))}, ${escapeSql(r.title)}, ${escapeSql(r.description)}, ${escapeSql(r.url)}, ${escapeSql(r.category)}::"PrepCategory", ${escapeSql(r.platform)}, ${escapeSql(r.sortOrder)}, NOW())`);
sql += prepRows.join(',\n') + ' ON CONFLICT ("id") DO NOTHING;\n\n';

sql += `INSERT INTO "resume_assets" ("id", "title", "type", "description", "fileUrl", "content", "updatedAt") VALUES\n`;
const assetRows = resumeAssets.map(r => `  (${escapeSql(getId(r.title))}, ${escapeSql(r.title)}, ${escapeSql(r.type)}::"AssetType", ${escapeSql(r.description)}, ${escapeSql(r.fileUrl)}, ${escapeSql(r.content)}::jsonb, NOW())`);
sql += assetRows.join(',\n') + ' ON CONFLICT ("id") DO NOTHING;\n';

fs.writeFileSync('query.sql', sql);
console.log('SQL file written to query.sql');
