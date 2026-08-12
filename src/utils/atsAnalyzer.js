// ============================================
// ATS Resume Analyzer — Core Engine
// ============================================
// Smart keyword matching with text normalization,
// multi-word phrase extraction, categorized results,
// and weighted scoring.

const pdfParse = require('pdf-parse');
const { STOP_WORDS } = require('./stopWords');
const {
  TECHNICAL_SKILLS,
  SOFT_SKILLS,
  EDUCATION_KEYWORDS,
  EXPERIENCE_KEYWORDS,
  CATEGORY_WEIGHTS,
} = require('./skillDictionaries');

// ── Text Processing ────────────────────────────

/**
 * Normalizes text: lowercase, remove special chars, collapse whitespace.
 */
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s.+#\-\/]/g, ' ')  // keep ., +, #, -, / for tech terms
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Tokenizes text into words, removing stop words.
 */
const tokenize = (text) => {
  return text
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
};

/**
 * Extracts n-grams (multi-word phrases) from text.
 */
const extractNgrams = (words, n) => {
  const ngrams = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return ngrams;
};

// ── Keyword Extraction ─────────────────────────

/**
 * Categorizes a keyword into its appropriate bucket.
 */
const categorizeKeyword = (keyword) => {
  if (TECHNICAL_SKILLS.has(keyword)) return 'technical';
  if (SOFT_SKILLS.has(keyword)) return 'soft';
  if (EDUCATION_KEYWORDS.has(keyword)) return 'education';
  if (EXPERIENCE_KEYWORDS.has(keyword)) return 'experience';
  return null;
};

/**
 * Extracts and categorizes keywords from the Job Description.
 * Processes unigrams, bigrams, and trigrams.
 */
const extractJDKeywords = (jdText) => {
  const normalized = normalizeText(jdText);
  const words = tokenize(normalized);

  const keywordMap = new Map(); // keyword -> category

  // Extract trigrams first (longer phrases take priority)
  const trigrams = extractNgrams(normalized.split(/\s+/), 3);
  for (const trigram of trigrams) {
    const category = categorizeKeyword(trigram);
    if (category && !keywordMap.has(trigram)) {
      keywordMap.set(trigram, category);
    }
  }

  // Extract bigrams
  const bigrams = extractNgrams(normalized.split(/\s+/), 2);
  for (const bigram of bigrams) {
    const category = categorizeKeyword(bigram);
    if (category && !keywordMap.has(bigram)) {
      // Avoid adding bigram if it's part of an already-captured trigram
      const isSubPhraseOfExisting = [...keywordMap.keys()].some(
        (existing) => existing.includes(bigram) && existing !== bigram
      );
      if (!isSubPhraseOfExisting) {
        keywordMap.set(bigram, category);
      }
    }
  }

  // Extract unigrams
  for (const word of words) {
    const category = categorizeKeyword(word);
    if (category && !keywordMap.has(word)) {
      // Avoid adding unigram if it's part of an already-captured phrase
      const isSubPhraseOfExisting = [...keywordMap.keys()].some(
        (existing) => existing.includes(word) && existing !== word && existing.split(' ').length > 1
      );
      if (!isSubPhraseOfExisting) {
        keywordMap.set(word, category);
      }
    }
  }

  // Also add uncategorized significant words (appear multiple times in JD)
  const wordFreq = {};
  for (const word of words) {
    if (!keywordMap.has(word) && word.length > 2) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  }
  // Words appearing 2+ times in JD are likely important
  for (const [word, count] of Object.entries(wordFreq)) {
    if (count >= 2 && !keywordMap.has(word)) {
      keywordMap.set(word, 'uncategorized');
    }
  }

  return keywordMap;
};

// ── Matching & Scoring ─────────────────────────

/**
 * Checks if a keyword exists in the resume text.
 * Uses word boundary matching for single words,
 * substring matching for multi-word phrases.
 */
const keywordExistsInResume = (keyword, resumeNormalized) => {
  if (keyword.includes(' ')) {
    // Multi-word phrase: direct substring search
    return resumeNormalized.includes(keyword);
  }
  // Single word: check with word boundaries
  const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');
  return regex.test(resumeNormalized);
};

/**
 * Escapes special regex characters in a string.
 */
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Core analysis function.
 * Extracts text from PDF buffer, compares against JD, returns scored results.
 *
 * @param {Buffer} pdfBuffer - The PDF file buffer from multer
 * @param {string} jobDescription - The job description text
 * @returns {Promise<object>} Analysis results
 */
const analyzeResume = async (pdfBuffer, jobDescription) => {
  // Step 1: Extract text from PDF
  const pdfData = await pdfParse(pdfBuffer);
  const resumeText = pdfData.text;

  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error(
      'Could not extract meaningful text from the PDF. The file may be scanned/image-based.'
    );
  }

  // Step 2: Normalize texts
  const resumeNormalized = normalizeText(resumeText);
  const jdNormalized = normalizeText(jobDescription);

  // Step 3: Extract & categorize JD keywords
  const jdKeywords = extractJDKeywords(jobDescription);

  // Step 4: Match against resume
  const found = [];
  const missing = [];
  const categoryBreakdown = {
    technical: { found: [], missing: [], weight: CATEGORY_WEIGHTS.technical },
    soft: { found: [], missing: [], weight: CATEGORY_WEIGHTS.soft },
    education: { found: [], missing: [], weight: CATEGORY_WEIGHTS.education },
    experience: { found: [], missing: [], weight: CATEGORY_WEIGHTS.experience },
    uncategorized: { found: [], missing: [], weight: 1.0 },
  };

  for (const [keyword, category] of jdKeywords.entries()) {
    const exists = keywordExistsInResume(keyword, resumeNormalized);

    if (exists) {
      found.push(keyword);
      categoryBreakdown[category].found.push(keyword);
    } else {
      missing.push(keyword);
      categoryBreakdown[category].missing.push(keyword);
    }
  }

  // Step 5: Calculate weighted score
  let weightedFound = 0;
  let weightedTotal = 0;

  for (const [category, data] of Object.entries(categoryBreakdown)) {
    const weight = data.weight;
    weightedFound += data.found.length * weight;
    weightedTotal += (data.found.length + data.missing.length) * weight;
  }

  const matchScore =
    weightedTotal > 0 ? Math.round((weightedFound / weightedTotal) * 100) : 0;

  // Step 6: Build category summary (without weight field)
  const categorySummary = {};
  for (const [category, data] of Object.entries(categoryBreakdown)) {
    const total = data.found.length + data.missing.length;
    if (total > 0) {
      categorySummary[category] = {
        found: data.found,
        missing: data.missing,
        score: Math.round((data.found.length / total) * 100),
        total,
      };
    }
  }

  return {
    matchScore,
    totalKeywords: jdKeywords.size,
    foundCount: found.length,
    missingCount: missing.length,
    foundKeywords: found,
    missingKeywords: missing,
    categoryBreakdown: categorySummary,
    resumeWordCount: resumeText.split(/\s+/).length,
    pdfPages: pdfData.numpages,
  };
};

module.exports = { analyzeResume };
