const DEFAULTS={deepseekKey:'',dailyLimit:10};
document.addEventListener('DOMContentLoaded',async()=>{
  const{settings}=await chrome.storage.sync.get('settings');
  const s=settings||DEFAULTS;
  document.getElementById('key').value=s.deepseekKey||'';
  document.getElementById('limit').value=s.dailyLimit||10;
  document.getElementById('save').addEventListener('click',async()=>{
    const btn=document.getElementById('save');btn.disabled=true;btn.textContent='保存中...';
    await chrome.storage.sync.set({settings:{deepseekKey:document.getElementById('key').value.trim(),dailyLimit:parseInt(document.getElementById('limit').value)||10}});
    btn.disabled=false;btn.textContent='保存';
    const el=document.getElementById('status');el.textContent='已保存!';el.style.display='inline';
    setTimeout(()=>el.style.display='none',2000);
  });
});
