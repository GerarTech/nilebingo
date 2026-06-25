const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create directories if they don't exist
const dirs = ['public/audio/en', 'public/audio/am'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// All English audio files to generate
const englishAudio = {
  // Letters
  'B': 'B',
  'I': 'I',
  'N': 'N',
  'G': 'G',
  'O': 'O',
  // Units 1-9
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  // Tens
  '10': 'ten',
  '20': 'twenty',
  '30': 'thirty',
  '40': 'forty',
  '50': 'fifty',
  '60': 'sixty',
  '70': 'seventy',
  // Special teens 11-19
  '11': 'eleven',
  '12': 'twelve',
  '13': 'thirteen',
  '14': 'fourteen',
  '15': 'fifteen',
  '16': 'sixteen',
  '17': 'seventeen',
  '18': 'eighteen',
  '19': 'nineteen'
};

// Numbers to generate for Amharic (1-10, 20, 30, 40, 50, 60, 70)
const amharicNumbers = {
  1: 'አንድ',
  2: 'ሁለት',
  3: 'ሶስት',
  4: 'አራት',
  5: 'አምስት',
  6: 'ስድስት',
  7: 'ሰባት',
  8: 'ስምንት',
  9: 'ዘጠኝ',
  10: 'አስር',
  20: 'ሃያ',
  30: 'ሰላሳ',
  40: 'አርባ',
  50: 'ሃምሳ',
  60: 'ስልሳ',
  70: 'ሰባ'
};

function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://translate.google.com/',
      }
    }, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✓ Generated: ${filepath}`);
          resolve();
        });
      } else {
        // Try HTTP if HTTPS fails
        http.get(url, (httpResponse) => {
          if (httpResponse.statusCode === 200) {
            httpResponse.pipe(file);
            file.on('finish', () => {
              file.close();
              console.log(`✓ Generated: ${filepath}`);
              resolve();
            });
          } else {
            reject(new Error(`HTTP ${response.statusCode}`));
          }
        }).on('error', reject);
      }
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function generateEnglishAudio() {
  console.log('\n🎵 Generating all English audio files...\n');
  
  for (const [num, word] of Object.entries(englishAudio)) {
    const encodedText = encodeURIComponent(word);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=en&client=tw-ob`;
    const filepath = path.join(__dirname, '..', 'public/audio/en', `${num}.mp3`);
    
    try {
      await downloadFile(url, filepath);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (err) {
      console.error(`✗ Failed to generate ${num}.mp3:`, err.message);
    }
  }
}

async function generateAmharicAudio() {
  console.log('\n🎵 Generating Amharic audio files...\n');
  
  for (const [num, word] of Object.entries(amharicNumbers)) {
    const encodedText = encodeURIComponent(word);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=am&client=tw-ob`;
    const filepath = path.join(__dirname, '..', 'public/audio/am', `${num}.mp3`);
    
    try {
      await downloadFile(url, filepath);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`✗ Failed to generate ${num}.mp3:`, err.message);
    }
  }
}

async function main() {
  console.log('🚀 Starting audio generation...\n');
  
  await generateEnglishAudio();
  await generateAmharicAudio();
  
  console.log('\n✅ Audio generation complete!');
  console.log('\nNext steps:');
  console.log('1. Check public/audio/en/ for English files');
  console.log('2. Check public/audio/am/ for Amharic files');
  console.log('3. Test in the game by enabling voice and drawing numbers');
}

main().catch(console.error);