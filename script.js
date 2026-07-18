class TextScramble {
  constructor(el) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}—=+*^?#________';
    this.update = this.update.bind(this);
  }
  setText(newText) {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise((resolve) => this.resolve = resolve);
    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 20);
      const end = start + Math.floor(Math.random() * 20);
      this.queue.push({ from, to, start, end });
    }
    cancelAnimationFrame(this.frameId);
    this.frame = 0;
    this.update();
    return promise;
  }
  update() {
    let output = '';
    let complete = 0;
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      if (this.frame >= end) {
        complete++;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span class="scramble-glyph" style="color:var(--accent); font-family:var(--font-mono);">${char}</span>`;
      } else {
        output += from;
      }
    }
    this.el.innerHTML = output;
    if (complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameId = requestAnimationFrame(this.update);
      this.frame++;
    }
  }
  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}

// Window Loader & Initial Trigger
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('fade-out');
    }, 800); // 800ms loading showcase
  }
  
  // Initial Scramble trigger
  const onLoadScrambles = document.querySelectorAll('.scramble-onload');
  onLoadScrambles.forEach(el => {
    const scramble = new TextScramble(el);
    scramble.setText(el.getAttribute('data-text') || el.innerText);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  // ═══════════════════════════════════════════
  // SOUND SYSTEM (Web Audio Synthesis)
  // ═══════════════════════════════════════════
  let audioCtx = null;
  let soundEnabled = false;

  const soundBtn = document.getElementById('sound-btn');
  
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      if (soundEnabled) {
        soundBtn.classList.remove('muted');
        initAudio();
        playTechSound(600, 0.05); // feedback beep
      } else {
        soundBtn.classList.add('muted');
      }
    });
  }

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTechSound(freq = 800, duration = 0.05, type = 'sine') {
    if (!soundEnabled) return;
    try {
      initAudio();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio synthesis error:", e);
    }
  }

  // Hover sound bindings for links and interactive elements
  const hoverables = document.querySelectorAll('a, button, .indicator-step, .project-card, .stat-card, .do-card, input, textarea');
  hoverables.forEach(el => {
    el.addEventListener('mouseenter', () => {
      playTechSound(900, 0.02, 'sine');
    });
    el.addEventListener('click', () => {
      playTechSound(450, 0.08, 'triangle');
    });
  });

  // ═══════════════════════════════════════════
  // INTERACTIVE CANVAS (Nodes Network Simulation)
  // ═══════════════════════════════════════════
  const canvas = document.getElementById('ghost-cursor-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  // Particle configuration parameters (adjustable via UI widget)
  const params = {
    particleCount: 75,
    linkDistance: 120,
    particleSpeed: 0.8,
    gravity: 0.25, // mouse pull strength
    showGrid: false
  };

  // Bind parameters to Tweakpane-style widget inputs
  const uiControls = {
    countSlider: document.getElementById('param-count'),
    distSlider: document.getElementById('param-dist'),
    speedSlider: document.getElementById('param-speed'),
    gravitySlider: document.getElementById('param-gravity')
  };

  // Setup inputs connection
  if (uiControls.countSlider) {
    uiControls.countSlider.addEventListener('input', (e) => {
      params.particleCount = parseInt(e.target.value);
      document.getElementById('val-count').textContent = params.particleCount;
      adjustParticleArray();
    });
  }
  if (uiControls.distSlider) {
    uiControls.distSlider.addEventListener('input', (e) => {
      params.linkDistance = parseInt(e.target.value);
      document.getElementById('val-dist').textContent = params.linkDistance;
    });
  }
  if (uiControls.speedSlider) {
    uiControls.speedSlider.addEventListener('input', (e) => {
      params.particleSpeed = parseFloat(e.target.value);
      document.getElementById('val-speed').textContent = params.particleSpeed.toFixed(1);
    });
  }
  if (uiControls.gravitySlider) {
    uiControls.gravitySlider.addEventListener('input', (e) => {
      params.gravity = parseFloat(e.target.value);
      document.getElementById('val-gravity').textContent = params.gravity.toFixed(2);
    });
  }

  // Tweakpane widget minimize action
  const tweakPanel = document.getElementById('tweak-panel');
  const tweakToggle = document.getElementById('tweak-toggle');
  if (tweakToggle && tweakPanel) {
    tweakToggle.addEventListener('click', () => {
      tweakPanel.classList.toggle('minimized');
      if (tweakPanel.classList.contains('minimized')) {
        tweakToggle.innerHTML = '⚙️'; // gear icon
      } else {
        tweakToggle.innerHTML = '✕'; // close icon
      }
    });
  }

  // Particle Class
  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(init = false) {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = (Math.random() - 0.5) * 2;
      this.radius = Math.random() * 2 + 1;
      this.color = `rgba(255, 255, 255, ${Math.random() * 0.4 + 0.2})`;
      this.accentProb = Math.random() < 0.15; // 15% particles are neon accent colored
      if (this.accentProb) {
        this.color = `rgba(215, 255, 0, ${Math.random() * 0.5 + 0.4})`;
        this.radius += 0.5;
      }
    }

    update(mouse) {
      // Speed multiplier
      this.x += this.vx * params.particleSpeed;
      this.y += this.vy * params.particleSpeed;

      // Wrap around edges
      if (this.x < 0 || this.x > width) this.vx *= -1;
      if (this.y < 0 || this.y > height) this.vy *= -1;

      // Mouse interaction (gravity attraction)
      if (mouse.x !== null && mouse.y !== null) {
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < 220) {
          const force = (220 - dist) / 220; // 0 (far) to 1 (close)
          this.x += (dx / dist) * force * params.gravity * 3;
          this.y += (dy / dist) * force * params.gravity * 3;
        }
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
  }

  const particles = [];
  function adjustParticleArray() {
    while (particles.length < params.particleCount) {
      particles.push(new Particle());
    }
    while (particles.length > params.particleCount) {
      particles.pop();
    }
  }
  adjustParticleArray();

  const mouse = { x: null, y: null };
  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Particle draw & linking animation loop
  function animate() {
    ctx.clearRect(0, 0, width, height);

    // Dynamic grid option
    if (params.showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.02)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Draw and connect particles
    const len = particles.length;
    for (let i = 0; i < len; i++) {
      particles[i].update(mouse);
      particles[i].draw();

      for (let j = i + 1; j < len; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.hypot(dx, dy);

        if (dist < params.linkDistance) {
          const alpha = (1 - (dist / params.linkDistance)) * 0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          
          if (particles[i].accentProb && particles[j].accentProb) {
            ctx.strokeStyle = `rgba(215, 255, 0, ${alpha * 2.2})`;
            ctx.lineWidth = 1.2;
          } else {
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.8;
          }
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }
  animate();

  // ═══════════════════════════════════════════
  // SCROLL TRACKING & NAVIGATION OBSERVER
  // ═══════════════════════════════════════════
  const sections = document.querySelectorAll('section.snap-section');
  const navLinks = document.querySelectorAll('.nav-link');
  const sidebarSteps = document.querySelectorAll('.indicator-step');
  const scrollContainer = document.querySelector('.scroll-container');

  function updateActiveStates(currentId) {
    // Header Links
    navLinks.forEach(link => {
      const targetHash = link.getAttribute('href');
      if (targetHash === `#${currentId}`) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Sidebar indicators
    sidebarSteps.forEach(step => {
      const targetHash = step.getAttribute('data-target');
      if (targetHash === currentId) {
        step.classList.add('active');
      } else {
        step.classList.remove('active');
      }
    });
  }

  // Use Intersection Observer for active sections
  const observerOptions = {
    root: scrollContainer,
    rootMargin: '-30% 0px -40% 0px', // check when middle of section dominates viewport
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        updateActiveStates(id);
      }
    });
  }, observerOptions);

  sections.forEach(section => {
    observer.observe(section);
  });

  // Clicking indicator steps to smooth scroll
  sidebarSteps.forEach(step => {
    step.addEventListener('click', () => {
      const targetId = step.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Nav Logo scroll to home
  const logo = document.getElementById('nav-logo');
  if (logo) {
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSection = document.getElementById('home');
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // Custom contact form submission feedback
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Play a custom confirmation sound
      playTechSound(1200, 0.25, 'sine');
      setTimeout(() => {
        playTechSound(1500, 0.25, 'sine');
      }, 100);

      // Submit feedback visual
      const btn = document.getElementById('btn-submit');
      const slotText = btn.querySelector('.slot-text');
      const slotTextHover = btn.querySelector('.slot-text-hover');
      if (slotText && slotTextHover) {
        const oldText = slotText.innerHTML;
        const oldHover = slotTextHover.innerHTML;
        
        slotText.innerHTML = "MESSAGE SENT";
        slotTextHover.innerHTML = "MESSAGE SENT";
        btn.style.borderColor = "var(--accent)";
        btn.style.color = "var(--accent)";
        
        // Reset after 3 seconds
        setTimeout(() => {
          slotText.innerHTML = oldText;
          slotTextHover.innerHTML = oldHover;
          btn.style.borderColor = "";
          btn.style.color = "";
          contactForm.reset();
        }, 3000);
      }
    });
  }

  // Wire TextScramble effect on scramble-hover elements
  const scrambleHovers = document.querySelectorAll('.scramble-hover');
  scrambleHovers.forEach(el => {
    const scramble = new TextScramble(el);
    const text = el.getAttribute('data-text') || el.innerText;
    el.addEventListener('mouseenter', () => {
      scramble.setText(text);
    });
  });

  // Mobile Hamburger menu overlay interaction
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      const isOpen = hamburgerBtn.classList.toggle('open');
      mobileMenu.classList.toggle('open', isOpen);
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('open');
        mobileMenu.classList.remove('open');
      });
    });
  }
});
