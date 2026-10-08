'use strict';
// Cloudflare Turnstile tokens are single-use, short-lived proof of a challenge.
// Never trust a browser token without Cloudflare Siteverify and hostname/action matching.
async function verifyTurnstileToken({token,secret,expectedHostnames,fetchImpl=fetch}){
 if(typeof token!=='string'||token.length<20||token.length>2048||/[\x00-\x20\x7F]/.test(token))return false;
 if(typeof secret!=='string'||!secret)return false;
 if(!(expectedHostnames instanceof Set)||expectedHostnames.size===0)return false;
 try{
  const response=await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
   method:'POST',
   headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body:new URLSearchParams({secret,response:token}),
   signal:AbortSignal.timeout(9000)
  });
  if(!response.ok)return false;
  const data=await response.json();
  return data?.success===true &&
    typeof data.hostname==='string' && expectedHostnames.has(data.hostname.toLowerCase()) &&
    data.action==='portfolio_lead';
 }catch{return false}
}
module.exports={verifyTurnstileToken};
