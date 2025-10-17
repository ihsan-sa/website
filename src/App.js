import React, { useState, useEffect } from 'react';
import './App.css';
import { aboutContent, experiences, projects, heroContent, contactContent, footerContent, skills } from './data';

function App() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [activeSkills, setActiveSkills] = useState(new Set());
  const [openExperiences, setOpenExperiences] = useState(new Set());
  const [openProjects, setOpenProjects] = useState(new Set());
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    };

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleSkill = (skillId) => {
    const newActiveSkills = new Set(activeSkills);
    if (newActiveSkills.has(skillId)) {
      newActiveSkills.delete(skillId);
    } else {
      newActiveSkills.add(skillId);
    }
    setActiveSkills(newActiveSkills);
  };

  const toggleExperience = (expId) => {
    const next = new Set(openExperiences);
    if (next.has(expId)) {
      next.delete(expId);
    } else {
      next.add(expId);
    }
    setOpenExperiences(next);
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
      <header className="App-header">
            <div className="hero-section">
        <p>
                Hello, I'm <span style={{ color: heroContent.nameColor }}>{heroContent.name}</span>.
        </p>
        <p style={{fontSize: '17px'}}>
                {heroContent.subtitle}
              </p>
            <p style={{fontSize: '17px', marginTop: '0.5rem'}}> 
              {heroContent.secondarySubtitle}
            </p>
            </div>
            
            {/* Floating project thumbnails */}
            <div className="floating-thumbnails">
              {projects.slice(0, 8).map((project, index) => (
                <a 
                  key={project.id} 
                  href={`#project-${project.id}`}
                  className={`floating-thumbnail thumbnail-${index + 1}`}
                  style={{ 
                    animationDelay: `${index * 0.3}s`,
                    animationDuration: `${8 + index * 1.5}s`
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    const projectElement = document.getElementById(`project-${project.id}`);
                    if (projectElement) {
                      // Expand the project if it's not already open
                      if (!openProjects.has(project.id)) {
                        toggleProject(project.id);
                      }
                      // Scroll to the project
                      projectElement.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      // Fallback to projects section if specific project not found
                      document.getElementById('projects').scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  {project.image ? (
                    <img 
                      src={project.image} 
                      alt={project.title}
                      title={project.title}
                    />
                  ) : (
                    <div className="thumbnail-placeholder">
                      {project.title.charAt(0)}
                    </div>
                  )}
                </a>
              ))}
            </div>
        <div className="scroll-indicator">
          <div className={`scroll-arrow ${hasScrolled ? 'stopped' : ''}`}></div>
        </div>
        
        {/* Temporary width indicator - remove after testing */}
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          Width: {windowWidth}px
        </div>
      </header>

        <section className="quick-links-section">
          <h2>Quick Links</h2>
          <div className="quick-links-grid">
            <a href="#about" className="quick-link">About</a>
            <a href="#skills" className="quick-link">Skills</a>
            <a href="#experience" className="quick-link">Experience</a>
            <a href="#projects" className="quick-link">Projects</a>
            <a href="#contact" className="quick-link">Contact</a>
          </div>
          <div className="pdf-buttons">
            <a className="action-btn" href="/assets/Ihsan_Resume.pdf" target="_blank" rel="noopener noreferrer">View Résumé (PDF)</a>
            <a className="action-btn" href="/assets/Ihsan_Portfolio.pdf" target="_blank" rel="noopener noreferrer">View Portfolio (PDF)</a>
          </div>
        </section>

        <section id="about" className="about-section">
          <h2>{aboutContent.title}</h2>
          <div className="about-content">
            <p>{aboutContent.greeting}</p>
            
            <p>{aboutContent.description}</p>
            
            <p>A few things about me:</p>
            
            <ul>
              {aboutContent.points.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
            
            <p>{aboutContent.closing}</p>
            
            <p>{aboutContent.contact}</p>
          </div>
        </section>

      <section id="skills" className="skills-section">
        <h2>Skills</h2>
        <div className="skills-grid">
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
                <span className="skill-toggle">+</span>
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

      <section id="experience" className="experience-section">
        <h2>Experience</h2>
        {experiences.map((experience) => (
          <div key={experience.id} className={`experience-item ${openExperiences.has(experience.id) ? 'active' : ''}`}>
            <div className="experience-header" onClick={() => toggleExperience(experience.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExperience(experience.id); }}>
              <div className="experience-title">
                <h3>{experience.title}</h3>
                <p className="company">{experience.company} • {experience.period}</p>
              </div>
              <div className="company-logo">
                <img src={experience.logo} alt={experience.company} />
              </div>
              <span className="experience-toggle" aria-hidden="true">{openExperiences.has(experience.id) ? '−' : '+'}</span>
            </div>
            <div className="experience-content">
              <p>{experience.description}</p>
              {experience.responsibilities.length > 0 && (
                <ul>
                  {experience.responsibilities.map((responsibility, index) => (
                    <li key={index}>{responsibility}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </section>

      <section id="projects" className="projects-section">
        <h2>Projects</h2>
        <p className="section-note">Tip: <strong>Expand</strong> a tile for a quick <strong>summary.</strong> <strong>Click</strong> the tile to view <strong>full details.</strong></p>
            <div className="projects-grid">
              {projects.map((project) => (
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
                <div className="project-header" onClick={(e) => { e.stopPropagation(); toggleProject(project.id); }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); toggleProject(project.id); } }}>
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

      <footer id="contact" className="contact-section">
        <p>
          Shoot me an email at <a href={`mailto:${contactContent.email}`} style={{color: '#d06085', textDecoration: 'none' }}>{contactContent.email}</a>
        </p>
        <p>
          Learn more about my projects: <a href={contactContent.website} style={{color: '#d06085', textDecoration: 'none' }}>{contactContent.website}</a>
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
