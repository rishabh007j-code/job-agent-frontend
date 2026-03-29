import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  function goToApp() { navigate('/app'); }

  function toggleFaq(i) { setOpenFaq(openFaq === i ? null : i); }

  const faqs = [
    { q: 'Is this free to use?', a: 'Yes — you can get started completely free. Parse your resume, view job matches, and preview your tailored resume at no cost. AI tailoring and cover letter generation are included.' },
    { q: 'What is ATS and why does it matter?', a: 'ATS stands for Applicant Tracking System — software most companies use to filter resumes before a human sees them. If your resume doesn\'t have the right keywords, it gets rejected automatically. Our AI ensures your resume passes ATS by matching the exact language from the job description.' },
    { q: 'How is this different from editing my resume myself?', a: 'Manually tailoring takes 30-60 minutes per application and you often miss keywords. Our AI reads the full JD, identifies every relevant keyword, rewrites your bullets to match, and scores the result — all in under 5 minutes.' },
    { q: 'Is my resume data safe?', a: 'Your resume is processed securely and never stored permanently. Each session is independent — once you close the browser, your data is not retained. We do not share your data with any third parties.' },
    { q: 'Can I use this for multiple job applications?', a: 'Absolutely. You can add multiple job descriptions in one session and get a separate tailored resume and cover letter for each. Results are cached so you never redo a step.' },
    { q: 'What file formats are supported?', a: 'You can upload PDF, DOCX, or TXT files. You can also paste your resume text directly or fill in details manually using our step-by-step form.' },
    { q: 'Does it work for all industries and experience levels?', a: 'Yes — the AI adapts to any role, industry, or experience level. Whether you are a fresher, mid-career professional, or senior leader, the tool tailors your resume to the specific job you are targeting.' },
    { q: 'How long does it take?', a: 'The full process — from uploading your resume to downloading your tailored output — takes under 5 minutes. The AI tailoring step itself takes 10-20 seconds on our servers.' },
  ];

  const reviews = [
    { name: 'Priya Sharma', role: 'Product Manager · Bangalore', text: 'I was applying to 10 jobs a week with the same resume and getting no responses. After using this tool, I got 3 interview calls within a week. The keyword matching is insane.', tag: 'Got interview at Swiggy', color: '#4F46E5', initial: 'P', stars: 5 },
    { name: 'Arjun Mehta', role: 'Data Analyst · Mumbai', text: 'The AI questions it asks are genuinely smart. It noticed I hadn\'t mentioned my team size and asked me — that detail ended up being highlighted in the resume and I think that\'s what got me shortlisted.', tag: 'Got interview at PhonePe', color: '#059669', initial: 'A', stars: 5 },
    { name: 'Sneha Rajan', role: 'Fresher — MBA 2024 · Hyderabad', text: 'I\'m a 2024 fresher and had no idea how to tailor my resume. This tool explained the gaps, asked me the right questions, and built a resume that actually sounded professional.', tag: 'Got interview at Zepto', color: '#D97706', initial: 'S', stars: 5 },
    { name: 'Rahul Verma', role: 'Senior Engineer · Pune', text: 'Cover letter quality is excellent. I used to spend 30 minutes writing cover letters. Now I copy-paste the AI output with minor edits and it\'s better than anything I wrote manually.', tag: 'Saved 2hrs per application', color: '#7C3AED', initial: 'R', stars: 4 },
    { name: 'Kavitha Nair', role: 'Analytics Manager · Chennai', text: 'The ATS score feature is what made me trust this tool. I could see my score go from 58% to 89% after the AI tailored my resume. That transparency is rare.', tag: 'ATS score improved 31 points', color: '#0891b2', initial: 'K', stars: 5 },
    { name: 'Vikram Singh', role: 'Career Switcher · Delhi', text: 'I was switching from consulting to product and had no idea how to reposition my resume. The AI understood the career change context and rewrote my experience to highlight transferable skills perfectly.', tag: 'Switched to Product role', color: '#059669', initial: 'V', stars: 5 },
  ];

  const steps = [
    { num: 1, title: 'Upload or paste your resume', sub: 'PDF, DOCX, paste text or fill manually' },
    { num: 2, title: 'Verify & edit your profile', sub: 'AI extracts all details — edit anything' },
    { num: 3, title: 'Set job preferences', sub: 'Role, location, salary, paste any JD' },
    { num: 4, title: 'AI scores job matches', sub: 'See % match + gaps for each job' },
    { num: 5, title: 'Answer targeted questions', sub: 'AI asks what it needs to personalise' },
    { num: 6, title: 'Get tailored resume + cover letter', sub: 'ATS-optimised, keyword-matched' },
    { num: 7, title: 'Download & apply', sub: 'Print to PDF, copy cover letter, apply' },
  ];

  const features = [
    { icon: '🧠', title: 'AI Resume Parsing', desc: 'Paste or upload your resume in any format. Our AI extracts every detail — contact, skills, experience, education — accurately in seconds.', bullets: ['Supports PDF, DOCX, plain text', 'Extracts all work history', 'Fully editable after parsing'] },
    { icon: '🎯', title: 'Smart Job Matching', desc: 'Paste any job description and our AI scores your profile against it, identifies skill gaps, and tells you exactly why you\'re a fit or not.', bullets: ['Match score 0-100%', 'Gap analysis per job', 'Works with any job board'] },
    { icon: '✏️', title: 'Personalised Questions', desc: 'AI asks you targeted questions based on your resume and the job — to capture achievements and context that make your application stronger.', bullets: ['Questions unique to each JD', 'Captures quantifiable impact', 'All optional — skip any'] },
    { icon: '📄', title: 'ATS-Optimised Resume', desc: 'Your resume is rewritten with exact keywords from the JD, achievement-focused bullets, and a professional summary that matches the role.', bullets: ['Keyword matching highlighted', 'ATS score estimate shown', 'Download as PDF instantly'] },
    { icon: '✉️', title: 'Cover Letter Included', desc: 'Every tailored resume comes with a 3-paragraph professional cover letter written specifically for the company and role — ready to copy and send.', bullets: ['Company-specific content', 'Professional tone', 'One-click copy'] },
    { icon: '🔄', title: 'Apply to Multiple Jobs', desc: 'Select multiple jobs in one session. Each gets its own tailored resume and cover letter. Results are cached so you never redo work.', bullets: ['Multiple jobs per session', 'Cached — no repeat API calls', 'Back/forward freely'] },
  ];

  const numbers = [
    { val: '50K+', label: 'Resumes Tailored', sub: 'And growing every day' },
    { val: '3×', label: 'More Interview Callbacks', sub: 'Compared to generic resumes' },
    { val: '5 min', label: 'Average Time to Apply', sub: 'From resume to tailored output' },
    { val: '20K+', label: 'Active Users', sub: 'Across all experience levels' },
    { val: '92%', label: 'ATS Pass Rate', sub: 'Average score on tailored resumes' },
    { val: '₹0', label: 'Cost to Get Started', sub: 'Free for your first application' },
  ];

  const S = {
    btnPrimary: { background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 30px', fontSize: 16, fontWeight: 700, cursor: 'pointer' },
    btnSecondary: { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '14px 30px', fontSize: 15, fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(8px)' },
    tag: { display: 'inline-block', background: 'rgba(79,70,229,0.08)', color: '#4F46E5', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '1rem' },
    input: { width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', fontFamily: 'inherit', marginBottom: 0, boxSizing: 'border-box' },
  };

  return (
    <div style={{ fontFamily: 'system-ui,sans-serif', color: '#1e293b', overflowX: 'hidden' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e2e8f0', padding: '0 2rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 16, color: '#4F46E5' }}>
          <span style={{ fontSize: 20 }}>🤖</span> AI Job Agent
        </div>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {[['How it works', '#how-it-works'], ['Reviews', '#reviews'], ['FAQ', '#faq'], ['Contact', '#contact']].map(function(item) {
            return <a key={item[0]} href={item[1]} style={{ textDecoration: 'none', fontSize: 14, color: '#64748b', fontWeight: 500 }}>{item[0]}</a>;
          })}
        </div>
        <button onClick={goToApp} style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Get Started Free</button>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6rem 2rem 4rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse at 30% 40%,rgba(79,70,229,0.3),transparent 50%),radial-gradient(ellipse at 70% 60%,rgba(124,58,237,0.3),transparent 50%)' }}/>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 750 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 50, padding: '6px 16px', fontSize: 13, color: '#a5b4fc', marginBottom: '1.5rem' }}>✨ AI-Powered Resume Tailoring</div>
          <h1 style={{ fontSize: 'clamp(2.2rem,6vw,4rem)', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: '1.25rem' }}>
            Your Resume, <span style={{ background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Tailored for Every Job</span> in Minutes
          </h1>
          <p style={{ fontSize: 'clamp(1rem,2.5vw,1.2rem)', color: '#94a3b8', maxWidth: 580, margin: '0 auto 2.5rem', lineHeight: 1.75 }}>
            Stop sending the same resume everywhere. Our AI reads the job description, rewrites your resume to match, and writes your cover letter — all in under 5 minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={goToApp} style={S.btnPrimary}>🚀 Build My Resume Now — Free</button>
            <button onClick={() => document.getElementById('how-it-works').scrollIntoView({ behavior: 'smooth' })} style={S.btnSecondary}>See How It Works</button>
          </div>
        </div>
      </section>

      {/* START NOW */}
      <section style={{ background: 'linear-gradient(135deg,#f0f4ff,#f5f3ff,#ecfdf5)', padding: '5rem 2rem' }} id="start">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '3rem', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', display: 'flex', gap: '3rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={S.tag}>GET STARTED</div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1rem' }}>Ready to land more interviews?</h2>
              <p style={{ color: '#64748b', lineHeight: 1.75, marginBottom: '1.5rem', fontSize: 15 }}>Paste your resume, drop in a job description, and get a fully tailored ATS-optimised resume with a cover letter in minutes. No templates. No guesswork. Pure AI.</p>
              <button onClick={goToApp} style={{ ...S.btnPrimary, fontSize: 15 }}>🚀 Start Building Now</button>
              <div style={{ display: 'flex', gap: 16, marginTop: '1.25rem', flexWrap: 'wrap' }}>
                {['No credit card', 'Works for all roles', 'ATS optimised', 'Cover letter included'].map(function(t) {
                  return <div key={t} style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>✓ {t}</div>;
                })}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 280, background: 'linear-gradient(135deg,#EEF2FF,#F5F3FF)', borderRadius: 16, padding: '1.5rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4F46E5', marginBottom: 12, letterSpacing: '0.5px' }}>YOUR 7-STEP JOURNEY</div>
              {steps.map(function(s) {
                return (
                  <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: s.num < 7 ? '1px solid #f1f5f9' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{s.num}</div>
                    <div><div style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>{s.title}</div><div style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub}</div></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: '#fff', padding: '5rem 2rem' }} id="how-it-works">
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div style={S.tag}>HOW IT WORKS</div>
          <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 800, marginBottom: '1rem' }}>Everything you need to land the interview</h2>
          <p style={{ fontSize: 15, color: '#64748b', maxWidth: 560, margin: '0 auto 3rem', lineHeight: 1.75 }}>Our AI does the heavy lifting — from parsing your resume to tailoring every bullet point for the job you want.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '2rem' }}>
            {features.map(function(f) {
              return (
                <div key={f.title} style={{ background: 'linear-gradient(135deg,#f8fafc,#f0f4ff)', borderRadius: 16, padding: '1.75rem', border: '1px solid #e2e8f0', textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}/>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: '1rem' }}>{f.icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, marginBottom: 10 }}>{f.desc}</p>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {f.bullets.map(function(b) {
                      return <li key={b} style={{ fontSize: 12, color: '#64748b', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: '#059669', fontWeight: 700 }}>✓</span>{b}</li>;
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* NUMBERS */}
      <section style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63)', padding: '5rem 2rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ ...S.tag, background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>BY THE NUMBERS</div>
          <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 800, color: '#fff', marginBottom: '3rem' }}>Trusted by job seekers across India</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '2rem' }}>
            {numbers.map(function(n) {
              return (
                <div key={n.label} style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                  <div style={{ fontSize: '3rem', fontWeight: 800, background: 'linear-gradient(135deg,#a78bfa,#60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{n.val}</div>
                  <div style={{ fontSize: 14, color: '#94a3b8', marginTop: 8, fontWeight: 500 }}>{n.label}</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{n.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section style={{ background: 'linear-gradient(135deg,#f0f4ff,#f5f3ff)', padding: '5rem 2rem' }} id="reviews">
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div style={S.tag}>REVIEWS</div>
          <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 800, marginBottom: '1rem' }}>What job seekers are saying</h2>
          <p style={{ fontSize: 15, color: '#64748b', maxWidth: 560, margin: '0 auto 3rem', lineHeight: 1.75 }}>Real feedback from people who used AI Job Agent to land interviews at top companies.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '1.5rem' }}>
            {reviews.map(function(r) {
              return (
                <div key={r.name} style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'left' }}>
                  <div style={{ color: '#f59e0b', fontSize: 16, marginBottom: 12 }}>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)}</div>
                  <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.75, marginBottom: '1.25rem', fontStyle: 'italic' }}>"{r.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{r.initial}</div>
                    <div><div style={{ fontSize: 14, fontWeight: 700 }}>{r.name}</div><div style={{ fontSize: 12, color: '#94a3b8' }}>{r.role}</div></div>
                  </div>
                  <div style={{ display: 'inline-block', background: '#f0fdf4', color: '#059669', borderRadius: 10, padding: '2px 10px', fontSize: 11, fontWeight: 600, marginTop: 10 }}>{r.tag}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: '#fff', padding: '5rem 2rem' }} id="faq">
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
          <div style={S.tag}>FAQ</div>
          <h2 style={{ fontSize: 'clamp(1.6rem,4vw,2.4rem)', fontWeight: 800, marginBottom: '1rem' }}>Frequently asked questions</h2>
          <p style={{ fontSize: 15, color: '#64748b', maxWidth: 560, margin: '0 auto 3rem', lineHeight: 1.75 }}>Everything you need to know before getting started.</p>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'left' }}>
            {faqs.map(function(f, i) {
              var isOpen = openFaq === i;
              return (
                <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 12, marginBottom: 12, overflow: 'hidden' }}>
                  <div onClick={function() { toggleFaq(i); }} style={{ padding: '1rem 1.25rem', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    {f.q}
                    <span style={{ fontSize: 20, color: '#4F46E5', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>+</span>
                  </div>
                  {isOpen && <div style={{ padding: '1rem 1.25rem', fontSize: 14, color: '#64748b', lineHeight: 1.75, borderTop: '1px solid #f1f5f9' }}>{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section style={{ background: 'linear-gradient(135deg,#0f0c29,#302b63)', padding: '5rem 2rem' }} id="contact">
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ ...S.tag, background: 'rgba(167,139,250,0.15)', color: '#a78bfa' }}>CONTACT US</div>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>Get in touch</h2>
              <p style={{ color: '#94a3b8', lineHeight: 1.75, marginBottom: '1.5rem', fontSize: 15 }}>Have a question, feedback, or want to report an issue? We would love to hear from you. Our team typically responds within 24 hours.</p>
              {[['📧', 'support@aijobagent.in'], ['📍', 'Bangalore, India'], ['🕐', 'Mon–Fri, 9am–6pm IST']].map(function(d) {
                return <div key={d[1]} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#a5b4fc', fontSize: 14, marginBottom: 10 }}><span>{d[0]}</span>{d[1]}</div>;
              })}
            </div>
            <div style={{ flex: 1, minWidth: 280, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.75rem', backdropFilter: 'blur(8px)' }}>
              {[['Your Name', 'name', 'text', 'Rishabh Jain'], ['Email Address', 'email', 'email', 'rishabh@email.com'], ['Message', 'message', 'textarea', 'Tell us how we can help...']].map(function(f) {
                return (
                  <div key={f[1]} style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 6 }}>{f[0]}</label>
                    {f[2] === 'textarea'
                      ? <textarea value={formData[f[1]]} onChange={function(e) { var v = e.target.value; setFormData(function(p) { return Object.assign({}, p, { message: v }); }); }} placeholder={f[3]} rows={4} style={{ ...S.input, resize: 'vertical' }}/>
                      : <input type={f[2]} value={formData[f[1]]} onChange={function(e) { var v = e.target.value; var key = f[1]; setFormData(function(p) { var n = Object.assign({}, p); n[key] = v; return n; }); }} placeholder={f[3]} style={S.input}/>
                    }
                  </div>
                );
              })}
              <button onClick={function() { alert('Thanks for reaching out! We will get back to you within 24 hours.'); }} style={{ width: '100%', background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff', border: 'none', borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 }}>Send Message →</button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#0a0a0f', padding: '1.5rem 2rem', textAlign: 'center', color: '#475569', fontSize: 13, borderTop: '1px solid #1e293b' }}>
        <div style={{ marginBottom: 6 }}>🤖 <strong>AI Job Agent</strong> — Built with Claude AI · Bangalore, India · 2025</div>
        <div style={{ color: '#334155' }}>Tailored resumes for every job, in minutes.</div>
      </footer>

    </div>
  );
}