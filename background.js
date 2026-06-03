// VidSummary - Background
const API = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULTS = { deepseekKey: '', dailyLimit: 10, language: 'zh' };

chrome.runtime.onInstalled.addListener(async () => {
  const { settings } = await chrome.storage.sync.get('settings');
  if (!settings) await chrome.storage.sync.set({ settings: DEFAULTS });
  const t = new Date();
  await chrome.storage.local.set({ count: 0, date: t.toDateString() });
});

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  switch (req.type) {
    case 'SUMMARIZE':
      summarize(req.transcript, req.lang).then(sendResponse).catch(e => sendResponse({ error: e.message }));
      return true;
    case 'CHECK_LIMIT':
      checkLimit().then(sendResponse);
      return true;
    case 'GET_SETTINGS':
      chrome.storage.sync.get('settings').then(sendResponse);
      return true;
    case 'SAVE_SETTINGS':
      chrome.storage.sync.set({ settings: req.settings }).then(() => sendResponse({ success: true }));
      return true;
  }
});

async function checkLimit() {
  const { settings } = await chrome.storage.sync.get('settings');
  const limit = (settings || DEFAULTS).dailyLimit || 10;
  const { count, date } = await chrome.storage.local.get(['count', 'date']);
  const today = new Date().toDateString();
  return { allowed: (date === today ? (count || 0) : 0) < limit };
}

async function summarize(transcript, language = 'zh') {
  const { settings } = await chrome.storage.sync.get('settings');
  const s = settings || DEFAULTS;
  if (!s.deepseekKey) throw new Error('NO_KEY');

  // 截断过长文本
  const text = transcript.substring(0, 12000);

  const langPrompt = language === 'zh' ? '请用中文输出。' : 'Please output in English.';

  const prompt = `你是一个视频内容总结专家。请分析以下YouTube视频字幕，提取核心内容。

要求：
1. 用一句话概括视频主题
2. 列出 5-8 个核心要点（每点 1-2 句话）
3. 如果适用，标注关键时间点
4. 指出视频适合谁看

${langPrompt}

视频字幕：
${text}`;

  const resp = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${s.deepseekKey}` },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2048
    })
  });

  if (!resp.ok) throw new Error(`API_${resp.status}`);
  const data = await resp.json();

  // 更新计数
  const { count, date } = await chrome.storage.local.get(['count', 'date']);
  const today = new Date().toDateString();
  const newCount = (date === today ? (count || 0) : 0) + 1;
  await chrome.storage.local.set({ count: newCount, date: today });

  return { success: true, summary: data.choices[0].message.content };
}
