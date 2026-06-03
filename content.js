// VidSummary - YouTube Content Script
(function() {
  'use strict';

  let panel = null;
  let isProcessing = false;

  function createPanel() {
    if (panel) return panel;

    // 等 YouTube 页面渲染完
    const secondary = document.getElementById('secondary') || document.getElementById('secondary-inner');
    if (!secondary) { setTimeout(createPanel, 1000); return; }

    panel = document.createElement('div');
    panel.id = 'vidsummary-panel';
    panel.className = 'style-scope ytd-watch-flexy';
    panel.innerHTML = `
      <div style="background:#272727;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #3f3f3f">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px;color:#fff;font-size:15px;font-weight:600">
            🤖 VidSummary
          </div>
          <button id="vidsum-btn" style="background:#065fd4;color:#fff;border:none;border-radius:18px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer">生成摘要</button>
        </div>
        <div id="vidsum-result" style="color:#aaa;font-size:13px;line-height:1.6;display:none"></div>
        <div id="vidsum-loading" style="display:none;color:#aaa;font-size:13px;text-align:center;padding:20px">⏳ AI正在分析视频内容...</div>
        <div id="vidsum-error" style="display:none;color:#f85149;font-size:13px;padding:8px 0"></div>
        <div style="margin-top:12px;font-size:11px;color:#717171;text-align:center">
          每日10次免费 · <a href="#" id="vidsum-settings" style="color:#3ea6ff;text-decoration:none">设置API Key</a>
        </div>
      </div>
    `;

    secondary.insertBefore(panel, secondary.firstChild);

    document.getElementById('vidsum-btn').addEventListener('click', startSummary);
    document.getElementById('vidsum-settings').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });

    return panel;
  }

  function getTranscript() {
    // YouTube 的字幕按钮
    const transcriptBtn = document.querySelector('[aria-label*="字幕"],[aria-label*="transcript"],[aria-label*="文字记录"]');
    if (transcriptBtn) transcriptBtn.click();

    // 尝试获取字幕文本
    const captions = document.querySelectorAll('.caption-window, .ytp-caption-segment, .captions-text');
    if (captions.length > 0) {
      return Array.from(captions).map(c => c.textContent).join(' ');
    }

    // 备用：获取视频描述作为降级方案
    const desc = document.querySelector('#description-inline-expander, [slot="content"]')?.textContent?.trim();
    return desc || '';
  }

  async function startSummary() {
    if (isProcessing) return;
    isProcessing = true;

    const btn = document.getElementById('vidsum-btn');
    const result = document.getElementById('vidsum-result');
    const loading = document.getElementById('vidsum-loading');
    const error = document.getElementById('vidsum-error');
    
    btn.disabled = true; btn.textContent = '分析中...';
    result.style.display = 'none'; error.style.display = 'none';
    loading.style.display = 'block';

    try {
      const limit = await chrome.runtime.sendMessage({ type: 'CHECK_LIMIT' });
      if (!limit.allowed) throw new Error('DAILY_LIMIT');

      const transcript = getTranscript();
      if (!transcript || transcript.length < 50) throw new Error('NO_TRANSCRIPT');

      const resp = await chrome.runtime.sendMessage({ type: 'SUMMARIZE', transcript, lang: 'zh' });
      if (resp.error) throw new Error(resp.error);

      result.innerHTML = resp.summary.replace(/\n/g, '<br>');
      result.style.display = 'block';
    } catch (e) {
      const msgs = {
        DAILY_LIMIT: '今日免费次数已用完（10次/天）',
        NO_TRANSCRIPT: '未能获取视频字幕。请确保视频有字幕或尝试刷新页面。',
        NO_KEY: '请先设置 DeepSeek API Key',
        default: `分析失败：${e.message}`
      };
      error.textContent = msgs[e.message] || msgs.default;
      error.style.display = 'block';
    }

    loading.style.display = 'none';
    btn.disabled = false; btn.textContent = '生成摘要';
    isProcessing = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPanel);
  } else {
    createPanel();
  }
})();
