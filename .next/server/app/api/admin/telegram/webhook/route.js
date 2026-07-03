"use strict";(()=>{var e={};e.id=835,e.ids=[835],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},3056:(e,a,t)=>{t.r(a),t.d(a,{originalPathname:()=>I,patchFetch:()=>S,requestAsyncStorage:()=>A,routeModule:()=>E,serverHooks:()=>v,staticGenerationAsyncStorage:()=>R});var n={};t.r(n),t.d(n,{POST:()=>C});var i=t(9303),s=t(8716),r=t(670),o=t(7070),d=t(7933);let m=process.env.ADMIN_BOT_TOKEN||"",p=process.env.ADMIN_CHAT_ID||"",c=process.env.SUPABASE_SERVICE_ROLE_KEY||"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyam9ubWVxdHZmcWtiam5ua2NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MjgyMTUsImV4cCI6MjA5NzEwNDIxNX0.vGW0f8jLjsfN8GZjxHodjyzfxAQCPRSg_YNrQbJVhYQ",l=(0,d.eI)("https://frjonmeqtvfqkbjnnkcd.supabase.co",c),u=`https://api.telegram.org/bot${m}`,_=[{command:"start",description:"Start the admin bot"},{command:"admin_stats",description:"Dashboard statistics"},{command:"admin_users",description:"Recent users list"},{command:"admin_commission",description:"Commission report"},{command:"admin_pending",description:"Pending transactions"},{command:"admin_games",description:"Active matches and winners"},{command:"appoint",description:"Appoint winner: /appoint <gameId> <cardNum> [afterBalls]"},{command:"admin_help",description:"Show all admin commands"}];async function f(){try{await g("setMyCommands",{commands:_})}catch(e){console.error("Admin bot setMyCommands error:",e)}}async function g(e,a={}){try{let t=await fetch(`${u}/${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a),signal:AbortSignal.timeout(1e4)});return await t.json()}catch(a){return console.error(`Admin bot API ${e} error:`,a),{ok:!1}}}async function h(e,a,t={}){return g("sendMessage",{chat_id:e,text:a,...t})}let w={},$=0;async function y(){let e=Date.now();if(w&&e-$<3e4)return w;try{let{data:a}=await l.from("bot_config").select("commands").eq("id","main").single();return w=a?.commands||{admin_stats:"/admin_stats",admin_users:"/admin_users",admin_commission:"/admin_commission",admin_pending:"/admin_pending",admin_games:"/admin_games",admin_help:"/admin_help",admin_approve:"/approve_",admin_reject:"/reject_"},$=e,w}catch{return{admin_stats:"/admin_stats",admin_users:"/admin_users",admin_commission:"/admin_commission",admin_pending:"/admin_pending",admin_games:"/admin_games",admin_help:"/admin_help",admin_approve:"/approve_",admin_reject:"/reject_"}}}async function b(e){let{data:a}=await l.from("profiles").select("id",{count:"exact",head:!0}),{data:t}=await l.from("games").select("id",{count:"exact",head:!0}),{data:n}=await l.from("games").select("id",{count:"exact",head:!0}).eq("status","active"),{data:i}=await l.from("transactions").select("type, amount, status"),s=0,r=0,o=0,d=0,m=0,p=0;if(i)for(let e of i){let a=Number(e.amount)||0;"deposit"===e.type&&"completed"===e.status&&(s+=a),"withdraw"===e.type&&"completed"===e.status&&(r+=a),"bet"===e.type&&(o+=a),"win"===e.type&&(d+=a),"deposit"===e.type&&"pending"===e.status&&m++,"withdraw"===e.type&&"pending"===e.status&&p++}let c=`*📊 Admin Dashboard*

👥 Users: ${a?.length||0}
🎮 Games: ${t?.length||0}
🟢 Active: ${n?.length||0}
💰 Deposits: ${s.toLocaleString()} ETB
💸 Withdrawals: ${r.toLocaleString()} ETB
📈 Revenue: ${(o-d).toLocaleString()} ETB
⏳ Pending Deposits: ${m}
⏳ Pending Withdrawals: ${p}`;await h(e,c,{parse_mode:"Markdown"})}async function T(e){let{data:a}=await l.from("profiles").select("first_name, username, telegram_id, phone, created_at").order("created_at",{ascending:!1}).limit(10);if(!a||0===a.length){await h(e,"No users found.");return}let t=a.map((e,a)=>`${a+1}. ${e.first_name||"Unknown"}${e.username?` (@${e.username})`:""}
   ID: ${e.telegram_id}${e.phone?` | 📞 ${e.phone}`:""}`).join("\n");await h(e,`*👥 Recent Users*

${t}`,{parse_mode:"Markdown"})}async function k(e){let{data:a}=await l.from("transactions").select("*, profiles!inner(first_name, username, phone, telegram_id)").eq("status","pending").order("created_at",{ascending:!1}).limit(20);if(!a||0===a.length){await h(e,"No pending transactions.");return}let t=a.map(e=>{let a=e.profiles||{},t=a.first_name||a.username||"Unknown",n=a.phone?`📞 ${a.phone}`:"",i=a.username?`@${a.username}`:`#${String(a.telegram_id).slice(-4)}`,s=e.details?.bank_name||"-",r=e.reference||"-";return`• *${e.type.toUpperCase()}* | ${Number(e.amount).toLocaleString()} ETB
  👤 ${t} (${i}) ${n}
  🏦 ${s} | 🆔 \`${r}\`
  🆔 \`${e.id.slice(0,8)}...\` | /approve_${e.id.slice(0,8)} | /reject_${e.id.slice(0,8)}`}).join("\n\n");await h(e,`*⏳ Pending Transactions*

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
_No recently completed matches._`,await h(e,n,{parse_mode:"Markdown"})}async function N(e){let{data:a}=await l.from("transactions").select("type, amount, created_at"),t=0,n=0,i=0,s=0,r=new Date;if(r.setHours(0,0,0,0),a)for(let e of a){let a=Number(e.amount)||0,o=new Date(e.created_at)>=r;"bet"===e.type&&(t+=a,o&&(i+=a)),"win"===e.type&&(n+=a,o&&(s+=a))}let o=Math.max(0,t-n),d=Math.max(0,i-s),m=10;try{let{data:e}=await l.from("bot_config").select("commands").eq("id","main").single();e?.commands?.commission&&(m=Number(e.commands.commission))}catch{}let p=`💰 *COMMISSION REPORT*

📊 *Total Commission:* ${o.toLocaleString()} ETB
📅 *Today:* ${d.toLocaleString()} ETB

📈 Total Bets: ${t.toLocaleString()} ETB
🏆 Total Wins: ${n.toLocaleString()} ETB
🔢 Rate: ${m}%`;await h(e,p,{parse_mode:"Markdown"})}async function D(e,a){let{data:t}=await l.from("transactions").select("*, profiles!inner(first_name, username, phone, telegram_id)").eq("id",a).single();if(!t||"pending"!==t.status){await h(e,"Transaction not found or already processed.");return}let n=t.profiles||{},i=Number(t.amount).toLocaleString(),s=t.details?.bank_name||"-",r=t.reference||"-",o=[`*🔄 Confirm Approval*`,"",`*Type:* ${t.type.toUpperCase()}`,`*Amount:* ${i} ETB`,`*Bank:* ${s}`,`*TX ID:* \`${r}\``,`*User:* ${n.first_name||n.username||"Unknown"}`,n.phone?`*Phone:* ${n.phone}`:null,n.username?`*Username:* @${n.username}`:null,`*Telegram ID:* ${n.telegram_id||"N/A"}`,"","Are you sure you want to approve this transaction?"].filter(Boolean).join("\n");await h(e,o,{parse_mode:"Markdown",reply_markup:{inline_keyboard:[[{text:"✅ Approve",callback_data:`confirm_approve_${a}`},{text:"❌ Cancel",callback_data:`confirm_reject_${a}`}]]}})}async function x(e,a){let{data:n}=await l.from("transactions").select("*, profiles!inner(telegram_id, first_name, username)").eq("id",a).single();if(await l.from("transactions").update({status:"failed"}).eq("id",a),n){let e=n.profiles||{},a=n.details?.bank_name||"-",i=n.reference||"-",s=Number(n.amount).toLocaleString(),r="deposit"===n.type?"Deposit":"Withdrawal";if(e.telegram_id)try{await fetch(`https://api.telegram.org/bot${m}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:e.telegram_id,text:`❌ *${r} Rejected*

💰 Amount: *${s} ETB*
🏦 Bank: *${a}*
🆔 TX ID: \`${i}\`

Your ${n.type} has been rejected. Please contact support if you have questions.`,parse_mode:"Markdown"}),signal:AbortSignal.timeout(5e3)})}catch(e){}let o="deposit"===n.type?"deposit_rejected":"withdraw_rejected",d=e.first_name||e.username||"Unknown",p=`❌ *${r.toUpperCase()} REJECTED*

👤 *User:* ${d}
💰 *Amount:* ${s} ETB
🏦 *Bank:* ${a}
🆔 *Reference:* \`${i}\`
🆔 *Tx ID:* \`${n.id.slice(0,8)}...\``;try{let{notifyEvent:e}=await t.e(607).then(t.bind(t,4607));e(o,p)}catch(e){}}await h(e,`❌ Transaction ${a.slice(0,8)} rejected.`)}async function C(e){try{let a=await e.json(),n=a.message||a.callback_query?.message,i=a.callback_query,s=n?.chat?.id||i?.message?.chat?.id;a.message?.from||a.callback_query?.from;let r=a.message?.text||"";if(!s)return o.NextResponse.json({ok:!0});let d=String(s);if(!(p&&d===p)){let{data:e}=await l.from("bot_config").select("commands").eq("id","main").single();if(!(e?.commands?.admin_chat_ids||[]).some(e=>String(e)===d))return await h(s,"\uD83D\uDEAB Access Denied\n\nThis bot is for authorized administrators only."),o.NextResponse.json({ok:!0})}if("/start"===r)return await f(),await h(s,"\uD83D\uDD10 Admin Bot Ready\n\nUse the menu below or type /admin_help for commands:",{reply_markup:{keyboard:[[{text:"\uD83D\uDCCA Stats"},{text:"\uD83D\uDC65 Users"},{text:"\uD83D\uDCB0 Commission"}],[{text:"⏳ Pending"},{text:"\uD83C\uDFAE Matches"}],[{text:"❓ Help"}]],resize_keyboard:!0}}),o.NextResponse.json({ok:!0});let c=await y();if("\uD83D\uDCCA Stats"===r)return await b(s),o.NextResponse.json({ok:!0});if("\uD83D\uDC65 Users"===r)return await T(s),o.NextResponse.json({ok:!0});if("⏳ Pending"===r)return await k(s),o.NextResponse.json({ok:!0});if("\uD83C\uDFAE Matches"===r)return await j(s),o.NextResponse.json({ok:!0});if("\uD83D\uDCB0 Commission"===r)return await N(s),o.NextResponse.json({ok:!0});if("❓ Help"===r)return await h(s,`*🔐 Admin Bot Commands*

${c.admin_stats||"/admin_stats"} - Dashboard stats
${c.admin_users||"/admin_users"} - Recent users
${c.admin_commission||"/admin_commission"} - Commission report
${c.admin_pending||"/admin_pending"} - Pending transactions
${c.admin_games||"/admin_games"} - Matches & winners
/appoint_<gameId>_<cardNum> - Assign winner card
${c.admin_approve}<tx_id> - Approve transaction
${c.admin_reject}<tx_id> - Reject transaction
${c.admin_help||"/admin_help"} - This help`,{parse_mode:"Markdown"}),o.NextResponse.json({ok:!0});if(r===c.admin_stats)return await b(s),o.NextResponse.json({ok:!0});if(r===c.admin_users)return await T(s),o.NextResponse.json({ok:!0});if(r===c.admin_pending)return await k(s),o.NextResponse.json({ok:!0});if(r===(c.admin_games||"/admin_games"))return await j(s),o.NextResponse.json({ok:!0});if(r===(c.admin_commission||"/admin_commission"))return await N(s),o.NextResponse.json({ok:!0});if(r===c.admin_help)return await h(s,`*🔐 Admin Bot Commands*

${c.admin_stats||"/admin_stats"} - Dashboard stats
${c.admin_users||"/admin_users"} - Recent users
${c.admin_commission||"/admin_commission"} - Commission report
${c.admin_pending||"/admin_pending"} - Pending transactions
${c.admin_games||"/admin_games"} - Matches & winners
/appoint_<gameId>_<cardNum> - Assign winner card
${c.admin_approve}<tx_id> - Approve transaction
${c.admin_reject}<tx_id> - Reject transaction
${c.admin_help||"/admin_help"} - This help`,{parse_mode:"Markdown"}),o.NextResponse.json({ok:!0});if(r.startsWith("/appoint")){let e="",a=0,n=20;if(r.startsWith("/appoint_")){let t=r.split("_");t.length>=3&&(e=t[1],a=Number(t[2]),n=t.length>=4&&Number(t[3])||20)}else{let t=r.split(" ");t.length>=3&&(e=t[1],a=Number(t[2]),n=t.length>=4&&Number(t[3])||20)}if(e&&a>0){let{data:i}=await l.from("bot_config").select("commands").eq("id","main").single(),r=i?.commands||{},o=r.appointed_winners||{};o[e]={card_number:a,after_balls:n},r.appointed_winners=o,await l.from("bot_config").update({commands:r}).eq("id","main"),await h(s,`🎯 *Appointed Winner Recorded*

Game ID: \`${e}\`
Appointed Card: *Card #${a}*
Win after: *${n} balls*

This card will be prioritized to win during live play!`,{parse_mode:"Markdown"});try{let{notifyEvent:i}=await t.e(607).then(t.bind(t,4607));i("game_winner_appointed",`🎯 *WINNER APPOINTED*

🆔 Game: \`${e}\`
🎴 Card: *#${a}*
🎱 Win after: *${n} balls*`)}catch(e){}}else await h(s,`❌ *Invalid Command Format*

Use: \`/appoint <gameId> <card_number> [after_balls]\` or click the link from the matches list (e.g., \`/appoint_ABCDEF12_25\`).`,{parse_mode:"Markdown"});return o.NextResponse.json({ok:!0})}if(r.startsWith(c.admin_approve)){let e=r.replace(c.admin_approve,""),{data:a}=await l.from("transactions").select("id").eq("status","pending");if(a){let t=a.find(a=>a.id.startsWith(e));t?await D(s,t.id):await h(s,"Transaction not found.")}return o.NextResponse.json({ok:!0})}if(r.startsWith(c.admin_reject)){let e=r.replace(c.admin_reject,""),{data:a}=await l.from("transactions").select("id").eq("status","pending");if(a){let t=a.find(a=>a.id.startsWith(e));t?await x(s,t.id):await h(s,"Transaction not found.")}return o.NextResponse.json({ok:!0})}if(i?.data){let e=i.data,a=i.message?.message_id;if(e.startsWith("confirm_approve_")){let n=e.replace("confirm_approve_",""),{data:i}=await l.from("transactions").select("*").eq("id",n).single();if(!i||"pending"!==i.status)return await h(s,"Transaction already processed."),o.NextResponse.json({ok:!0});if(await l.from("transactions").update({status:"completed"}).eq("id",n),"deposit"===i.type){let e=await l.rpc("adjust_main_balance",{p_user_id:i.user_id,p_amount:Number(i.amount)});e.error&&console.error("adjust_main_balance error:",e.error)}let r=i.details?.bank_name||"-",d=i.reference||"-",m=Number(i.amount).toLocaleString(),p="deposit"===i.type?"Deposit":"Withdrawal";try{let{data:e}=await l.from("profiles").select("telegram_id, first_name, username").eq("id",i.user_id).single();e?.telegram_id&&await h(e.telegram_id,`✅ *${p} Approved!*

Your ${i.type} of *${m} ETB* via *${r}* (TX ID: \`${d}\`) has been approved and credited to your wallet.`,{parse_mode:"Markdown"})}catch(e){}let c="deposit"===i.type?"deposit_approved":"withdraw_approved",{data:_}=await l.from("profiles").select("first_name, username").eq("id",i.user_id).single(),f=_?.first_name||_?.username||"Unknown",g=`✅ *${p.toUpperCase()} APPROVED*

👤 *User:* ${f}
💰 *Amount:* ${m} ETB
🏦 *Bank:* ${r}
🆔 *Reference:* \`${d}\`
🆔 *Tx ID:* \`${i.id.slice(0,8)}...\``;try{let{notifyEvent:e}=await t.e(607).then(t.bind(t,4607));e(c,g)}catch(e){}try{await fetch(`${u}/editMessageText`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:s,message_id:a,text:`✅ *Transaction Approved*

${i.type.toUpperCase()} ${m} ETB via ${r}
TX ID: \`${d}\`
has been approved.`,parse_mode:"Markdown"})})}catch(e){}return await h(s,`✅ ${i.type.toUpperCase()} ${m} ETB (${r}, TX: \`${d}\`) approved and credited.`),o.NextResponse.json({ok:!0})}if(e.startsWith("confirm_reject_")){let n=e.replace("confirm_reject_",""),{data:i}=await l.from("transactions").select("*, profiles!inner(telegram_id, first_name, username)").eq("id",n).single();await l.from("transactions").update({status:"failed"}).eq("id",n);let r=i?.details?.bank_name||"-",o=i?.reference||"-",d=Number(i?.amount||0).toLocaleString(),p=i?.type==="deposit"?"Deposit":"Withdrawal",c=i?.profiles||{};if(c.telegram_id)try{await fetch(`https://api.telegram.org/bot${m}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:c.telegram_id,text:`❌ *${p} Rejected*

💰 Amount: *${d} ETB*
🏦 Bank: *${r}*
🆔 TX ID: \`${o}\`

Your ${i?.type} has been rejected. Please contact support if you have questions.`,parse_mode:"Markdown"}),signal:AbortSignal.timeout(5e3)})}catch(e){}let _=i?.type==="deposit"?"deposit_rejected":"withdraw_rejected",f=c.first_name||c.username||"Unknown",g=`❌ *${p.toUpperCase()} REJECTED*

👤 *User:* ${f}
💰 *Amount:* ${d} ETB
🏦 *Bank:* ${r}
🆔 *Reference:* \`${o}\`
🆔 *Tx ID:* \`${n.slice(0,8)}...\``;try{let{notifyEvent:e}=await t.e(607).then(t.bind(t,4607));e(_,g)}catch(e){}try{await fetch(`${u}/editMessageText`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:s,message_id:a,text:`❌ *Transaction Rejected*

${i?.type?.toUpperCase()||""} ${d} ETB via ${r}
TX ID: \`${o}\`
has been rejected.`,parse_mode:"Markdown"})})}catch(e){}await h(s,`❌ ${i?.type?.toUpperCase()||""} ${d} ETB (${r}, TX: \`${o}\`) rejected.`)}}return o.NextResponse.json({ok:!0})}catch(e){return console.error("Admin bot webhook error:",e),o.NextResponse.json({ok:!0,warning:"handled"})}}let E=new i.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/admin/telegram/webhook/route",pathname:"/api/admin/telegram/webhook",filename:"route",bundlePath:"app/api/admin/telegram/webhook/route"},resolvedPagePath:"d:\\HB Technologies\\BINGO\\nilebingo1\\src\\app\\api\\admin\\telegram\\webhook\\route.ts",nextConfigOutput:"standalone",userland:n}),{requestAsyncStorage:A,staticGenerationAsyncStorage:R,serverHooks:v}=E,I="/api/admin/telegram/webhook/route";function S(){return(0,r.patchFetch)({serverHooks:v,staticGenerationAsyncStorage:R})}}};var a=require("../../../../../webpack-runtime.js");a.C(e);var t=e=>a(a.s=e),n=a.X(0,[276,972,370],()=>t(3056));module.exports=n})();