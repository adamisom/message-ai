export function quickPriorityCheck(text: string): 'high' | 'low' | 'unknown' {
  const lowPriorityPatterns = [
    /^(ok|okay|sure|thanks|thx|ty|lol|haha|😊|👍|❤️)$/i,
    /^(good ?night|good ?morning|see you|bye|later|ttyl)/i,
    /^(nice|cool|awesome|great|sounds good)/i,
  ];

  const highPriorityKeywords = [
    'urgent', 'asap', 'immediately', 'emergency', 'critical', 'important',
    'deadline', 'need now', 'right away', 'time sensitive', 'breaking',
    'alert', 'attention', 'priority', 'action required',
  ];

  const urgentPunctuation = /\?{2,}|!{2,}/;

  // Check low priority
  if (lowPriorityPatterns.some((p) => p.test(text)) && text.length < 30) {
    return 'low';
  }

  // Check high priority
  const lowerText = text.toLowerCase();
  if (highPriorityKeywords.some((kw) => lowerText.includes(kw))) {
    return 'high';
  }

  if (urgentPunctuation.test(text)) {
    return 'high';
  }

  // Check all caps
  if (text.length > 10 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    return 'high';
  }

  return text.length < 30 ? 'low' : 'unknown';
}

