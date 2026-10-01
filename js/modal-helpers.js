const getSectionToneLabel = (summary = '') => {
  const text = String(summary || '').trim();
  if (!text) return 'IA';

  return (
    text
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'IA'
  );
};

globalThis.getSectionToneLabel = getSectionToneLabel;

export { getSectionToneLabel };
