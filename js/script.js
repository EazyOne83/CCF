// Keep the footer year current.
const yearElement = document.getElementById("current-year");
if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

// Highlight the destination currently in view, giving the page a subtle
// "navigation through a world" feeling without hijacking normal scrolling.
const sectionLinks = [...document.querySelectorAll('.site-header nav a[href*="#"]')];
const trackedSections = sectionLinks
  .map((link) => {
    const hash = new URL(link.href, window.location.href).hash;
    return hash ? document.querySelector(hash) : null;
  })
  .filter(Boolean);

if ("IntersectionObserver" in window && trackedSections.length) {
  const linkById = new Map();
  sectionLinks.forEach((link) => {
    const hash = new URL(link.href, window.location.href).hash;
    if (hash) linkById.set(hash.slice(1), link);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      sectionLinks.forEach((link) => link.removeAttribute("aria-current"));
      const activeLink = linkById.get(entry.target.id);
      if (activeLink) activeLink.setAttribute("aria-current", "location");
    });
  }, {
    rootMargin: "-25% 0px -55% 0px",
    threshold: 0
  });

  [...new Set(trackedSections)].forEach((section) => observer.observe(section));
}

// Give the three CCF mode cards a small, accessible focus/hover response.
document.querySelectorAll('#framework .card').forEach((card) => {
  card.addEventListener('pointerenter', () => card.classList.add('is-highlighted'));
  card.addEventListener('pointerleave', () => card.classList.remove('is-highlighted'));
  card.addEventListener('focusin', () => card.classList.add('is-highlighted'));
  card.addEventListener('focusout', () => card.classList.remove('is-highlighted'));
});
