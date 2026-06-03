document.addEventListener('DOMContentLoaded',async()=>{
  const{count,date}=await chrome.storage.local.get(['count','date']);
  const today=new Date().toDateString();
  document.getElementById('count').textContent=(date===today?(count||0):0)+'/10';
  document.getElementById('settings').addEventListener('click',()=>chrome.runtime.openOptionsPage());
});
