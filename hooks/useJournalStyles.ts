import { useEffect, useMemo } from 'react';

// A simplified interface for a Foundry journal
interface JournalData {
  name: string;
  flags?: Record<string, any>;
}

const useJournalStyles = (journalData: JournalData | null): string => {
  // Determine the theme based on journal data. Default to PFS1.
  // This logic can be expanded later to support more themes.
  const theme = useMemo(() => {
    // A potential (but simplified) way to check for a theme flag
    if (journalData?.flags?.core?.sheetClass?.includes('PFS1')) {
      return 'PFS1';
    }
    // Default theme if no specific theme is detected
    return 'PFS1';
  }, [journalData]);

  useEffect(() => {
    const pf2eStyleId = 'pf2e-journal-styles';
    const commonStyleId = 'common-journal-styles';
    const themeStyleId = 'theme-journal-styles';

    // Clean up previous styles
    document.getElementById(pf2eStyleId)?.remove();
    document.getElementById(commonStyleId)?.remove();
    document.getElementById(themeStyleId)?.remove();

    // 1. PF2e Base Stylesheet
    const pf2eLink = document.createElement('link');
    pf2eLink.id = pf2eStyleId;
    pf2eLink.rel = 'stylesheet';
    pf2eLink.href = './styles/pf2e.css';
    document.head.appendChild(pf2eLink);

    // 2. Common Stylesheet
    const commonLink = document.createElement('link');
    commonLink.id = commonStyleId;
    commonLink.rel = 'stylesheet';
    commonLink.href = './styles/common.css';
    document.head.appendChild(commonLink);
    
    // 3. Theme Stylesheet
    if (theme) {
      const themeLink = document.createElement('link');
      themeLink.id = themeStyleId;
      themeLink.rel = 'stylesheet';
      themeLink.href = `./styles/${theme}/${theme}.css`;
      document.head.appendChild(themeLink);
    }

    return () => {
      document.getElementById(pf2eStyleId)?.remove();
      document.getElementById(commonStyleId)?.remove();
      document.getElementById(themeStyleId)?.remove();
    };
  }, [theme]); // Rerun effect if the theme changes

  return theme; // Return the class name for the component to use
};

export default useJournalStyles;