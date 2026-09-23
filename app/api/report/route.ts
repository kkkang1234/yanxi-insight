import { restoreProject, report } from "@/lib/research";

export async function POST(request:Request){
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"请求来源无效"},{status:403});
 if(Number(request.headers.get("content-length")||0)>5000000)return Response.json({error:"报告内容过大"},{status:413});
 try{
  const body=await request.text();if(body.length>5000000)return Response.json({error:"报告内容过大"},{status:413});
  const input=new URLSearchParams(body).get("project");
  const project=restoreProject(JSON.parse(input||"null"));
  const content=report(project);
  const filename=`${project.name.replace(/[<>:"/\\|?*\r\n]/g,"_")}_洞察报告.md`;
  return new Response(content,{headers:{"Content-Type":"text/markdown; charset=utf-8","Content-Disposition":`attachment; filename="insight-report.md"; filename*=UTF-8''${encodeURIComponent(filename)}`,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
 }catch{return Response.json({error:"报告校验未通过，请先确认有效发现与证据。"},{status:422});}
}
