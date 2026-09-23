import test from 'node:test';
import assert from 'node:assert/strict';
import {organize,cleanSpeech,directions,UNASSIGNED} from '../lib/interview-organization.ts';
import {createProject,addInterview,report,sampleProject} from '../lib/research.ts';
test('只清理独立犹豫词，保留否定、不确定与完整回应',()=>{
 assert.equal(cleanSpeech('受访者：嗯，我不知道。'),'受访者：我不知道。');
 for(const s of ['嗯','受访者：可能不太合适。','受访者：我觉得没有必要。'])assert.equal(cleanSpeech(s),s);
});
test('按大纲精确标题归类并保留每段原始位置',()=>{
 let p=createProject();p.outline='1. 填写时有哪些困难？\n2. 提交后是否知道操作结果？';
 p=addInterview(p,'访谈','访谈者：填写时有哪些困难？\n受访者：嗯，不知道该填什么。\n访谈者：提交后是否知道操作结果？\n受访者：没有提示。','P01');
 const d=p.interviews[0],ss=organize(p,d);assert.equal(directions(p).length,2);assert.equal(ss[1].direction,'填写时有哪些困难？');assert.equal(ss[3].direction,'提交后是否知道操作结果？');assert.equal(d.text.slice(ss[1].start,ss[1].end),'受访者：嗯，不知道该填什么。');
});
test('不认识的问题与未知说话人不会硬归类或当成已确认发言',()=>{
 let p=createProject();p.questions=['填写时有哪些困难？'];p=addInterview(p,'访谈','访谈者：还有别的吗？\n也许有一点。','P01');const ss=organize(p,p.interviews[0]);assert.equal(ss[1].direction,UNASSIGNED);assert.equal(ss[1].speaker,'unknown');
});
test('整理稿独立保存，原文引文保持不变',()=>{
 let p=createProject();p=addInterview(p,'访谈','受访者：嗯，不知道。','P01');const d=p.interviews[0];d.organized=organize(p,d).map(s=>({...s,clean:'不知道。'}));assert.equal(organize(p,d)[0].clean,'不知道。');assert.equal(d.text,'受访者：嗯，不知道。');
});
test('报告按正文分节，不再逐条重复洞察卡片标题',()=>{
 const p=sampleProject();const md=report(p,true);assert.ok(md.includes('用户需求与痛点'));assert.ok(!md.includes('#### 发现：'));assert.ok(md.includes('证据附录'));
});
