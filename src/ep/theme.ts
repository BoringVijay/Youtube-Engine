// Series looks. Every template reads colors from here, so one script can be rendered in any series style.
export type Theme = {
  name: string; bg: string; bg2: string; ink: string; soft: string; accent: string; accent2: string;
  pattern: 'none' | 'grid' | 'halftone' | 'grain' | 'split';
  headFill: string; captionBg: string; captionInk: string;
};

export const THEMES: Record<string, Theme> = {
  whatif: { name: 'What If?', bg: '#F3EFE6', bg2: '#E9E3D6', ink: '#141414', soft: '#8C8678', accent: '#FF5A1F', accent2: '#2F6BFF', pattern: 'none', headFill: '#F3EFE6', captionBg: '#141414', captionInk: '#FFFFFF' },
  happened: { name: 'What Actually Happened', bg: '#0E1014', bg2: '#181B22', ink: '#F2F2EE', soft: '#8A8F9C', accent: '#FF4D4D', accent2: '#F5C542', pattern: 'grain', headFill: '#0E1014', captionBg: '#FF4D4D', captionInk: '#FFFFFF' },
  howitworks: { name: 'How It Works', bg: '#0B2E6F', bg2: '#0E3A8A', ink: '#EAF2FF', soft: '#8FB0E6', accent: '#FFD23F', accent2: '#5BE3FF', pattern: 'grid', headFill: '#0B2E6F', captionBg: '#FFD23F', captionInk: '#0B2E6F' },
  money: { name: 'Money Moves', bg: '#0B0D0C', bg2: '#141816', ink: '#F1F5F2', soft: '#7E8A84', accent: '#2BD67B', accent2: '#FF5C5C', pattern: 'grid', headFill: '#0B0D0C', captionBg: '#2BD67B', captionInk: '#0B0D0C' },
  weird: { name: 'True Weird Stories', bg: '#FFE45C', bg2: '#FFD93A', ink: '#121212', soft: '#6B5E1E', accent: '#FF3B8D', accent2: '#3B6CFF', pattern: 'halftone', headFill: '#FFFFFF', captionBg: '#121212', captionInk: '#FFE45C' },
  versus: { name: 'Versus', bg: '#111216', bg2: '#1B1D23', ink: '#F5F5F5', soft: '#8D90A0', accent: '#FF4757', accent2: '#3D8BFF', pattern: 'split', headFill: '#111216', captionBg: '#F5F5F5', captionInk: '#111216' },
};

export const seriesToTheme = (series: string): string => {
  const s = (series || '').toLowerCase();
  if (s.includes('happened')) return 'happened';
  if (s.includes('how it works') || s.includes('cutaway')) return 'howitworks';
  if (s.includes('money')) return 'money';
  if (s.includes('weird') || s.includes('comic')) return 'weird';
  if (s.includes('versus')) return 'versus';
  return 'whatif';
};
