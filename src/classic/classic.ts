/**
 * Classic-site behaviour: the Bulma navbar burger.
 *
 * The 2022 original wired this with a bare <span> and no ARIA. Same toggle,
 * now on a real <button> that reports its state.
 */

const burger = document.querySelector<HTMLButtonElement>('.navbar-burger')
const menu = burger ? document.getElementById(burger.dataset.target ?? '') : null

burger?.addEventListener('click', () => {
  const open = burger.classList.toggle('is-active')
  menu?.classList.toggle('is-active', open)
  burger.setAttribute('aria-expanded', String(open))
})
