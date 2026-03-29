import { useState, useRef } from "react";

var STEPS = ["Resume","Verify","Preferences","Jobs","Questions","Tailored Resume","Apply"];

var SAMPLE_JOBS = [
  {id:1,title:"Senior Business Analyst",company:"Meesho",location:"Bengaluru",salary:"22-32 LPA",source:"LinkedIn",jd:"Drive data-informed decisions across supply chain. Own dashboards, define KPIs, conduct root cause analysis. 6+ years analytics. Strong SQL, Excel, Tableau or Looker. Stakeholder management."},
  {id:2,title:"Senior Data Analyst",company:"PhonePe",location:"Bengaluru",salary:"25-38 LPA",source:"Naukri",jd:"Build analytical models, track metrics for payments business. Present insights to leadership. 5-8 years experience, SQL, Python, BI tools. Fintech domain preferred."},
  {id:3,title:"Growth Analyst",company:"Zepto",location:"Bengaluru",salary:"18-28 LPA",source:"IIMJobs",jd:"Run experiments, analyse funnels, identify GMV growth levers. 4-7 years growth analytics. SQL fluency, cohort analysis, experimentation mindset."},
  {id:4,title:"Analytics Manager",company:"Swiggy",location:"Bengaluru",salary:"35-50 LPA",source:"LinkedIn",jd:"Lead analytics for restaurant and logistics verticals. Set roadmap, mentor analysts, shape strategy. 7-9 years analytics, 2+ years lead. SQL, Python or R, visualisation tools."},
  {id:5,title:"Growth Manager",company:"CRED",location:"Bengaluru",salary:"28-42 LPA",source:"IIMJobs",jd:"Design and execute lifecycle campaigns, analyse drop-offs, own retention KPIs. 5-8 years growth/product analytics. SQL, A/B testing, CRM tools."}
];

// ── Styles ──
var BP = {background:"linear-gradient(135deg,#4F46E5,#7C3AED)",color:"#fff",border:"none",borderRadius:10,padding:"11px 22px",fontSize:14,cursor:"pointer",fontWeight:600};
var BS = {background:"#fff",color:"#64748b",border:"1.5px solid #e2e8f0",borderRadius:10,padding:"10px 16px",fontSize:14,cursor:"pointer"};
var IP = {width:"100%",padding:"10px 12px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,background:"#fff",color:"#1e293b",outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:8};
var CD = {background:"#fff",borderRadius:16,padding:"1.25rem",boxShadow:"0 4px 20px rgba(0,0,0,0.07)",border:"1px solid #e8eaf0",marginBottom:"1rem"};
var LB = {fontSize:12,color:"#64748b",fontWeight:600,display:"block",marginBottom:4};

// ── API ──
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'http://localhost:3001';

async function ask(system, user, tokens) {
  var res = await fetch(API_BASE + '/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: system, user: user, maxTokens: tokens || 800 })
  });
  var d = await res.json();
  if (d.error) throw new Error(d.error);
  return d.text || '';
}

function getJ(raw) {
  var a = raw.indexOf("{"), b = raw.lastIndexOf("}");
  if (a === -1 || b === -1) return null;
  try { return JSON.parse(raw.slice(a, b+1)); } catch(e) { return null; }
}

function getArr(raw) {
  var a = raw.indexOf("["), b = raw.lastIndexOf("]");
  if (a === -1 || b === -1) return null;
  try { return JSON.parse(raw.slice(a, b+1)); } catch(e) { return null; }
}

// ── App ──
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
  var [jobs, setJobs] = useState(SAMPLE_JOBS.map(function(j) { return Object.assign({},j,{score:null,reasons:[],gap:""}); }));
  var [sel, setSel] = useState([]);
  var [qs, setQs] = useState({});
  var [ans, setAns] = useState({});
  var [tailored, setTailored] = useState({});
  var [activeJob, setActiveJob] = useState(null);
  var [busy, setBusy] = useState("");
  var [pct, setPct] = useState(0);
  var [secs, setSecs] = useState(0);
  var fileRef = useRef();
  var tmrRef = useRef(null);
  var secRef = useRef(null);
  var pctRef = useRef(0);

  function startLoad(msg) {
    pctRef.current = 5; setPct(5); setSecs(0); setBusy(msg);
    tmrRef.current = setInterval(function() {
      pctRef.current = Math.min(pctRef.current + (pctRef.current < 60 ? 3 : 0.5), 95);
      setPct(Math.round(pctRef.current));
    }, 500);
    secRef.current = setInterval(function() { setSecs(function(s) { return s+1; }); }, 1000);
  }

  function stopLoad() {
    clearInterval(tmrRef.current);
    clearInterval(secRef.current);
    setBusy(""); setPct(0); setSecs(0);
  }

  // ── STEP 0: Parse resume via AI ──
  async function doParseResume(text) {
    startLoad("Parsing resume with AI...");
    try {
      var raw = await ask(
        "You are an expert resume parser. Extract ALL information accurately. Return ONLY a valid JSON object. No markdown, no backticks, no explanation. Rules: (1) skills must be a flat array of all individual skills found across all categories. (2) experience array must capture every job role in order. (3) bullets must be an array of strings for each role. (4) Extract name from the very first line. (5) Extract email, phone, location from the contact line even if they are on the same line separated by spaces.",
        "Parse this complete resume and return JSON with these exact keys:\n- name (string)\n- email (string)\n- phone (string)\n- location (string)\n- current_title (string, most recent job title)\n- experience_years (number)\n- summary (string, the about me section)\n- skills (flat array of ALL individual skills across all categories like Business, Management, Tech)\n- education (string, degree + university + year + CGPA)\n- experience (array of objects, each with: title, company, duration, bullets as array of strings)\n\nRESUME TEXT:\n" + text.slice(0, 4000),
        1500
      );
      var p = getJ(raw);
      if (!p) throw new Error("Could not parse. Please try again.");
      if (!Array.isArray(p.skills)) p.skills = [];
      if (!Array.isArray(p.experience)) p.experience = [];
      stopLoad();
      setProfile(p);
      setStep(1);
    } catch(e) {
      stopLoad();
      alert("Parse error: " + e.message + "\n\nPlease try again.");
    }
  }

  async function doUpload(file) {
    try {
      var text = await file.text();
      await doParseResume(text);
    } catch(e) {
      alert("Could not read file. Please paste text instead.");
    }
  }

  function doManualBuild() {
    if (!manData.name) { alert("Enter your name."); return; }
    if (!manData.title) { alert("Enter your job title."); return; }
    var text = "Name: " + manData.name + "\nEmail: " + manData.email + "\nPhone: " + manData.phone + "\nLocation: " + manData.location + "\nCurrent Title: " + manData.title + "\nExperience: " + manData.years + " years\nSummary: " + manData.summary + "\nSkills: " + manData.skills + "\nEducation: " + manData.education;
    for (var i = 0; i < manJobs.length; i++) {
      var j = manJobs[i];
      text += "\n\nJob: " + j.title + " at " + j.company + " (" + j.duration + ")\n" + j.bullets;
    }
    doParseResume(text);
  }

  // ── STEP 2: Find + score jobs via AI ──
  async function doFindJobs() {
    startLoad("Scoring jobs...");
    try {
      var ctx = "Candidate: " + profile.current_title + ", " + profile.experience_years + " years exp. Skills: " + (profile.skills||[]).slice(0,12).join(", ") + ". Target: " + prefs.role;
      var allJobs = SAMPLE_JOBS.slice();

      // Parse custom JD if provided
      if (customJD.trim()) {
        try {
          var cRaw = await ask(
            "Extract job details. Return ONLY JSON with keys: title, company, location, salary, jd (full job description summary).",
            "Extract from this job posting:\n" + customJD.slice(0, 1000),
            300
          );
          var cJob = getJ(cRaw);
          if (cJob) {
            allJobs.push({
              id: "custom",
              title: cJob.title || "Custom Role",
              company: cJob.company || "Company",
              location: cJob.location || prefs.location,
              salary: cJob.salary || "",
              source: "Custom",
              jd: cJob.jd || customJD.slice(0, 300)
            });
          } else {
            allJobs.push({id:"custom",title:"Custom Role",company:"Your Target",location:prefs.location,salary:"",source:"Custom",jd:customJD.slice(0,300)});
          }
        } catch(e) {
          allJobs.push({id:"custom",title:"Custom Role",company:"Your Target",location:prefs.location,salary:"",source:"Custom",jd:customJD.slice(0,300)});
        }
      }

      // Score all jobs
      var scored = [];
      for (var i = 0; i < allJobs.length; i++) {
        var job = allJobs[i];
        try {
          var sRaw = await ask(
            "Score candidate-job fit. Return ONLY JSON: {score: number 0-100, reasons: [string, string], gap: string or null}",
            ctx + "\n\nJob: " + job.title + " at " + job.company + "\nJD: " + job.jd,
            200
          );
          var s = getJ(sRaw) || {score:55,reasons:["Profile reviewed","Partial match"],gap:null};
          scored.push(Object.assign({}, job, {
            score: Math.min(100, Math.max(0, Number(s.score)||55)),
            reasons: Array.isArray(s.reasons) ? s.reasons : ["Reviewed"],
            gap: s.gap || null
          }));
        } catch(e) {
          scored.push(Object.assign({}, job, {score:55,reasons:["Reviewed"],gap:null}));
        }
      }
      scored.sort(function(a,b) { return b.score - a.score; });
      setJobs(scored);
      stopLoad();
      setStep(3);
    } catch(e) {
      stopLoad();
      alert("Error: " + e.message);
    }
  }

  // ── STEP 3: Generate questions ──
  function doGenQs() {
    if (!sel.length) { alert("Select at least one job."); return; }
    var result = {};
    for (var i = 0; i < sel.length; i++) {
      var id = sel[i];
      var job = null;
      for (var j = 0; j < jobs.length; j++) { if (jobs[j].id === id) { job = jobs[j]; break; } }
      result[id] = [
        "Describe your biggest achievement with measurable impact (numbers, %, revenue)?",
        "Which tools did you use most — " + (job ? job.jd.match(/SQL|Python|Excel|Tableau|Power BI|Looker|R\b/gi)||["analytics tools"] : ["analytics tools"]).slice(0,3).join(", ") + "?",
        "How many people did you manage or mentor directly?",
        "Any domain expertise relevant to " + (job ? job.company : "this role") + " (e.g. fintech, growth, supply chain)?"
      ];
    }
    setQs(result);
    setActiveJob(sel[0]);
    setStep(4);
  }

  // ── STEP 4: Build tailored resume via AI ──
  async function doBuild() {
    startLoad("Building ATS-optimised resume...");
    try {
      var result = {};
      for (var i = 0; i < sel.length; i++) {
        var id = sel[i];
        var job = null;
        for (var j = 0; j < jobs.length; j++) { if (jobs[j].id === id) { job = jobs[j]; break; } }
        if (!job) continue;

        var extras = "";
        var qList = qs[id] || [];
        var aList = ans[id] || {};
        for (var q = 0; q < qList.length; q++) {
          var a = aList[q] || "";
          if (a.trim()) extras += "\n- " + qList[q] + ": " + a;
        }

        var td = null;
        try {
          var raw = await ask(
            "You are an expert ATS resume writer. Tailor the candidate resume specifically for the job description. Maximise keyword match with the JD. Return ONLY a JSON object with no markdown.",
            "CANDIDATE PROFILE:\nName: " + profile.name + "\nTitle: " + profile.current_title + "\nYears: " + profile.experience_years + "\nSkills: " + (profile.skills||[]).join(", ") + "\nSummary: " + (profile.summary||"") + "\nExperience: " + JSON.stringify((profile.experience||[]).slice(0,3)) + "\nEducation: " + (profile.education||"") + (extras ? "\n\nADDITIONAL INFO:" + extras : "") + "\n\nTARGET JOB:\n" + job.title + " at " + job.company + "\nJD: " + job.jd + "\n\nReturn JSON with keys:\n- tailored_title (string)\n- tailored_summary (3-4 sentences, keyword-rich)\n- tailored_experience (array of {title, company, duration, bullets} where bullets are achievement-focused and use JD keywords)\n- keywords_added (array of keywords from JD added to resume)\n- ats_score_estimate (number 0-100)\n- ats_tips (array of 3 specific tips)\n- cover_letter (3 paragraph professional cover letter)",
            2000
          );
          td = getJ(raw);
        } catch(e) {}

        result[id] = {
          tailored_title: (td&&td.tailored_title) || job.title,
          tailored_summary: (td&&td.tailored_summary) || "Experienced " + profile.current_title + " with " + profile.experience_years + " years applying for " + job.title + " at " + job.company + ".",
          tailored_experience: (td&&Array.isArray(td.tailored_experience)&&td.tailored_experience.length) ? td.tailored_experience : (profile.experience||[]),
          keywords_added: (td&&Array.isArray(td.keywords_added)) ? td.keywords_added : [],
          ats_score_estimate: (td&&td.ats_score_estimate) || 70,
          ats_tips: (td&&Array.isArray(td.ats_tips)) ? td.ats_tips : ["Add more keywords from the JD","Quantify achievements with numbers","Match job title exactly"],
          cover_letter: (td&&td.cover_letter) || "Dear Hiring Manager,\n\nI am excited to apply for the " + job.title + " role at " + job.company + ". With " + profile.experience_years + " years as " + profile.current_title + ", I bring strong expertise aligned with your requirements.\n\nI am confident in my ability to contribute meaningfully to your team.\n\nBest regards,\n" + profile.name
        };
      }
      stopLoad();
      setTailored(result);
      setActiveJob(sel[0]);
      setStep(5);
    } catch(e) {
      stopLoad();
      alert("Error: " + e.message);
    }
  }

  function doDownload(id) {
    var td = tailored[id]; if (!td||!profile) return;
    var job = null; for (var i=0;i<jobs.length;i++){if(jobs[i].id===id){job=jobs[i];break;}}
    var skills = (profile.skills||[]).slice();
    var kwMap = {};
    var kws = td.keywords_added||[];
    for (var i=0;i<kws.length;i++) {
      kwMap[kws[i].toLowerCase()] = 1;
      var found = false;
      for (var j=0;j<skills.length;j++){if(skills[j].toLowerCase()===kws[i].toLowerCase()){found=true;break;}}
      if (!found) skills.push(kws[i]);
    }
    var exp = (td.tailored_experience&&td.tailored_experience.length) ? td.tailored_experience : (profile.experience||[]);
    var sH = "";
    for (var i=0;i<skills.length;i++) {
      var kw = kwMap[skills[i].toLowerCase()];
      sH += "<span style='display:inline-block;padding:3px 10px;margin:2px;border-radius:4px;font-size:12px;background:" + (kw?"#dbeafe":"#f1f5f9") + ";color:" + (kw?"#1e40af":"#334155") + ";border:1px solid " + (kw?"#93c5fd":"#e2e8f0") + "'>" + skills[i] + "</span>";
    }
    var eH = "";
    for (var i=0;i<exp.length;i++) {
      var e = exp[i]; var bl = "";
      for (var j=0;j<(e.bullets||[]).length;j++) bl += "<li style='margin-bottom:4px;font-size:13px;line-height:1.6'>" + e.bullets[j] + "</li>";
      eH += "<div style='margin-bottom:16px'><div style='display:flex;justify-content:space-between;align-items:baseline'><strong style='font-size:14px'>" + (e.title||"") + "</strong><span style='font-size:12px;color:#888'>" + (e.duration||"") + "</span></div><div style='font-size:13px;color:#6d28d9;margin:2px 0 6px'>" + (e.company||"") + "</div>" + (bl?"<ul style='padding-left:16px;margin:0'>" + bl + "</ul>":"") + "</div>";
    }
    var html = "<!DOCTYPE html><html><head><meta charset='utf-8'><title>" + profile.name + "</title><style>body{font-family:Arial,sans-serif;max-width:750px;margin:40px auto;padding:0 32px;color:#1e293b;font-size:13px}h2{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;border-bottom:1.5px solid #e2e8f0;padding-bottom:4px;margin:18px 0 10px;color:#1d4ed8}@media print{body{margin:0}}</style></head><body>"
      + "<div style='text-align:center;padding-bottom:14px;border-bottom:2px solid #1d4ed8;margin-bottom:16px'>"
      + "<h1 style='font-size:22px;margin:0 0 4px;letter-spacing:0.5px'>" + profile.name + "</h1>"
      + "<div style='font-size:13px;color:#6d28d9;font-weight:600;margin-bottom:4px'>" + (td.tailored_title||profile.current_title) + "</div>"
      + "<div style='font-size:12px;color:#64748b'>" + [profile.email,profile.phone,profile.location].filter(Boolean).join("  |  ") + "</div>"
      + "</div>"
      + (td.tailored_summary ? "<h2>Professional Summary</h2><p style='margin:0;line-height:1.75;font-size:13px'>" + td.tailored_summary + "</p>" : "")
      + (skills.length ? "<h2>Core Competencies</h2><div style='margin-bottom:4px'>" + sH + "</div>" : "")
      + (exp.length ? "<h2>Work Experience</h2>" + eH : "")
      + (profile.education ? "<h2>Education</h2><div style='font-size:13px'>" + profile.education + "</div>" : "")
      + "</body></html>";
    var w = window.open("","_blank");
    if (!w) { alert("Allow pop-ups then retry."); return; }
    w.document.open(); w.document.write(html); w.document.close();
    w.onload = function() { w.focus(); w.print(); };
  }

  var sc = function(s){return s>=80?"#059669":s>=60?"#D97706":"#DC2626";};
  var sb = function(s){return s>=80?"#ecfdf5":s>=60?"#fffbeb":"#fef2f2";};

  function Tabs() {
    return (
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1rem"}}>
        {sel.map(function(id) {
          var job = null; for (var i=0;i<jobs.length;i++){if(jobs[i].id===id){job=jobs[i];break;}}
          var active = id===activeJob;
          return <button key={id} onClick={function(){setActiveJob(id);}} style={{padding:"6px 14px",borderRadius:20,fontSize:12,cursor:"pointer",fontWeight:active?700:400,background:active?"linear-gradient(135deg,#4F46E5,#7C3AED)":"#f1f5f9",color:active?"#fff":"#64748b",border:"none"}}>{job?job.company:id}</button>;
        })}
      </div>
    );
  }

  function Preview(props) {
    var id = props.id; var td = tailored[id]; var p = profile;
    if (!td||!p) return null;
    var skills = (p.skills||[]).slice(); var kwMap = {};
    var kws = td.keywords_added||[];
    for (var i=0;i<kws.length;i++){kwMap[kws[i].toLowerCase()]=1;var found=false;for(var j=0;j<skills.length;j++){if(skills[j].toLowerCase()===kws[i].toLowerCase()){found=true;break;}}if(!found)skills.push(kws[i]);}
    var exp = (td.tailored_experience&&td.tailored_experience.length)?td.tailored_experience:(p.experience||[]);
    return (
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

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#EEF2FF,#F5F3FF,#ECFDF5)",padding:"1.5rem 1rem",fontFamily:"system-ui,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}input:focus,textarea:focus{border-color:#4F46E5!important;outline:none}`}</style>
      <div style={{maxWidth:680,margin:"0 auto"}}>

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
            {STEPS.map(function(s,i) {
              var done=i<step,active=i===step;
              return (
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

        {/* STEP 0 — Upload Resume */}
        {step===0&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>📋 Add Your Resume</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>AI will parse all details automatically</div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:"1.25rem"}}>
              {[{m:"paste",icon:"📋",label:"Paste Text",sub:"Copy-paste resume"},{m:"upload",icon:"📄",label:"Upload File",sub:"TXT / DOCX"},{m:"manual",icon:"✏️",label:"Manual Entry",sub:"Fill form"}].map(function(o) {
                var a = mode===o.m;
                return (
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
                  <input ref={fileRef} type="file" accept=".txt,.docx,.doc" style={{display:"none"}} onChange={function(e){var f=e.target.files[0];if(f)doUpload(f);}}/>
                  <div style={{fontSize:32,marginBottom:8}}>📁</div>
                  <div style={{fontWeight:600,color:"#4F46E5",fontSize:14}}>Click to upload resume</div>
                  <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>TXT or DOCX — AI will parse automatically</div>
                </div>
                <div style={{marginTop:10,padding:"0.75rem",background:"#fff7ed",borderRadius:8,fontSize:12,color:"#92400e"}}>
                  Note: PDF binary files cannot be read in this sandbox. If upload fails, please use Paste Text instead.
                </div>
              </div>
            )}

            {mode==="manual"&&(
              <div style={{background:"#f8fafc",borderRadius:12,padding:"1rem",border:"1px solid #e2e8f0"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
                  {[["name","👤 Full Name"],["email","📧 Email"],["phone","📱 Phone"],["location","📍 City"],["title","💼 Current Title"],["years","📅 Years Exp"]].map(function(pair) {
                    return (
                      <div key={pair[0]}>
                        <label style={LB}>{pair[1]}</label>
                        <input value={manData[pair[0]]} onChange={function(e){var v=e.target.value;setManData(function(p){var n=Object.assign({},p);n[pair[0]]=v;return n;});}} style={{...IP,marginBottom:0}}/>
                      </div>
                    );
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
                  {manJobs.map(function(j,i) {
                    return (
                      <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0.75rem",background:"rgba(79,70,229,0.05)",borderRadius:8,marginBottom:6,border:"1px solid rgba(79,70,229,0.15)"}}>
                        <div><div style={{fontWeight:600,fontSize:13}}>{j.title} @ {j.company}</div><div style={{fontSize:12,color:"#64748b"}}>{j.duration}</div></div>
                        <button onClick={function(){setManJobs(function(p){return p.filter(function(_,x){return x!==i;});});}} style={{background:"#fee2e2",border:"none",color:"#dc2626",borderRadius:6,padding:"3px 9px",cursor:"pointer"}}>✕</button>
                      </div>
                    );
                  })}
                  <div style={{background:"#fff",borderRadius:10,padding:"0.875rem",border:"1.5px dashed #c7d2fe",marginBottom:"1rem"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      {[["title","Job Title"],["company","Company"],["duration","Duration"]].map(function(pair) {
                        return (
                          <div key={pair[0]} style={pair[0]==="duration"?{gridColumn:"1/-1"}:{}}>
                            <input value={manJobEntry[pair[0]]} onChange={function(e){var v=e.target.value;setManJobEntry(function(p){var n=Object.assign({},p);n[pair[0]]=v;return n;});}} placeholder={pair[1]} style={{...IP,marginBottom:0}}/>
                          </div>
                        );
                      })}
                    </div>
                    <textarea value={manJobEntry.bullets} onChange={function(e){setManJobEntry(function(p){return Object.assign({},p,{bullets:e.target.value});});}} rows={3} placeholder="Key achievements (one per line)" style={{...IP,resize:"vertical",marginBottom:8}}/>
                    <button onClick={function(){
                      if(!manJobEntry.title||!manJobEntry.company){alert("Fill title and company.");return;}
                      setManJobs(function(p){return p.concat([Object.assign({},manJobEntry)]);});
                      setManJobEntry({title:"",company:"",duration:"",bullets:""});
                    }} style={BP}>+ Add Role</button>
                  </div>
                </div>
                <button onClick={doManualBuild} style={{...BP,width:"100%"}}>Parse with AI →</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 1 — Verify */}
        {step===1&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>✅ Verify Profile</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>AI-extracted details — review before continuing</div>
            {profile&&(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:"1rem"}}>
                  {[["👤 Name",profile.name],["💼 Title",profile.current_title],["📅 Experience",(profile.experience_years||0)+" yrs"],["📍 Location",profile.location],["📧 Email",profile.email],["📱 Phone",profile.phone]].map(function(pair) {
                    if (!pair[1]) return null;
                    return (
                      <div key={pair[0]} style={{background:"#f8fafc",borderRadius:8,padding:"0.5rem 0.75rem",border:"1px solid #e2e8f0"}}>
                        <div style={{fontSize:10,color:"#94a3b8",marginBottom:2}}>{pair[0]}</div>
                        <div style={{fontWeight:600,fontSize:13}}>{pair[1]}</div>
                      </div>
                    );
                  })}
                </div>
                {profile.skills&&profile.skills.length>0&&(
                  <div style={{background:"rgba(79,70,229,0.04)",borderRadius:8,padding:"0.75rem",marginBottom:"1rem",border:"1px solid rgba(79,70,229,0.12)"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#4F46E5",marginBottom:6}}>⚡ SKILLS</div>
                    <div>{profile.skills.map(function(s,i){return <span key={i} style={{display:"inline-block",padding:"2px 10px",margin:2,borderRadius:20,fontSize:12,background:"#fff",border:"1px solid #e2e8f0"}}>{s}</span>;})}</div>
                  </div>
                )}
                {profile.experience&&profile.experience.length>0&&(
                  <div style={{marginBottom:"1rem"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#4F46E5",marginBottom:6}}>💼 EXPERIENCE</div>
                    {profile.experience.map(function(e,i) {
                      return (
                        <div key={i} style={{padding:"0.5rem 0.75rem",background:"#f8fafc",borderRadius:8,marginBottom:5,borderLeft:"3px solid #4F46E5"}}>
                          <div style={{fontWeight:600,fontSize:13}}>{e.title} <span style={{color:"#6d28d9",fontWeight:400}}>@ {e.company}</span></div>
                          <div style={{fontSize:11,color:"#94a3b8"}}>{e.duration}</div>
                          {e.bullets&&e.bullets.slice(0,2).map(function(b,j){return <div key={j} style={{fontSize:12,color:"#475569",marginTop:2}}>• {b}</div>;})}
                        </div>
                      );
                    })}
                  </div>
                )}
                {profile.education&&(
                  <div style={{background:"rgba(5,150,105,0.04)",borderRadius:8,padding:"0.75rem",marginBottom:"1rem",border:"1px solid rgba(5,150,105,0.12)"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#059669",marginBottom:4}}>🎓 EDUCATION</div>
                    <div style={{fontSize:13}}>{profile.education}</div>
                  </div>
                )}
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setStep(0);setProfile(null);}} style={BS}>← Back</button>
              <button onClick={function(){setStep(2);}} style={{...BP,flex:1}}>Looks Good →</button>
            </div>
          </div>
        )}

        {/* STEP 2 — Preferences */}
        {step===2&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>🎯 Job Preferences</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>AI will score each job against your profile</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              {[["🎯 Target Role","role","e.g. Senior Data Analyst"],["📍 Location","location","e.g. Bengaluru"],["📅 Experience","exp","e.g. 7 years"],["💰 Salary","salary","e.g. 25-35 LPA"]].map(function(arr) {
                return (
                  <div key={arr[1]}>
                    <label style={LB}>{arr[0]}</label>
                    <input value={prefs[arr[1]]} onChange={function(e){var v=e.target.value;setPrefs(function(p){var n=Object.assign({},p);n[arr[1]]=v;return n;});}} placeholder={arr[2]} style={{...IP,marginBottom:0}}/>
                  </div>
                );
              })}
            </div>
            <label style={LB}>📋 Custom Job Description (optional — AI will parse and add to job list)</label>
            <textarea value={customJD} onChange={function(e){setCustomJD(e.target.value);}} rows={4} placeholder="Paste any job description here — AI will extract title, company, and requirements..." style={{...IP,resize:"vertical"}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setStep(1);}} style={BS}>← Back</button>
              <button onClick={doFindJobs} style={{...BP,flex:1}}>Score Jobs with AI →</button>
            </div>
          </div>
        )}

        {/* STEP 3 — Jobs */}
        {step===3&&(
          <div style={CD}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
              <div>
                <div style={{fontWeight:700,fontSize:16}}>🔍 AI-Scored Jobs</div>
                <div style={{fontSize:12,color:"#64748b"}}>Tap to select jobs to apply for</div>
              </div>
              {sel.length>0&&<div style={{background:"linear-gradient(135deg,#4F46E5,#7C3AED)",color:"#fff",borderRadius:20,padding:"4px 14px",fontSize:12,fontWeight:700}}>{sel.length} selected</div>}
            </div>
            {jobs.map(function(j) {
              var isSel = sel.indexOf(j.id) !== -1;
              return (
                <div key={j.id} onClick={function(){setSel(function(p){return isSel?p.filter(function(x){return x!==j.id;}):p.concat([j.id]);});}} style={{border:"2px solid "+(isSel?"#4F46E5":"#e2e8f0"),borderRadius:12,padding:"0.875rem",marginBottom:"0.625rem",cursor:"pointer",background:isSel?"rgba(79,70,229,0.04)":"#fafafa",transition:"all 0.15s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{j.title}{isSel&&<span style={{fontSize:10,background:"#4F46E5",color:"#fff",borderRadius:10,padding:"1px 7px",marginLeft:6}}>✓</span>}</div>
                      <div style={{fontSize:12,color:"#64748b",marginBottom:5}}>{j.company} · {j.location}{j.salary?" · "+j.salary:""}</div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        <span style={{fontSize:11,padding:"2px 7px",borderRadius:10,background:"#f0f4ff",color:"#4F46E5",border:"1px solid #c7d2fe"}}>{j.source}</span>
                        {(j.reasons||[]).map(function(r,ri){return <span key={ri} style={{fontSize:11,padding:"2px 7px",borderRadius:10,background:"#f5f3ff",color:"#6d28d9",border:"1px solid #ddd6fe"}}>{r}</span>;})}
                      </div>
                      {j.gap&&<div style={{fontSize:11,color:"#D97706",marginTop:4}}>Gap: {j.gap}</div>}
                    </div>
                    <div style={{textAlign:"center",background:j.score!==null?sb(j.score):"#f8fafc",borderRadius:8,padding:"7px 10px",marginLeft:10,border:"1px solid "+(j.score!==null?sc(j.score)+"44":"#e2e8f0"),flexShrink:0}}>
                      <div style={{fontWeight:800,fontSize:18,color:j.score!==null?sc(j.score):"#94a3b8"}}>{j.score!==null?j.score+"%":"–"}</div>
                      <div style={{fontSize:10,color:j.score!==null?sc(j.score):"#94a3b8"}}>match</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div style={{display:"flex",gap:8,marginTop:"0.5rem"}}>
              <button onClick={function(){setStep(2);}} style={BS}>← Back</button>
              <button onClick={doGenQs} disabled={!sel.length} style={{...BP,flex:1,opacity:sel.length?1:0.4}}>Continue with {sel.length} Job{sel.length!==1?"s":""} →</button>
            </div>
          </div>
        )}

        {/* STEP 4 — Questions */}
        {step===4&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>💡 Quick Questions</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>Your answers improve resume personalisation (all optional)</div>
            <Tabs/>
            {sel.map(function(id) {
              if (id!==activeJob) return null;
              return (
                <div key={id}>
                  {(qs[id]||[]).map(function(q,i) {
                    return (
                      <div key={i} style={{marginBottom:"0.875rem",background:"#fffbeb",borderRadius:10,padding:"0.875rem",border:"1px solid #fde68a"}}>
                        <label style={{fontSize:13,fontWeight:600,display:"block",marginBottom:6,color:"#92400e"}}>💬 {q}</label>
                        <input value={(ans[id]&&ans[id][i])||""} onChange={function(e){var v=e.target.value;setAns(function(p){var c=Object.assign({},p);c[id]=Object.assign({},c[id]);c[id][i]=v;return c;});}} placeholder="Your answer (optional)" style={{...IP,marginBottom:0,background:"#fff"}}/>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <div style={{display:"flex",gap:8}}>
              <button onClick={function(){setStep(3);}} style={BS}>← Back</button>
              <button onClick={doBuild} style={{...BP,flex:1}}>Build Tailored Resume →</button>
            </div>
          </div>
        )}

        {/* STEP 5 — Resume */}
        {step===5&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>📄 ATS-Tailored Resume</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>Keyword-optimised for each job</div>
            <Tabs/>
            {sel.map(function(id) {
              if (id!==activeJob) return null;
              var td = tailored[id];
              if (!td) return <div key={id} style={{padding:"1rem",background:"#fff7ed",borderRadius:8,fontSize:13,color:"#92400e"}}>Not ready. Go back.</div>;
              return (
                <div key={id}>
                  <Preview id={id}/>
                  {td.ats_tips&&td.ats_tips.length>0&&(
                    <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"0.75rem",marginBottom:"1rem"}}>
                      <div style={{fontWeight:700,color:"#059669",fontSize:12,marginBottom:5}}>✅ ATS Optimisation Tips</div>
                      {td.ats_tips.map(function(t,i){return <div key={i} style={{color:"#065f46",fontSize:13,marginBottom:2}}>• {t}</div>;})}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={function(){setStep(4);}} style={BS}>← Back</button>
                    <button onClick={function(){doDownload(id);}} style={{...BP,background:"linear-gradient(135deg,#059669,#0891b2)"}}>⬇ Download Resume</button>
                    <button onClick={function(){setStep(6);}} style={{...BP,flex:1}}>Cover Letter →</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 6 — Apply */}
        {step===6&&(
          <div style={CD}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>🚀 Apply</div>
            <div style={{fontSize:12,color:"#64748b",marginBottom:"1rem"}}>Resume + cover letter ready</div>
            <Tabs/>
            {(function(){
              var id = activeJob||sel[0];
              var job = null; for(var i=0;i<jobs.length;i++){if(jobs[i].id===id){job=jobs[i];break;}}
              var td = tailored[id];
              if (!td) return <div style={{padding:"1rem",background:"#fff7ed",borderRadius:8,fontSize:13}}>No data. Go back.</div>;
              return (
                <div>
                  <Preview id={id}/>
                  {td.cover_letter&&(
                    <div style={{background:"#f5f3ff",borderRadius:10,padding:"1.25rem",marginBottom:"1rem",border:"1px solid #ddd6fe"}}>
                      <div style={{fontSize:11,fontWeight:700,color:"#6d28d9",marginBottom:8}}>✉️ COVER LETTER — {job&&job.title} at {job&&job.company}</div>
                      <pre style={{margin:0,fontSize:13,lineHeight:1.75,whiteSpace:"pre-wrap",fontFamily:"inherit",color:"#334155"}}>{td.cover_letter}</pre>
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={function(){setStep(5);}} style={BS}>← Back</button>
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