import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.HAZEFLOW_NATIVE === "1" ? "/" : process.env.GITHUB_ACTIONS ? "/hazeflow/" : "/",
  build: { rollupOptions: { input: { main: "index.html", designs: "design-samples.html" } } },
  plugins: [{
    name: 'haze-journal-ai',
    configureServer(server) {
      server.middlewares.use('/api/ai-status', (req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({available:!!process.env.OPENAI_API_KEY}));});
      server.middlewares.use('/api/journal', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        if (!process.env.OPENAI_API_KEY) { res.setHeader('Content-Type','application/json'); res.statusCode=503; return res.end(JSON.stringify({error:'AI 연결은 API 키 설정이 필요해요. 일기와 기록은 이 기기에만 저장돼요.'})); }
        try {
          let raw=''; for await (const chunk of req) raw += chunk;
          const d=JSON.parse(raw);
          const facts={date:d.date,mood:d.mood,note:d.note,events:d.events,logs:d.logs,tasks:d.tasks,exercises:d.exercises};
          const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5-mini',store:false,instructions:'Write a short Korean first-person diary draft using only the supplied facts. Do not invent feelings, events, or details. Scheduled events are plans, not evidence they happened. Use only completed events and actual logs as activity facts. If there is little information, keep it brief and leave room for the user to edit.',input:JSON.stringify(facts)})});
          const result=await response.json(); if(!response.ok) throw Error(result.error?.message||'AI 요청에 실패했어요.');
          const draft=result.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text||'';
          res.setHeader('Content-Type','application/json');res.end(JSON.stringify({draft}));
        } catch {res.setHeader('Content-Type','application/json');res.statusCode=500;res.end(JSON.stringify({error:'AI 초안을 만들지 못했어요. 잠시 후 다시 시도해주세요.'}));}
      });
    }
  }]
});
