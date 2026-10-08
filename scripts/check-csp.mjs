import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8').replace(/\r\n/g, '\n');
const csp = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1];
if (!csp) throw new Error('Missing Content-Security-Policy meta tag');
const directive = name => csp.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+' ')) || '';
const sha = s => "'sha256-" + crypto.createHash('sha256').update(s, 'utf8').digest('base64') + "'";
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  .filter(([,attrs])=>!attrs.includes('application/ld+json'));
const styleBlocks = [...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)];

if (scripts.length < 1 || styleBlocks.length < 1) throw new Error('Missing expected inline scripts or styles');
if (!directive('script-src') || directive('script-src').includes("'unsafe-inline'"))
 throw new Error('Script CSP missing or unsafe-inline enabled');
for (let i=0;i<scripts.length;i++) {
 const hash = sha(scripts[i][2]);
 if (!directive('script-src').includes(hash)) throw new Error('Script #'+(i+1)+' not CSP-authorized; update its hash');
 new vm.Script(scripts[i][2], {filename:'inline-'+(i+1)+'.js'});
}
for (let i=0;i<styleBlocks.length;i++) {
 if (!directive('style-src').includes(sha(styleBlocks[i][1])))
  throw new Error('Style block #'+(i+1)+' not CSP-authorized; update its hash');
}
for(const d of ['object-src','base-uri','connect-src','frame-src']) if(!directive(d))
 throw new Error('Missing CSP directive: '+d);
if (!fs.existsSync('privacy.html')) throw new Error('Privacy notice missing');
console.log('PASS: '+scripts.length+' script hashes, '+styleBlocks.length+' style hashes, JS syntax and required security directives');
