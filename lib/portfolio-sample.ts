import { sampleProject, uid, type Project } from './research';
import { organize } from './interview-organization';
// Curated synthetic demonstration, never used as a substitute for model output.
export function portfolioSample():Project {
 const p=sampleProject();
 p.name='新用户表单体验研究 · 合成案例';
 p.themes=['填写体验','提交反馈','历史记录查找'];
 p.findings=p.findings.map((f,i)=>({...f,theme:p.themes[i===0?1:i===1?0:2],status:'confirmed',behavior:i===0?'P02 提及再次点击提交；P01 提及未理解操作反馈':f.behavior}));
 p.interviews=p.interviews.map(d=>({...d,organized:organize(p,d).map(s=>({...s,direction:d.text.slice(s.start,s.end).includes('记录')?'历史记录查找':d.text.slice(s.start,s.end).includes('该填')?'填写体验':'提交反馈'}))}));
 p.insights=[{
 id:uid(),question:p.questions[0],findingIds:p.findings.slice(0,2).map(f=>f.id),
 interpretation:'在本组合成材料中，填写与提交分别出现了理解障碍：一位受访者不确定字段应填什么，两位受访者未能理解提交反馈，其中一位提及重复点击。另一位受访者认为提示清楚，说明这不是样本中一致出现的问题。可以将“理解填写要求”和“确认操作结果”作为两个需要进一步验证的需求方向。',
 judgment:'先验证问题出现的条件，再确定优化优先级；不根据三位受访者推算总体发生率。',
 opportunity:'探索关键字段的简短说明与示例，以及容易识别的提交中、成功和失败反馈。',
 hypothesis:'更明确的字段说明和提交状态，可能减少填写犹豫与重复操作。',
 validation:'开展任务可用性测试，观察填写停顿、重复提交，并询问用户如何判断操作结果。',
 limitations:'人工编写的合成案例，仅演示研究流程；三名受访者、四份记录，P01 的两份记录只计一人。保留一名受访者的反例。',status:'confirmed',source:'sample'
 },{
 id:uid(),question:p.questions[1],findingIds:[p.findings[2].id],
 interpretation:'一位受访者希望在完成后查看记录。这是后续查找需求的单人线索，尚不能据此判断现有入口难用或需求普遍存在。',
 judgment:'作为下一轮研究问题保留，暂不直接推导功能优先级。',opportunity:'了解用户何时需要回看、希望查看什么，以及当前的查找方式。',hypothesis:'部分用户可能需要完成后的回查入口。',validation:'补充访谈并观察实际回查任务，区分偶发需求与持续需求。',limitations:'仅有一名合成受访者提及，不构成真实用户研究结论。',status:'confirmed',source:'sample'
 }];return p;
}
