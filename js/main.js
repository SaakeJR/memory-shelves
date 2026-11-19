// Classic deferred entry point: even file:// can present an actionable message.
(async function boot() {
 const status=document.getElementById('startupStatus');
 const shell=document.getElementById('appShell');
 const retry=document.getElementById('startupRetry');
 function fail(message,local=false){
  status.dataset.state='error';status.setAttribute('role','alert');
  document.getElementById('startupTitle').textContent='Memory Shelves could not open';
  document.getElementById('startupMessage').textContent=message;
  document.getElementById('startupLocal').hidden=!local;
  retry.hidden=local;shell.hidden=true;status.hidden=false;
 }
 retry.addEventListener('click',()=>location.reload());
 if(location.protocol === 'file:'){
  fail('This version needs a web server to load its JavaScript and course files. Opening index.html directly is not supported.',true);return;
 }
 try{
  const {startApp}=await import('./app.js');
  await startApp();
  shell.hidden=false;status.hidden=true;
  const dialog=shell.querySelector('.modal');
  if(dialog)(document.getElementById('welcomeStart')||dialog).focus();
 }catch(error){
  fail('The study application could not start. Check your connection and website files, then retry. Do not clear browser storage to fix this problem.');
  console.error('Memory Shelves startup failed:',error);
 }
})();
