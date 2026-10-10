const $ = s => document.querySelector(s);

const API_BASE = 'https://do7u-backend.onrender.com';

// Année du pied de page.
if ($('#year')) {
  $('#year').textContent = new Date().getFullYear();
}

// Menu de navigation mobile.
if ($('#menuToggle') && $('#nav')) {
  $('#menuToggle').addEventListener('click', () => {
    $('#nav').classList.toggle('open');
  });

  document.querySelectorAll('#nav a').forEach(a => {
    a.addEventListener('click', () => {
      $('#nav').classList.remove('open');
    });
  });
}

// Sécuriser le texte affiché dans le HTML.
function esc(s = '') {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

const fallbackProjectImage =
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80';

const fallbackActivityImage =
  'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1000&q=80';

// Carte d'un projet.
function projectCard(x) {
  const image = esc(x.image || fallbackProjectImage);

  return `
    <article class="project-card">
      <img
        loading="lazy"
        src="${image}"
        alt="${esc(x.title)}"
        onerror="this.onerror=null;this.src='${fallbackProjectImage}'"
      >

      <div class="card-body">
        <span class="tag">${esc(x.category || 'Projet')}</span>
        <h3>${esc(x.title)}</h3>
        <p>${esc(x.description)}</p>
      </div>
    </article>
  `;
}

// Carte d'une activité.
function activityCard(x) {
  const image = esc(x.image || fallbackActivityImage);

  return `
    <article class="activity-card">
      <img
        loading="lazy"
        src="${image}"
        alt="${esc(x.title)}"
        onerror="this.onerror=null;this.src='${fallbackActivityImage}'"
      >

      <div class="card-body">
        <time>${esc(x.date || 'Activité D7U')}</time>
        <h3>${esc(x.title)}</h3>
        <p>${esc(x.description)}</p>
        <a class="read-more" href="#contact">
          En savoir plus →
        </a>
      </div>
    </article>
  `;
}

// Charger les données du backend et les afficher.
async function loadContent() {
  const projectGrid = $('#projectGrid');
  const activityGrid = $('#activityGrid');

  if (!projectGrid || !activityGrid) {
    console.error(
      'Les éléments #projectGrid ou #activityGrid sont introuvables dans la page.'
    );
    return;
  }

  projectGrid.innerHTML = '<p>Chargement des projets...</p>';
  activityGrid.innerHTML = '<p>Chargement des activités...</p>';

  try {
    const response = await fetch(`${API_BASE}/api/content`, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Erreur du serveur : ${response.status}`);
    }

    const data = await response.json();

    const projects = Array.isArray(data.projects)
      ? data.projects
      : [];

    const activities = Array.isArray(data.activities)
      ? data.activities
      : [];

    projectGrid.innerHTML = projects.length
      ? projects.map(projectCard).join('')
      : '<p>Aucun projet publié pour le moment.</p>';

    activityGrid.innerHTML = activities.length
      ? activities.slice(0, 3).map(activityCard).join('')
      : '<p>Aucune activité publiée pour le moment.</p>';

    console.log(
      `DO7U : ${projects.length} projet(s) et ${activities.length} activité(s) chargés.`
    );

  } catch (error) {
    console.error('Erreur de chargement des contenus DO7U :', error);

    projectGrid.innerHTML = `
      <p>Impossible de charger les projets pour le moment.
      Veuillez réessayer plus tard.</p>
    `;

    activityGrid.innerHTML = `
      <p>Impossible de charger les activités pour le moment.
      Veuillez réessayer plus tard.</p>
    `;
  }
}

// Lancer le chargement.
loadContent();

// Formulaire de contact.
if ($('#contactForm')) {
  $('#contactForm').addEventListener('submit', e => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const subject = encodeURIComponent(
      'Message depuis le site D7U — ' + form.get('name')
    );

    const body = encodeURIComponent(
      `Nom : ${form.get('name')}\n` +
      `E-mail : ${form.get('email')}\n\n` +
      `${form.get('message')}`
    );

    if ($('#contactNote')) {
      $('#contactNote').textContent =
        'Votre application de messagerie va s’ouvrir pour envoyer votre message.';
    }

    window.location.href =
      `mailto:?subject=${subject}&body=${body}`;
  });
}
