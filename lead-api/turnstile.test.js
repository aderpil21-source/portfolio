'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {verifyTurnstileToken}=require('./turnstile.js');
const token='verification-token-longer-than-twenty-characters';
const secret='server-only-secret';
const expectedHostnames=new Set(['aderpil21-source.github.io','katsstudio.eu.org']);
function fakeFetch(body,{ok=true}={}){return async (_url,req)=>{
 assert.equal(_url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');
 assert.equal(req.method,'POST');
 assert.equal(req.body.get('secret'),secret);
 assert.equal(req.body.get('response'),token);
 return {ok,json:async()=>body};
};}
test('accepts only successful Cloudflare verification on an approved hostname and action',async()=>{
 assert.equal(await verifyTurnstileToken({token,secret,expectedHostnames,fetchImpl:fakeFetch({success:true,hostname:'aderpil21-source.github.io',action:'portfolio_lead'})}),true);
 assert.equal(await verifyTurnstileToken({token,secret,expectedHostnames,fetchImpl:fakeFetch({success:true,hostname:'katsstudio.eu.org',action:'portfolio_lead'})}),true);
});
test('rejects forged and expired or missing tokens',async()=>{
 assert.equal(await verifyTurnstileToken({token:'',secret,expectedHostnames,fetchImpl:fakeFetch({success:true})}),false);
 assert.equal(await verifyTurnstileToken({token,secret,expectedHostnames,fetchImpl:fakeFetch({success:false,hostname:'aderpil21-source.github.io',action:'portfolio_lead'})}),false);
});
test('rejects cross-site and wrong-action tokens',async()=>{
 assert.equal(await verifyTurnstileToken({token,secret,expectedHostnames,fetchImpl:fakeFetch({success:true,hostname:'attacker.example',action:'portfolio_lead'})}),false);
 assert.equal(await verifyTurnstileToken({token,secret,expectedHostnames,fetchImpl:fakeFetch({success:true,hostname:'aderpil21-source.github.io',action:'other_action'})}),false);
});
test('rejects network failures, invalid response and HTTP errors',async()=>{
 assert.equal(await verifyTurnstileToken({token,secret,expectedHostnames,fetchImpl:async()=>{throw Error('offline')}}),false);
 assert.equal(await verifyTurnstileToken({token,secret,expectedHostnames,fetchImpl:fakeFetch(null)}),false);
 assert.equal(await verifyTurnstileToken({token,secret,expectedHostnames,fetchImpl:fakeFetch({}, {ok:false})}),false);
});
