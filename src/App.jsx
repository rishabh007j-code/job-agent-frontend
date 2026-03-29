import { useState, useRef } from "react";

var STEPS = ["Resume","Verify","Preferences","Jobs","Questions","Tailored Resume","Apply"];

var SAMPLE_JOBS = [
  {id:1,title:"Senior Business Analyst",company:"Meesho",location:"Bengaluru",salary:"22-32 LPA",source:"LinkedIn",jd:"Drive data-informed decisions across supply chain. Own dashboards, define KPIs, conduct root cause analysis. 6+ years analytics. Strong SQL, Excel, Tableau or Looker. Stakeholder management experience required."}
];

var BP = {background:"linear-gradient(135deg,#4F46E5,#7C3AED)",color:"#fff",border:"none",borderRadius:10,padding:"11px 22px",fontSize:14,cursor:"pointer",fontWeight:600};
var BS = {background:"#fff",color:"#64748b",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"10px 16px",fontSize:14,cursor:"pointer"};
var IP = {width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,background:"#fff",color:"#1e293b",outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:8};
var CD = {background:"#fff",borderRadius:16,padding:"1.25rem",boxShadow:"0 4px 20px rgba(0,0,0,0.07)",border:"1px solid #e8eaf0",marginBottom:"1rem"};
var LB = {fontSize:12,color:"#64748b",fontWeight:600,display:"block",marginBottom:4};

async function ask(system, user, tokens) {
  var ctrl = new AbortController();
  var t = setTimeout(function() { ctrl.abort(); }, 30000);
  try {
    var res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model:"claude-haiku-4-5-20251001", max_tokens:tokens||800, system:system, messages:[{role:"user",content:user}] })
    });
    clearTimeout(t);
    var d = await res.json();
    if (d.error) throw new Error(d.error.message);
    return (d.content && d.content[0] && d.content[0].text) || "";
  } catch(e) { clearTimeout(t); throw e.name==="AbortError"?new Error("Timed out"):e; }
}

function getJ(raw) {
  var a=raw.indexOf("{"),b=raw.lastIndexOf("}");
  if(a===-1||b===-1)return null;
  try{return JSON.parse(raw.slice(a,b+1));}catch(e){return null;}
}
function getArr(raw) {
  var a=raw.indexOf("["),b=raw.lastIndexOf("]");
  if(a===-1||b===-1)return null;
  try{return JSON.parse(raw.slice(a,b+1));}catch(e){return null;}
}

export default function App() {
  var [step, setStep] = useState(0);
  var [mode, setMode] = useState("paste");
  var [pasteText, setPasteText] = useState("");
  var [manData, setManData] = useState({name:"",email:"",phone:"",location:"",title:"",years:"",summary:"",skills:"",education:""});
  var [manJobs, setManJobs] = useState([]);
  var [manJobEntry, setManJobEntry] = useState({title:"",company:"",duration:"",bullets:""});
  var [profile, setProfile] = useState(null);
  var [prefs, setPrefs] = useState({role:"",location:"Bengaluru",exp:"",salary:""});
  var [customJD, setCustomJD] = useState("");
  var [jobs, setJobs] = useState([]);
  var [sel, setSel] = useState([]);
  var [qs, setQs] = useState({});
  var [ans, setAns] = useState({});
  var [tailored, setTailored] = useState({});
  var [activeJob, setActiveJob] = useState(null);
  var [busy, setBusy] = useState("");
  var [pct, setPct] = useState(0);
  var [secs, setSecs] = useState(0);
  // Cache flags — track what's already been computed
  var [profileDone, setProfileDone] = useState(false);
  var [jobsDone, setJobsDone] = useState(false);
  var [qsDone, setQsDone] = useState({});
  var [tailoredDone, setTailoredDone] = useState({});
  // Rework modal
  var [showRework, setShowRework] = useState(false);
  var [reworkTarget, setReworkTarget] = useState(null);

  var fileRef = useRef();
  var tmrRef = useRef(null), secRef = useRef(null), pctRef = useRef(0);

  function startLoad(msg) {
    pctRef.current=5; setPct(5); setSecs(0); setBusy(msg);
    tmrRef.current=setInterval(function(){pctRef.current=Math.min(pctRef.current+(pctRef.current<60?3:0.5),95);setPct(Math.round(pctRef.current));},500);
    secRef.current=setInterval(function(){setSecs(function(s){return s+1;});},1000);
  }
  function stopLoad() {
    clearInterval(tmrRef.current); clearInterval(secRef.current);
    setBusy(""); setPct(0); setSecs(0);
  }

  // Navigate back — show rework dialog if step has cached data
  function goBack(targetStep) {
    var hasCachedData = false;
    if (targetStep === 0 && profileDone) hasCachedData = true;
    if (targetStep === 2 && jobsDone) hasCachedData = true;
    if (targetStep === 3 && sel.length > 0 && Object.keys(qsDone).length > 0) hasCachedData = true;
    if (targetStep === 4 && Object.keys(tailoredDone).length > 0) hasCachedData = true;
    if (hasCachedData) {
      setReworkTarget(targetStep);
      setShowRework(true);
    } else {
      setStep(targetStep);
    }
  }

  // User chose to keep existing data — just navigate
  function keepAndGo() {
    setShowRework(false);
    setStep(reworkTarget);
  }

  // User chose to redo — clear cache for that step and navigate
  function redoStep() {
    setShowRework(false);
    if (reworkTarget === 0) { setProfileDone(false); setProfile(null); }
    if (reworkTarget === 2) { setJobsDone(false); setJobs([]); setSel([]); }
    if (reworkTarget === 3) { setQsDone({}); setQs({}); setAns({}); }
    if (reworkTarget === 4) { setTailoredDone({}); setTailored({}); }
    setStep(reworkTarget);
  }

  // Parse resume — skip if already done
  async function doParseResume(text) {
    if (profileDone && profile) { setStep(1); return; }
    startLoad("Parsing resume with AI...");
    try {
      var raw = await ask(
        "You are an expert resume parser. Extract ALL information. Return ONLY valid JSON, no markdown, no backticks. Rules: skills must be a flat array. experience must capture every job. bullets must be array of strings. Extract name from first line. Extract email, phone, location even if on same line.",
        "Parse this resume into JSON with keys: name, email, phone, location, current_title, experience_years(number), summary, skills(flat array of ALL skills), education(string), experience(array of {title,company,duration,bullets}).\n\nRESUME:\n" + text.slice(0,4000),
        1500
      );
      var p = getJ(raw);
      if (!p) throw new Error("Could not parse. Please try again.");
      if (!Array.isArray(p.skills)) p.skills = [];
      if (!Array.isArray(p.experience)) p.experience = [];
      setProfile(p);
      setProfileDone(true);
      stopLoad();
      setStep(1);
    } catch(e) { stopLoad(); alert("Parse error: " + e.message); }
  }

  async function doUpload(file) {
    try { var text = await file.text(); await doParseResume(text); }
    catch(e) { alert("Could not read file. Please paste text instead."); }
  }

  function doManualBuild() {
    if (!manData.name) { alert("Enter your name."); return; }
    if (!manData.title) { alert("Enter your job title."); return; }
    var p = {
      name: manData.name,
      email: manData.email,
      phone: manData.phone,
      location: manData.location,
      current_title: manData.title,
      experience_years: parseInt(manData.years) || 0,
      summary: manData.summary,
      skills: manData.skills ? manData.skills.split(",").map(function(s){return s.trim();}).filter(Boolean) : [],
      education: manData.education,
      experience: manJobs.map(function(j) {
        return {
          title: j.title,
          company: j.company,
          duration: j.duration,
          bullets: j.bullets ? j.bullets.split("\n").filter(Boolean) : []
        };
      })
    };
    setProfile(p);
    setProfileDone(true);
    setStep(1);
  }

  // Find + score jobs — skip if already done
  async function doFindJobs() {
    if (jobsDone && jobs.length > 0) { setStep(3); return; }
    startLoad("Scoring jobs with AI...");
    try {
      var allJobs = SAMPLE_JOBS.slice();
      if (customJD.trim()) {
        try {
          var cRaw = await ask("Extract job details. Return ONLY JSON: {title,company,location,salary,jd}","Extract from:\n"+customJD.slice(0,1000),300);
          var cJob = getJ(cRaw);
          allJobs.push({id:"custom",title:cJob?cJob.title||"Custom Role":"Custom Role",company:cJob?cJob.company||"Company":"Company",location:cJob?cJob.location||prefs.location:prefs.location,salary:cJob?cJob.salary||"":"",source:"Custom",jd:cJob?cJob.jd||customJD.slice(0,300):customJD.slice(0,300)});
        } catch(e) {
          allJobs.push({id:"custom",title:"Custom Role",company:"Your Target",location:prefs.location,salary:"",source:"Custom",jd:customJD.slice(0,300)});
        }
      }
      // Batch score all jobs in ONE API call
      var ctx = "Candidate: "+profile.current_title+", "+(profile.experience_years||0)+" yrs exp. Skills: "+(profile.skills||[]).slice(0,12).join(", ")+". Summary: "+(profile.summary||"").slice(0,200);
      var jobList = allJobs.map(function(j,i){return (i+1)+". "+j.title+" at "+j.company+": "+j.jd;}).join("\n\n");
      var raw = await ask(
        "You are a recruiter scoring candidate-job fit. Return ONLY a JSON array, no markdown.",
        "Score each job for this candidate. Return a JSON array with one object per job in the same order: [{score(0-100), reasons:[string,string], gap:string or null}]\n\nCANDIDATE:\n"+ctx+"\n\nJOBS:\n"+jobList,
        600
      );
      var scores = getArr(raw) || [];
      var scored = allJobs.map(function(j,i){
        var s = scores[i] || {score:55,reasons:["Profile reviewed","Partial match"],gap:null};
        return Object.assign({},j,{score:Math.min(100,Math.max(0,Number(s.score)||55)),reasons:Array.isArray(s.reasons)?s.reasons:[],gap:s.gap||null});
      });
      scored.sort(function(a,b){return b.score-a.score;});
      setJobs(scored);
      setJobsDone(true);
      stopLoad();
      setStep(3);
    } catch(e) { stopLoad(); alert("Error: "+e.message); }
  }

  // Generate AI questions based on resume + JD — skip if already done for that job
  async function doGenQs() {
    if (!sel.length) { alert("Select at least one job."); return; }
    var allDone = sel.every(function(id){ return qsDone[id]; });
    if (allDone) { setActiveJob(sel[0]); setStep(4); return; }
    startLoad("Generating personalised questions...");
    try {
      var result = Object.assign({}, qs);
      var doneCopy = Object.assign({}, qsDone);
      for (var i=0;i<sel.length;i++) {
        var id = sel[i];
        if (qsDone[id]) continue; // skip if already generated
        var job = null;
        for (var j=0;j<jobs.length;j++){if(jobs[j].id===id){job=jobs[j];break;}}
        if (!job) continue;
        var raw = await ask(
          "You are an expert career coach. Generate targeted questions to extract the best information from the candidate to tailor their resume for this specific job. Return ONLY a JSON array of 5 question strings. No markdown.",
          "Generate 5 specific questions to ask this candidate that will help tailor their resume for the job.\n\nFocus on:\n- Quantifiable achievements missing from resume that match JD requirements\n- Specific tools/technologies mentioned in JD but not clearly in resume\n- Leadership or team size relevant to the role\n- Domain-specific experience gaps identified in the JD\n- Any unique differentiators that could strengthen the application\n\nCANDIDATE PROFILE:\nTitle: "+profile.current_title+"\nYears: "+(profile.experience_years||0)+"\nSkills: "+(profile.skills||[]).join(", ")+"\nSummary: "+(profile.summary||"").slice(0,300)+"\nExperience: "+JSON.stringify((profile.experience||[]).slice(0,2))+"\n\nTARGET JOB:\n"+job.title+" at "+job.company+"\nJD: "+job.jd+"\n\nGap identified: "+(job.gap||"none"),
          500
        );
        var arr = getArr(raw);
        result[id] = Array.isArray(arr)&&arr.length ? arr.slice(0,5) : [
          "What is your biggest quantifiable achievement relevant to this role?",
          "Which specific tools from the JD have you used and at what scale?",
          "How many people did you directly manage or mentor?",
          "What domain expertise do you have relevant to "+job.company+"?",
          "Any certifications or projects directly relevant to this role?"
        ];
        doneCopy[id] = true;
      }
      setQs(result);
      setQsDone(doneCopy);
      setActiveJob(sel[0]);
      stopLoad();
      setStep(4);
    } catch(e) { stopLoad(); alert("Error: "+e.message); }
  }

  // Build tailored resume — skip if already done for that job
  async function doBuild() {
    var allDone = sel.every(function(id){ return tailoredDone[id]; });
    if (allDone) { setActiveJob(sel[0]); setStep(5); return; }
    startLoad("Building ATS-optimised resume...");
    try {
      var result = Object.assign({}, tailored);
      var doneCopy = Object.assign({}, tailoredDone);
      for (var i=0;i<sel.length;i++) {
        var id = sel[i];
        if (tailoredDone[id]) continue; // skip if already built
        var job = null;
        for (var j=0;j<jobs.length;j++){if(jobs[j].id===id){job=jobs[j];break;}}
        if (!job) continue;
        var extras = "";
        var qList=qs[id]||[], aList=ans[id]||{};
        for (var q=0;q<qList.length;q++){var a=aList[q]||"";if(a.trim())extras+="\n- "+qList[q]+": "+a;}
        var td = null;
        try {
          var raw = await ask(
            "You are an expert ATS resume writer. Tailor the resume to maximise keyword match with the JD. Return ONLY a JSON object, no markdown.",
            "CANDIDATE:\nName: "+profile.name+"\nTitle: "+profile.current_title+"\nYears: "+(profile.experience_years||0)+"\nSkills: "+(profile.skills||[]).join(", ")+"\nSummary: "+(profile.summary||"")+"\nExperience: "+JSON.stringify((profile.experience||[]).slice(0,3))+"\nEducation: "+(profile.education||"")+(extras?"\n\nADDITIONAL INFO FROM CANDIDATE:"+extras:"")+"\n\nTARGET JOB:\n"+job.title+" at "+job.company+"\nJD: "+job.jd+"\n\nReturn JSON with keys: tailored_title, tailored_summary(3-4 sentences keyword-rich), tailored_experience(array of {title,company,duration,bullets} with achievement-focused ATS-optimised bullets), keywords_added(array), ats_score_estimate(0-100), ats_tips(array of 3 tips), cover_letter(3 paragraph professional letter)",
            2000
          );
          td = getJ(raw);
        } catch(e) {}
        result[id] = {
          tailored_title:(td&&td.tailored_title)||job.title,
          tailored_summary:(td&&td.tailored_summary)||"Experienced "+profile.current_title+" with "+(profile.experience_years||0)+" years applying for "+job.title+" at "+job.company+".",
          tailored_experience:(td&&Array.isArray(td.tailored_experience)&&td.tailored_experience.length)?td.tailored_experience:(profile.experience||[]),
          keywords_added:(td&&Array.isArray(td.keywords_added))?td.keywords_added:[],
          ats_score_estimate:(td&&td.ats_score_estimate)||70,
          ats_tips:(td&&Array.isArray(td.ats_tips))?td.ats_tips:["Add keywords from JD","Quantify achievements","Match job title exactly"],
          cover_letter:(td&&td.cover_letter)||"Dear Hiring Manager,\n\nI am excited to apply for the "+job.title+" role at "+job.company+". With "+(profile.experience_years||0)+" years as "+profile.current_title+", I bring strong expertise aligned with your requirements.\n\nI am confident I would be a strong fit for this role.\n\nBest regards,\n"+profile.name
        };
        doneCopy[id] = true;
      }
      setTailored(result);
      setTailoredDone(doneCopy);
      setActiveJob(sel[0]);
      stopLoad();
      setStep(5);
    } catch(e) { stopLoad(); alert("Error: "+e.message); }
  }

  function doDownload(id) {
    var td=tailored[id]; if(!td||!profile)return;
    var job=null;for(var i=0;i<jobs.length;i++){if(jobs[i].id===id){job=jobs[i];break;}}
    var skills=(profile.skills||[]).slice(),kwMap={},kws=td.keywords_added||[];
    for(var i=0;i<kws.length;i++){kwMap[kws[i].toLowerCase()]=1;var found=false;for(var j=0;j<skills.length;j++){if(skills[j].toLowerCase()===kws[i].toLowerCase()){found=true;break;}}if(!found)skills.push(kws[i]);}
    var exp=(td.tailored_experience&&td.tailored_experience.length)?td.tailored_experience:(profile.experience||[]);
    var sH="";for(var i=0;i<skills.length;i++){var kw=kwMap[skills[i].toLowerCase()];sH+="<span style='display:inline-block;padding:3px 10px;margin:2px;border-radius:4px;font-size:12px;background:"+(kw?"#dbeafe":"#f1f5f9")+";color:"+(kw?"#1e40af":"#334155")+";border:1px solid "+(kw?"#93c5fd":"#e2e8f0")+"'>"+skills[i]+"</span>";}
    var eH="";for(var i=0;i<exp.length;i++){var e=exp[i],bl="";for(var j=0;j<(e.bullets||[]).length;j++)bl+="<li style='margin-bottom:4px;font-size:13px;line-height:1.6'>"+e.bullets[j]+"</li>";eH+="<div style='margin-bottom:16px'><div style='display:flex;justify-content:space-between'><strong>"+( e.title||"")+"</strong><span style='font-size:12px;color:#888'>"+(e.duration||"")+"</span></div><div style='font-size:13px;color:#6d28d9;margin:2px 0 6px'>"+(e.company||"")+"</div>"+(bl?"<ul style='padding-left:16px;margin:0'>"+bl+"</ul>":"")+"</div>";}
    var html="<!DOCTYPE html><html><head><meta charset='utf-8'><title>"+profile.name+"</title><style>body{font-family:Arial,sans-serif;max-width:750px;margin:40px auto;padding:0 32px;color:#1e293b}h2{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1.5px solid #e2e8f0;padding-bottom:4px;margin:18px 0 10px;color:#1d4ed8}@media print{body{margin:0}}</style></head><body><div style='text-align:center;padding-bottom:14px;border-bottom:2px solid #1d4ed8;margin-bottom:16px'><h1 style='font-size:22px;margin:0 0 4px'>"+profile.name+"</h1><div style='font-size:13px;color:#6d28d9;font-weight:600;margin-bottom:4px'>"+(td.tailored_title||profile.current_title)+"</div><div style='font-size:12px;color:#64748b'>"+[profile.email,profile.phone,profile.location].filter(Boolean).join("  |  ")+"</div></div>"+(td.tailored_summary?"<h2>Professional Summary</h2><p style='margin:0;line-height:1.75;font-size:13px'>"+td.tailored_summary+"</p>":"")+(skills.length?"<h2>Core Competencies</h2><div>"+sH+"</div>":"")+(exp.length?"<h2>Work Experience</h2>"+eH:"")+(profile.education?"<h2>Education</h2><div style='font-size:13px'>"+profile.education+"</div>":"")+"</body></html>";
    var w=window.open("","_blank");if(!w){alert("Allow pop-ups then retry.");return;}
    w.document.open();w.document.write(html);w.document.close();
    w.onload=function(){w.focus();w.print();};
  }

  var sc=function(s){return s>=80?"#059669":s>=60?"#D97706":"#DC2626";};
  var sb=function(s){return s>=80?"#ecfdf5":s>=60?"#fffbeb":"#fef2f2";};

  function Tabs() {
    return(
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1rem"}}>
        {sel.map(function(id){
          var job=null;for(var i=0;i<jobs.length;i++){if(jobs[i].id===id){job=jobs[i];break;}}
          var active=id===activeJob;
          return <button key={id} onClick={function(){setActiveJob(id);}} style={{padding:"6px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontWeight:active?700:400,background:active?"linear-gradient(135deg,#4F46E5,#7C3AED)":"#f1f5f9",color:active?"#fff":"#64748b",border:"none"}}>{job?job.company:id}</button>;
        })}
      </div>
    );
  }

  function Preview(props) {
    var id=props.id,td=tailored[id],p=profile;
    if(!td||!p)return null;
    var skills=(p.skills||[]).slice(),kwMap={},kws=td.keywords_added||[];
    for(var i=0;i<kws.length;i++){kwMap[kws[i].toLowerCase()]=1;var found=false;for(var j=0;j<skills.length;j++){if(skills[j].toLowerCase()===kws[i].toLowerCase()){found=true;break;}}if(!found)skills.push(kws[i]);}
    var exp=(td.tailored_experience&&td.tailored_experience.length)?td.tailored_experience:(p.experience||[]);
    return(
      <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:"1.25rem",marginBottom:"1rem"}}>
        <div style={{textAlign:"center",paddingBottom:12,borderBottom:"1px solid #f1f5f9",marginBottom:12}}>
          <div style={{fontSize:20,fontWeight:700}}>{p.name}</div>
          <div style={{fontSize:13,color:"#6d28d9",fontWeight:600}}>{td.tailored_title||p.current_title}</div>
          <div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{[p.email,p.phone,p.location].filter(Boolean).join(" · ")}</div>
          {td.ats_score_estimate&&<div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:6,background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:20,padding:"3px 12px"}}><span style={{fontSize:11,fontWeight:700,color:"#059669"}}>ATS Score</span><span style={{fontSize:14,fontWeight:800,color:"#059669"}}>{td.ats_score_estimate}%</span></div>}
        </div>
        {td.tailored_summary&&<div style={{marginBottom:10}}><div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#4F46E5",marginBottom:4}}>PROFESSIONAL SUMMARY</div><p style={{margin:0,fontSize:13,lineHeight:1.75}}>{td.tailored_summary}</p></div>}
        {skills.length>0&&<div style={{marginBottom:10}}><div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#4F46E5",marginBottom:4}}>CORE COMPETENCIES</div><div>{skills.map(function(s,i){var kw=kwMap[s.toLowerCase()];return <span key={i} style={{display:"inline-block",padding:"2px 10px",margin:2,borderRadius:20,fontSize:12,background:kw?"#dbeafe":"#f1f5f9",color:kw?"#1d4ed8":"#334155",border:"1px solid "+(kw?"#93c5fd":"#e2e8f0"),fontWeight:kw?600:400}}>{s}</span>;})}</div><div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>Blue = keywords matched from JD</div></div>}
        {exp.length>0&&<div style={{marginBottom:10}}><div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#4F46E5",marginBottom:6}}>WORK EXPERIENCE</div>{exp.map(function(e,i){return(<div key={i} style={{marginBottom:12,paddingLeft:10,borderLeft:"2px solid #c7d2fe"}}><div style={{display:"flex",justifyContent:"space-between"}}><strong style={{fontSize:13}}>{e.title}</strong><span style={{fontSize:11,color:"#94a3b8"}}>{e.duration}</span></div><div style={{fontSize:12,color:"#6d28d9",marginBottom:4}}>{e.company}</div>{(e.bullets||[]).map(function(b,j){return <div key={j} style={{fontSize:12,paddingLeft:10,lineHeight:1.65,marginBottom:2,position:"relative"}}><span style={{position:"absolute",left:0,color:"#4F46E5"}}>•</span>{b}</div>;})}</div>);})}</div>}
        {p.education&&<div><div style={{fontSize:10,fontWeight:700,letterSpacing:1,color:"#4F46E5",marginBottom:4}}>EDUCATION</div><div style={{fontSize:13}}>{p.education}</div></div>}
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#EEF2FF,#F5F3FF,#ECFDF5)",padding:"1.5rem 1rem",fontFamily:"system-ui,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}input:focus,textarea:focus{border-color:#4F46E5!important;outline:none}`}</style>
      <div style={{maxWidth:680,margin:"0 auto"}}>

        {/* Rework Modal */}
        {showRework&&(
          <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
            <div style={{background:"#fff",borderRadius:16,padding:"1.75rem",maxWidth:380,width:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
              <div style={{fontSize:28,textAlign:"center",marginBottom:12}}>🔄</div>
              <div style={{fontWeight:700,fontSize:16,textAlign:"center",marginBottom:8}}>You already have data here</div>
              <div style={{fontSize:13,color:"#64748b",textAlign:"center",marginBottom:"1.5rem",lineHeight:1.6}}>Do you want to keep your existing results and go back, or redo this step with a fresh AI call?</div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={keepAndGo} style={{...BP,flex:1,background:"linear-gradient(135deg,#059669,#0891b2)"}}>Keep & Go Back</button>
                <button onClick={redoStep} style={{...BS,flex:1,color:"#DC2626",borderColor:"#fca5a5"}}>Redo Step</button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{textAlign:"center",marginBottom:"1.25rem"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#4F46E5,#7C3AED)",padding:"8px 22px",borderRadius:50,marginBottom:8}}>
            <span style={{fontSize:16}}>🤖</span>
            <span style={{color:"#fff",fontWeight:700,fontSize:15}}>AI Job Application Agent</span>
          </div>
          <div style={{fontSize:12,color:"#64748b"}}>Tailored resumes for every job, in minutes</div>
        </div>

        {/* Step bar */}
        <div style={{...CD,padding:"0.75rem 1rem",marginBottom:"1rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",flexWrap:"wrap",gap:3}}>
            {STEPS.map(function(s,i){
              var done=i<step,active=i===step;
              return(
                <div key={i} style={{display:"flex",alignItems:"center",gap:3}}>
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    <div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,background:done?"#059669":active?"linear-gradient(135deg,#4F46E5,#7C3AED)":"#f1f5f9",color:done||active?"#fff":"#94a3b8"}}>{done?"✓":i+1}</div>
                    <span style={{fontSize:12,fontWeight:active?700:400,color:active?"#4F46E5":done?"#059669":"#94a3b8"}}>{s}</span>
                  </div>
                  {i<STEPS.length-1&&<span style={{color:"#cbd5e1",fontSize:11,margin:"0 2px"}}>›</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Loader */}
        {busy&&(
          <div style={{...CD,padding:"1rem",background:"rgba(79,70,229,0.05)",marginBottom:"1rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:16,height:16,borderRadius:"50%",border:"2.5px solid #4F46E5",borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>
                <span style={{fontSize:13,fontWeight:600,color:"#4F46E5"}}>{busy}{secs>15?" — almost done...":""}</span>
              </div>
              <div style={{display:"flex",gap:8}}>
                <span style={{fontSize:12,color:"#7C3AED",background:"rgba(124,58,237,0.1)",padding:"2px 10px",borderRadius:20}}>⏱ {secs}s</span>
                <span style={{fontSize:12,fontWeight:700,color:"#4F46E5"}}>{pct}%</span>
              </div>
            </div>
            <div style={{background:"#e2e8f0",borderRadius:10,height:7,overflow:"hidden"}}>
              <div style={{height:7,borderRadius:10,background:"linear-gradient(90deg,#4F46E5,#7C3AED)",width:pct+"%",transition:"width 0.4s"}}/>
            </div>
          </div>
        )}

        {/* STEP 0 */}
        {step===0&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>📋 Add Your Resume</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>AI will parse all details automatically</div>
            {profileDone&&profile&&(
              <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><span style={{fontSize:12,fontWeight:700,color:"#059669"}}>✓ Resume already parsed</span><span style={{fontSize:12,color:"#64748b",marginLeft:8}}>{profile.name} · {profile.current_title}</span></div>
                <button onClick={function(){setStep(1);}} style={{...BP,padding:"6px 14px",fontSize:12}}>Continue →</button>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:"1.25rem"}}>
              {[{m:"paste",icon:"📋",label:"Paste Text",sub:"Copy-paste"},{m:"upload",icon:"📄",label:"Upload File",sub:"TXT / DOCX"},{m:"manual",icon:"✏️",label:"Manual Entry",sub:"Fill form"}].map(function(o){
                var a=mode===o.m;
                return(
                  <div key={o.m} onClick={function(){setMode(o.m);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"0.875rem 0.5rem",borderRadius:12,border:"2px solid "+(a?"#4F46E5":"#e2e8f0"),cursor:"pointer",background:a?"rgba(79,70,229,0.05)":"#fafafa",textAlign:"center"}}>
                    <div style={{width:40,height:40,borderRadius:10,background:a?"linear-gradient(135deg,#4F46E5,#7C3AED)":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{o.icon}</div>
                    <div style={{fontWeight:a?700:600,fontSize:13,color:a?"#4F46E5":"#334155"}}>{o.label}</div>
                    <div style={{fontSize:11,color:"#94a3b8"}}>{o.sub}</div>
                  </div>
                );
              })}
            </div>
            {mode==="paste"&&(
              <div style={{background:"#f8fafc",borderRadius:12,padding:"1rem",border:"1px solid #e2e8f0"}}>
                <label style={LB}>Paste your complete resume text</label>
                <textarea value={pasteText} onChange={function(e){setPasteText(e.target.value);}} rows={10} placeholder={"Paste your full resume here...\n\nInclude: contact info, summary, work experience, skills, education"} style={{...IP,resize:"vertical",marginBottom:"0.75rem"}}/>
                <button onClick={function(){if(!pasteText.trim()){alert("Paste your resume first.");return;}doParseResume(pasteText);}} style={{...BP,width:"100%"}}>Parse with AI →</button>
              </div>
            )}
            {mode==="upload"&&(
              <div style={{background:"#f8fafc",borderRadius:12,padding:"1rem",border:"1px solid #e2e8f0"}}>
                <div onClick={function(){fileRef.current.click();}} style={{border:"2px dashed #c7d2fe",borderRadius:10,padding:"2rem",textAlign:"center",cursor:"pointer",background:"#fff"}}>
                  <input ref={fileRef} type="file" accept=".pdf,.txt,.docx,.doc" style={{display:"none"}} onChange={async function(e){
                    var f = e.target.files[0]; if(!f) return;
                    var name = f.name.toLowerCase();
                    if (name.endsWith(".pdf")) {
                      // PDF — send to backend for extraction
                      startLoad("Extracting PDF text...");
                      try {
                        var formData = new FormData();
                        formData.append("resume", f);
                    var API_BASE = (typeof window !== "undefined" && window.__VITE_API_URL__) ? window.__VITE_API_URL__ : "";
                        var res = await fetch(API_BASE + "/api/extract-pdf", { method:"POST", body:formData });
                        var d = await res.json();
                        stopLoad();
                        if (d.text && d.text.trim()) {
                          await doParseResume(d.text);
                        } else {
                          alert("Could not extract text from PDF. Please paste your resume text instead.");
                        }
                      } catch(err) {
                        stopLoad();
                        alert("PDF upload failed. Please paste your resume text instead.");
                      }
                    } else {
                      // TXT / DOCX — read directly
                      try {
                        var text = await f.text();
                        await doParseResume(text);
                      } catch(err) {
                        alert("Could not read file. Please paste your resume text instead.");
                      }
                    }
                  }}/>
                  <div style={{fontSize:32,marginBottom:8}}>📁</div>
                  <div style={{fontWeight:600,color:"#4F46E5",fontSize:14}}>Click to upload resume</div>
                  <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>PDF, TXT or DOCX supported</div>
                </div>
              </div>
            )}
            {mode==="manual"&&(
              <div style={{background:"#f8fafc",borderRadius:12,padding:"1rem",border:"1px solid #e2e8f0"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
                  {[["name","👤 Full Name"],["email","📧 Email"],["phone","📱 Phone"],["location","📍 City"],["title","💼 Current Title"],["years","📅 Years Exp"]].map(function(pair){
                    return(<div key={pair[0]}><label style={LB}>{pair[1]}</label><input value={manData[pair[0]]} onChange={function(e){var v=e.target.value;setManData(function(p){var n=Object.assign({},p);n[pair[0]]=v;return n;});}} style={{...IP,marginBottom:0}}/></div>);
                  })}
                </div>
                <label style={LB}>📝 Summary</label>
                <textarea value={manData.summary} onChange={function(e){setManData(function(p){return Object.assign({},p,{summary:e.target.value});});}} rows={2} placeholder="Brief professional summary..." style={{...IP,resize:"vertical"}}/>
                <label style={LB}>⚡ Skills (comma separated)</label>
                <input value={manData.skills} onChange={function(e){setManData(function(p){return Object.assign({},p,{skills:e.target.value});});}} placeholder="SQL, Python, Excel, Tableau..." style={IP}/>
                <label style={LB}>🎓 Education</label>
                <input value={manData.education} onChange={function(e){setManData(function(p){return Object.assign({},p,{education:e.target.value});});}} placeholder="MBA – IIM Bangalore, 2018" style={IP}/>
                <div style={{borderTop:"1px dashed #e2e8f0",paddingTop:"0.875rem",marginTop:4}}>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:8}}>💼 Work Experience</div>
                  {manJobs.map(function(j,i){return(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0.75rem",background:"rgba(79,70,229,0.05)",borderRadius:8,marginBottom:6,border:"1px solid rgba(79,70,229,0.15)"}}><div><div style={{fontWeight:600,fontSize:13}}>{j.title} @ {j.company}</div><div style={{fontSize:12,color:"#64748b"}}>{j.duration}</div></div><button onClick={function(){setManJobs(function(p){return p.filter(function(_,x){return x!==i;});});}} style={{background:"#fee2e2",border:"none",color:"#dc2626",borderRadius:6,padding:"3px 9px",cursor:"pointer"}}>✕</button></div>);})}
                  <div style={{background:"#fff",borderRadius:10,padding:"0.875rem",border:"1.5px dashed #c7d2fe",marginBottom:"1rem"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      {[["title","Job Title"],["company","Company"],["duration","Duration"]].map(function(pair){return(<div key={pair[0]} style={pair[0]==="duration"?{gridColumn:"1/-1"}:{}}><input value={manJobEntry[pair[0]]} onChange={function(e){var v=e.target.value;setManJobEntry(function(p){var n=Object.assign({},p);n[pair[0]]=v;return n;});}} placeholder={pair[1]} style={{...IP,marginBottom:0}}/></div>);})}
                    </div>
                    <textarea value={manJobEntry.bullets} onChange={function(e){setManJobEntry(function(p){return Object.assign({},p,{bullets:e.target.value});});}} rows={3} placeholder="Key achievements (one per line)" style={{...IP,resize:"vertical",marginBottom:8}}/>
                    <button onClick={function(){if(!manJobEntry.title||!manJobEntry.company){alert("Fill title and company.");return;}setManJobs(function(p){return p.concat([Object.assign({},manJobEntry)]);});setManJobEntry({title:"",company:"",duration:"",bullets:"" });}} style={BP}>+ Add Role</button>
                  </div>
                </div>
                <button onClick={doManualBuild} style={{...BP,width:"100%"}}>Continue →</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 1 */}
        {step===1&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>✅ Verify Profile</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>Review and edit your details before continuing</div>
            {profile&&(
              <div>
                {/* Editable contact fields */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:"1rem"}}>
                  {[["👤 Name","name"],["💼 Current Title","current_title"],["📅 Years of Experience","experience_years"],["📍 Location","location"],["📧 Email","email"],["📱 Phone","phone"]].map(function(pair){
                    return(
                      <div key={pair[1]} style={{background:"#f8fafc",borderRadius:8,padding:"0.5rem 0.75rem",border:"1px solid #e2e8f0"}}>
                        <div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>{pair[0]}</div>
                        <input value={profile[pair[1]]||""} onChange={function(e){var v=e.target.value;setProfile(function(p){var n=Object.assign({},p);n[pair[1]]=v;return n;});}} style={{width:"100%",fontSize:13,fontWeight:600,border:"none",background:"transparent",outline:"none",color:"#1e293b",padding:0,fontFamily:"inherit"}}/>
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                <div style={{marginBottom:"1rem"}}>
                  <label style={{fontSize:10,fontWeight:700,color:"#4F46E5",display:"block",marginBottom:5}}>📝 SUMMARY</label>
                  <textarea value={profile.summary||""} onChange={function(e){setProfile(function(p){return Object.assign({},p,{summary:e.target.value});});}} rows={3} placeholder="Add a professional summary..." style={{...IP,marginBottom:0,fontSize:13,resize:"vertical"}}/>
                </div>

                {/* Skills */}
                <div style={{background:"rgba(79,70,229,0.04)",borderRadius:8,padding:"0.75rem",marginBottom:"1rem",border:"1px solid rgba(79,70,229,0.12)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#4F46E5",marginBottom:6}}>⚡ SKILLS</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                    {(profile.skills||[]).map(function(s,i){
                      return(
                        <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 10px",borderRadius:20,fontSize:12,background:"#fff",border:"1px solid #e2e8f0"}}>
                          {s}
                          <span onClick={function(){setProfile(function(p){return Object.assign({},p,{skills:p.skills.filter(function(_,x){return x!==i;})});});}} style={{cursor:"pointer",color:"#dc2626",fontWeight:700,fontSize:13,lineHeight:1}}>×</span>
                        </span>
                      );
                    })}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <input id="skill-input" placeholder="Add skill and press Enter" style={{...IP,marginBottom:0,fontSize:12,flex:1}}
                      onKeyDown={function(e){
                        if(e.key==="Enter"){
                          var v=e.target.value.trim();
                          if(v){setProfile(function(p){return Object.assign({},p,{skills:(p.skills||[]).concat([v])});});e.target.value="";}
                        }
                      }}/>
                    <button onClick={function(){
                      var inp=document.getElementById("skill-input");
                      var v=inp.value.trim();
                      if(v){setProfile(function(p){return Object.assign({},p,{skills:(p.skills||[]).concat([v])});});inp.value="";}
                    }} style={{...BP,padding:"8px 14px",fontSize:12}}>+ Add</button>
                  </div>
                </div>

                {/* Education */}
                <div style={{background:"rgba(5,150,105,0.04)",borderRadius:8,padding:"0.75rem",marginBottom:"1rem",border:"1px solid rgba(5,150,105,0.12)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#059669",marginBottom:5}}>🎓 EDUCATION</div>
                  <input value={profile.education||""} onChange={function(e){setProfile(function(p){return Object.assign({},p,{education:e.target.value});});}} placeholder="e.g. MBA – IIM Bangalore, 2018 | CGPA 8.5" style={{...IP,marginBottom:0,fontSize:13}}/>
                </div>

                {/* Experience */}
                <div style={{marginBottom:"1rem"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#4F46E5",marginBottom:6}}>💼 EXPERIENCE</div>
                  {(profile.experience||[]).map(function(e,i){
                    return(
                      <div key={i} style={{background:"#f8fafc",borderRadius:8,marginBottom:8,border:"1px solid #e2e8f0",overflow:"hidden"}}>
                        <div style={{padding:"0.5rem 0.75rem",borderBottom:"1px solid #e2e8f0",display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                          <input value={e.title||""} onChange={function(ev){var v=ev.target.value;setProfile(function(p){var exp=p.experience.slice();exp[i]=Object.assign({},exp[i],{title:v});return Object.assign({},p,{experience:exp});});}} placeholder="Job Title" style={{fontSize:13,fontWeight:600,border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 8px",background:"#fff",outline:"none",fontFamily:"inherit"}}/>
                          <input value={e.company||""} onChange={function(ev){var v=ev.target.value;setProfile(function(p){var exp=p.experience.slice();exp[i]=Object.assign({},exp[i],{company:v});return Object.assign({},p,{experience:exp});});}} placeholder="Company" style={{fontSize:13,color:"#6d28d9",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 8px",background:"#fff",outline:"none",fontFamily:"inherit"}}/>
                          <input value={e.duration||""} onChange={function(ev){var v=ev.target.value;setProfile(function(p){var exp=p.experience.slice();exp[i]=Object.assign({},exp[i],{duration:v});return Object.assign({},p,{experience:exp});});}} placeholder="Duration e.g. Jan 2022 – Mar 2024" style={{fontSize:11,color:"#94a3b8",border:"1px solid #e2e8f0",borderRadius:6,padding:"4px 8px",background:"#fff",outline:"none",fontFamily:"inherit",gridColumn:"1/-1"}}/>
                        </div>
                        <div style={{padding:"0.5rem 0.75rem"}}>
                          {(e.bullets||[]).map(function(b,j){
                            return(
                              <div key={j} style={{display:"flex",gap:6,alignItems:"flex-start",marginBottom:4}}>
                                <span style={{color:"#4F46E5",marginTop:4,flexShrink:0}}>•</span>
                                <input value={b} onChange={function(ev){var v=ev.target.value;setProfile(function(p){var exp=p.experience.slice();var buls=exp[i].bullets.slice();buls[j]=v;exp[i]=Object.assign({},exp[i],{bullets:buls});return Object.assign({},p,{experience:exp});});}} style={{flex:1,fontSize:12,border:"1px solid #e2e8f0",borderRadius:6,padding:"3px 8px",background:"#fff",outline:"none",fontFamily:"inherit"}}/>
                                <span onClick={function(){setProfile(function(p){var exp=p.experience.slice();var buls=exp[i].bullets.filter(function(_,x){return x!==j;});exp[i]=Object.assign({},exp[i],{bullets:buls});return Object.assign({},p,{experience:exp});});}} style={{cursor:"pointer",color:"#dc2626",fontWeight:700,fontSize:14,marginTop:2}}>×</span>
                              </div>
                            );
                          })}
                          <button onClick={function(){setProfile(function(p){var exp=p.experience.slice();exp[i]=Object.assign({},exp[i],{bullets:(exp[i].bullets||[]).concat([""])});return Object.assign({},p,{experience:exp});});}} style={{fontSize:11,color:"#4F46E5",background:"none",border:"1px dashed #c7d2fe",borderRadius:6,padding:"3px 10px",cursor:"pointer",marginTop:4}}>+ Add bullet</button>
                        </div>
                        <div style={{padding:"0.25rem 0.75rem 0.5rem",display:"flex",justifyContent:"flex-end"}}>
                          <button onClick={function(){setProfile(function(p){return Object.assign({},p,{experience:p.experience.filter(function(_,x){return x!==i;})});});}} style={{fontSize:11,color:"#dc2626",background:"#fee2e2",border:"none",borderRadius:6,padding:"3px 10px",cursor:"pointer"}}>Remove role</button>
                        </div>
                      </div>
                    );
                  })}
                  {/* Add new experience */}
                  <button onClick={function(){setProfile(function(p){return Object.assign({},p,{experience:(p.experience||[]).concat([{title:"",company:"",duration:"",bullets:[""]}])});});}} style={{...BS,width:"100%",fontSize:12,marginTop:4}}>+ Add Experience</button>
                </div>
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){goBack(0);}} style={BS}>← Back</button>
              <button onClick={function(){setStep(2);}} style={{...BP,flex:1}}>Looks Good →</button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step===2&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>🎯 Job Preferences</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>AI will score each job against your profile</div>
            {jobsDone&&jobs.length>0&&(
              <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><span style={{fontSize:12,fontWeight:700,color:"#059669"}}>✓ Jobs already scored</span><span style={{fontSize:12,color:"#64748b",marginLeft:8}}>{jobs.length} jobs ready</span></div>
                <button onClick={function(){setStep(3);}} style={{...BP,padding:"6px 14px",fontSize:12}}>View Jobs →</button>
              </div>
            )}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              {[["🎯 Target Role","role","e.g. Senior Data Analyst"],["📍 Location","location","e.g. Bengaluru"],["📅 Experience","exp","e.g. 7 years"],["💰 Salary","salary","e.g. 25-35 LPA"]].map(function(arr){
                return(<div key={arr[1]}><label style={LB}>{arr[0]}</label><input value={prefs[arr[1]]} onChange={function(e){var v=e.target.value;setPrefs(function(p){var n=Object.assign({},p);n[arr[1]]=v;return n;});}} placeholder={arr[2]} style={{...IP,marginBottom:0}}/></div>);
              })}
            </div>
            <label style={LB}>📋 Custom Job Description (AI will parse and add to job list)</label>
            <textarea value={customJD} onChange={function(e){setCustomJD(e.target.value);}} rows={4} placeholder="Paste any job description here — AI will extract title, company, and requirements..." style={{...IP,resize:"vertical"}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){goBack(1);}} style={BS}>← Back</button>
              <button onClick={doFindJobs} style={{...BP,flex:1}}>Score Jobs with AI →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step===3&&(
          <div style={CD}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
              <div><div style={{fontWeight:700,fontSize:16}}>🔍 AI-Scored Jobs</div><div style={{fontSize:12,color:"#64748b"}}>Tap to select</div></div>
              {sel.length>0&&<div style={{background:"linear-gradient(135deg,#4F46E5,#7C3AED)",color:"#fff",borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700}}>{sel.length} selected</div>}
            </div>
            {jobs.map(function(j){
              var isSel=sel.indexOf(j.id)!==-1;
              return(
                <div key={j.id} onClick={function(){setSel(function(p){return isSel?p.filter(function(x){return x!==j.id;}):p.concat([j.id]);});}} style={{border:"2px solid "+(isSel?"#4F46E5":"#e2e8f0"),borderRadius:12,padding:"0.875rem",marginBottom:"0.625rem",cursor:"pointer",background:isSel?"rgba(79,70,229,0.04)":"#fafafa",transition:"all 0.15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{j.title}{isSel&&<span style={{fontSize:10,background:"#4F46E5",color:"#fff",borderRadius:10,padding:"1px 7px",marginLeft:6}}>✓</span>}</div>
                      <div style={{fontSize:12,color:"#64748b",marginBottom:5}}>{j.company} · {j.location}{j.salary?" · "+j.salary:""}</div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,padding:"2px 7px",borderRadius:10,background:"#f0f4ff",color:"#4F46E5",border:"1px solid #c7d2fe"}}>{j.source}</span>
                        {(j.reasons||[]).map(function(r,ri){return <span key={ri} style={{fontSize:11,padding:"2px 7px",borderRadius:10,background:"#f5f3ff",color:"#6d28d9",border:"1px solid #ddd6fe"}}>{r}</span>;})}
                      </div>
                      {j.gap&&<div style={{fontSize:11,color:"#D97706",marginTop:4,background:"#fffbeb",padding:"3px 8px",borderRadius:6,display:"inline-block"}}>⚠ Gap: {j.gap}</div>}
                    </div>
                    <div style={{textAlign:"center",background:sb(j.score),borderRadius:8,padding:"7px 10px",marginLeft:10,border:"1px solid "+sc(j.score)+"44",flexShrink:0}}>
                      <div style={{fontWeight:800,fontSize:18,color:sc(j.score)}}>{j.score}%</div>
                      <div style={{fontSize:10,color:sc(j.score)}}>match</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{display:"flex",gap:8,marginTop:"0.5rem"}}>
              <button onClick={function(){goBack(2);}} style={BS}>← Back</button>
              <button onClick={doGenQs} disabled={!sel.length} style={{...BP,flex:1,opacity:sel.length?1:0.4}}>Continue with {sel.length} Job{sel.length!==1?"s":""} →</button>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step===4&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>💡 AI-Generated Questions</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>Questions tailored to your resume + job gaps — answer to improve your tailored resume</div>
            <Tabs/>
            {sel.map(function(id){
              if(id!==activeJob)return null;
              return(
                <div key={id}>
                  {(qs[id]||[]).map(function(q,i){
                    return(
                      <div key={i} style={{marginBottom:"0.875rem",background:"#fffbeb",borderRadius:10,padding:"0.875rem",border:"1px solid #fde68a"}}>
                        <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:6,color:"#92400e"}}>💬 {q}</label>
                        <input value={(ans[id]&&ans[id][i])||""} onChange={function(e){var v=e.target.value;setAns(function(p){var c=Object.assign({},p);c[id]=Object.assign({},c[id]);c[id][i]=v;return c;});}} placeholder="Your answer (optional — leave blank to skip)" style={{...IP,marginBottom:0,background:"#fff"}}/>
                      </div>
                    );
                  })}
                  {tailoredDone[id]&&(
                    <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"0.75rem 1rem",marginBottom:"1rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:12,fontWeight:700,color:"#059669"}}>✓ Resume already built for {(jobs.find(function(j){return j.id===id;})||{}).company}</span>
                      <button onClick={function(){setStep(5);}} style={{...BP,padding:"6px 14px",fontSize:12}}>View Resume →</button>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){goBack(3);}} style={BS}>← Back</button>
              <button onClick={doBuild} style={{...BP,flex:1}}>Build Tailored Resume →</button>
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {step===5&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>📄 ATS-Tailored Resume</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>Keyword-optimised for each job</div>
            <Tabs/>
            {sel.map(function(id){
              if(id!==activeJob)return null;
              var td=tailored[id];
              if(!td)return <div key={id} style={{padding:"1rem",background:"#fff7ed",borderRadius:8,fontSize:13,color:"#92400e"}}>Not ready. Go back.</div>;
              return(
                <div key={id}>
                  <Preview id={id}/>
                  {td.ats_tips&&td.ats_tips.length>0&&(
                    <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"0.75rem",marginBottom:"1rem"}}>
                      <div style={{fontWeight:700,color:"#059669",fontSize:12,marginBottom:5}}>✅ ATS Optimisation Tips</div>
                      {td.ats_tips.map(function(t,i){return <div key={i} style={{color:"#065f46",fontSize:13,marginBottom:2}}>• {t}</div>;})}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={function(){goBack(4);}} style={BS}>← Back</button>
                    <button onClick={function(){doDownload(id);}} style={{...BP,background:"linear-gradient(135deg,#059669,#0891b2)"}}>⬇ Download Resume</button>
                    <button onClick={function(){setStep(6);}} style={{...BP,flex:1}}>Cover Letter →</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 6 */}
        {step===6&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>🚀 Apply</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>Resume + cover letter ready</div>
            <Tabs/>
            {(function(){
              var id=activeJob||sel[0];
              var job=null;for(var i=0;i<jobs.length;i++){if(jobs[i].id===id){job=jobs[i];break;}}
              var td=tailored[id];
              if(!td)return <div style={{padding:"1rem",background:"#fff7ed",borderRadius:8,fontSize:13}}>No data. Go back.</div>;
              return(
                <div>
                  <Preview id={id}/>
                  {td.cover_letter&&(
                    <div style={{background:"#f5f3ff",borderRadius:10,padding:"1.25rem",marginBottom:"1rem",border:"1px solid #ddd6fe"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#6d28d9",marginBottom:8}}>✉️ COVER LETTER — {job&&job.title} at {job&&job.company}</div>
                      <pre style={{margin:0,fontSize:13,lineHeight:1.75,whiteSpace:"pre-wrap",fontFamily:"inherit",color:"#334155"}}>{td.cover_letter}</pre>
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={function(){goBack(5);}} style={BS}>← Back</button>
                    <button onClick={function(){doDownload(id);}} style={{...BP,background:"linear-gradient(135deg,#059669,#0891b2)"}}>⬇ Download</button>
                    <button onClick={function(){if(td&&td.cover_letter)navigator.clipboard.writeText(td.cover_letter).catch(function(){});}} style={{...BS,color:"#6d28d9",borderColor:"#a78bfa"}}>📋 Copy Letter</button>
                    <button style={{...BP,background:"linear-gradient(135deg,#059669,#10b981)",flex:1}}>✅ Mark Applied</button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}