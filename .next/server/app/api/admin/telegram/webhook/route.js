"use strict";(()=>{var e={};e.id=835,e.ids=[835],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8077:(e,a,t)=>{t.r(a),t.d(a,{originalPathname:()=>v,patchFetch:()=>C,requestAsyncStorage:()=>A,routeModule:()=>D,serverHooks:()=>I,staticGenerationAsyncStorage:()=>E});var n={};t.r(n),t.d(n,{POST:()=>x});var i=t(9303),s=t(8716),r=t(670),o=t(7070),d=t(7933);let m=process.env.ADMIN_BOT_TOKEN||"",p=process.env.ADMIN_CHAT_ID||"",c=process.env.SUPABASE_SERVICE_ROLE_KEY||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyam9ubWVxdHZmcWtiam5ua2NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MjgyMTUsImV4cCI6MjA5NzEwNDIxNX0.vGW0f8jLjsfN8GZjxHodjyzfxAQCPRSg_YNrQbJVhYQ",l=(0,d.eI)("https://frjonmeqtvfqkbjnnkcd.supabase.co",c),u=`https://api.telegram.org/bot${m}`;async function _(e,a={}){try{let t=await fetch(`${u}/${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a),signal:AbortSignal.timeout(1e4)});return await t.json()}catch(a){return console.error(`Admin bot API ${e} error:`,a),{ok:!1}}}async function f(e,a,t={}){return _("sendMessage",{chat_id:e,text:a,...t})}let g={},w=0;async function h(){let e=Date.now();if(g&&e-w<3e4)return g;try{let{data:a}=await l.from("bot_config").select("commands").eq("id","main").single();return g=a?.commands||{admin_stats:"/admin_stats",admin_users:"/admin_users",admin_pending:"/admin_pending",admin_games:"/admin_games",admin_help:"/admin_help",admin_approve:"/approve_",admin_reject:"/reject_"},w=e,g}catch{return{admin_stats:"/admin_stats",admin_users:"/admin_users",admin_pending:"/admin_pending",admin_games:"/admin_games",admin_help:"/admin_help",admin_approve:"/approve_",admin_reject:"/reject_"}}}async function $(e){let{data:a}=await l.from("profiles").select("id",{count:"exact",head:!0}),{data:t}=await l.from("games").select("id",{count:"exact",head:!0}),{data:n}=await l.from("games").select("id",{count:"exact",head:!0}).eq("status","active"),{data:i}=await l.from("transactions").select("type, amount, status"),s=0,r=0,o=0,d=0,m=0,p=0;if(i)for(let e of i){let a=Number(e.amount)||0;"deposit"===e.type&&"completed"===e.status&&(s+=a),"withdraw"===e.type&&"completed"===e.status&&(r+=a),"bet"===e.type&&(o+=a),"win"===e.type&&(d+=a),"deposit"===e.type&&"pending"===e.status&&m++,"withdraw"===e.type&&"pending"===e.status&&p++}let c=`*📊 Admin Dashboard*

👥 Users: ${a?.length||0}
🎮 Games: ${t?.length||0}
🟢 Active: ${n?.length||0}
💰 Deposits: ${s.toLocaleString()} ETB
💸 Withdrawals: ${r.toLocaleString()} ETB
📈 Revenue: ${(o-d).toLocaleString()} ETB
⏳ Pending Deposits: ${m}
⏳ Pending Withdrawals: ${p}`;await f(e,c,{parse_mode:"Markdown"})}async function y(e){let{data:a}=await l.from("profiles").select("first_name, username, telegram_id, phone, created_at").order("created_at",{ascending:!1}).limit(10);if(!a||0===a.length){await f(e,"No users found.");return}let t=a.map((e,a)=>`${a+1}. ${e.first_name||"Unknown"}${e.username?` (@${e.username})`:""}
   ID: ${e.telegram_id}${e.phone?` | 📞 ${e.phone}`:""}`).join("\n");await f(e,`*👥 Recent Users*

${t}`,{parse_mode:"Markdown"})}async function k(e){let{data:a}=await l.from("transactions").select("*, profiles!inner(first_name, username)").eq("status","pending").order("created_at",{ascending:!1}).limit(20);if(!a||0===a.length){await f(e,"No pending transactions.");return}let t=a.map(e=>`• ${e.type.toUpperCase()} | ${Number(e.amount).toLocaleString()} ETB | ${e.profiles?.first_name||"Unknown"}
  ID: \`${e.id.slice(0,8)}...\` | /approve_${e.id.slice(0,8)}`).join("\n");await f(e,`*⏳ Pending Transactions*

${t}`,{parse_mode:"Markdown"})}async function b(e){let{data:a}=await l.from("games").select("*, game_players(*, profiles(first_name, username))").eq("status","active").order("created_at",{ascending:!1}),{data:t}=await l.from("games").select("*, winner:profiles(first_name, username)").eq("status","finished").order("created_at",{ascending:!1}).limit(10),n=`*🎮 Nile BINGO Matches Board*

`;if(a&&a.length>0)for(let e of(n+=`*🟢 LIVE ACTIVE GAMES (Spectate & Appoint)*
`,a)){let a=Number(e.prize_pool||0).toLocaleString(),t=e.game_players?.map(e=>e.profiles?.first_name||"Player").join(", ")||"None";n+=`• Game ID: \`${e.code}\`
  Prize Pool: *${a} ETB*
  Players: ${t}
  Appoint Winner: \`/appoint_${e.code}_25\`

`}else n+=`*🟢 LIVE ACTIVE GAMES*
_No live games currently playing._

`;t&&t.length>0?n+=`*🏆 RECENT COMPLETED MATCHES*
`+t.map((e,a)=>{let t=e.winner?.first_name||"Virtual Player",n=e.winner?.username?` (@${e.winner.username})`:"",i=Number(e.prize_pool||0).toLocaleString();return`${a+1}. Game ID: \`${e.code}\`
   Prize Pool: *${i} ETB*
   Winner: *${t}${n}*`}).join("\n\n"):n+=`*🏆 RECENT COMPLETED MATCHES*
_No recently completed matches._`,await f(e,n,{parse_mode:"Markdown"})}async function j(e,a){let{data:t}=await l.from("transactions").select("*").eq("id",a).single();if(!t||"pending"!==t.status){await f(e,"Transaction not found or already processed.");return}if(await l.from("transactions").update({status:"completed"}).eq("id",a),"deposit"===t.type){let{data:e}=await l.from("wallets").select("main_balance").eq("user_id",t.user_id).single();e&&await l.from("wallets").update({main_balance:Number(e.main_balance)+Number(t.amount)}).eq("user_id",t.user_id)}await f(e,`✅ Transaction ${a.slice(0,8)} approved.`)}async function N(e,a){await l.from("transactions").update({status:"failed"}).eq("id",a),await f(e,`❌ Transaction ${a.slice(0,8)} rejected.`)}async function x(e){try{let a=await e.json(),t=a.message||a.callback_query?.message,n=a.callback_query,i=t?.chat?.id||n?.message?.chat?.id;a.message?.from||a.callback_query?.from;let s=a.message?.text||"";if(!i||String(i)!==p)return o.NextResponse.json({ok:!0});if("/start"===s)return await f(i,"\uD83D\uDD10 Admin Bot Ready\n\nUse the menu below or type /admin_help for commands:",{reply_markup:{keyboard:[[{text:"\uD83D\uDCCA Stats"},{text:"\uD83D\uDC65 Users"}],[{text:"⏳ Pending"},{text:"\uD83C\uDFAE Matches"}],[{text:"❓ Help"}]],resize_keyboard:!0}}),o.NextResponse.json({ok:!0});let r=await h();if("\uD83D\uDCCA Stats"===s)return await $(i),o.NextResponse.json({ok:!0});if("\uD83D\uDC65 Users"===s)return await y(i),o.NextResponse.json({ok:!0});if("⏳ Pending"===s)return await k(i),o.NextResponse.json({ok:!0});if("\uD83C\uDFAE Matches"===s)return await b(i),o.NextResponse.json({ok:!0});if("❓ Help"===s)return await f(i,`*🔐 Admin Commands*

${r.admin_stats} - View dashboard stats
${r.admin_users} - List recent users
${r.admin_pending} - View pending transactions
${r.admin_games||"/admin_games"} - View recent matches & winners
${r.admin_approve}<tx_id> - Approve a transaction
${r.admin_reject}<tx_id> - Reject a transaction
${r.admin_help} - Show this help`,{parse_mode:"Markdown"}),o.NextResponse.json({ok:!0});if(s===r.admin_stats)return await $(i),o.NextResponse.json({ok:!0});if(s===r.admin_users)return await y(i),o.NextResponse.json({ok:!0});if(s===r.admin_pending)return await k(i),o.NextResponse.json({ok:!0});if(s===(r.admin_games||"/admin_games"))return await b(i),o.NextResponse.json({ok:!0});if(s===r.admin_help)return await f(i,`*🔐 Admin Commands*

${r.admin_stats} - View dashboard stats
${r.admin_users} - List recent users
${r.admin_pending} - View pending transactions
${r.admin_games||"/admin_games"} - View recent matches & winners
${r.admin_approve}<tx_id> - Approve a transaction
${r.admin_reject}<tx_id> - Reject a transaction
${r.admin_help} - Show this help`,{parse_mode:"Markdown"}),o.NextResponse.json({ok:!0});if(s.startsWith("/appoint")){let e="",a=0;if(s.startsWith("/appoint_")){let t=s.split("_");t.length>=3&&(e=t[1],a=Number(t[2]))}else{let t=s.split(" ");t.length>=3&&(e=t[1],a=Number(t[2]))}if(e&&a>0){let{data:t}=await l.from("bot_config").select("commands").eq("id","main").single(),n=t?.commands||{},s=n.appointed_winners||{};s[e]=a,n.appointed_winners=s,await l.from("bot_config").update({commands:n}).eq("id","main"),await f(i,`🎯 *Appointed Winner Recorded*

Game ID: \`${e}\`
Appointed Card: *Card #${a}*

This card will be prioritized to win during live play!`,{parse_mode:"Markdown"})}else await f(i,`❌ *Invalid Command Format*

Use: \`/appoint <gameId> <card_number>\` or click the link from the matches list (e.g., \`/appoint_ABCDEF12_25\`).`,{parse_mode:"Markdown"});return o.NextResponse.json({ok:!0})}if(s.startsWith(r.admin_approve)){let e=s.replace(r.admin_approve,""),{data:a}=await l.from("transactions").select("id").eq("status","pending");if(a){let t=a.find(a=>a.id.startsWith(e));t?await j(i,t.id):await f(i,"Transaction not found.")}return o.NextResponse.json({ok:!0})}if(s.startsWith(r.admin_reject)){let e=s.replace(r.admin_reject,""),{data:a}=await l.from("transactions").select("id").eq("status","pending");if(a){let t=a.find(a=>a.id.startsWith(e));t?await N(i,t.id):await f(i,"Transaction not found.")}}return o.NextResponse.json({ok:!0})}catch(e){return console.error("Admin bot webhook error:",e),o.NextResponse.json({ok:!0,warning:"handled"})}}let D=new i.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/admin/telegram/webhook/route",pathname:"/api/admin/telegram/webhook",filename:"route",bundlePath:"app/api/admin/telegram/webhook/route"},resolvedPagePath:"D:\\HB Technologies\\BINGO\\nilebingo1\\src\\app\\api\\admin\\telegram\\webhook\\route.ts",nextConfigOutput:"standalone",userland:n}),{requestAsyncStorage:A,staticGenerationAsyncStorage:E,serverHooks:I}=D,v="/api/admin/telegram/webhook/route";function C(){return(0,r.patchFetch)({serverHooks:I,staticGenerationAsyncStorage:E})}}};var a=require("../../../../../webpack-runtime.js");a.C(e);var t=e=>a(a.s=e),n=a.X(0,[276,972,370],()=>t(8077));module.exports=n})();