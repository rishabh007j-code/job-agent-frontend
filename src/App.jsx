import { useState, useRef } from "react";

var STEPS = ["Upload", "Verify", "Preferences", "Find Jobs", "AI Questions", "Resume", "Apply"];

var SAMPLE_JOBS = [
  { id:1, title:"Senior Business Analyst", company:"Meesho", location:"Bengaluru", salary:"22-32 LPA", source:"LinkedIn", posted:"1 day ago", jd:"Senior Business Analyst to drive data-informed decisions across supply chain and seller ecosystem. Own reporting dashboards, define KPIs, conduct root cause analyses, partner with product and ops teams. 6+ years in business analysis or analytics. Strong SQL, Excel, storytelling skills. Tableau or Looker preferred. Experience with large user base analytics a plus." },
  { id:2, title:"Senior Data Analyst", company:"PhonePe", location:"Bengaluru", salary:"25-38 LPA", source:"Naukri", posted:"Today", jd:"Senior Data Analyst for payments and financial services. Build analytical models, track business metrics, present insights to leadership. 5-8 years in data analytics, SQL, Python, BI tools. Fintech or payments domain a strong plus. Experience with funnel analytics and CRM a plus." },
  { id:3, title:"Growth Analyst", company:"Zepto", location:"Bengaluru", salary:"18-28 LPA", source:"IIMJobs", posted:"2 days ago", jd:"Growth Analyst to run experiments, analyse acquisition and retention funnels, identify GMV growth levers. 4-7 years growth or product analytics. SQL fluency, cohort analysis, experimentation mindset, A/B testing. Quick-commerce or e-commerce background preferred." },
  { id:4, title:"Analytics Manager", company:"Swiggy", location:"Bengaluru", salary:"35-50 LPA", source:"LinkedIn", posted:"3 days ago", jd:"Analytics Manager to lead a team of analysts for restaurant and logistics verticals. Set analytics roadmap, mentor junior analysts, work with senior stakeholders to shape strategy. 7-9 years in analytics, at least 2 years in a lead or manager role. Expertise in SQL, Python or R, data visualisation tools. Strong communication and leadership skills essential." },
  { id:5, title:"Growth Manager Retention", company:"CRED", location:"Bengaluru", salary:"28-42 LPA", source:"IIMJobs", posted:"1 day ago", jd:"Growth Manager for member retention and engagement. Own lifecycle campaigns, analyse churn signals, run A/B tests, collaborate with product and marketing. 5-8 years in growth, CRM or lifecycle analytics. Strong analytical skills, CleverTap or MoEngage experience, data-first mindset required." },
  { id:6, title:"Senior Operations Analyst", company:"Delhivery", location:"Bengaluru", salary:"20-30 LPA", source:"Naukri", posted:"4 days ago", jd:"Senior Operations Analyst to optimise last-mile delivery operations. Build operational dashboards, identify process inefficiencies, work with field teams. 6-8 years in operations or supply chain analytics. SQL, Python, Excel. Experience in logistics or e-commerce operations highly preferred." },
  { id:7, title:"Business Analyst Strategy", company:"Razorpay", location:"Bengaluru", salary:"24-36 LPA", source:"LinkedIn", posted:"Today", jd:"Business Analyst for GTM decisions, merchant analytics, and competitive intelligence. Work directly with business heads on strategic initiatives. 5-7 years in business analysis, strategy consulting or ops. Strong SQL and presentation skills. Startup or fintech experience preferred." },
];

const API_BASE = typeof import.meta !== 'undefined' && import.meta.env
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  : 'http://localhost:3001';

async function callClaude(system, user, maxTok) {
  try {
    var r = await fetch(API_BASE + '/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system: system, user: user, maxTokens: maxTok || 2000 }),
    });
    var d = await r.json();
    return d.text || '';
  } catch(e) { return ''; }
}

function parseJSON(raw) {
  if (!raw) return null;
  var clean = raw.replace(/```json/g,"").replace(/```/g,"").trim();
  try { return JSON.parse(clean); } catch(e) {}
  var om = clean.match(/\{[\s\S]*\}/); if (om) { try { return JSON.parse(om[0]); } catch(e) {} }
  var am = clean.match(/\[[\s\S]*\]/); if (am) { try { return JSON.parse(am[0]); } catch(e) {} }
  return null;
}

function sanitizeExp(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(function(e) {
    return {
      title: String(e.title||""), company: String(e.company||""), duration: String(e.duration||""),
      projects: Array.isArray(e.projects) ? e.projects.map(function(p) {
        return { name:String(p.name||""), description:String(p.description||""), tech:String(p.tech||"") };
      }) : []
    };
  }).filter(function(e) { return e.company || e.title; });
}

function flattenSkills(arr) {
  if (!Array.isArray(arr)) return [];
  var result = [];
  arr.forEach(function(s) {
    if (typeof s !== "string") return;
    var cleaned = s.replace(/^[A-Za-z &]+:/,"").trim();
    cleaned.split(/,(?![^(]*\))/).forEach(function(part) {
      var t = part.trim().replace(/^[-*]\s*/,"");
      if (t && t.length > 1 && t.length < 60) result.push(t);
    });
  });
  return result.filter(function(s,i,a) { return a.indexOf(s)===i; });
}

// Extract education from raw resume text — returns "Degree, University (Year)"
function extractEducation(text) {
  var lines = text.split("\n").map(function(l){return l.trim();}).filter(Boolean);
  var eduIdx = -1;
  for (var i=0; i<lines.length; i++) {
    if (/^EDUCATION$/i.test(lines[i])) { eduIdx = i; break; }
  }
  if (eduIdx < 0) return "";
  var uni = lines[eduIdx+1] || "";
  var deg = lines[eduIdx+2] || "";
  if (uni && deg) return deg.split(",").slice(0,2).join(",").trim() + " — " + uni.split("|")[0].trim();
  return uni.split("|")[0].trim();
}

// Extract all experience blocks from raw text as hard fallback
function extractExpFromText(text) {
  var lines = text.split("\n").map(function(l){return l.trim();}).filter(Boolean);
  var roles = [];
  var cur = null;
  var inExp = false;
  for (var i=0; i<lines.length; i++) {
    var l = lines[i];
    if (/^(WORK EXPERIENCE|FREELANCING|EXPERIENCE)$/i.test(l)) { inExp = true; continue; }
    if (/^(EDUCATION|SKILLS|CERTIFICATIONS)$/i.test(l)) { inExp = false; }
    if (!inExp) continue;
    var isRoleHeader = l.indexOf("|") > 0 && /\d{4}/.test(l);
    if (isRoleHeader) {
      if (cur) roles.push(cur);
      var parts = l.split("|");
      var company = parts[0].trim();
      var duration = parts.slice(1).join("|").trim();
      var titleLine = lines[i+1] || "";
      cur = { title:titleLine, company:company, duration:duration, projects:[] };
      i++;
    } else if (cur && l.length > 15) {
      cur.projects.push({ name:"", description:l.replace(/^[-*\u2022]\s*/,""), tech:"" });
    }
  }
  if (cur) roles.push(cur);
  return sanitizeExp(roles);
}

var INP = { width:"100%", padding:"0.5rem 0.75rem", borderRadius:8, border:"1px solid var(--color-border-secondary)", fontSize:13, fontFamily:"var(--font-sans)", background:"var(--color-background-secondary)", color:"var(--color-text-primary)", boxSizing:"border-box" };
var BP = { padding:"0.6rem 1.5rem", borderRadius:8, border:"none", background:"#185FA5", color:"#fff", fontWeight:500, cursor:"pointer", fontSize:14 };
var BS = { padding:"0.6rem 1.2rem", borderRadius:8, border:"1px solid var(--color-border-secondary)", background:"transparent", color:"var(--color-text-primary)", cursor:"pointer", fontSize:14 };

function ResumePDF(props) {
  var profile = props.profile;
  var td = props.tailored;
  if (!profile) return null;
  var exp = (td && td.tailored_experience && td.tailored_experience.length) ? td.tailored_experience : (profile.experience||[]);
  var kws = (td && td.keywords_added) ? td.keywords_added : [];
  var skills = profile.skills||[];
  var allSkills = skills.concat(kws.filter(function(k){return skills.indexOf(k)<0;}));
  var displayTitle = (td && td.tailored_title) ? td.tailored_title : (profile.current_title||"");
  var summary = (td && td.tailored_summary) ? td.tailored_summary : (profile.summary||"");
  var metaParts = [];
  if (profile.location) metaParts.push(profile.location);
  if (profile.experience_years) metaParts.push(profile.experience_years + " yrs exp");
  if (profile.education) metaParts.push(profile.education);

  return (
    <div style={{background:"#fff",color:"#111",fontFamily:"Arial,sans-serif",padding:"36px 44px",maxWidth:700,margin:"0 auto",boxShadow:"0 2px 20px rgba(0,0,0,0.12)",borderRadius:4}}>
      {/* Header */}
      <div style={{marginBottom:12}}>
        <h1 style={{fontSize:22,fontWeight:700,color:"#0a1628",margin:"0 0 2px"}}>{profile.name || "Name missing — please verify in Step 2"}</h1>
        <div style={{fontSize:13,color:"#185FA5",fontWeight:700,margin:"0 0 4px"}}>{displayTitle}</div>
        <div style={{fontSize:10,color:"#555"}}>{metaParts.join("  |  ")}</div>
      </div>
      <hr style={{border:"none",borderTop:"2.5px solid #185FA5",margin:"0 0 12px"}}/>

      {/* Summary */}
      {summary ? (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:1.2,color:"#185FA5",textTransform:"uppercase",borderBottom:"1px solid #dde3ee",paddingBottom:2,marginBottom:6}}>Professional Summary</div>
          <p style={{margin:0,fontSize:11,lineHeight:1.7}}>{summary}</p>
        </div>
      ) : null}

      {/* Skills */}
      {allSkills.length > 0 ? (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:1.2,color:"#185FA5",textTransform:"uppercase",borderBottom:"1px solid #dde3ee",paddingBottom:2,marginBottom:6}}>Core Competencies</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
            {allSkills.map(function(s,i) {
              var isKw = kws.indexOf(s)>=0;
              return <span key={i} style={{padding:"2px 7px",borderRadius:2,fontSize:9.5,background:isKw?"#dbeafe":"#f3f4f6",color:isKw?"#1e40af":"#374151",border:isKw?"1px solid #93c5fd":"1px solid #e5e7eb",fontWeight:isKw?700:400}}>{s}</span>;
            })}
          </div>
        </div>
      ) : null}

      {/* Experience */}
      {exp.length > 0 ? (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:1.2,color:"#185FA5",textTransform:"uppercase",borderBottom:"1px solid #dde3ee",paddingBottom:2,marginBottom:8}}>Work Experience</div>
          {exp.map(function(e,i) {
            return (
              <div key={i} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                  <span style={{fontWeight:700,fontSize:12,color:"#0a1628"}}>{e.title}</span>
                  <span style={{fontSize:9,color:"#888"}}>{e.duration}</span>
                </div>
                <div style={{fontSize:10,color:"#185FA5",fontWeight:600,marginBottom:4}}>{e.company}</div>
                {e.projects && e.projects.length > 0 ? (
                  <ul style={{margin:0,paddingLeft:13}}>
                    {e.projects.map(function(p,pi) {
                      return (
                        <li key={pi} style={{fontSize:10,lineHeight:1.6,color:"#222",marginBottom:3}}>
                          {p.name ? <strong>{p.name}: </strong> : null}
                          {p.description}
                          {p.tech ? <em style={{color:"#777"}}> [{p.tech}]</em> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Education */}
      {profile.education ? (
        <div>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:1.2,color:"#185FA5",textTransform:"uppercase",borderBottom:"1px solid #dde3ee",paddingBottom:2,marginBottom:5}}>Education</div>
          <div style={{fontSize:11}}>{profile.education}</div>
        </div>
      ) : null}
    </div>
  );
}

export default function App() {
  var [step,setStep] = useState(0);
  var [resumeText,setResumeText] = useState("");
  var [resumeName,setResumeName] = useState("");
  var [profile,setProfile] = useState(null);
  var [edit,setEdit] = useState(null);
  var [newSkill,setNewSkill] = useState("");
  var [prefs,setPrefs] = useState({role:"",location:"Bengaluru",exp:"",salary:"",notice:""});
  var [jobs,setJobs] = useState([]);
  var [selected,setSelected] = useState({});
  var [loading,setLoading] = useState("");
  var [loadingPct,setLoadingPct] = useState(0);
  var [elapsed,setElapsed] = useState(0);
  var [aiQs,setAiQs] = useState({});
  var [activeQJob,setActiveQJob] = useState(null);
  var [tailored,setTailored] = useState({});
  var [activeJob,setActiveJob] = useState(null);
  var [printMode,setPrintMode] = useState(false);
  var [printJob,setPrintJob] = useState(null);
  var [printTd,setPrintTd] = useState(null);
  var [customJobs,setCustomJobs] = useState([]);
  var [jobInput,setJobInput] = useState("");
  var [jobInputLoading,setJobInputLoading] = useState(false);
  var [showJDPaste,setShowJDPaste] = useState(false);
  var [pendingUrl,setPendingUrl] = useState("");
  var [jdPasteText,setJdPasteText] = useState("");
  var fileRef = useRef();
  var timerRef = useRef(null);

  function getSelJobs() { return jobs.filter(function(j){return !!selected[j.id];}); }

  function startTimer(pct) {
    setElapsed(0); setLoadingPct(pct||10);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(function(){setElapsed(function(t){return t+1;});},1000);
  }
  function stopTimer() {
    if (timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}
    setElapsed(0); setLoadingPct(0); setLoading("");
  }

  function scColor(s){return s>=80?"#1D9E75":s>=60?"#BA7517":"#A32D2D";}
  function scBg(s){return s>=80?"#E1F5EE":s>=60?"#FAEEDA":"#FCEBEB";}

  function upEdit(k,v){setEdit(function(p){var n=Object.assign({},p);n[k]=v;return n;});}
  function addSkill(){var s=newSkill.trim();if(!s)return;setEdit(function(p){return Object.assign({},p,{skills:(p.skills||[]).concat([s])});});setNewSkill("");}
  function rmSkill(i){setEdit(function(p){return Object.assign({},p,{skills:p.skills.filter(function(_,x){return x!==i;})});});}
  function upExp(i,k,v){setEdit(function(p){var e=p.experience.map(function(x,xi){return xi===i?Object.assign({},x,{[k]:v}):x;});return Object.assign({},p,{experience:e});});}
  function rmExp(i){setEdit(function(p){return Object.assign({},p,{experience:p.experience.filter(function(_,x){return x!==i;})});});}
  function addExp(){setEdit(function(p){return Object.assign({},p,{experience:[{title:"",company:"",duration:"",projects:[]}].concat(p.experience)});});}
  function upProj(ei,pi,k,v){setEdit(function(p){var e=p.experience.map(function(exp,xi){if(xi!==ei)return exp;var pr=exp.projects.map(function(proj,pxi){return pxi===pi?Object.assign({},proj,{[k]:v}):proj;});return Object.assign({},exp,{projects:pr});});return Object.assign({},p,{experience:e});});}
  function rmProj(ei,pi){setEdit(function(p){var e=p.experience.map(function(exp,xi){if(xi!==ei)return exp;return Object.assign({},exp,{projects:exp.projects.filter(function(_,x){return x!==pi;})});});return Object.assign({},p,{experience:e});});}
  function addProj(ei){setEdit(function(p){var e=p.experience.map(function(exp,xi){if(xi!==ei)return exp;return Object.assign({},exp,{projects:exp.projects.concat([{name:"",description:"",tech:""}])});});return Object.assign({},p,{experience:e});});}
  function setAns(jobId,qi,v){setAiQs(function(prev){var qs=prev[jobId].map(function(q,i){return i===qi?Object.assign({},q,{answer:v}):q;});return Object.assign({},prev,{[jobId]:qs});});}
  function openPrint(job,td){setPrintJob(job);setPrintTd(td);setPrintMode(true);}

  function isURL(str){if(!str)return false;var s=str.trim().toLowerCase();return s.indexOf("http")===0||s.indexOf("www.")===0||s.indexOf("linkedin.com")>=0||s.indexOf("naukri.com")>=0||s.indexOf("indeed.com")>=0||s.indexOf("iimjobs.com")>=0;}

  async function handleAddJob() {
    if (!jobInput.trim()) return;
    if (isURL(jobInput.trim())) { setPendingUrl(jobInput.trim()); setJobInput(""); setJdPasteText(""); setShowJDPaste(true); return; }
    setJobInputLoading(true);
    try {
      var raw = await callClaude("Extract job details. Return ONLY JSON: {title,company,location,salary,jd}. If any field is unclear use empty string.","Parse:\n\n"+jobInput,1500);
      var parsed = parseJSON(raw)||{};
      setCustomJobs(function(prev){return prev.concat([{id:"c_"+Date.now(),title:parsed.title||"Custom Role",company:parsed.company||"Unknown",location:parsed.location||"Not specified",salary:parsed.salary||"Not specified",source:"Added by you",posted:"Just added",jd:parsed.jd||jobInput,isCustom:true}]);});
      setJobInput("");
    } catch(e){}
    setJobInputLoading(false);
  }

  async function handleJDPaste() {
    if (!jdPasteText.trim()) return;
    setJobInputLoading(true);
    try {
      var raw = await callClaude("Extract job details. Return ONLY JSON: {title,company,location,salary,jd}.","URL: "+pendingUrl+"\n\nJD:\n\n"+jdPasteText,1500);
      var parsed = parseJSON(raw)||{};
      setCustomJobs(function(prev){return prev.concat([{id:"c_"+Date.now(),title:parsed.title||"Custom Role",company:parsed.company||"Unknown",location:parsed.location||"Not specified",salary:parsed.salary||"Not specified",source:pendingUrl,posted:"Just added",jd:parsed.jd||jdPasteText,isCustom:true}]);});
      setShowJDPaste(false); setPendingUrl(""); setJdPasteText("");
    } catch(e){}
    setJobInputLoading(false);
  }

  async function parseResume() {
    if (!resumeText.trim()){alert("Please paste or upload your resume first.");return;}
    startTimer(10);

    // Step 1: basic fields
    setLoading("Step 1/3 — Extracting basic details...");
    setLoadingPct(15);
    var basicRaw = await callClaude(
      "Expert resume parser. Return ONLY a JSON object, no markdown. Keys: name (full name), current_title (most recent job title exactly as written), experience_years (integer — sum up all roles), skills (flat array — split grouped skills by comma, strip category labels like 'Tech:' 'Business:' 'Management:'), location (city only), summary (2 sentences about candidate's value).",
      "Parse:\n\n"+resumeText, 1500
    );

    // Step 2: experience
    setLoading("Step 2/3 — Extracting work experience...");
    setLoadingPct(40);
    var expRaw = await callClaude(
      "Expert resume parser. Extract EVERY role including WORK EXPERIENCE and FREELANCING sections. Return ONLY a valid JSON array, no markdown. Each element: {title,company,duration,projects:[{name:'',description,tech:''}]}. One project object per bullet point. Copy bullet text verbatim into description. Order most recent first.",
      "Extract all roles:\n\n"+resumeText, 4000
    );

    setLoading("Step 3/3 — Building profile...");
    setLoadingPct(70);

    var basic = parseJSON(basicRaw)||{};
    var expArr = parseJSON(expRaw);

    // Retry if experience failed
    if (!Array.isArray(expArr)||expArr.length===0) {
      setLoading("Retrying experience extraction...");
      var retry = await callClaude(
        "Extract work experience. Return ONLY a JSON array. Each: {title,company,duration,projects:[{name:'',description,tech:''}]}.",
        "Resume:\n\n"+resumeText, 3500
      );
      expArr = parseJSON(retry);
    }

    // Hard fallback: parse from raw text
    var experience = (Array.isArray(expArr)&&expArr.length>0) ? sanitizeExp(expArr) : extractExpFromText(resumeText);

    var skills = flattenSkills(Array.isArray(basic.skills)?basic.skills:[]);
    // Fallback: extract skills directly from text
    if (skills.length===0) {
      var sm = resumeText.match(/SKILLS[\s\S]{0,5}\n([\s\S]{0,600}?)(?:\n[A-Z]{3,}|\n*$)/i);
      if (sm) { sm[1].replace(/^[A-Za-z &]+:/gm,"").split(/[,\n]/).forEach(function(s){var t=s.trim();if(t&&t.length>1&&t.length<60)skills.push(t);}); }
    }

    var education = String(basic.education||"");
    if (!education) education = extractEducation(resumeText);

    var expYears = parseInt(basic.experience_years)||7;

    var parsed = {
      name: String(basic.name||""),
      current_title: String(basic.current_title||(experience.length?experience[0].title:"")),
      experience_years: expYears,
      skills: skills,
      education: education,
      location: String(basic.location||""),
      summary: String(basic.summary||""),
      experience: experience,
    };
    setProfile(parsed);
    setEdit(JSON.parse(JSON.stringify(parsed)));
    stopTimer();
    setStep(1);
  }

  async function scoreJobs() {
    startTimer(10);
    var allJobs = SAMPLE_JOBS.concat(customJobs);
    var candidateSummary = "Title: "+profile.current_title+"\nYears: "+profile.experience_years+"\nSkills: "+(profile.skills||[]).slice(0,20).join(", ")+"\nBackground: "+profile.summary+"\nTarget: "+prefs.role+"\nSalary: "+prefs.salary;
    var scored = new Array(allJobs.length);
    // Parallel batches of 3
    for (var b=0;b<allJobs.length;b+=3) {
      var batch = allJobs.slice(b,b+3);
      setLoading("Scoring jobs "+(b+1)+"-"+Math.min(b+3,allJobs.length)+" of "+allJobs.length+"...");
      setLoadingPct(Math.round(10+(b/allJobs.length)*80));
      var promises = batch.map(function(job) {
        return callClaude(
          "Senior recruiter scoring one job fit. Be realistic and differentiated. Return ONLY JSON: {score (0-100 integer — 85-95 excellent, 70-84 good, 50-69 partial, below 50 poor),reasons (array of 2 short strength strings),gap (biggest missing requirement or null)}.",
          "CANDIDATE:\n"+candidateSummary+"\n\nJOB: "+job.title+" at "+job.company+"\nJD: "+job.jd, 600
        );
      });
      var results = await Promise.all(promises);
      batch.forEach(function(job,bi) {
        var s = parseJSON(results[bi])||{score:55,reasons:["Profile reviewed","Partial match"],gap:"Verify requirements"};
        scored[b+bi] = Object.assign({},job,{score:Math.min(100,Math.max(0,Number(s.score)||55)),reasons:Array.isArray(s.reasons)?s.reasons.slice(0,2):["Reviewed"],gap:s.gap||null});
      });
    }
    scored.sort(function(a,b){return b.score-a.score;});
    setJobs(scored);
    stopTimer();
    setStep(3);
  }

  async function generateQuestions() {
    var sel = getSelJobs();
    if (!sel.length) return;
    startTimer(15);
    setLoading("Identifying gaps for "+sel.length+" job"+(sel.length>1?"s":"")+"...");
    var jobList = sel.map(function(j,i){return "JOB "+i+": "+j.title+" at "+j.company+"\n"+j.jd;}).join("\n\n---\n\n");
    var raw = await callClaude(
      "Career coach identifying resume gaps. Return ONLY a JSON array of arrays — one inner array per job in same order. Each question: {q,why,type ('text'|'number'|'yesno'),placeholder}. 3-5 questions per job. Focus on missing metrics, tools not mentioned, scale/impact, team size, business outcomes. Do NOT ask about things clearly in the resume.",
      "RESUME:\n"+resumeText+"\n\nPROFILE:"+JSON.stringify({title:profile.current_title,years:profile.experience_years,skills:(profile.skills||[]).slice(0,15)})+"\n\nJOBS:\n"+jobList, 2000
    );
    setLoadingPct(80);
    var allQs = parseJSON(raw);
    var newQs = {};
    sel.forEach(function(job,i) {
      var qs = [];
      if (Array.isArray(allQs)) {
        if (Array.isArray(allQs[i])) qs = allQs[i];
        else if (i===0 && allQs.length>0 && allQs[0] && allQs[0].q) qs = allQs;
      }
      if (!qs.length) qs = [
        {q:"What BI tools have you used most — Tableau, Looker, Power BI, or others?",why:"Specific tool experience increases ATS match.",type:"text",placeholder:"e.g. Looker, Tableau"},
        {q:"What was the total user or customer base you worked with in your last role?",why:"Scale signals seniority.",type:"text",placeholder:"e.g. 100M users at Paytm"},
        {q:"Do you have hands-on experience with Python for data analysis?",why:"Many roles require Python alongside SQL.",type:"yesno",placeholder:""}
      ];
      newQs[job.id] = qs.map(function(q){return {q:String(q.q||""),why:String(q.why||""),type:String(q.type||"text"),placeholder:String(q.placeholder||""),answer:""};});
    });
    setAiQs(newQs);
    setActiveQJob(sel[0].id);
    stopTimer();
    setStep(4);
  }

  async function buildResume() {
    var sel = getSelJobs();
    if (!sel.length) return;
    startTimer(10);
    var results = {};
    for (var i=0;i<sel.length;i++) {
      var job = sel[i];
      setLoading("Building tailored resume for "+job.title+" at "+job.company+" ("+(i+1)+"/"+sel.length+")...");
      setLoadingPct(Math.round(15+(i/sel.length)*65));
      var answered = (aiQs[job.id]||[]).filter(function(q){return q.answer&&q.answer.trim();});
      var extras = answered.length ? "\n\nCANDIDATE ADDITIONAL INFO:\n"+answered.map(function(q){return "- "+q.q+": "+q.answer;}).join("\n") : "";
      var allCo = (profile.experience||[]).map(function(e){return e.company;}).filter(Boolean);

      var raw = await callClaude(
        "Expert ATS resume writer. Rewrite for this specific job. RULES: (1) tailored_experience must include ALL these companies in exact order: "+allCo.join(", ")+" — do not omit any. (2) Only use facts from the resume — never invent. (3) Rewrite every bullet with strong action verbs and JD keywords. (4) Use real metrics from resume: 20K daily signups, 2x reactivations, Rs1Cr bounce reduction, 40K users retained, 100M users, 30% revenue increase, 5x revenue growth. (5) tailored_title must match job title. Return ONLY valid JSON: {tailored_title,tailored_summary (4 sentences with real metrics + JD keywords),keywords_added (8-12 ATS keywords array from JD),tailored_experience (ALL companies — array of {title,company,duration,projects:[{name,description,tech}]}),cover_letter (3 paragraphs using real resume metrics addressing JD)}.",
        "RESUME:\n"+resumeText+"\n\nPROFILE:\n"+JSON.stringify(profile)+"\n\nTARGET: "+job.title+" at "+job.company+"\nJD: "+job.jd+extras, 4000
      );

      var out = parseJSON(raw);

      // Validate completeness
      var hasAllCo = out && Array.isArray(out.tailored_experience) && out.tailored_experience.length >= allCo.length;
      if (!hasAllCo) {
        setLoading("Improving resume completeness...");
        var raw2 = await callClaude(
          "Rewrite ALL work experience for this job. Return ONLY a JSON array. All companies in order: "+allCo.join(", ")+". Each: {title,company,duration,projects:[{name:'',description,tech:''}]}. Use action verbs and JD keywords. Use real metrics from resume.",
          "RESUME:\n"+resumeText+"\nJOB: "+job.title+" at "+job.company+"\nJD: "+job.jd, 3500
        );
        var expOnly = parseJSON(raw2);
        if (Array.isArray(expOnly)&&expOnly.length>=allCo.length) {
          if (!out) out = {tailored_title:job.title,tailored_summary:"",keywords_added:[],tailored_experience:[],cover_letter:""};
          out.tailored_experience = sanitizeExp(expOnly);
        }
      }

      if (!out) out = {tailored_title:job.title,tailored_summary:profile.summary||"",keywords_added:[],tailored_experience:profile.experience||[],cover_letter:""};

      // Build fallback cover letter with real metrics if missing
      if (!out.cover_letter||out.cover_letter.length<100) {
        out.cover_letter = "Dear Hiring Manager,\n\nI am excited to apply for the "+job.title+" role at "+job.company+". With "+profile.experience_years+" years of experience in analytics and growth, I have a proven track record of delivering measurable business impact — including scaling daily user sign-ups from 2K to 20K at Paytm Payments Bank, driving 2x wallet reactivations in 4 months, and reducing churn by 4% retaining ~40K additional users monthly at Slice.\n\nMy expertise spans funnel analytics, CRM optimisation, stakeholder management, and leading teams of analysts, making me well-suited for the requirements of this role. I thrive in data-driven, fast-paced environments and consistently translate analytics into actionable business strategy.\n\nThank you for considering my application. I would love the opportunity to discuss how my background aligns with "+job.company+"'s goals.";
      }

      out._tailored = !!(out.tailored_summary&&out.keywords_added&&out.keywords_added.length>0);
      results[job.id] = out;
    }
    setTailored(results);
    setActiveJob(sel[0].id);
    stopTimer();
    setStep(5);
  }

  function ResumePanel(props) {
    var jobId = props.jobId;
    var curJob = jobs.find(function(j){return j.id===jobId;});
    var td = tailored[jobId];
    if (!curJob||!td) return <div style={{fontSize:13,color:"var(--color-text-secondary)",padding:"1rem"}}>Resume not ready. Go back and rebuild.</div>;
    return (
      <div style={{border:"1px solid var(--color-border-secondary)",borderRadius:10,overflow:"hidden",marginBottom:"1rem"}}>
        <div style={{background:"var(--color-background-secondary)",padding:"0.55rem 1rem",fontSize:12,display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid var(--color-border-tertiary)"}}>
          <span style={{fontWeight:500,color:"var(--color-text-primary)"}}>{curJob.title} at {curJob.company}</span>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {td._tailored
              ? <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#E1F5EE",color:"#0F6E56",fontWeight:600}}>ATS-optimised</span>
              : <span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#FAEEDA",color:"#854F0B",fontWeight:600}}>Fallback — retry if needed</span>}
            {td.keywords_added&&td.keywords_added.length>0&&<span style={{fontSize:11,color:"var(--color-text-tertiary)"}}>{td.keywords_added.length} keywords</span>}
          </div>
        </div>
        <div style={{padding:"1.5rem",background:"#ececea",overflowY:"auto",maxHeight:600}}>
          <ResumePDF job={curJob} profile={profile} tailored={td}/>
        </div>
      </div>
    );
  }

  function JobTabs(props) {
    var sel = getSelJobs();
    if (sel.length<=1) return null;
    return (
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:"1rem"}}>
        {sel.map(function(job){var active=props.activeId===job.id;return <button key={job.id} onClick={function(){props.onSelect(job.id);}} style={{padding:"0.35rem 0.9rem",borderRadius:20,border:"1px solid "+(active?"#185FA5":"var(--color-border-secondary)"),background:active?"#EBF3FD":"var(--color-background-secondary)",color:active?"#185FA5":"var(--color-text-primary)",fontSize:13,cursor:"pointer",fontWeight:active?500:400}}>{job.company}</button>;})}
      </div>
    );
  }

  if (printMode&&printJob&&printTd) {
    return (
      <div>
        <style dangerouslySetInnerHTML={{__html:"@media print{.noprint{display:none!important}body{margin:0;background:#fff}}"}}/>
        <div className="noprint" style={{background:"#185FA5",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
          <span style={{color:"#fff",fontSize:13,fontWeight:500}}>Press Ctrl+P then set destination to Save as PDF</span>
          <div style={{display:"flex",gap:8}}>
            <button onClick={function(){window.print();}} style={{padding:"6px 18px",borderRadius:6,border:"none",background:"#fff",color:"#185FA5",fontWeight:600,cursor:"pointer",fontSize:13}}>Print / Save as PDF</button>
            <button onClick={function(){setPrintMode(false);}} style={{padding:"6px 14px",borderRadius:6,border:"1px solid rgba(255,255,255,0.5)",background:"transparent",color:"#fff",cursor:"pointer",fontSize:13}}>Back</button>
          </div>
        </div>
        <div style={{background:"#f0f0ee",padding:"24px",minHeight:"100vh"}}>
          <ResumePDF job={printJob} profile={profile} tailored={printTd}/>
        </div>
      </div>
    );
  }

  if (showJDPaste) {
    return (
      <div style={{fontFamily:"var(--font-sans)",color:"var(--color-text-primary)",maxWidth:780,margin:"0 auto",padding:"1.5rem 1rem"}}>
        <h3 style={{fontWeight:500,fontSize:16,margin:"0 0 1rem"}}>Paste job description</h3>
        <div style={{padding:"0.75rem 1rem",background:"#FAEEDA",border:"1px solid #EF9F27",borderRadius:8,marginBottom:"1rem",fontSize:13,color:"#854F0B"}}>
          <strong>URL detected:</strong> {pendingUrl}<br/>Claude cannot browse URLs. Open the link, copy the full job description text, paste below.
        </div>
        <label style={{fontSize:13,fontWeight:500,display:"block",marginBottom:6}}>Full job description text:</label>
        <textarea value={jdPasteText} onChange={function(e){setJdPasteText(e.target.value);}} rows={14} placeholder="Paste the complete job description here..." style={Object.assign({},INP,{resize:"vertical"})}/>
        <div style={{display:"flex",gap:8,marginTop:"1rem"}}>
          <button onClick={function(){setShowJDPaste(false);setPendingUrl("");setJdPasteText("");}} style={BS}>Cancel</button>
          <button onClick={handleJDPaste} disabled={!jdPasteText.trim()||jobInputLoading} style={Object.assign({},BP,{background:jdPasteText.trim()?"#185FA5":"var(--color-border-secondary)",cursor:jdPasteText.trim()?"pointer":"not-allowed"})}>{jobInputLoading?"Parsing...":"Add this job"}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{fontFamily:"var(--font-sans)",color:"var(--color-text-primary)",maxWidth:780,margin:"0 auto",padding:"1.5rem 1rem"}}>
      <h2 style={{fontSize:20,fontWeight:500,margin:"0 0 4px"}}>AI Job Application Agent</h2>
      <p style={{fontSize:13,color:"var(--color-text-secondary)",margin:"0 0 1.5rem"}}>Upload resume, match jobs, answer AI questions, get ATS-optimised resume and cover letter</p>

      {/* Stepper */}
      <div style={{display:"flex",marginBottom:"2rem"}}>
        {STEPS.map(function(s,i){return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
            <div style={{width:"100%",display:"flex",alignItems:"center"}}>
              {i>0?<div style={{flex:1,height:2,background:i<=step?"#185FA5":"var(--color-border-tertiary)"}}/>:null}
              <div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:500,flexShrink:0,background:i<step?"#185FA5":i===step?"#E6F1FB":"var(--color-background-secondary)",color:i<step?"#fff":i===step?"#185FA5":"var(--color-text-tertiary)",border:i===step?"2px solid #185FA5":"none"}}>
                {i<step?"v":i+1}
              </div>
              {i<STEPS.length-1?<div style={{flex:1,height:2,background:i<step?"#185FA5":"var(--color-border-tertiary)"}}/>:null}
            </div>
            <span style={{fontSize:9,marginTop:4,textAlign:"center",color:i===step?"var(--color-text-primary)":"var(--color-text-secondary)",fontWeight:i===step?500:400}}>{s}</span>
          </div>
        );})}
      </div>

      {/* Loading */}
      {loading?(
        <div style={{padding:"0.85rem 1rem",background:"#E6F1FB",border:"1px solid #b3c9ef",borderRadius:8,marginBottom:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
            <span style={{fontSize:13,color:"#185FA5",fontWeight:500}}>{loading}</span>
            <span style={{fontSize:12,color:"#185FA5",fontWeight:600}}>{elapsed}s</span>
          </div>
          <div style={{background:"#c7dcf5",borderRadius:4,height:6,overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:4,background:"#185FA5",width:loadingPct+"%",transition:"width 0.6s ease"}}/>
          </div>
        </div>
      ):null}

      {/* STEP 0 */}
      {step===0?(
        <div>
          <div onClick={function(){fileRef.current.click();}} style={{border:"2px dashed var(--color-border-secondary)",borderRadius:12,padding:"2rem",textAlign:"center",cursor:"pointer",marginBottom:"1rem"}}>
            <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" style={{display:"none"}} onChange={async function(e) {
  var f = e.target.files[0];
  if (!f) return;
  setResumeName(f.name);
  if (f.name.toLowerCase().endsWith('.pdf')) {
    var formData = new FormData();
    formData.append('resume', f);
    try {
      var r = await fetch(API_BASE + '/api/extract-pdf', { method:'POST', body:formData });
      var d = await r.json();
      setResumeText(d.text || '');
    } catch(e) { setResumeText(''); }
  } else {
    setResumeText(await f.text().catch(function(){ return ''; }));
  }
}}/>
            <div style={{fontSize:28,marginBottom:6}}>📄</div>
            <div style={{fontWeight:500,marginBottom:3}}>{resumeName||"Click to upload resume"}</div>
            <div style={{fontSize:12,color:"var(--color-text-secondary)"}}>PDF, DOCX or TXT — or paste text below</div>
          </div>
          <textarea value={resumeText} onChange={function(e){setResumeText(e.target.value);}} placeholder="Paste your full resume here including all job titles, bullet points and projects..." rows={10} style={Object.assign({},INP,{resize:"vertical"})}/>
          <button onClick={parseResume} style={Object.assign({},BP,{marginTop:"1rem"})}>Parse resume</button>
        </div>
      ):null}

      {/* STEP 1 */}
      {step===1&&edit?(
        <div>
          <div style={{padding:"0.7rem 1rem",background:"#FAEEDA",border:"1px solid #EF9F27",borderRadius:8,marginBottom:"1.2rem",fontSize:13,color:"#854F0B"}}>
            Review and correct everything before continuing — this is what AI uses to tailor your resume.
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 1rem"}}>
            <div style={{marginBottom:"0.8rem"}}><label style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Full name</label><input value={edit.name||""} onChange={function(e){upEdit("name",e.target.value);}} placeholder="e.g. Rishabh Jain" style={INP}/></div>
            <div style={{marginBottom:"0.8rem"}}><label style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Current title</label><input value={edit.current_title||""} onChange={function(e){upEdit("current_title",e.target.value);}} placeholder="e.g. Assistant Manager, Analytics" style={INP}/></div>
            <div style={{marginBottom:"0.8rem"}}><label style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Years of experience</label><input type="number" value={edit.experience_years||""} onChange={function(e){upEdit("experience_years",Number(e.target.value));}} placeholder="7" style={INP}/></div>
            <div style={{marginBottom:"0.8rem"}}><label style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Location</label><input value={edit.location||""} onChange={function(e){upEdit("location",e.target.value);}} placeholder="Bengaluru" style={INP}/></div>
          </div>
          <div style={{marginBottom:"0.8rem"}}><label style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Education</label><input value={edit.education||""} onChange={function(e){upEdit("education",e.target.value);}} placeholder="B.Tech Engineering Physics, Delhi Technological University 2018" style={INP}/></div>
          <div style={{marginBottom:"0.8rem"}}><label style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",display:"block",marginBottom:4}}>Summary</label><textarea value={edit.summary||""} onChange={function(e){upEdit("summary",e.target.value);}} rows={3} style={Object.assign({},INP,{resize:"vertical"})}/></div>

          <div style={{marginBottom:"1rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <label style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)"}}>Work experience — {(edit.experience||[]).length} roles extracted</label>
              <button onClick={addExp} style={{fontSize:12,padding:"2px 10px",borderRadius:6,border:"1px solid var(--color-border-secondary)",background:"transparent",cursor:"pointer"}}>+ Add role</button>
            </div>
            {!(edit.experience&&edit.experience.length)?<div style={{fontSize:12,color:"var(--color-text-tertiary)",fontStyle:"italic",marginBottom:8}}>No roles found. Please paste the full resume text in Step 0.</div>:null}
            {(edit.experience||[]).map(function(exp,i){return (
              <div key={i} style={{border:"1px solid var(--color-border-secondary)",borderRadius:8,padding:"0.75rem",marginBottom:10,background:"var(--color-background-secondary)"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 0.8fr auto",gap:6,marginBottom:10}}>
                  <div><div style={{fontSize:10,color:"var(--color-text-tertiary)",marginBottom:2}}>JOB TITLE</div><input value={exp.title} onChange={function(e){upExp(i,"title",e.target.value);}} placeholder="Job title" style={Object.assign({},INP,{fontSize:12})}/></div>
                  <div><div style={{fontSize:10,color:"var(--color-text-tertiary)",marginBottom:2}}>COMPANY</div><input value={exp.company} onChange={function(e){upExp(i,"company",e.target.value);}} placeholder="Company" style={Object.assign({},INP,{fontSize:12})}/></div>
                  <div><div style={{fontSize:10,color:"var(--color-text-tertiary)",marginBottom:2}}>DURATION</div><input value={exp.duration} onChange={function(e){upExp(i,"duration",e.target.value);}} placeholder="2021-2023" style={Object.assign({},INP,{fontSize:12})}/></div>
                  <div style={{display:"flex",alignItems:"flex-end",paddingBottom:2}}><span onClick={function(){rmExp(i);}} style={{cursor:"pointer",fontSize:18,color:"var(--color-text-tertiary)",lineHeight:1}}>x</span></div>
                </div>
                <div style={{borderLeft:"3px solid var(--color-border-secondary)",paddingLeft:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:10,fontWeight:600,color:"var(--color-text-tertiary)"}}>BULLET POINTS ({(exp.projects||[]).length})</span>
                    <button onClick={function(){addProj(i);}} style={{fontSize:10,padding:"1px 8px",borderRadius:5,border:"1px solid var(--color-border-secondary)",background:"transparent",cursor:"pointer"}}>+ Add</button>
                  </div>
                  {!(exp.projects&&exp.projects.length)?<div style={{fontSize:11,color:"var(--color-text-tertiary)",fontStyle:"italic",marginBottom:4}}>No bullets found</div>:null}
                  {(exp.projects||[]).map(function(proj,pi){return (
                    <div key={pi} style={{marginBottom:8,padding:"6px 8px",background:"var(--color-background-primary)",borderRadius:6,border:"1px solid var(--color-border-tertiary)"}}>
                      <div style={{display:"flex",gap:5,marginBottom:5,alignItems:"center"}}>
                        <input value={proj.name} onChange={function(e){upProj(i,pi,"name",e.target.value);}} placeholder="Label (optional)" style={Object.assign({},INP,{flex:1,fontSize:11})}/>
                        <input value={proj.tech} onChange={function(e){upProj(i,pi,"tech",e.target.value);}} placeholder="Tools" style={Object.assign({},INP,{flex:0.7,fontSize:11})}/>
                        <span onClick={function(){rmProj(i,pi);}} style={{cursor:"pointer",fontSize:16,color:"var(--color-text-tertiary)",lineHeight:1}}>x</span>
                      </div>
                      <input value={proj.description} onChange={function(e){upProj(i,pi,"description",e.target.value);}} placeholder="What you did and the impact" style={Object.assign({},INP,{fontSize:11})}/>
                    </div>
                  );})}
                </div>
              </div>
            );})}
          </div>

          <div style={{marginBottom:"1rem"}}>
            <label style={{fontSize:12,fontWeight:500,color:"var(--color-text-secondary)",display:"block",marginBottom:6}}>Skills ({(edit.skills||[]).length} extracted)</label>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
              {(edit.skills||[]).map(function(sk,i){return <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,background:"var(--color-background-info)",color:"#185FA5",fontSize:12,border:"1px solid var(--color-border-info)"}}>{sk}<span onClick={function(){rmSkill(i);}} style={{cursor:"pointer",fontSize:14,lineHeight:1,opacity:0.6}}>x</span></span>;})}
              {!(edit.skills&&edit.skills.length)?<span style={{fontSize:12,color:"var(--color-text-tertiary)"}}>No skills — add manually</span>:null}
            </div>
            <div style={{display:"flex",gap:6}}>
              <input value={newSkill} onChange={function(e){setNewSkill(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")addSkill();}} placeholder="Type a skill and press Enter" style={Object.assign({},INP,{flex:1})}/>
              <button onClick={addSkill} style={Object.assign({},BP,{padding:"0.5rem 1rem"})}>Add</button>
            </div>
          </div>

          <div style={{display:"flex",gap:8}}>
            <button onClick={function(){setStep(0);}} style={BS}>Back</button>
            <button onClick={function(){if(!edit){alert("Profile not loaded.");return;}setProfile(JSON.parse(JSON.stringify(edit)));setStep(2);}} style={BP}>Confirm and continue</button>
          </div>
        </div>
      ):null}

      {/* STEP 2 */}
      {step===2?(
        <div>
          <h3 style={{fontWeight:500,fontSize:16,marginBottom:"1rem"}}>Job preferences</h3>
          {[["Target roles","role","e.g. Growth Manager, Analytics Manager, Business Analyst"],["Location","location","e.g. Bengaluru, Remote"],["Total experience","exp","e.g. 7 years"],["Expected salary","salary","e.g. 30 LPA"],["Notice period","notice","e.g. 30 days"]].map(function(f){return (
            <div key={f[1]} style={{marginBottom:"0.85rem"}}>
              <label style={{fontSize:13,fontWeight:500,display:"block",marginBottom:4}}>{f[0]}</label>
              <input value={prefs[f[1]]} onChange={function(e){setPrefs(function(p){return Object.assign({},p,{[f[1]]:e.target.value});});}} placeholder={f[2]} style={INP}/>
            </div>
          );})}
          <div style={{marginTop:"1.5rem",paddingTop:"1rem",borderTop:"1px solid var(--color-border-tertiary)"}}>
            <label style={{fontSize:13,fontWeight:500,display:"block",marginBottom:4}}>Add your own job listing (optional)</label>
            <p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"0 0 8px"}}>Paste a job URL or full JD text. If URL, you will be asked to paste the JD text since Claude cannot browse links.</p>
            <textarea value={jobInput} onChange={function(e){setJobInput(e.target.value);}} placeholder="Paste job URL or full job description text..." rows={4} style={Object.assign({},INP,{resize:"vertical",fontSize:12})}/>
            <div style={{display:"flex",gap:8,alignItems:"center",marginTop:6}}>
              <button onClick={handleAddJob} disabled={!jobInput.trim()||jobInputLoading} style={Object.assign({},BP,{padding:"0.5rem 1.2rem",fontSize:13,background:jobInput.trim()?"#185FA5":"var(--color-border-secondary)",cursor:jobInput.trim()?"pointer":"not-allowed"})}>{jobInputLoading?"Parsing...":"+ Add this job"}</button>
              {customJobs.length>0?<span style={{fontSize:12,color:"#1D9E75",fontWeight:500}}>{customJobs.length} custom job{customJobs.length>1?"s":""} added</span>:null}
            </div>
            {customJobs.length>0?(
              <div style={{marginTop:10}}>
                {customJobs.map(function(job){return <div key={job.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 10px",background:"var(--color-background-secondary)",borderRadius:8,marginBottom:5,border:"1px solid var(--color-border-tertiary)",fontSize:12}}><span><strong>{job.title}</strong> at {job.company}</span><span onClick={function(){setCustomJobs(function(p){return p.filter(function(j){return j.id!==job.id;});});}} style={{cursor:"pointer",color:"var(--color-text-tertiary)",fontSize:16,marginLeft:10}}>x</span></div>;})}
              </div>
            ):null}
          </div>
          <div style={{display:"flex",gap:8,marginTop:"1.5rem"}}>
            <button onClick={function(){setStep(1);}} style={BS}>Back</button>
            <button onClick={scoreJobs} style={BP}>Find matching jobs</button>
          </div>
        </div>
      ):null}

      {/* STEP 3 */}
      {step===3?(
        <div>
          <div style={{padding:"0.6rem 1rem",background:"var(--color-background-secondary)",borderRadius:8,marginBottom:"1rem",fontSize:13}}>
            <strong>{profile&&profile.name?profile.name:"You"}</strong> — {profile&&profile.current_title?profile.current_title:""} — {profile&&profile.experience_years?profile.experience_years+" yrs":""} — {profile&&profile.skills?profile.skills.slice(0,5).join(", "):""}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
            <h3 style={{fontWeight:500,fontSize:16,margin:0}}>Matching jobs ({jobs.length})</h3>
            <span style={{fontSize:12,color:"var(--color-text-secondary)"}}>Select the jobs you want to apply for</span>
          </div>
          {jobs.map(function(job){
            var sel=!!selected[job.id];
            return (
              <div key={job.id} onClick={function(){setSelected(function(s){return Object.assign({},s,{[job.id]:!s[job.id]});});}} style={{border:"1.5px solid "+(sel?"#185FA5":"var(--color-border-tertiary)"),borderRadius:10,padding:"0.85rem 1rem",marginBottom:"0.6rem",cursor:"pointer",background:sel?"#EBF3FD":"var(--color-background-secondary)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <input type="checkbox" checked={sel} readOnly style={{accentColor:"#185FA5"}}/>
                      <span style={{fontWeight:500,fontSize:14}}>{job.title}</span>
                      {job.isCustom?<span style={{fontSize:10,padding:"1px 7px",borderRadius:20,background:"#E1F5EE",color:"#0F6E56",fontWeight:600}}>Your listing</span>:null}
                    </div>
                    <div style={{fontSize:12,color:"var(--color-text-secondary)",marginTop:2,marginLeft:22}}>{job.company} — {job.location} — {job.salary} — {job.source} — {job.posted}</div>
                    <div style={{marginTop:5,marginLeft:22,display:"flex",flexWrap:"wrap",gap:4}}>
                      {(job.reasons||[]).map(function(r,i){return <span key={i} style={{fontSize:11,padding:"2px 7px",borderRadius:20,background:"#E1F5EE",color:"#0F6E56"}}>{r}</span>;})}
                      {job.gap?<span style={{fontSize:11,padding:"2px 7px",borderRadius:20,background:"#FAEEDA",color:"#854F0B"}}>Gap: {job.gap}</span>:null}
                    </div>
                  </div>
                  <div style={{textAlign:"center",marginLeft:12}}>
                    <div style={{fontSize:20,fontWeight:600,color:scColor(job.score),background:scBg(job.score),borderRadius:8,padding:"4px 10px",minWidth:50}}>{job.score}%</div>
                    <div style={{fontSize:10,color:"var(--color-text-tertiary)",marginTop:2}}>match</div>
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{display:"flex",gap:8,marginTop:"1rem"}}>
            <button onClick={function(){setStep(2);}} style={BS}>Back</button>
            <button onClick={generateQuestions} disabled={!getSelJobs().length} style={Object.assign({},BP,{background:getSelJobs().length?"#185FA5":"var(--color-border-secondary)",cursor:getSelJobs().length?"pointer":"not-allowed"})}>
              Answer AI questions ({getSelJobs().length} selected)
            </button>
          </div>
        </div>
      ):null}

      {/* STEP 4 */}
      {step===4?(
        <div>
          <h3 style={{fontWeight:500,fontSize:16,marginBottom:"0.4rem"}}>AI-identified gaps</h3>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1rem"}}>Answer these to strengthen your resume. Skip any that don't apply.</p>
          <JobTabs activeId={activeQJob} onSelect={setActiveQJob}/>
          {activeQJob&&(aiQs[activeQJob]||[]).length===0?<div style={{padding:"1rem",background:"var(--color-background-secondary)",borderRadius:8,fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1rem"}}>Your resume covers this role well. No gaps found.</div>:null}
          {(aiQs[activeQJob]||[]).map(function(q,qi){return (
            <div key={qi} style={{border:"1px solid var(--color-border-tertiary)",borderRadius:10,padding:"1rem",marginBottom:"0.8rem",background:"var(--color-background-secondary)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                <div style={{fontSize:14,fontWeight:500,flex:1,lineHeight:1.5}}>{qi+1}. {q.q}</div>
                {q.answer&&q.answer.trim()?<span style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:"#E1F5EE",color:"#0F6E56",marginLeft:8,whiteSpace:"nowrap"}}>Answered</span>:null}
              </div>
              <div style={{fontSize:12,color:"var(--color-text-secondary)",marginBottom:8,fontStyle:"italic"}}>Why this helps: {q.why}</div>
              {q.type==="yesno"?(
                <div style={{display:"flex",gap:8}}>
                  {["Yes","No"].map(function(opt){return <button key={opt} onClick={function(){setAns(activeQJob,qi,opt);}} style={{padding:"0.4rem 1.2rem",borderRadius:8,border:"1px solid "+(q.answer===opt?"#185FA5":"var(--color-border-secondary)"),background:q.answer===opt?"#EBF3FD":"transparent",color:q.answer===opt?"#185FA5":"var(--color-text-primary)",cursor:"pointer",fontSize:13}}>{opt}</button>;})}
                </div>
              ):(
                <input type={q.type==="number"?"number":"text"} value={q.answer||""} onChange={function(e){setAns(activeQJob,qi,e.target.value);}} placeholder={q.placeholder||"Your answer..."} style={INP}/>
              )}
            </div>
          );})}
          <div style={{display:"flex",gap:8,marginTop:"0.5rem"}}>
            <button onClick={function(){setStep(3);}} style={BS}>Back</button>
            <button onClick={buildResume} style={BP}>Build tailored resume</button>
          </div>
        </div>
      ):null}

      {/* STEP 5 */}
      {step===5?(
        <div>
          <h3 style={{fontWeight:500,fontSize:16,marginBottom:"0.4rem"}}>Tailored resume preview</h3>
          <p style={{fontSize:13,color:"var(--color-text-secondary)",marginBottom:"1rem"}}>Review your tailored resume. Use Print / Save as PDF to download it.</p>
          <JobTabs activeId={activeJob} onSelect={setActiveJob}/>
          {activeJob?<ResumePanel jobId={activeJob}/>:null}
          <div style={{display:"flex",gap:8}}>
            <button onClick={function(){setStep(4);}} style={BS}>Back</button>
            {activeJob&&tailored[activeJob]?<button onClick={function(){openPrint(jobs.find(function(j){return j.id===activeJob;}),tailored[activeJob]);}} style={Object.assign({},BS,{color:"#185FA5",borderColor:"#185FA5"})}>Print / Save as PDF</button>:null}
            <button onClick={function(){setStep(6);}} style={BP}>Proceed to apply</button>
          </div>
        </div>
      ):null}

      {/* STEP 6 */}
      {step===6?(function(){
        var sel=getSelJobs();
        var curId=activeJob||(sel.length?sel[0].id:null);
        var curJob=curId?jobs.find(function(j){return j.id===curId;}):null;
        var td=curId?tailored[curId]:null;
        return (
          <div>
            <h3 style={{fontWeight:500,fontSize:16,marginBottom:"0.75rem"}}>Final application</h3>
            <JobTabs activeId={curId} onSelect={setActiveJob}/>
            {!td?(
              <div style={{padding:"1rem",background:"var(--color-background-secondary)",borderRadius:8,fontSize:13,color:"var(--color-text-secondary)"}}>No resume found. Please go back and rebuild.</div>
            ):(
              <div>
                <ResumePanel jobId={curId}/>
                <div style={{padding:"0.75rem 1rem",background:"var(--color-background-secondary)",borderRadius:8,marginBottom:"1rem"}}>
                  <div style={{fontSize:12,color:"var(--color-text-secondary)",fontWeight:500,marginBottom:8}}>COVER LETTER — {curJob&&curJob.title} at {curJob&&curJob.company}</div>
                  <pre style={{margin:0,fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"var(--font-sans)"}}>{td.cover_letter}</pre>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={function(){setStep(5);}} style={BS}>Back</button>
                  <button onClick={function(){openPrint(curJob,td);}} style={Object.assign({},BS,{color:"#185FA5",borderColor:"#185FA5"})}>Print / Save as PDF</button>
                  <button onClick={function(){if(td&&td.cover_letter)navigator.clipboard.writeText(td.cover_letter);}} style={BS}>Copy cover letter</button>
                  <button style={Object.assign({},BP,{background:"#1D9E75"})}>Mark as applied</button>
                </div>
              </div>
            )}
          </div>
        );
      })():null}
    </div>
  );
}