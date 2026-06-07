import { state } from './state.js';

const JAMENDO_CLIENT_ID = '77395cff';

export async function searchMusic(query, limit = 5) {
  // Restore the trailing slash after /tracks/ - Jamendo API is sensitive to this.
  // Use format=json as it is the most standard.
  const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=${limit}&search=${encodeURIComponent(query)}&boost=popularity_total&include=musicinfo`;
  
  try {
    console.log("AuraMotion | API Call:", url);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("AuraMotion | API HTTP Error:", response.status, errorText);
      throw new Error(`Server responded with ${response.status}`);
    }
    
    const data = await response.json();
    console.log("AuraMotion | API Response Received:", data);
    
    if (data.headers && data.headers.status === 'failed') {
      console.error("AuraMotion | API Logic Error:", data.headers.error_message);
      throw new Error(data.headers.error_message);
    }
    
    return data.results || [];
  } catch (error) {
    console.error("AuraMotion | Search Request Failed:", error);
    throw error;
  }
}

export function suggestKeywords(prompt, theme) {
  const keywords = new Set();
  
  // Theme based keywords
  const themeMap = {
    'cinematic': ['cinematic', 'orchestral', 'epic', 'soundtrack', 'dramatic'],
    'retro': ['lofi', '80s', 'synthwave', 'retro', 'vintage', 'tape'],
    'cyberpunk': ['dark', 'techno', 'glitch', 'industrial', 'cyberpunk', 'electronic', 'neon'],
    'minimalist': ['ambient', 'minimal', 'piano', 'calm', 'soft', 'relaxing']
  };
  
  // Normalize theme name
  let normalizedTheme = theme ? theme.toLowerCase() : 'cinematic';
  if (normalizedTheme.includes('retro') || normalizedTheme.includes('vhs')) normalizedTheme = 'retro';

  if (themeMap[normalizedTheme]) {
    themeMap[normalizedTheme].forEach(k => keywords.add(k));
  }
  
  // Prompt based keywords
  const moodKeywords = ['happy', 'sad', 'dark', 'energetic', 'calm', 'romantic', 'action', 'nature', 'urban', 'fast', 'slow', 'moody', 'chill', 'scary', 'tense', 'peaceful'];
  
  if (prompt) {
    const words = prompt.toLowerCase().split(/\W+/);
    words.forEach(word => {
      // Add if it's a known mood keyword or a long enough word that isn't too common
      if (moodKeywords.includes(word) || (word.length > 3 && !['this', 'that', 'with', 'from', 'your'].includes(word))) {
        keywords.add(word);
      }
    });
  }
  
  // Convert to array and take a few good ones
  const resultArr = Array.from(keywords);
  
  // If we have many, prioritize mood keywords + theme
  const filtered = resultArr.filter(k => moodKeywords.includes(k) || themeMap[normalizedTheme].includes(k));
  
  if (filtered.length > 0) {
    return filtered.slice(0, 3).join(' ');
  }

  return resultArr.slice(0, 3).join(' ') || normalizedTheme;
}
