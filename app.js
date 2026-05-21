const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-button');

const setElevated = () => {
  header.dataset.elevated = window.scrollY > 8 ? 'true' : 'false';
};

window.addEventListener('scroll', setElevated, { passive: true });
setElevated();

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!open));
  if (!open) {
    const menu = document.createElement('div');
    menu.className = 'mobile-menu';
    menu.innerHTML = `
      <a href="#agents">Agents</a>
      <a href="#how">How it works</a>
      <a href="#builders">For builders</a>
      <a href="#pricing">Pricing</a>
    `;
    Object.assign(menu.style, {
      position: 'fixed', top: '76px', left: '18px', right: '18px', zIndex: '30',
      display: 'grid', gap: '6px', padding: '12px', background: '#fff', borderRadius: '14px',
      boxShadow: 'rgba(0,0,0,.08) 0 0 0 1px, rgba(0,0,0,.08) 0 16px 30px'
    });
    [...menu.children].forEach((a) => Object.assign(a.style, { padding: '14px', borderRadius: '10px', fontWeight: '500' }));
    menu.addEventListener('click', () => {
      menu.remove();
      menuButton.setAttribute('aria-expanded', 'false');
    });
    document.body.appendChild(menu);
  } else {
    document.querySelector('.mobile-menu')?.remove();
  }
});
