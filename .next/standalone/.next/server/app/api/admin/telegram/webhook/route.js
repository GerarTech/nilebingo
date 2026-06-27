"use strict";(()=>{var e={};e.id=835,e.ids=[835],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},8077:(e,a,t)=>{t.r(a),t.d(a,{originalPathname:()=>C,patchFetch:()=>E,requestAsyncStorage:()=>A,routeModule:()=>T,serverHooks:()=>v,staticGenerationAsyncStorage:()=>D});var n={};t.r(n),t.d(n,{POST:()=>x});var i=t(9303),r=t(8716),s=t(670),o=t(7070),d=t(7933);let m=process.env.ADMIN_BOT_TOKEN||"",p=process.env.ADMIN_CHAT_ID||"",c=process.env.SUPABASE_SERVICE_ROLE_KEY||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyam9ubWVxdHZmcWtiam5ua2NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MjgyMTUsImV4cCI6MjA5NzEwNDIxNX0.vGW0f8jLjsfN8GZjxHodjyzfxAQCPRSg_YNrQbJVhYQ",l=(0,d.eI)("https://frjonmeqtvfqkbjnnkcd.supabase.co",c),u=`https://api.telegram.org/bot${m}`;async function _(e,a={}){try{let t=await fetch(`${u}/${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a),signal:AbortSignal.timeout(1e4)});return await t.json()}catch(a){return console.error(`Admin bot API ${e} error:`,a),{ok:!1}}}async function f(e,a,t={}){return _("sendMessage",{chat_id:e,text:a,...t})}let g={},h=0;async function w(){let e=Date.now();if(g&&e-h<3e4)return g;try{let{data:a}=await l.from("bot_config").select("commands").eq("id","main").single();return g=a?.commands||{admin_stats:"/admin_stats",admin_users:"/admin_users",admin_pending:"/admin_pending",admin_games:"/admin_games",admin_help:"/admin_help",admin_approve:"/approve_",admin_reject:"/reject_"},h=e,g}catch{return{admin_stats:"/admin_stats",admin_users:"/admin_users",admin_pending:"/admin_pending",admin_games:"/admin_games",admin_help:"/admin_help",admin_approve:"/approve_",admin_reject:"/reject_"}}}async function $(e){let{data:a}=await l.from("profiles").select("id",{count:"exact",head:!0}),{data:t}=await l.from("games").select("id",{count:"exact",head:!0}),{data:n}=await l.from("games").select("id",{count:"exact",head:!0}).eq("status","active"),{data:i}=await l.from("transactions").select("type, amount, status"),r=0,s=0,o=0,d=0,m=0,p=0;if(i)for(let e of i){let a=Number(e.amount)||0;"deposit"===e.type&&"completed"===e.status&&(r+=a),"withdraw"===e.type&&"completed"===e.status&&(s+=a),"bet"===e.type&&(o+=a),"win"===e.type&&(d+=a),"deposit"===e.type&&"pending"===e.status&&m++,"withdraw"===e.type&&"pending"===e.status&&p++}let c=`*📊 Admin Dashboard*

👥 Users: ${a?.length||0}
🎮 Games: ${t?.length||0}
🟢 Active: ${n?.length||0}
💰 Deposits: ${r.toLocaleString()} ETB
💸 Withdrawals: ${s.toLocaleString()} ETB
📈 Revenue: ${(o-d).toLocaleString()} ETB
⏳ Pending Deposits: ${m}
⏳ Pending Withdrawals: ${p}`;await f(e,c,{parse_mode:"Markdown"})}async function y(e){let{data:a}=await l.from("profiles").select("first_name, username, telegram_id, phone, created_at").order("created_at",{ascending:!1}).limit(10);if(!a||0===a.length){await f(e,"No users found.");return}let t=a.map((e,a)=>`${a+1}. ${e.first_name||"Unknown"}${e.username?` (@${e.username})`:""}
   ID: ${e.telegram_id}${e.phone?` | 📞 ${e.phone}`:""}`).join("\n");await f(e,`*👥 Recent Users*

${t}`,{parse_mode:"Markdown"})}async function b(e){let{data:a}=await l.from("transactions").select("*, profiles!inner(first_name, username)").eq("status","pending").order("created_at",{ascending:!1}).limit(20);if(!a||0===a.length){await f(e,"No pending transactions.");return}let t=a.map(e=>{let a=e.profiles||{},t=a.first_name||a.username||"Unknown",n=a.phone?`📞 ${a.phone}`:"",i=a.username?`@${a.username}`:`#${String(a.telegram_id).slice(-4)}`;return`• *${e.type.toUpperCase()}* | ${Number(e.amount).toLocaleString()} ETB
  👤 ${t} (${i}) ${n}
  🆔 \`${e.id.slice(0,8)}...\` | /approve_${e.id.slice(0,8)} | /reject_${e.id.slice(0,8)}`}).join("\n\n");await f(e,`*⏳ Pending Transactions*

${t}`,{parse_mode:"Markdown"})}async function j(e){let{data:a}=await l.from("games").select("*, game_players(*, profiles(first_name, username))").eq("status","active").order("created_at",{ascending:!1}),{data:t}=await l.from("games").select("*, winner:profiles(first_name, username)").eq("status","finished").order("created_at",{ascending:!1}).limit(10),n=`*🎮 Nile BINGO Matches Board*

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
_No recently completed matches._`,await f(e,n,{parse_mode:"Markdown"})}async function k(e,a){let{data:t}=await l.from("transactions").select("*, profiles!inner(first_name, username, phone, telegram_id)").eq("id",a).single();if(!t||"pending"!==t.status){await f(e,"Transaction not found or already processed.");return}let n=t.profiles||{},i=Number(t.amount).toLocaleString(),r=[`*🔄 Confirm Approval*`,"",`*Type:* ${t.type.toUpperCase()}`,`*Amount:* ${i} ETB`,`*User:* ${n.first_name||n.username||"Unknown"}`,n.phone?`*Phone:* ${n.phone}`:null,n.username?`*Username:* @${n.username}`:null,`*Telegram ID:* ${n.telegram_id||"N/A"}`,"","Are you sure you want to approve this transaction?"].filter(Boolean).join("\n");await f(e,r,{parse_mode:"Markdown",reply_markup:{inline_keyboard:[[{text:"✅ Approve",callback_data:`confirm_approve_${a}`},{text:"❌ Cancel",callback_data:`confirm_reject_${a}`}]]}})}async function N(e,a){await l.from("transactions").update({status:"failed"}).eq("id",a),await f(e,`❌ Transaction ${a.slice(0,8)} rejected.`)}async function x(e){try{let a=await e.json(),t=a.message||a.callback_query?.message,n=a.callback_query,i=t?.chat?.id||n?.message?.chat?.id;a.message?.from||a.callback_query?.from;let r=a.message?.text||"";if(!i)return o.NextResponse.json({ok:!0});let s=String(i);if(!(p&&s===p)){let{data:e}=await l.from("bot_config").select("commands").eq("id","main").single();if(!(e?.commands?.admin_chat_ids||[]).some(e=>String(e)===s))return await f(i,"\uD83D\uDEAB Access Denied\n\nThis bot is for authorized administrators only."),o.NextResponse.json({ok:!0})}if("/start"===r)return await f(i,"\uD83D\uDD10 Admin Bot Ready\n\nUse the menu below or type /admin_help for commands:",{reply_markup:{keyboard:[[{text:"\uD83D\uDCCA Stats"},{text:"\uD83D\uDC65 Users"}],[{text:"⏳ Pending"},{text:"\uD83C\uDFAE Matches"}],[{text:"❓ Help"}]],resize_keyboard:!0}}),o.NextResponse.json({ok:!0});let d=await w();if("\uD83D\uDCCA Stats"===r)return await $(i),o.NextResponse.json({ok:!0});if("\uD83D\uDC65 Users"===r)return await y(i),o.NextResponse.json({ok:!0});if("⏳ Pending"===r)return await b(i),o.NextResponse.json({ok:!0});if("\uD83C\uDFAE Matches"===r)return await j(i),o.NextResponse.json({ok:!0});if("❓ Help"===r)return await f(i,`*🔐 Admin Bot Commands*

${d.admin_stats||"/admin_stats"} - Dashboard stats
${d.admin_users||"/admin_users"} - Recent users
${d.admin_pending||"/admin_pending"} - Pending transactions
${d.admin_games||"/admin_games"} - Matches & winners
/appoint_<gameId>_<cardNum> - Assign winner card
${d.admin_approve}<tx_id> - Approve transaction
${d.admin_reject}<tx_id> - Reject transaction
${d.admin_help||"/admin_help"} - This help`,{parse_mode:"Markdown"}),o.NextResponse.json({ok:!0});if(r===d.admin_stats)return await $(i),o.NextResponse.json({ok:!0});if(r===d.admin_users)return await y(i),o.NextResponse.json({ok:!0});if(r===d.admin_pending)return await b(i),o.NextResponse.json({ok:!0});if(r===(d.admin_games||"/admin_games"))return await j(i),o.NextResponse.json({ok:!0});if(r===d.admin_help)return await f(i,`*🔐 Admin Bot Commands*

${d.admin_stats||"/admin_stats"} - Dashboard stats
${d.admin_users||"/admin_users"} - Recent users
${d.admin_pending||"/admin_pending"} - Pending transactions
${d.admin_games||"/admin_games"} - Matches & winners
/appoint_<gameId>_<cardNum> - Assign winner card
${d.admin_approve}<tx_id> - Approve transaction
${d.admin_reject}<tx_id> - Reject transaction
${d.admin_help||"/admin_help"} - This help`,{parse_mode:"Markdown"}),o.NextResponse.json({ok:!0});if(r.startsWith("/appoint")){let e="",a=0,t=20;if(r.startsWith("/appoint_")){let n=r.split("_");n.length>=3&&(e=n[1],a=Number(n[2]),t=n.length>=4&&Number(n[3])||20)}else{let n=r.split(" ");n.length>=3&&(e=n[1],a=Number(n[2]),t=n.length>=4&&Number(n[3])||20)}if(e&&a>0){let{data:n}=await l.from("bot_config").select("commands").eq("id","main").single(),r=n?.commands||{},s=r.appointed_winners||{};s[e]={card_number:a,after_balls:t},r.appointed_winners=s,await l.from("bot_config").update({commands:r}).eq("id","main"),await f(i,`🎯 *Appointed Winner Recorded*

Game ID: \`${e}\`
Appointed Card: *Card #${a}*
Win after: *${t} balls*

This card will be prioritized to win during live play!`,{parse_mode:"Markdown"})}else await f(i,`❌ *Invalid Command Format*

Use: \`/appoint <gameId> <card_number> [after_balls]\` or click the link from the matches list (e.g., \`/appoint_ABCDEF12_25\`).`,{parse_mode:"Markdown"});return o.NextResponse.json({ok:!0})}if(r.startsWith(d.admin_approve)){let e=r.replace(d.admin_approve,""),{data:a}=await l.from("transactions").select("id").eq("status","pending");if(a){let t=a.find(a=>a.id.startsWith(e));t?await k(i,t.id):await f(i,"Transaction not found.")}return o.NextResponse.json({ok:!0})}if(r.startsWith(d.admin_reject)){let e=r.replace(d.admin_reject,""),{data:a}=await l.from("transactions").select("id").eq("status","pending");if(a){let t=a.find(a=>a.id.startsWith(e));t?await N(i,t.id):await f(i,"Transaction not found.")}return o.NextResponse.json({ok:!0})}if(n?.data){let e=n.data,a=n.message?.message_id;if(e.startsWith("confirm_approve_")){let t=e.replace("confirm_approve_",""),{data:n}=await l.from("transactions").select("*").eq("id",t).single();if(!n||"pending"!==n.status)return await f(i,"Transaction already processed."),o.NextResponse.json({ok:!0});if(await l.from("transactions").update({status:"completed"}).eq("id",t),"deposit"===n.type){let e=await l.rpc("adjust_main_balance",{p_user_id:n.user_id,p_amount:Number(n.amount)});e.error&&console.error("adjust_main_balance error:",e.error)}try{let{data:e}=await l.from("profiles").select("telegram_id").eq("id",n.user_id).single();e?.telegram_id&&await f(e.telegram_id,`✅ *Deposit Approved!*

Your deposit of *${Number(n.amount).toLocaleString()} ETB* has been approved and credited to your wallet.`,{parse_mode:"Markdown"})}catch(e){}try{await fetch(`${u}/editMessageText`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:i,message_id:a,text:`✅ *Transaction Approved*

${n.type.toUpperCase()} ${Number(n.amount).toLocaleString()} ETB has been approved.`,parse_mode:"Markdown"})})}catch(e){}return await f(i,`✅ Transaction ${t.slice(0,8)} approved and credited.`),o.NextResponse.json({ok:!0})}if(e.startsWith("confirm_reject_")){let t=e.replace("confirm_reject_","");await l.from("transactions").update({status:"failed"}).eq("id",t);try{await fetch(`${u}/editMessageText`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:i,message_id:a,text:`❌ *Transaction Rejected*

Transaction ${t.slice(0,8)} has been rejected.`,parse_mode:"Markdown"})})}catch(e){}await f(i,`❌ Transaction ${t.slice(0,8)} rejected.`)}}return o.NextResponse.json({ok:!0})}catch(e){return console.error("Admin bot webhook error:",e),o.NextResponse.json({ok:!0,warning:"handled"})}}let T=new i.AppRouteRouteModule({definition:{kind:r.x.APP_ROUTE,page:"/api/admin/telegram/webhook/route",pathname:"/api/admin/telegram/webhook",filename:"route",bundlePath:"app/api/admin/telegram/webhook/route"},resolvedPagePath:"D:\\HB Technologies\\BINGO\\nilebingo1\\src\\app\\api\\admin\\telegram\\webhook\\route.ts",nextConfigOutput:"standalone",userland:n}),{requestAsyncStorage:A,staticGenerationAsyncStorage:D,serverHooks:v}=T,C="/api/admin/telegram/webhook/route";function E(){return(0,s.patchFetch)({serverHooks:v,staticGenerationAsyncStorage:D})}}};var a=require("../../../../../webpack-runtime.js");a.C(e);var t=e=>a(a.s=e),n=a.X(0,[276,972,370],()=>t(8077));module.exports=n})();