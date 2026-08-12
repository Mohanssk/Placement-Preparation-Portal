// ============================================
// English Stop Words Dictionary
// ============================================
// ~175 common words to remove during text normalization.

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an',
  'and', 'any', 'are', 'aren', 'arent', 'as', 'at', 'be', 'because',
  'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'could', 'couldn', 'couldnt', 'did', 'didn', 'didnt', 'do',
  'does', 'doesn', 'doesnt', 'doing', 'don', 'dont', 'down', 'during',
  'each', 'etc', 'even', 'every', 'few', 'for', 'from', 'further',
  'get', 'got', 'had', 'hadn', 'hadnt', 'has', 'hasn', 'hasnt', 'have',
  'haven', 'havent', 'having', 'he', 'her', 'here', 'hers', 'herself',
  'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isn',
  'isnt', 'it', 'its', 'itself', 'just', 'let', 'lets', 'like', 'll',
  'may', 'me', 'might', 'mightn', 'more', 'most', 'much', 'must', 'mustn',
  'my', 'myself', 'need', 'needn', 'no', 'nor', 'not', 'now', 'of', 'off',
  'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'per', 're', 's', 'same', 'shan', 'she', 'should',
  'shouldn', 'shouldnt', 'so', 'some', 'such', 't', 'than', 'that',
  'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under',
  'until', 'up', 'us', 've', 'very', 'via', 'was', 'wasn', 'wasnt',
  'we', 'well', 'were', 'weren', 'werent', 'what', 'when', 'where',
  'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'within',
  'without', 'won', 'wont', 'would', 'wouldn', 'wouldnt', 'you', 'your',
  'yours', 'yourself', 'yourselves',
  // Common resume filler words
  'also', 'able', 'across', 'already', 'always', 'among', 'another',
  'around', 'available', 'back', 'become', 'best', 'better', 'big',
  'come', 'given', 'going', 'good', 'great', 'high', 'however',
  'include', 'including', 'keep', 'know', 'look', 'make', 'many',
  'new', 'next', 'old', 'one', 'part', 'place', 'point', 'provide',
  'put', 'right', 'say', 'see', 'show', 'since', 'still', 'take',
  'tell', 'thing', 'think', 'try', 'turn', 'two', 'use', 'used',
  'using', 'want', 'way', 'work', 'world', 'would', 'year',
]);

module.exports = { STOP_WORDS };
