import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import './App.css';
import { aboutContent, experiences, projects, heroContent, contactContent, footerContent, skills } from './data';

function App() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [activeSkills, setActiveSkills] = useState(new Set());
  const [openExperiences, setOpenExperiences] = useState(new Set());
  const [openProjects, setOpenProjects] = useState(new Set());
  const [formStatus, setFormStatus] = useState({ type: null, message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [numProjectColumns, setNumProjectColumns] = useState(1);
  const [numLeftColumns, setNumLeftColumns] = useState(1);
  const [numRightColumns, setNumRightColumns] = useState(0);

  useEffect(() => {
    if (formStatus.type === 'success') {
      const timer = setTimeout(() => {
        setFormStatus({ type: null, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [formStatus.type]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 768);
      
      // Calculate number of project columns based on screen width
      // The center group: [Top 2 Projects (465px)] [About (1.5fr)] [Experience (0.9fr)]
      // This stays centered and tightly grouped with original sizes
      // Additional projects fill space on left and right ONLY
      if (width > 768) {
        const projectColWidth = 465;
        const gap = 24; // 1.5rem
        const padding = 32; // 1rem on each side
        
        // Original center group: 465px (projects) + 1.5fr (about) + 0.9fr (experience) + gaps
        // We need to estimate the fr values - about is roughly 600px, experience is roughly 400px
        const estimatedAboutWidth = 600;
        const estimatedExperienceWidth = 400;
        const centerGroupWidth = projectColWidth + gap + estimatedAboutWidth + gap + estimatedExperienceWidth;
        
        // Calculate available space on each side
        const availableSpace = width - centerGroupWidth - (padding * 2);
        const spacePerSide = Math.max(0, availableSpace / 2);
        
        // Calculate how many columns fit on each side
        const columnsPerSide = Math.floor(spacePerSide / (projectColWidth + gap));
        
        setNumLeftColumns(Math.max(0, columnsPerSide));
        setNumRightColumns(Math.max(0, columnsPerSide));
        setNumProjectColumns(Math.max(0, columnsPerSide * 2));
      } else {
        setNumLeftColumns(0);
        setNumRightColumns(0);
        setNumProjectColumns(0);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check on mount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSkill = (skillId) => {
    if (skillId === 'all') {
      // Toggle the section visibility only, don't auto-expand individual items
      if (activeSkills.size > 0) {
        setActiveSkills(new Set());
      } else {
        // Just show the container, but keep all items collapsed
        setActiveSkills(new Set(['section-open']));
      }
    } else {
      const newActiveSkills = new Set(activeSkills);
      // Remove the section-open marker when toggling individual items
      newActiveSkills.delete('section-open');
      if (newActiveSkills.has(skillId)) {
        newActiveSkills.delete(skillId);
      } else {
        newActiveSkills.add(skillId);
      }
      setActiveSkills(newActiveSkills);
    }
  };

  const toggleExperience = (expId) => {
    if (expId === 'all') {
      // Toggle the section visibility only, don't auto-expand individual items
      if (openExperiences.size > 0) {
        setOpenExperiences(new Set());
      } else {
        // Just show the container, but keep all items collapsed
        setOpenExperiences(new Set(['section-open']));
      }
    } else {
      const next = new Set(openExperiences);
      // Remove the section-open marker when toggling individual items
      next.delete('section-open');
      if (next.has(expId)) {
        next.delete(expId);
      } else {
        next.add(expId);
      }
      setOpenExperiences(next);
    }
  };

  const toggleProject = (projectId) => {
    const next = new Set(openProjects);
    if (next.has(projectId)) {
      next.delete(projectId);
    } else {
      next.add(projectId);
    }
    setOpenProjects(next);
  };
  return (
    <div className={`App ${hasScrolled ? 'scrolled' : ''}`}>
      <div className="top-nav-bar">
        <div className="quick-links-bar">
          <a href={contactContent.website} target="_blank" rel="noopener noreferrer" className="quick-link">Project Docs <span className="arrow-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span></a>
          <a href={`mailto:${contactContent.email}`} className="quick-link">Email <span className="arrow-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span></a>
          <a href="https://linkedin.com/in/ihsan-sa" target="_blank" rel="noopener noreferrer" className="quick-link">LinkedIn <span className="arrow-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span></a>
          <a href="https://github.com/ihsan-sa" target="_blank" rel="noopener noreferrer" className="quick-link">GitHub <span className="arrow-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span></a>
        </div>
        <div className="pdf-buttons-bar">
          <a className="action-btn" href="/images/Ihsan_Salari_Resume.pdf" target="_blank" rel="noopener noreferrer">Résumé <span className="arrow-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span></a>
          <a className="action-btn" href="https://ihsan.cc/resume" target="_blank" rel="noopener noreferrer">Résumé (Web) <span className="arrow-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span></a>
          <a className="action-btn" href="/images/Ihsan_Salari_Portfolio.pdf" target="_blank" rel="noopener noreferrer">Portfolio <span className="arrow-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span></a>
        </div>
      </div>

      <header className="App-header">
        <div className="hero-section">
          <p>
            Hello, I'm <span style={{ color: heroContent.nameColor }}>{heroContent.name}</span>.
          </p>
          <p className="mobile-subtitle">
            <span className="subtitle-part">EE @ UWaterloo</span>
            <span className="subtitle-separator"> | </span>
            <span className="subtitle-part">HW @ Arista</span>
          </p>
          {/* Subtitle temporarily hidden
          <p style={{fontSize: '17px'}}>
            {heroContent.subtitle}
          </p>
          {heroContent.secondarySubtitle && (
            <p style={{fontSize: '17px', marginTop: '0.5rem'}}> 
              {heroContent.secondarySubtitle}
            </p>
          )}
          */}
        </div>
      </header>

      <div 
        className="three-column-container"
        style={{
          gridTemplateColumns: `${numLeftColumns > 0 ? Array(numLeftColumns).fill('465px').join(' ') + ' ' : ''}465px 1.5fr 0.9fr${numRightColumns > 0 ? ' ' + Array(numRightColumns).fill('465px').join(' ') : ''}`
        }}
      >
        {/* Render left project columns (before center group) */}
        {Array.from({ length: numLeftColumns }).map((_, colIndex) => {
          const projectsPerColumn = 2;
          // Skip the first 2 projects (they're in the center group)
          const startIndex = 2 + (colIndex * projectsPerColumn);
          const endIndex = startIndex + projectsPerColumn;
          const columnProjects = projects.slice(startIndex, endIndex);
          
          return (
            <div key={`left-${colIndex}`} className="projects-column">
              {columnProjects.map((project) => (
            <div 
              key={project.id} 
              id={`project-${project.id}`}
              className={`project-tile ${openProjects.has(project.id) ? 'active' : ''}`}
              onClick={() => toggleProject(project.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="project-image">
                {project.image ? (
                  <img src={project.image} alt={project.title} />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '200px',
                    background: 'linear-gradient(135deg, #2d3b53, #1a2332)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#82aaff',
                    fontSize: '1.2rem',
                    fontFamily: 'Courier New, monospace'
                  }}>
                    {project.title}
                  </div>
                )}
              </div>
              <div className="project-content">
                <div className="project-header">
                  <h3>{project.title}</h3>
                  <span className="project-toggle" aria-hidden="true">{openProjects.has(project.id) ? '−' : '+'}</span>
                </div>
                <div className="project-collapsible">
                  {Array.isArray(project.description) ? (
                    <ul>
                      {project.description.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{project.description}</p>
                  )}
                  <div className="project-skills">
                    {project.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                  {project.links.docs && (
                    <div className="project-learn-more">
                      <a href={project.links.docs} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        Learn more
                        <span className="arrow-icon">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
              ))}
            </div>
          );
        })}

        {/* Top 2 Projects - always shown, part of center group */}
        <div className="projects-column">
          {projects.slice(0, 2).map((project) => (
            <div 
              key={project.id} 
              id={`project-${project.id}`}
              className={`project-tile ${openProjects.has(project.id) ? 'active' : ''}`}
              onClick={() => toggleProject(project.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="project-image">
                {project.image ? (
                  <img src={project.image} alt={project.title} />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '200px',
                    background: 'linear-gradient(135deg, #2d3b53, #1a2332)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#82aaff',
                    fontSize: '1.2rem',
                    fontFamily: "'Courier New', Courier, monospace"
                  }}>
                    {project.title}
                  </div>
                )}
              </div>
              <div className="project-content">
                <div className="project-header">
                  <h3>{project.title}</h3>
                  <span className="project-toggle" aria-hidden="true">{openProjects.has(project.id) ? '−' : '+'}</span>
                </div>
                <div className="project-collapsible">
                  {Array.isArray(project.description) ? (
                    <ul>
                      {project.description.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{project.description}</p>
                  )}
                  <div className="project-skills">
                    {project.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                  {project.links.docs && (
                    <div className="project-learn-more">
                      <a href={project.links.docs} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        Learn more
                        <span className="arrow-icon">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <section id="about" className="about-section">
          <div className="about-content">
            {aboutContent.greeting && <p>{aboutContent.greeting}</p>}
            
            <p>{aboutContent.description}</p>
            
            {(!isMobile || aboutExpanded) && (
              <>
                <p>{aboutContent.interests}</p>
                
                {aboutContent.points.length > 0 && (
                  <>
                    <p>A few things about me:</p>
                    <ul>
                      {aboutContent.points.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </>
                )}
                
                <p>{aboutContent.closing}</p>
                
                <p dangerouslySetInnerHTML={{ __html: aboutContent.contact }}></p>
              </>
            )}
            
            {isMobile && !aboutExpanded && (
              <button className="about-see-more" onClick={() => setAboutExpanded(true)}>
                See more
              </button>
            )}
            
            {isMobile && aboutExpanded && (
              <button className="about-see-more" onClick={() => setAboutExpanded(false)}>
                See less
              </button>
            )}
            
            <div className="about-actions">
              <a className="action-btn project-docs-btn" href={contactContent.website} target="_blank" rel="noopener noreferrer">{isMobile ? 'Docs' : 'Project Docs'} <span className="arrow-icon">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span></a>
              <a className="action-btn" href="/images/Ihsan_Salari_Resume.pdf" target="_blank" rel="noopener noreferrer">Résumé <span className="arrow-icon">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span></a>
              <a className="action-btn" href="https://ihsan.cc/resume" target="_blank" rel="noopener noreferrer">Résumé (Web) <span className="arrow-icon">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span></a>
              <a className="action-btn" href="/images/Ihsan_Salari_Portfolio.pdf" target="_blank" rel="noopener noreferrer">Portfolio <span className="arrow-icon">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span></a>
            </div>
          </div>
        </section>

        <section id="experience" className="experience-section">
          <div className="company-logos mobile-logos">
            {experiences
              .filter(exp => exp.logo !== null && !exp.isEducation)
              .map((experience) => (
                <div key={`logo-${experience.id}`} className="company-logo-item">
                  <img src={experience.logo} alt={experience.company} className="company-logo" />
                </div>
              ))}
          </div>
          <div className="experience-mobile-toggle" onClick={() => toggleExperience('all')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExperience('all'); } }} tabIndex={0}>
            <h2>Experience</h2>
            <span className="section-toggle" aria-hidden="true">{openExperiences.has('section-open') ? '−' : '+'}</span>
          </div>
          <div className={`experience-container ${openExperiences.has('section-open') ? 'active' : ''}`}>
            {experiences.map((experience) => (
              <div key={experience.id} className={`experience-item ${experience.isEducation ? 'education-item' : ''}`}>
                <div className="experience-header">
                  <div className="experience-title">
                    <h3>{experience.title}</h3>
                    <p className="company">{experience.company} • {experience.period}</p>
                  </div>
                </div>
                {openExperiences.has('section-open') && experience.description && (
                  <div className="experience-content">
                    <p>{experience.description}</p>
                    {experience.responsibilities && experience.responsibilities.length > 0 && (
                      <ul>
                        {experience.responsibilities.map((resp, index) => (
                          <li key={index}>{resp}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Render right project columns (after center group) */}
        {Array.from({ length: numRightColumns }).map((_, colIndex) => {
          const projectsPerColumn = 2;
          // Start after the top 2 projects + left columns
          const startIndex = 2 + (numLeftColumns * projectsPerColumn) + (colIndex * projectsPerColumn);
          const endIndex = startIndex + projectsPerColumn;
          const columnProjects = projects.slice(startIndex, endIndex);
          
          return (
            <div key={`right-${colIndex}`} className="projects-column">
              {columnProjects.map((project) => (
                <div 
                  key={project.id} 
                  id={`project-${project.id}`}
                  className={`project-tile ${openProjects.has(project.id) ? 'active' : ''}`}
                  onClick={() => toggleProject(project.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="project-image">
                    {project.image ? (
                      <img src={project.image} alt={project.title} />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '200px',
                        background: 'linear-gradient(135deg, #2d3b53, #1a2332)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#82aaff',
                        fontSize: '1.2rem',
                        fontFamily: "'Courier New', Courier, monospace"
                      }}>
                        {project.title}
                      </div>
                    )}
                  </div>
                  <div className="project-content">
                    <div className="project-header">
                      <h3>{project.title}</h3>
                      <span className="project-toggle" aria-hidden="true">{openProjects.has(project.id) ? '−' : '+'}</span>
                    </div>
                    <div className="project-collapsible">
                      {Array.isArray(project.description) ? (
                        <ul>
                          {project.description.map((point, index) => (
                            <li key={index}>{point}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>{project.description}</p>
                      )}
                      <div className="project-skills">
                        {project.skills.map((skill, index) => (
                          <span key={index} className="skill-tag">{skill}</span>
                        ))}
                      </div>
                      {project.links.docs && (
                        <div className="project-learn-more">
                          <a href={project.links.docs} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                            Learn more
                            <span className="arrow-icon">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {isMobile && (
        <div className="projects-mobile-header">
          <h2>Projects</h2>
        </div>
      )}

      <div className="full-width-projects-grid">
        {(isMobile ? projects : projects.slice(2 + (numLeftColumns + numRightColumns) * 2)).map((project) => (
          <div 
            key={project.id} 
            id={`project-${project.id}`}
            className={`project-tile ${openProjects.has(project.id) ? 'active' : ''}`}
            onClick={() => toggleProject(project.id)}
            style={{ cursor: 'pointer' }}
          >
            <div className="project-image">
              {project.image ? (
                <img src={project.image} alt={project.title} />
              ) : (
                <div style={{
                  width: '100%',
                  height: '200px',
                  background: 'linear-gradient(135deg, #2d3b53, #1a2332)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#82aaff',
                  fontSize: '1.2rem',
                  fontFamily: 'Courier New, monospace'
                }}>
                  {project.title}
                </div>
              )}
            </div>
            <div className="project-content">
              <div className="project-header">
                <h3>{project.title}</h3>
                <span className="project-toggle" aria-hidden="true">{openProjects.has(project.id) ? '−' : '+'}</span>
              </div>
              <div className="project-collapsible">
                {Array.isArray(project.description) ? (
                  <ul>
                    {project.description.map((point, index) => (
                      <li key={index}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p>{project.description}</p>
                )}
                <div className="project-skills">
                  {project.skills.map((skill, index) => (
                    <span key={index} className="skill-tag">{skill}</span>
                  ))}
                </div>
                {project.links.docs && (
                  <div className="project-learn-more">
                    <a href={project.links.docs} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                      Learn more
                      <span className="arrow-icon">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Skills section commented out for testing
      <section id="skills" className="skills-section">
        <div className="section-collapsible-header" onClick={() => toggleSkill('all')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSkill('all'); }}>
          <h2>Skills</h2>
          <span className="section-toggle" aria-hidden="true">{(activeSkills.has('section-open') || activeSkills.size > 0) ? '−' : '+'}</span>
        </div>
        <div className={`skills-grid ${activeSkills.has('section-open') || activeSkills.size > 0 ? 'active' : ''}`}>
          {skills.map((skillCategory) => (
            <div 
              key={skillCategory.id} 
              className={`skill-category ${activeSkills.has(skillCategory.id) ? 'active' : ''}`}
            >
              <div 
                className="skill-header"
                onClick={() => toggleSkill(skillCategory.id)}
              >
                <h3>{skillCategory.title}</h3>
                <span className="skill-toggle">{activeSkills.has(skillCategory.id) ? '−' : '+'}</span>
              </div>
              <div className="skill-content">
                <div className="skill-icons-grid">
                  {skillCategory.skills.map((skill, index) => (
                    <div key={index} className="skill-icon">
                      <div className="skill-icon-image">
                        {skill.logo ? (
                          <img 
                            src={skill.logo} 
                            alt={`${skill.name} logo`}
                            className="skill-icon-logo"
                          />
                        ) : (
                          <div className="skill-icon-placeholder">
                            {skill.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="skill-icon-caption">{skill.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      */}

      {/* Projects section moved to left column in three-column-container */}
      <section id="projects" className="projects-section" style={{ display: 'none' }}>
        <h2>Projects</h2>
        <p className="section-note">Tip: <strong>Expand</strong> a tile for a quick <strong>summary</strong>. <strong>Click</strong> the tile to view <strong>full details</strong>.</p>
        <div className="projects-grid">
          {/* Projects moved to left column */}
          {false && projects.map((project) => (
            <div 
              key={project.id} 
              id={`project-${project.id}`}
              className={`project-tile ${openProjects.has(project.id) ? 'active' : ''}`}
              onClick={project.links.docs ? () => window.open(project.links.docs, '_blank') : undefined}
              style={{ cursor: project.links.docs ? 'pointer' : 'default' }}
            >
              <div className="project-image">
                {project.image ? (
                  <img src={project.image} alt={project.title} />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '200px',
                    background: 'linear-gradient(135deg, #2d3b53, #1a2332)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#82aaff',
                    fontSize: '1.2rem',
                    fontFamily: 'Courier New, monospace'
                  }}>
                    {project.title}
                  </div>
                )}
              </div>
              <div className="project-content">
                <div className="project-header">
                  <h3>{project.title}</h3>
                  <span className="project-toggle" aria-hidden="true">{openProjects.has(project.id) ? '−' : '+'}</span>
                </div>
                <div className="project-collapsible">
                  {Array.isArray(project.description) ? (
                    <ul>
                      {project.description.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>{project.description}</p>
                  )}
                  <div className="project-skills">
                    {project.skills.map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="contact-section">
        <div className="contact-container">
          <h2>Get in Touch</h2>
          <form className="contact-form" onSubmit={async (e) => {
            e.preventDefault();
            setIsSubmitting(true);
            setFormStatus({ type: null, message: '' });

            const formData = new FormData(e.target);
            const templateParams = {
              from_name: formData.get('name'),
              from_email: formData.get('email'),
              title: formData.get('subject'),
              message: formData.get('message'),
              to_email: 'hi@ihsan.cc'
            };

            try {
              await emailjs.send(
                'service_1f58p8b',
                'template_47yztik',
                templateParams,
                '8QkIGK2-gftBhvDGA'
              );
              
              setFormStatus({ type: 'success', message: 'Message sent successfully! I\'ll get back to you soon.' });
              e.target.reset();
            } catch (error) {
              console.error('EmailJS error:', error);
              setFormStatus({ type: 'error', message: 'Failed to send message. Please try again or email me directly at hi@ihsan.cc' });
            } finally {
              setIsSubmitting(false);
            }
          }}>
            <div className="form-group">
              <input 
                type="text" 
                name="name" 
                placeholder="Your Name" 
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <input 
                type="email" 
                name="email" 
                placeholder="Your Email" 
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <input 
                type="text" 
                name="subject" 
                placeholder="Subject" 
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <textarea 
                name="message" 
                placeholder="Your Message" 
                className="form-textarea"
                rows="6"
                required
              ></textarea>
            </div>
            {formStatus.message && (
              <div className={`form-message ${formStatus.type === 'success' ? 'form-success' : 'form-error'}`}>
                {formStatus.message}
              </div>
            )}
            <button type="submit" className="contact-submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>
      </section>

      <footer className="footer-section">
        <p>
          Or reach me directly at <a href={`mailto:${contactContent.email}`} style={{color: '#d06085', textDecoration: 'none' }}>{contactContent.email} <span className="arrow-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span></a>
        </p>
        <p>
          Learn more about my projects: <a href={contactContent.website} target="_blank" rel="noopener noreferrer" style={{color: '#d06085', textDecoration: 'none' }}>{contactContent.website} <span className="arrow-icon">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 10L10 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6 2L10 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span></a>
        </p>
      </footer>

      <div className="footer-bar">
        <div className="footer-left">
          <p>{footerContent.copyright}</p>
        </div>
        <div className="footer-right">
          {footerContent.socialLinks.map((link, index) => (
            <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className="footer-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                {link.icon === 'github' && <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>}
                {link.icon === 'linkedin' && <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>}
                {link.icon === 'email' && <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>}
                {link.icon === 'website' && <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>}
              </svg>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
