const fs = require('fs');
const seed = fs.readFileSync('prisma/seed.js', 'utf8');

// I'll extract prepResources and resumeAssets by eval'ing a portion or just writing a simple node script that outputs the SQL

