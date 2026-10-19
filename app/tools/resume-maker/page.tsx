"use client";

import { useState } from "react";
import Link from "next/link";

interface Education {
  degree: string;
  institution: string;
  year: string;
  percentage: string;
}

interface Experience {
  role: string;
  company: string;
  period: string;
  details: string;
}

export default function ResumeMakerPage() {
  const [template, setTemplate] = useState<"classic" | "modern" | "cybercafe">("modern");
  const [name, setName] = useState("RAHUL SHARMA");
  const [title, setTitle] = useState("Junior Web Developer / Data Operator");
  const [email, setEmail] = useState("rahul.sharma@email.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [address, setAddress] = useState("Jaipur, Rajasthan, India");
  const [summary, setSummary] = useState(
    "Detail-oriented professional with experience in document handling, computer operations, and customer service. Proficient in MS Office, basic programming, and digital paperwork management."
  );

  const [skills, setSkills] = useState("MS Office, Excel, Hindi & English Typing (40 WPM), Photoshop Basics, Internet Portals, HTML/CSS");

  const [educationList, setEducationList] = useState<Education[]>([
    { degree: "Bachelor of Computer Applications (BCA)", institution: "Rajasthan University", year: "2021 - 2024", percentage: "72%" },
    { degree: "Senior Secondary (12th)", institution: "Govt. Senior Secondary School", year: "2021", percentage: "81%" },
  ]);

  const [experienceList, setExperienceList] = useState<Experience[]>([
    {
      role: "Computer Operator & Desk Assistant",
      company: "Shree Print & Cyber Solutions",
      period: "2024 - Present",
      details: "Managed digital form submissions, online portal applications, document printing, and customer correspondence.",
    },
  ]);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPhotoUrl(URL.createObjectURL(file));
  }

  function addEducation() {
    setEducationList((prev) => [
      ...prev,
      { degree: "Diploma / Certificate", institution: "Institute Name", year: "2023", percentage: "Pass" },
    ]);
  }

  function addExperience() {
    setExperienceList((prev) => [
      ...prev,
      { role: "Job Title", company: "Company Name", period: "2023 - 2024", details: "Key responsibilities..." },
    ]);
  }

  return (
    <div className="tool-page-container">
      <header className="tool-header">
        <div className="tool-header-inner wrap">
          <div className="tool-breadcrumbs">
            <Link href="/" className="crumb-home">
              ← All Tools
            </Link>
            <span className="crumb-sep">/</span>
            <span className="crumb-current">Pro Resume & CV Builder</span>
          </div>
          <div className="tool-badge-row">
            <span className="badge-free">100% Free · Unlimited</span>
            <span className="badge-local">Instant A4 Print / PDF</span>
          </div>
        </div>
      </header>

      <main className="tool-main wrap">
        <div className="tool-heading">
          <h1>Professional Resume & Curriculum Vitae (CV) Builder</h1>
          <p className="tool-desc">
            Quickly draft job-ready resumes for cyber cafes, students, and job seekers. Choose templates, fill in your
            credentials, and generate a print-ready A4 document instantly.
          </p>
        </div>

        <div className="workbench-grid">
          {/* Left: Input Form */}
          <div className="crop-editor-card">
            <div className="card-header">
              <h3>1. Resume Details</h3>
              <div className="template-switcher">
                <button
                  className={`btn-tiny ${template === "modern" ? "active" : ""}`}
                  onClick={() => setTemplate("modern")}
                >
                  Modern
                </button>
                <button
                  className={`btn-tiny ${template === "classic" ? "active" : ""}`}
                  onClick={() => setTemplate("classic")}
                >
                  Classic
                </button>
                <button
                  className={`btn-tiny ${template === "cybercafe" ? "active" : ""}`}
                  onClick={() => setTemplate("cybercafe")}
                >
                  Standard Bio
                </button>
              </div>
            </div>

            {/* Personal Details */}
            <div className="control-group">
              <label className="control-label">Personal Information:</label>
              <div className="form-grid-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Target Role / Headline"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <input
                type="text"
                placeholder="City, State, Country"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ marginTop: "8px" }}
              />
            </div>

            {/* Photo upload optional */}
            <div className="control-group">
              <label className="control-label">Profile Photo (Optional):</label>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} />
            </div>

            {/* Summary */}
            <div className="control-group">
              <label className="control-label">Career Objective / Summary:</label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            {/* Education */}
            <div className="control-group">
              <div className="group-title-row">
                <label className="control-label">Education Qualifications:</label>
                <button type="button" className="btn-tiny" onClick={addEducation}>
                  + Add Education
                </button>
              </div>
              {educationList.map((edu, idx) => (
                <div key={idx} className="repeatable-box">
                  <div className="form-grid-2">
                    <input
                      type="text"
                      placeholder="Degree / Course"
                      value={edu.degree}
                      onChange={(e) => {
                        const copy = [...educationList];
                        copy[idx].degree = e.target.value;
                        setEducationList(copy);
                      }}
                    />
                    <input
                      type="text"
                      placeholder="School / College / University"
                      value={edu.institution}
                      onChange={(e) => {
                        const copy = [...educationList];
                        copy[idx].institution = e.target.value;
                        setEducationList(copy);
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Passing Year"
                      value={edu.year}
                      onChange={(e) => {
                        const copy = [...educationList];
                        copy[idx].year = e.target.value;
                        setEducationList(copy);
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Grade / Percentage"
                      value={edu.percentage}
                      onChange={(e) => {
                        const copy = [...educationList];
                        copy[idx].percentage = e.target.value;
                        setEducationList(copy);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Experience */}
            <div className="control-group">
              <div className="group-title-row">
                <label className="control-label">Work Experience:</label>
                <button type="button" className="btn-tiny" onClick={addExperience}>
                  + Add Experience
                </button>
              </div>
              {experienceList.map((exp, idx) => (
                <div key={idx} className="repeatable-box">
                  <div className="form-grid-2">
                    <input
                      type="text"
                      placeholder="Job Title"
                      value={exp.role}
                      onChange={(e) => {
                        const copy = [...experienceList];
                        copy[idx].role = e.target.value;
                        setExperienceList(copy);
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Company"
                      value={exp.company}
                      onChange={(e) => {
                        const copy = [...experienceList];
                        copy[idx].company = e.target.value;
                        setExperienceList(copy);
                      }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Duration (e.g. 2022 - 2024)"
                    value={exp.period}
                    onChange={(e) => {
                      const copy = [...experienceList];
                      copy[idx].period = e.target.value;
                      setExperienceList(copy);
                    }}
                    style={{ marginTop: "6px" }}
                  />
                  <textarea
                    rows={2}
                    placeholder="Key Responsibilities"
                    value={exp.details}
                    onChange={(e) => {
                      const copy = [...experienceList];
                      copy[idx].details = e.target.value;
                      setExperienceList(copy);
                    }}
                    style={{ marginTop: "6px" }}
                  />
                </div>
              ))}
            </div>

            {/* Skills */}
            <div className="control-group">
              <label className="control-label">Key Skills & Certifications:</label>
              <textarea
                rows={2}
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
            </div>
          </div>

          {/* Right: Live A4 Resume Preview */}
          <div className="result-preview-card">
            <div className="card-header">
              <h3>2. Live A4 Sheet Preview</h3>
              <button className="btn-print-direct" onClick={() => window.print()}>
                Print / Save as PDF 🖨️
              </button>
            </div>

            <div className="resume-a4-sheet" id="printable-resume">
              {/* Modern Template */}
              {template === "modern" && (
                <div className="tpl-modern">
                  <div className="modern-header">
                    <div className="modern-header-text">
                      <h2>{name || "YOUR NAME"}</h2>
                      <p className="modern-title">{title}</p>
                      <div className="modern-contact-line">
                        <span>✉ {email}</span> · <span>☎ {phone}</span> · <span>📍 {address}</span>
                      </div>
                    </div>
                    {photoUrl && <img src={photoUrl} alt="Profile" className="resume-photo" />}
                  </div>

                  <div className="modern-body">
                    {summary && (
                      <div className="resume-section">
                        <h4>Profile Summary</h4>
                        <p>{summary}</p>
                      </div>
                    )}

                    <div className="resume-section">
                      <h4>Education</h4>
                      <table className="resume-table">
                        <thead>
                          <tr>
                            <th>Degree / Course</th>
                            <th>Institute</th>
                            <th>Year</th>
                            <th>Grade</th>
                          </tr>
                        </thead>
                        <tbody>
                          {educationList.map((edu, i) => (
                            <tr key={i}>
                              <td><strong>{edu.degree}</strong></td>
                              <td>{edu.institution}</td>
                              <td>{edu.year}</td>
                              <td>{edu.percentage}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="resume-section">
                      <h4>Work Experience</h4>
                      {experienceList.map((exp, i) => (
                        <div key={i} className="exp-item">
                          <div className="exp-head">
                            <strong>{exp.role}</strong> — <span>{exp.company}</span>
                            <small className="exp-date">{exp.period}</small>
                          </div>
                          <p className="exp-desc">{exp.details}</p>
                        </div>
                      ))}
                    </div>

                    {skills && (
                      <div className="resume-section">
                        <h4>Skills & Expertise</h4>
                        <p>{skills}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Classic Template */}
              {template === "classic" && (
                <div className="tpl-classic">
                  <div className="classic-header">
                    <h2>{name || "YOUR NAME"}</h2>
                    <p>{title}</p>
                    <p>{address} | {phone} | {email}</p>
                  </div>
                  <hr />
                  {summary && (
                    <div className="resume-section">
                      <h4>Objective</h4>
                      <p>{summary}</p>
                    </div>
                  )}
                  <div className="resume-section">
                    <h4>Educational Qualifications</h4>
                    <ul>
                      {educationList.map((edu, i) => (
                        <li key={i}>
                          <strong>{edu.degree}</strong> from {edu.institution} ({edu.year}) — {edu.percentage}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="resume-section">
                    <h4>Experience</h4>
                    {experienceList.map((exp, i) => (
                      <div key={i} style={{ marginBottom: "8px" }}>
                        <strong>{exp.role}</strong> at {exp.company} ({exp.period})
                        <p>{exp.details}</p>
                      </div>
                    ))}
                  </div>
                  {skills && (
                    <div className="resume-section">
                      <h4>Skills</h4>
                      <p>{skills}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cybercafe / Hindi-English Bio */}
              {template === "cybercafe" && (
                <div className="tpl-cybercafe">
                  <div className="cyber-header">
                    <h2>CURRICULUM VITAE</h2>
                    <div className="cyber-subhead">
                      <div>
                        <h3>{name}</h3>
                        <p>Address: {address}</p>
                        <p>Mob: {phone} | Email: {email}</p>
                      </div>
                      {photoUrl && <img src={photoUrl} alt="Profile" className="resume-photo" />}
                    </div>
                  </div>
                  <div className="resume-section">
                    <h4>CAREER OBJECTIVE</h4>
                    <p>{summary}</p>
                  </div>
                  <div className="resume-section">
                    <h4>ACADEMIC QUALIFICATION</h4>
                    <table className="resume-table">
                      <thead>
                        <tr>
                          <th>Exam Passed</th>
                          <th>Board / Univ</th>
                          <th>Passing Year</th>
                          <th>Marks (%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {educationList.map((edu, i) => (
                          <tr key={i}>
                            <td>{edu.degree}</td>
                            <td>{edu.institution}</td>
                            <td>{edu.year}</td>
                            <td>{edu.percentage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="resume-section">
                    <h4>EXPERIENCE</h4>
                    {experienceList.map((exp, i) => (
                      <p key={i}>• {exp.role} at {exp.company} ({exp.period}): {exp.details}</p>
                    ))}
                  </div>
                  <div className="resume-section">
                    <h4>EXTRA SKILLS</h4>
                    <p>{skills}</p>
                  </div>
                  <div className="cyber-declaration">
                    <p>Declaration: I hereby declare that all the information given above is true to the best of my knowledge.</p>
                    <div className="sig-row">
                      <span>Date: ____________</span>
                      <span>Signature: ____________</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="export-actions-row">
              <button className="btn-export-pdf" onClick={() => window.print()}>
                Print / Save as PDF (A4 Scale) 🖨️
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
