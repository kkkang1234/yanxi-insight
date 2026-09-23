import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleProject } from '../lib/research.ts';
const base=process.env.TEST_BASE_URL||'http://localhost:5173';

test('报告下载接口返回真实 Markdown 附件及原文证据',async()=>{
 const p=sampleProject();p.findings.forEach(f=>f.status='confirmed');
 const response=await fetch(base+'/api/report',{method:'POST',headers:{Origin:base},body:new URLSearchParams({project:JSON.stringify(p)})});
 assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/attachment/);assert.match(response.headers.get('content-disposition'),/filename\*=UTF-8/);
 const body=await response.text();assert.ok(body.includes('支持 2 人，反例 1 人'));assert.ok(body.includes(p.evidence[0].quote));assert.ok(body.includes('合成示例'));
});
test('无有效确认发现时下载接口拒绝生成正式报告',async()=>{const p=sampleProject();const response=await fetch(base+'/api/report',{method:'POST',body:new URLSearchParams({project:JSON.stringify(p)})});assert.equal(response.status,422);});
test('跨来源报告提交被拒绝',async()=>{const response=await fetch(base+'/api/report',{method:'POST',headers:{Origin:'https://untrusted.example'},body:'project={}'});assert.equal(response.status,403);});
test('AI 未配置时不返回任何伪造结果',async(t)=>{const state=await (await fetch(base+'/api/ai')).json();if(state.configured){t.skip('环境已经配置，真实模型调用需单独验收');return;}const response=await fetch(base+'/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({step:'context',input:{brief:'合成测试'}})});assert.equal(response.status,503);const data=await response.json();assert.ok(data.error);assert.equal(data.result,undefined);assert.ok(!/API|密钥|模型|配置/.test(data.error));});
