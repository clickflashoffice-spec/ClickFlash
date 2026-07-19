Title: Live Content

Description: Fetched live

Source: https://sharp.pixelplumbing.com/api-operation#sharpen

---

<!DOCTYPE html><html lang="en" dir="ltr" data-theme="dark" data-has-toc data-has-sidebar class="astro-bguv2lll"> <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self'; object-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com/beacon.min.js/;"/><title>Image operations | sharp</title><link rel="canonical" href="https://sharp.pixelplumbing.com/api-operation/"/><link rel="sitemap" href="/sitemap-index.xml"/><link rel="author" href="/humans.txt" type="text/plain"/><script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareSourceCode","name":"sharp","description":"High performance Node.js image processing","url":"https://sharp.pixelplumbing.com","codeRepository":"https://github.com/lovell/sharp","programmingLanguage":["JavaScript","C++"],"runtimePlatform":"Node.js","copyrightHolder":{"@context":"https://schema.org","@type":"Person","name":"Lovell Fuller"},"copyrightYear":2013,"license":"https://www.apache.org/licenses/LICENSE-2.0"}</script><link rel="shortcut icon" href="/favicon.svg" type="image/svg+xml"/><meta name="generator" content="Astro v6.4.8"/><meta name="generator" content="Starlight v0.40.0"/><meta property="og:title" content="Image operations"/><meta property="og:type" content="article"/><meta property="og:url" content="https://sharp.pixelplumbing.com/api-operation/"/><meta property="og:locale" content="en"/><meta property="og:description" content="High performance Node.js image processing. The fastest module to resize JPEG, PNG, WebP and TIFF images."/><meta property="og:site_name" content="sharp"/><meta name="twitter:card" content="summary_large_image"/><meta name="description" content="High performance Node.js image processing. The fastest module to resize JPEG, PNG, WebP and TIFF images."/><script>
	window.StarlightThemeProvider = (() => {
		const storedTheme =
			typeof localStorage !== 'undefined' && localStorage.getItem('starlight-theme');
		const theme =
			storedTheme ||
			(window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
		document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
		return {
			updatePickers(theme = storedTheme || 'auto') {
				document.querySelectorAll('starlight-theme-select').forEach((picker) => {
					const select = picker.querySelector('select');
					if (select) select.value = theme;
					/** @type {HTMLTemplateElement | null} */
					const tmpl = document.querySelector(`#theme-icons`);
					const newIcon = tmpl && tmpl.content.querySelector('.' + theme);
					if (newIcon) {
						const oldIcon = picker.querySelector('svg.label-icon');
						if (oldIcon) {
							oldIcon.replaceChildren(...newIcon.cloneNode(true).childNodes);
						}
					}
				});
			},
		};
	})();
</script><template id="theme-icons"><svg aria-hidden="true" class="light astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M5 12a1 1 0 0 0-1-1H3a1 1 0 0 0 0 2h1a1 1 0 0 0 1-1Zm.64 5-.71.71a1 1 0 0 0 0 1.41 1 1 0 0 0 1.41 0l.71-.71A1 1 0 0 0 5.64 17ZM12 5a1 1 0 0 0 1-1V3a1 1 0 0 0-2 0v1a1 1 0 0 0 1 1Zm5.66 2.34a1 1 0 0 0 .7-.29l.71-.71a1 1 0 1 0-1.41-1.41l-.66.71a1 1 0 0 0 0 1.41 1 1 0 0 0 .66.29Zm-12-.29a1 1 0 0 0 1.41 0 1 1 0 0 0 0-1.41l-.71-.71a1.004 1.004 0 1 0-1.43 1.41l.73.71ZM21 11h-1a1 1 0 0 0 0 2h1a1 1 0 0 0 0-2Zm-2.64 6A1 1 0 0 0 17 18.36l.71.71a1 1 0 0 0 1.41 0 1 1 0 0 0 0-1.41l-.76-.66ZM12 6.5a5.5 5.5 0 1 0 5.5 5.5A5.51 5.51 0 0 0 12 6.5Zm0 9a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm0 3.5a1 1 0 0 0-1 1v1a1 1 0 0 0 2 0v-1a1 1 0 0 0-1-1Z"/></svg><svg aria-hidden="true" class="dark astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M21.64 13a1 1 0 0 0-1.05-.14 8.049 8.049 0 0 1-3.37.73 8.15 8.15 0 0 1-8.14-8.1 8.59 8.59 0 0 1 .25-2A1 1 0 0 0 8 2.36a10.14 10.14 0 1 0 14 11.69 1 1 0 0 0-.36-1.05Zm-9.5 6.69A8.14 8.14 0 0 1 7.08 5.22v.27a10.15 10.15 0 0 0 10.14 10.14 9.784 9.784 0 0 0 2.1-.22 8.11 8.11 0 0 1-7.18 4.32v-.04Z"/></svg><svg aria-hidden="true" class="auto astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M21 14h-1V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v7H3a1 1 0 0 0-1 1v2a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-2a1 1 0 0 0-1-1ZM6 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7H6V7Zm14 10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1h16v1Z"/></svg></template><link rel="stylesheet" href="/_astro/print.DNXP8c50.css" media="print"><link rel="stylesheet" href="/_astro/common.L1NS0bs4.css"><script type="module" src="/_astro/page.B_tncCx8.js"></script></head> <body class="astro-bguv2lll"> <a href="#_top" class="astro-7q3lir66">Skip to content</a> <div class="page sl-flex astro-vrdttmbt"> <header class="header astro-vrdttmbt"><div class="header astro-kmkmnagf"> <div class="title-wrapper sl-flex astro-kmkmnagf"> <a href="/" class="site-title sl-flex astro-m46x6ez3">  <img class="astro-m46x6ez3" alt="#" src="/_astro/sharp-logo.CiVIswaO.svg" width="550" height="550">  <span class="astro-m46x6ez3" translate="no"> sharp </span> </a> </div> <div class="sl-flex print:hidden astro-kmkmnagf"> <site-search class="astro-kmkmnagf astro-v37mnknz" data-translations="{&quot;placeholder&quot;:&quot;Search&quot;}"> <button data-open-modal disabled aria-label="Search" aria-keyshortcuts="Control+K" class="astro-v37mnknz"> <svg aria-hidden="true" class="astro-v37mnknz astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M21.71 20.29 18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a.999.999 0 0 0 1.42 0 1 1 0 0 0 0-1.39ZM11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"/></svg> <span class="sl-hidden md:sl-block astro-v37mnknz" aria-hidden="true">Search</span> <kbd class="sl-hidden md:sl-flex astro-v37mnknz" style="display: none;"> <kbd class="astro-v37mnknz">Ctrl</kbd><kbd class="astro-v37mnknz">K</kbd> </kbd> </button> <dialog style="padding:0" aria-label="Search" class="astro-v37mnknz"> <div class="dialog-frame sl-flex astro-v37mnknz">  <button data-close-modal class="sl-flex md:sl-hidden astro-v37mnknz"> Cancel </button> <div class="search-container astro-v37mnknz"> <div id="starlight__search" class="astro-v37mnknz"></div> </div> </div> </dialog> </site-search>  <script>
	(() => {
		const openBtn = document.querySelector('button[data-open-modal]');
		const shortcut = openBtn?.querySelector('kbd');
		if (!openBtn || !(shortcut instanceof HTMLElement)) return;
		const platformKey = shortcut.querySelector('kbd');
		if (platformKey && /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) {
			platformKey.textContent = '⌘';
			openBtn.setAttribute('aria-keyshortcuts', 'Meta+K');
		}
		shortcut.style.display = '';
	})();
</script> <script type="module" src="/_astro/Search.astro_astro_type_script_index_0_lang.lq3t8uE2.js"></script>  </div> <div class="sl-hidden md:sl-flex print:hidden right-group astro-kmkmnagf"> <div class="sl-flex social-icons astro-kmkmnagf"> <a href="https://opencollective.com/libvips" rel="me" class="sl-flex astro-wy4te6ga"><span class="sr-only astro-wy4te6ga">Open Collective</span><svg aria-hidden="true" class="astro-wy4te6ga astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M21.86 5.17a11.94 11.94 0 0 1 0 13.66l-3.1-3.1a7.68 7.68 0 0 0 0-7.46l3.1-3.1Zm-3.03-3.03-3.1 3.1a7.71 7.71 0 1 0 0 13.51l3.1 3.11a12 12 0 1 1 0-19.73Z"/><path d="M21.86 5.17a11.94 11.94 0 0 1 0 13.66l-3.1-3.1a7.68 7.68 0 0 0 0-7.46l3.1-3.1Z"/></svg></a><a href="https://github.com/lovell/sharp" rel="me" class="sl-flex astro-wy4te6ga"><span class="sr-only astro-wy4te6ga">GitHub</span><svg aria-hidden="true" class="astro-wy4te6ga astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.08 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3Z"/></svg></a> </div> <starlight-theme-select>  <label style="--sl-select-width: 6.25em" class="astro-4yphtoen"> <span class="sr-only astro-4yphtoen">Select theme</span> <svg aria-hidden="true" class="icon label-icon astro-4yphtoen astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M21 14h-1V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v7H3a1 1 0 0 0-1 1v2a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-2a1 1 0 0 0-1-1ZM6 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7H6V7Zm14 10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1h16v1Z"/></svg> <select autocomplete="off" class="astro-4yphtoen"> <option value="dark" class="astro-4yphtoen">Dark</option><option value="light" class="astro-4yphtoen">Light</option><option value="auto" selected class="astro-4yphtoen">Auto</option> </select> <svg aria-hidden="true" class="icon caret astro-4yphtoen astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M17 9.17a1 1 0 0 0-1.41 0L12 12.71 8.46 9.17a1 1 0 1 0-1.41 1.42l4.24 4.24a1.002 1.002 0 0 0 1.42 0L17 10.59a1.002 1.002 0 0 0 0-1.42Z"/></svg> </label> </starlight-theme-select>  <script>
	StarlightThemeProvider.updatePickers();
</script> <script type="module">const r="starlight-theme",o=e=>e==="auto"||e==="dark"||e==="light"?e:"auto",c=()=>o(typeof localStorage<"u"&&localStorage.getItem(r));function n(e){typeof localStorage<"u"&&localStorage.setItem(r,e==="light"||e==="dark"?e:"")}const l=()=>matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";function t(e){StarlightThemeProvider.updatePickers(e),document.documentElement.dataset.theme=e==="auto"?l():e,n(e)}matchMedia("(prefers-color-scheme: light)").addEventListener("change",()=>{c()==="auto"&&t("auto")});class s extends HTMLElement{constructor(){super(),t(c()),this.querySelector("select")?.addEventListener("change",a=>{a.currentTarget instanceof HTMLSelectElement&&t(o(a.currentTarget.value))})}}customElements.define("starlight-theme-select",s);</script> <script type="module">class s extends HTMLElement{constructor(){super();const e=this.querySelector("select");e&&(e.addEventListener("change",t=>{t.currentTarget instanceof HTMLSelectElement&&(window.location.pathname=t.currentTarget.value)}),window.addEventListener("pageshow",t=>{if(!t.persisted)return;const n=e.querySelector("option[selected]")?.index;n!==e.selectedIndex&&(e.selectedIndex=n??0)}))}}customElements.define("starlight-lang-select",s);</script> </div> </div></header> <nav class="sidebar print:hidden astro-vrdttmbt" aria-label="Main"> <starlight-menu-button class="print:hidden astro-jif73yzw"> <button aria-expanded="false" aria-label="Menu" aria-controls="starlight__sidebar" class="sl-flex md:sl-hidden astro-jif73yzw"> <svg aria-hidden="true" class="open-menu astro-jif73yzw astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M3 8h18a1 1 0 1 0 0-2H3a1 1 0 0 0 0 2Zm18 8H3a1 1 0 0 0 0 2h18a1 1 0 0 0 0-2Zm0-5H3a1 1 0 0 0 0 2h18a1 1 0 0 0 0-2Z"/></svg> <svg aria-hidden="true" class="close-menu astro-jif73yzw astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="m13.41 12 6.3-6.29a1.004 1.004 0 1 0-1.42-1.42L12 10.59l-6.29-6.3a1.004 1.004 0 0 0-1.42 1.42l6.3 6.29-6.3 6.29a1 1 0 0 0 0 1.42.998.998 0 0 0 1.42 0l6.29-6.3 6.29 6.3a.999.999 0 0 0 1.42 0 1 1 0 0 0 0-1.42L13.41 12Z"/></svg> </button> </starlight-menu-button> <script type="module">class s extends HTMLElement{constructor(){super(),this.btn=this.querySelector("button"),this.btn.addEventListener("click",()=>this.toggleExpanded());const t=this.closest("nav");t&&t.addEventListener("keyup",e=>this.closeOnEscape(e))}setExpanded(t){this.setAttribute("aria-expanded",String(t)),document.body.toggleAttribute("data-mobile-menu-expanded",t)}toggleExpanded(){this.setExpanded(this.getAttribute("aria-expanded")!=="true")}closeOnEscape(t){t.code==="Escape"&&(this.setExpanded(!1),this.btn.focus())}}customElements.define("starlight-menu-button",s);</script>  <div id="starlight__sidebar" class="sidebar-pane astro-vrdttmbt"> <div class="sidebar-content sl-flex astro-vrdttmbt"> <sl-sidebar-state-persist data-hash="0g134sg" class="astro-kku4brbg"> <script aria-hidden="true">
		(() => {
			try {
				if (!matchMedia('(min-width: 50em)').matches) return;
				/** @type {HTMLElement | null} */
				const target = document.querySelector('sl-sidebar-state-persist');
				const state = JSON.parse(sessionStorage.getItem('sl-sidebar-state') || '0');
				if (!target || !state || target.dataset.hash !== state.hash) return;
				window._starlightScrollRestore = state.scroll;
				customElements.define(
					'sl-sidebar-restore',
					class SidebarRestore extends HTMLElement {
						connectedCallback() {
							try {
								const idx = parseInt(this.dataset.index || '');
								const details = this.closest('details');
								if (details && typeof state.open[idx] === 'boolean') details.open = state.open[idx];
							} catch {}
						}
					}
				);
			} catch {}
		})();
	</script>  <ul class="top-level astro-3ii7xxms"> <li class="astro-3ii7xxms"> <a href="/" class="large astro-3ii7xxms"> <span class="astro-3ii7xxms">Home</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/install/" class="large astro-3ii7xxms"> <span class="astro-3ii7xxms">Installation</span>  </a> </li><li class="astro-3ii7xxms"> <details open class="astro-3ii7xxms"> <summary class="astro-3ii7xxms"> <span class="group-label astro-3ii7xxms"> <span class="large astro-3ii7xxms">API</span>  </span> <svg aria-hidden="true" class="caret astro-3ii7xxms astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1.25rem;"><path d="m14.83 11.29-4.24-4.24a1 1 0 1 0-1.42 1.41L12.71 12l-3.54 3.54a1 1 0 0 0 0 1.41 1 1 0 0 0 .71.29 1 1 0 0 0 .71-.29l4.24-4.24a1.002 1.002 0 0 0 0-1.42Z"/></svg> </summary> <sl-sidebar-restore data-index="0"></sl-sidebar-restore> <ul class="astro-3ii7xxms"> <li class="astro-3ii7xxms"> <a href="/api-constructor/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">Constructor</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/api-input/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">Input metadata</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/api-output/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">Output options</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/api-resize/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">Resizing images</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/api-composite/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">Compositing images</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/api-operation/" aria-current="page" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">Image operations</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/api-colour/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">Colour manipulation</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/api-channel/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">Channel manipulation</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/api-utility/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">Global properties</span>  </a> </li> </ul> </details> </li><li class="astro-3ii7xxms"> <a href="/performance/" class="large astro-3ii7xxms"> <span class="astro-3ii7xxms">Performance</span>  </a> </li><li class="astro-3ii7xxms"> <details class="astro-3ii7xxms"> <summary class="astro-3ii7xxms"> <span class="group-label astro-3ii7xxms"> <span class="large astro-3ii7xxms">Changelog</span>  </span> <svg aria-hidden="true" class="caret astro-3ii7xxms astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1.25rem;"><path d="m14.83 11.29-4.24-4.24a1 1 0 1 0-1.42 1.41L12.71 12l-3.54 3.54a1 1 0 0 0 0 1.41 1 1 0 0 0 .71.29 1 1 0 0 0 .71-.29l4.24-4.24a1.002 1.002 0 0 0 0-1.42Z"/></svg> </summary> <sl-sidebar-restore data-index="1"></sl-sidebar-restore> <ul class="astro-3ii7xxms"> <li class="astro-3ii7xxms"> <a href="/changelog/v0.35.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.35.2 - 19th June 2026</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.35.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.35.1 - 11th June 2026</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.35.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.35.0 - 10th June 2026</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.34.5/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.34.5 - 6th November 2025</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.34.4/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.34.4 - 17th September 2025</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.34.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.34.3 - 10th July 2025</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.34.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.34.2 - 20th May 2025</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.34.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.34.1 - 7th April 2025</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.34.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.34.0 - 4th April 2025</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.33.5/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.33.5 - 16th August 2024</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.33.4/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.33.4 - 16th May 2024</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.33.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.33.3 - 23rd March 2024</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.33.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.33.2 - 12th January 2024</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.33.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.33.1 - 17th December 2023</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.33.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.33.0 - 29th November 2023</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.32.6/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.32.6 - 18th September 2023</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.32.5/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.32.5 - 15th August 2023</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.32.4/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.32.4 - 21st July 2023</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.32.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.32.3 - 14th July 2023</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.32.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.32.2 - 11th July 2023</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.32.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.32.1 - 27th April 2023</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.32.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.32.0 - 24th March 2023</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.31.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.31.3 - 21st December 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.31.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.31.2 - 4th November 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.31.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.31.1 - 29th September 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.31.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.31.0 - 5th September 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.30.7/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.30.7 - 22nd June 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.30.6/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.30.6 - 30th May 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.30.5/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.30.5 - 23rd May 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.30.4/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.30.4 - 18th April 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.30.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.30.3 - 14th March 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.30.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.30.2 - 2nd March 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.30.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.30.1 - 9th February 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.30.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.30.0 - 1st February 2022</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.29.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.29.3 - 14th November 2021</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.29.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.29.2 - 21st October 2021</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.29.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.29.1 - 7th September 2021</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.29.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.29.0 - 17th August 2021</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.28.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.28.3 - 24th May 2021</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.28.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.28.2 - 10th May 2021</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.28.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.28.1 - 5th April 2021</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.28.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.28.0 - 29th March 2021</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.27.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.27.2 - 22nd February 2021</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.27.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.27.1 - 27th January 2021</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.27.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.27.0 - 22nd December 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.26.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.26.3 - 16th November 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.26.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.26.2 - 14th October 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.26.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.26.1 - 20th September 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.26.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.26.0 - 25th August 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.25.4/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.25.4 - 12th June 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.25.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.25.3 - 17th May 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.25.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.25.2 - 20th March 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.25.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.25.1 - 7th March 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.25.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.25.0 - 7th March 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.24.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.24.1 - 15th February 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.24.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.24.0 - 16th January 2020</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.23.4/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.23.4 - 5th December 2019</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.23.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.23.3 - 17th November 2019</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.23.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.23.2 - 28th October 2019</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.23.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.23.1 - 26th September 2019</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.23.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.23.0 - 29th July 2019</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.22.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.22.1 - 25th April 2019</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.22.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.22.0 - 18th March 2019</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.21.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.21.3 - 19th January 2019</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.21.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.21.2 - 13th January 2019</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.21.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.21.1 - 7th December 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.21.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.21.0 - 4th October 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.20.8/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.20.8 - 5th September 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.20.7/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.20.7 - 21st August 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.20.6/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.20.6 - 20th August 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.20.5/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.20.5 - 27th June 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.20.4/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.20.4 - 20th June 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.20.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.20.3 - 29th May 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.20.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.20.2 - 28th April 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.20.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.20.1 - 17th March 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.20.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.20.0 - 5th March 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.19.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.19.1 - 24th February 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.19.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.19.0 - 11th January 2018</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.18.4/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.18.4 - 18th September 2017</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.18.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.18.3 - 13th September 2017</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.18.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.18.2 - 1st July 2017</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.18.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.18.1 - 30th May 2017</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.18.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.18.0 - 30th May 2017</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.17.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.17.3 - 1st April 2017</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.17.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.17.2 - 11th February 2017</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.17.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.17.1 - 15th January 2017</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.17.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.17.0 - 11th December 2016</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.16.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.16.2 - 22nd October 2016</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.16.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.16.1 - 13th October 2016</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.16.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.16.0 - 18th August 2016</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.15.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.15.1 - 12th July 2016</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.15.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.15.0 - 21st May 2016</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.14.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.14.1 - 16th April 2016</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.14.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.14.0 - 2nd April 2016</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.13.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.13.1 - 27th February 2016</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.13.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.13.0 - 15th February 2016</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.12.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.12.2 - 16th January 2016</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.12.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.12.1 - 12th December 2015</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.12.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.12.0 - 23rd November 2015</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.11.4/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.11.4 - 5th November 2015</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.11.3/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.11.3 - 8th September 2015</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.11.2/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.11.2 - 28th August 2015</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.11.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.11.1 - 12th August 2015</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.11.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.11.0 - 15th July 2015</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.10.1/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.10.1 - 1st June 2015</span>  </a> </li><li class="astro-3ii7xxms"> <a href="/changelog/v0.10.0/" class="astro-3ii7xxms"> <span class="astro-3ii7xxms">v0.10.0 - 23rd April 2015</span>  </a> </li> </ul> </details> </li> </ul>  <script aria-hidden="true">
		(() => {
			const scroller = document.getElementById('starlight__sidebar');
			if (!window._starlightScrollRestore || !scroller) return;
			scroller.scrollTop = window._starlightScrollRestore;
			delete window._starlightScrollRestore;
		})();
	</script> </sl-sidebar-state-persist> <div class="md:sl-hidden"> <div class="mobile-preferences sl-flex astro-wu23bvmt"> <div class="social-icons astro-wu23bvmt"> <a href="https://opencollective.com/libvips" rel="me" class="sl-flex astro-wy4te6ga"><span class="sr-only astro-wy4te6ga">Open Collective</span><svg aria-hidden="true" class="astro-wy4te6ga astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M21.86 5.17a11.94 11.94 0 0 1 0 13.66l-3.1-3.1a7.68 7.68 0 0 0 0-7.46l3.1-3.1Zm-3.03-3.03-3.1 3.1a7.71 7.71 0 1 0 0 13.51l3.1 3.11a12 12 0 1 1 0-19.73Z"/><path d="M21.86 5.17a11.94 11.94 0 0 1 0 13.66l-3.1-3.1a7.68 7.68 0 0 0 0-7.46l3.1-3.1Z"/></svg></a><a href="https://github.com/lovell/sharp" rel="me" class="sl-flex astro-wy4te6ga"><span class="sr-only astro-wy4te6ga">GitHub</span><svg aria-hidden="true" class="astro-wy4te6ga astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.09-.73.09-.73 1.2.09 1.83 1.24 1.83 1.24 1.08 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3Z"/></svg></a> </div> <starlight-theme-select>  <label style="--sl-select-width: 6.25em" class="astro-4yphtoen"> <span class="sr-only astro-4yphtoen">Select theme</span> <svg aria-hidden="true" class="icon label-icon astro-4yphtoen astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M21 14h-1V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v7H3a1 1 0 0 0-1 1v2a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3v-2a1 1 0 0 0-1-1ZM6 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7H6V7Zm14 10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1h16v1Z"/></svg> <select autocomplete="off" class="astro-4yphtoen"> <option value="dark" class="astro-4yphtoen">Dark</option><option value="light" class="astro-4yphtoen">Light</option><option value="auto" selected class="astro-4yphtoen">Auto</option> </select> <svg aria-hidden="true" class="icon caret astro-4yphtoen astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1em;"><path d="M17 9.17a1 1 0 0 0-1.41 0L12 12.71 8.46 9.17a1 1 0 1 0-1.41 1.42l4.24 4.24a1.002 1.002 0 0 0 1.42 0L17 10.59a1.002 1.002 0 0 0 0-1.42Z"/></svg> </label> </starlight-theme-select>  <script>
	StarlightThemeProvider.updatePickers();
</script>   </div> </div> </div> </div> </nav> <div class="main-frame astro-vrdttmbt">  <script type="module">const a=document.getElementById("starlight__sidebar"),n=a?.querySelector("sl-sidebar-state-persist"),o="sl-sidebar-state",i=()=>{let t=[];const e=n?.dataset.hash||"";try{const s=sessionStorage.getItem(o),r=JSON.parse(s||"{}");Array.isArray(r.open)&&r.hash===e&&(t=r.open)}catch{}return{hash:e,open:t,scroll:a?.scrollTop||0}},c=t=>{try{sessionStorage.setItem(o,JSON.stringify(t))}catch{}},d=()=>c(i()),l=(t,e)=>{const s=i();s.open[e]=t,c(s)};n?.addEventListener("click",t=>{if(!(t.target instanceof Element))return;const e=t.target.closest("summary")?.closest("details");if(!e)return;const s=e.querySelector("sl-sidebar-restore"),r=parseInt(s?.dataset.index||"");isNaN(r)||l(!e.open,r)});addEventListener("visibilitychange",()=>{document.visibilityState==="hidden"&&d()});addEventListener("pageHide",d);</script> <div class="lg:sl-flex astro-67yu43on"> <aside class="right-sidebar-container print:hidden astro-67yu43on"> <div class="right-sidebar astro-67yu43on"> <div class="lg:sl-hidden astro-pb3aqygn"><mobile-starlight-toc data-min-h="2" data-max-h="3" class="astro-doynk5tl"><nav aria-labelledby="starlight__on-this-page--mobile" class="astro-doynk5tl"><details id="starlight__mobile-toc" class="astro-doynk5tl"><summary id="starlight__on-this-page--mobile" class="sl-flex astro-doynk5tl"><span class="toggle sl-flex astro-doynk5tl">On this page<svg aria-hidden="true" class="caret astro-doynk5tl astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1rem;"><path d="m14.83 11.29-4.24-4.24a1 1 0 1 0-1.42 1.41L12.71 12l-3.54 3.54a1 1 0 0 0 0 1.41 1 1 0 0 0 .71.29 1 1 0 0 0 .71-.29l4.24-4.24a1.002 1.002 0 0 0 0-1.42Z"/></svg></span><span class="display-current astro-doynk5tl"></span></summary><div class="dropdown astro-doynk5tl"><ul class="isMobile astro-gnoq344e" style="--depth: 0;"> <li class="astro-gnoq344e" style="--depth: 0;"> <a href="#_top" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">Overview</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#rotate" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">rotate</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#autoorient" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">autoOrient</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#flip" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">flip</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#flop" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">flop</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#affine" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">affine</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#sharpen" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">sharpen</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#median" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">median</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#blur" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">blur</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#dilate" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">dilate</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#erode" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">erode</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#flatten" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">flatten</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#unflatten" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">unflatten</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#gamma" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">gamma</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#negate" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">negate</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#normalise" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">normalise</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#normalize" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">normalize</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#clahe" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">clahe</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#convolve" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">convolve</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#threshold" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">threshold</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#boolean" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">boolean</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#linear" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">linear</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#recomb" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">recomb</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#modulate" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">modulate</span> </a>  </li> </ul></div></details></nav></mobile-starlight-toc><script type="module" src="/_astro/MobileTableOfContents.astro_astro_type_script_index_0_lang.hwBsy0Mo.js"></script></div><div class="right-sidebar-panel sl-hidden lg:sl-block astro-pb3aqygn"><div class="sl-container astro-pb3aqygn"><starlight-toc data-min-h="2" data-max-h="3"><nav aria-labelledby="starlight__on-this-page"><h2 id="starlight__on-this-page">On this page</h2><ul class="astro-gnoq344e" style="--depth: 0;"> <li class="astro-gnoq344e" style="--depth: 0;"> <a href="#_top" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">Overview</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#rotate" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">rotate</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#autoorient" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">autoOrient</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#flip" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">flip</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#flop" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">flop</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#affine" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">affine</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#sharpen" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">sharpen</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#median" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">median</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#blur" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">blur</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#dilate" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">dilate</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#erode" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">erode</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#flatten" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">flatten</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#unflatten" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">unflatten</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#gamma" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">gamma</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#negate" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">negate</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#normalise" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">normalise</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#normalize" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">normalize</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#clahe" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">clahe</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#convolve" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">convolve</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#threshold" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">threshold</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#boolean" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">boolean</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#linear" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">linear</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#recomb" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">recomb</span> </a>  </li><li class="astro-gnoq344e" style="--depth: 0;"> <a href="#modulate" class="astro-gnoq344e" style="--depth: 0;"> <span class="astro-gnoq344e" style="--depth: 0;">modulate</span> </a>  </li> </ul></nav></starlight-toc><script type="module" src="/_astro/TableOfContents.astro_astro_type_script_index_0_lang.FuRcXuRY.js"></script></div></div> </div> </aside> <div class="main-pane astro-67yu43on">  <main data-pagefind-body class="astro-bguv2lll" lang="en" dir="ltr">    <div class="content-panel astro-7nkwcw3z"> <div class="sl-container astro-7nkwcw3z"> <h1 id="_top" class="astro-j6tvhyss">Image operations</h1> </div> </div> <div class="content-panel astro-7nkwcw3z"> <div class="sl-container astro-7nkwcw3z"> <div class="sl-markdown-content"> <div class="sl-heading-wrapper level-h2"><h2 id="rotate">rotate</h2><a class="sl-anchor-link" href="#rotate"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “rotate”</span></a></div>
<blockquote>
<p>rotate([angle], [options]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Rotate the output image.</p>
<p>The provided angle is converted to a valid positive degree rotation.
For example, <code dir="auto">-450</code> will produce a 270 degree rotation.</p>
<p>When rotating by an angle other than a multiple of 90,
the background colour can be provided with the <code dir="auto">background</code> option.</p>
<p>For backwards compatibility, if no angle is provided, <code dir="auto">.autoOrient()</code> will be called.</p>
<p>Only one rotation can occur per pipeline (aside from an initial call without
arguments to orient via EXIF data). Previous calls to <code dir="auto">rotate</code> in the same
pipeline will be ignored.</p>
<p>Multi-page images can only be rotated by 180 degrees.</p>
<p>Method order is important when rotating, resizing and/or extracting regions,
for example <code dir="auto">.rotate(x).extract(y)</code> will produce a different result to <code dir="auto">.extract(y).rotate(x)</code>.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>





























<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[angle]</td><td><code>number</code></td><td><code>auto</code></td><td>angle of rotation.</td></tr><tr><td>[options]</td><td><code>Object</code></td><td></td><td>if present, is an Object with optional attributes.</td></tr><tr><td>[options.background]</td><td><code>string</code> | <code>Object</code></td><td><code>”&#x26;quot;#000000&#x26;quot;“</code></td><td>parsed by the <a href="https://www.npmjs.org/package/color">color</a> module to extract values for red, green, blue and alpha.</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><link rel="stylesheet" href="/_astro/ec.v4551.css"><script type="module" src="/_astro/ec.0vx5m.js"></script><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">rotateThenResize</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">rotate</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#F78C6C;--1:#AA0982">90</span><span style="--0:#D6DEEB;--1:#403F53">)</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">resize</span><span style="--0:#D6DEEB;--1:#403F53">({ width: </span><span style="--0:#F78C6C;--1:#AA0982">16</span><span style="--0:#D6DEEB;--1:#403F53">, height: </span><span style="--0:#F78C6C;--1:#AA0982">8</span><span style="--0:#D6DEEB;--1:#403F53">, fit: </span><span style="--0:#D9F5DD;--1:#111111">'</span><span style="--0:#ECC48D;--1:#984E4D">fill</span><span style="--0:#D9F5DD;--1:#111111">'</span><span style="--0:#D6DEEB;--1:#403F53"> })</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">resizeThenRotate</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">resize</span><span style="--0:#D6DEEB;--1:#403F53">({ width: </span><span style="--0:#F78C6C;--1:#AA0982">16</span><span style="--0:#D6DEEB;--1:#403F53">, height: </span><span style="--0:#F78C6C;--1:#AA0982">8</span><span style="--0:#D6DEEB;--1:#403F53">, fit: </span><span style="--0:#D9F5DD;--1:#111111">'</span><span style="--0:#ECC48D;--1:#984E4D">fill</span><span style="--0:#D9F5DD;--1:#111111">'</span><span style="--0:#D6DEEB;--1:#403F53"> })</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">rotate</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#F78C6C;--1:#AA0982">90</span><span style="--0:#D6DEEB;--1:#403F53">)</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const rotateThenResize = await sharp(input)  .rotate(90)  .resize({ width: 16, height: 8, fit: &#x27;fill&#x27; })  .toBuffer();const resizeThenRotate = await sharp(input)  .resize({ width: 16, height: 8, fit: &#x27;fill&#x27; })  .rotate(90)  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="autoorient">autoOrient</h2><a class="sl-anchor-link" href="#autoorient"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “autoOrient”</span></a></div>
<blockquote>
<p>autoOrient() ⇒ <code>Sharp</code></p>
</blockquote>
<p>Auto-orient based on the EXIF <code dir="auto">Orientation</code> tag, then remove the tag.
Mirroring is supported and may infer the use of a flip operation.</p>
<p>Previous or subsequent use of <code dir="auto">rotate(angle)</code> and either <code dir="auto">flip()</code> or <code dir="auto">flop()</code>
will logically occur after auto-orientation, regardless of call order.</p>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">autoOrient</span><span style="--0:#D6DEEB;--1:#403F53">()</span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input).autoOrient().toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">pipeline</span><span style="--0:#C792EA;--1:#8844AE"> = </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">autoOrient</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">resize</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#FF6A83;--1:#A24848">null</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">200</span><span style="--0:#D6DEEB;--1:#403F53">)</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#C792EA;--1:#8844AE">function</span><span style="--0:#D6DEEB;--1:#403F53"> </span><span style="--0:#D9F5DD;--1:#111111">(</span><span style="--1:#403F53"><span style="--0:#D7DBE0">err</span><span style="--0:#D6DEEB">, </span><span style="--0:#D7DBE0">outputBuffer</span><span style="--0:#D6DEEB">, </span><span style="--0:#D7DBE0">info</span></span><span style="--0:#D9F5DD;--1:#111111">)</span><span style="--0:#D6DEEB;--1:#403F53"> {</span></div></div><div class="ec-line"><div class="code"><span class="indent">    </span><span style="--0:#919F9F;--1:#5D6376">// outputBuffer contains 200px high JPEG image data,</span></div></div><div class="ec-line"><div class="code"><span class="indent">    </span><span style="--0:#919F9F;--1:#5D6376">// auto-oriented using EXIF Orientation tag</span></div></div><div class="ec-line"><div class="code"><span class="indent">    </span><span style="--0:#919F9F;--1:#5D6376">// info.width and info.height contain the dimensions of the resized image</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">});</span></div></div><div class="ec-line"><div class="code"><span style="--0:#7FDBCA;--1:#096E72">readableStream</span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">pipe</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">pipeline</span><span style="--0:#D6DEEB">);</span></span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const pipeline = sharp()  .autoOrient()  .resize(null, 200)  .toBuffer(function (err, outputBuffer, info) {    // outputBuffer contains 200px high JPEG image data,    // auto-oriented using EXIF Orientation tag    // info.width and info.height contain the dimensions of the resized image  });readableStream.pipe(pipeline);"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="flip">flip</h2><a class="sl-anchor-link" href="#flip"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “flip”</span></a></div>
<blockquote>
<p>flip([flip]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Mirror the image vertically (up-down) about the x-axis.
This always occurs before rotation, if any.</p>
<p>This operation does not work correctly with multi-page images.</p>















<table><thead><tr><th>Param</th><th>Type</th><th>Default</th></tr></thead><tbody><tr><td>[flip]</td><td><code>Boolean</code></td><td><code>true</code></td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">flip</span><span style="--0:#D6DEEB;--1:#403F53">()</span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input).flip().toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="flop">flop</h2><a class="sl-anchor-link" href="#flop"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “flop”</span></a></div>
<blockquote>
<p>flop([flop]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Mirror the image horizontally (left-right) about the y-axis.
This always occurs before rotation, if any.</p>















<table><thead><tr><th>Param</th><th>Type</th><th>Default</th></tr></thead><tbody><tr><td>[flop]</td><td><code>Boolean</code></td><td><code>true</code></td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">flop</span><span style="--0:#D6DEEB;--1:#403F53">()</span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input).flop().toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="affine">affine</h2><a class="sl-anchor-link" href="#affine"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “affine”</span></a></div>
<blockquote>
<p>affine(matrix, [options]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Perform an affine transform on an image. This operation will always occur after resizing, extraction and rotation, if any.</p>
<p>You must provide an array of length 4 or a 2x2 affine transformation matrix.
By default, new pixels are filled with a black background. You can provide a background colour with the <code dir="auto">background</code> option.
A particular interpolator may also be specified. Set the <code dir="auto">interpolator</code> option to an attribute of the <code dir="auto">sharp.interpolators</code> Object e.g. <code dir="auto">sharp.interpolators.nohalo</code>.</p>
<p>In the case of a 2x2 matrix, the transform is:</p>
<ul>
<li>X = <code dir="auto">matrix[0, 0]</code> * (x + <code dir="auto">idx</code>) + <code dir="auto">matrix[0, 1]</code> * (y + <code dir="auto">idy</code>) + <code dir="auto">odx</code></li>
<li>Y = <code dir="auto">matrix[1, 0]</code> * (x + <code dir="auto">idx</code>) + <code dir="auto">matrix[1, 1]</code> * (y + <code dir="auto">idy</code>) + <code dir="auto">ody</code></li>
</ul>
<p>where:</p>
<ul>
<li>x and y are the coordinates in input image.</li>
<li>X and Y are the coordinates in output image.</li>
<li>(0,0) is the upper left corner.</li>
</ul>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>
<p><strong>Since</strong>: 0.27.0</p>



























































<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>matrix</td><td><code>Array.&#x3C;Array.&#x3C;number>></code> | <code>Array.&#x3C;number></code></td><td></td><td>affine transformation matrix</td></tr><tr><td>[options]</td><td><code>Object</code></td><td></td><td>if present, is an Object with optional attributes.</td></tr><tr><td>[options.background]</td><td><code>String</code> | <code>Object</code></td><td><code>”#000000”</code></td><td>parsed by the <a href="https://www.npmjs.org/package/color">color</a> module to extract values for red, green, blue and alpha.</td></tr><tr><td>[options.idx]</td><td><code>Number</code></td><td><code>0</code></td><td>input horizontal offset</td></tr><tr><td>[options.idy]</td><td><code>Number</code></td><td><code>0</code></td><td>input vertical offset</td></tr><tr><td>[options.odx]</td><td><code>Number</code></td><td><code>0</code></td><td>output horizontal offset</td></tr><tr><td>[options.ody]</td><td><code>Number</code></td><td><code>0</code></td><td>output vertical offset</td></tr><tr><td>[options.interpolator]</td><td><code>String</code></td><td><code>sharp.interpolators.bicubic</code></td><td>interpolator</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">pipeline</span><span style="--0:#C792EA;--1:#8844AE"> = </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">affine</span><span style="--0:#D6DEEB;--1:#403F53">([[</span><span style="--0:#F78C6C;--1:#AA0982">1</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0.3</span><span style="--0:#D6DEEB;--1:#403F53">], [</span><span style="--0:#F78C6C;--1:#AA0982">0.1</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0.7</span><span style="--0:#D6DEEB;--1:#403F53">]], {</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">     </span></span><span style="--0:#D6DEEB;--1:#403F53">background: </span><span style="--0:#D9F5DD;--1:#111111">'</span><span style="--0:#ECC48D;--1:#984E4D">white</span><span style="--0:#D9F5DD;--1:#111111">'</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">     </span></span><span style="--0:#D6DEEB;--1:#403F53">interpolator: </span><span style="--0:#7FDBCA;--1:#096E72">sharp</span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#FAF39F;--1:#111111">interpolators</span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#7FDBCA;--1:#096E72">nohalo</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">})</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#D9F5DD;--1:#111111">(</span><span style="--1:#403F53"><span style="--0:#D7DBE0">err</span><span style="--0:#D6DEEB">, </span><span style="--0:#D7DBE0">outputBuffer</span><span style="--0:#D6DEEB">, </span><span style="--0:#D7DBE0">info</span></span><span style="--0:#D9F5DD;--1:#111111">)</span><span style="--0:#D6DEEB;--1:#403F53"> </span><span style="--0:#C792EA;--1:#8844AE">=></span><span style="--0:#D6DEEB;--1:#403F53"> {</span></div></div><div class="ec-line"><div class="code"><span class="indent">     </span><span style="--0:#919F9F;--1:#5D6376">// outputBuffer contains the transformed image</span></div></div><div class="ec-line"><div class="code"><span class="indent">     </span><span style="--0:#919F9F;--1:#5D6376">// info.width and info.height contain the new dimensions</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">});</span></div></div><div class="ec-line"><div class="code">
</div></div><div class="ec-line"><div class="code"><span style="--0:#D7DBE0;--1:#403F53">inputStream</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">pipe</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">pipeline</span><span style="--0:#D6DEEB">);</span></span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const pipeline = sharp()  .affine([[1, 0.3], [0.1, 0.7]], {     background: &#x27;white&#x27;,     interpolator: sharp.interpolators.nohalo  })  .toBuffer((err, outputBuffer, info) => {     // outputBuffer contains the transformed image     // info.width and info.height contain the new dimensions  });inputStream  .pipe(pipeline);"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="sharpen">sharpen</h2><a class="sl-anchor-link" href="#sharpen"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “sharpen”</span></a></div>
<blockquote>
<p>sharpen([options]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Sharpen the image.</p>
<p>When used without parameters, performs a fast, mild sharpen of the output image.</p>
<p>When a <code dir="auto">sigma</code> is provided, performs a slower, more accurate sharpen of the L channel in the LAB colour space.
Fine-grained control over the level of sharpening in “flat” (m1) and “jagged” (m2) areas is available.</p>
<p>See <a href="https://www.libvips.org/API/current/method.Image.sharpen.html">libvips sharpen</a> operation.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>





















































<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[options]</td><td><code>Object</code></td><td></td><td>if present, is an Object with attributes</td></tr><tr><td>[options.sigma]</td><td><code>number</code></td><td></td><td>the sigma of the Gaussian mask, where <code dir="auto">sigma = 1 + radius / 2</code>, between 0.000001 and 10</td></tr><tr><td>[options.m1]</td><td><code>number</code></td><td><code>1.0</code></td><td>the level of sharpening to apply to “flat” areas, between 0 and 1000000</td></tr><tr><td>[options.m2]</td><td><code>number</code></td><td><code>2.0</code></td><td>the level of sharpening to apply to “jagged” areas, between 0 and 1000000</td></tr><tr><td>[options.x1]</td><td><code>number</code></td><td><code>2.0</code></td><td>threshold between “flat” and “jagged”, between 0 and 1000000</td></tr><tr><td>[options.y2]</td><td><code>number</code></td><td><code>10.0</code></td><td>maximum amount of brightening, between 0 and 1000000</td></tr><tr><td>[options.y3]</td><td><code>number</code></td><td><code>20.0</code></td><td>maximum amount of darkening, between 0 and 1000000</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">data</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">sharpen</span><span style="--0:#D6DEEB;--1:#403F53">()</span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const data = await sharp(input).sharpen().toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">data</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">sharpen</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#C792EA;--1:#8844AE">{ sigma: </span><span style="--0:#F78C6C;--1:#AA0982">2</span><span style="--0:#C792EA;--1:#8844AE"> }</span><span style="--0:#D6DEEB;--1:#403F53">)</span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const data = await sharp(input).sharpen({ sigma: 2 }).toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">data</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">sharpen</span><span style="--0:#D6DEEB;--1:#403F53">({</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">sigma: </span><span style="--0:#F78C6C;--1:#AA0982">2</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">m1: </span><span style="--0:#F78C6C;--1:#AA0982">0</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">m2: </span><span style="--0:#F78C6C;--1:#AA0982">3</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">x1: </span><span style="--0:#F78C6C;--1:#AA0982">3</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">y2: </span><span style="--0:#F78C6C;--1:#AA0982">15</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">y3: </span><span style="--0:#F78C6C;--1:#AA0982">15</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">})</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const data = await sharp(input)  .sharpen({    sigma: 2,    m1: 0,    m2: 3,    x1: 3,    y2: 15,    y3: 15,  })  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="median">median</h2><a class="sl-anchor-link" href="#median"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “median”</span></a></div>
<blockquote>
<p>median([size]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Apply median filter.
When used without parameters the default window is 3x3.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>

















<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[size]</td><td><code>number</code></td><td><code>3</code></td><td>square mask size: size x size</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">median</span><span style="--0:#D6DEEB;--1:#403F53">()</span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input).median().toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">median</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#F78C6C;--1:#AA0982">5</span><span style="--0:#D6DEEB;--1:#403F53">)</span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input).median(5).toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="blur">blur</h2><a class="sl-anchor-link" href="#blur"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “blur”</span></a></div>
<blockquote>
<p>blur([options]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Blur the image.</p>
<p>When used without parameters, performs a fast 3x3 box blur (equivalent to a box linear filter).</p>
<p>When a <code dir="auto">sigma</code> is provided, performs a slower, more accurate Gaussian blur.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>



































<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[options]</td><td><code>Object</code> | <code>number</code> | <code>Boolean</code></td><td></td><td></td></tr><tr><td>[options.sigma]</td><td><code>number</code></td><td></td><td>a value between 0.3 and 1000 representing the sigma of the Gaussian mask, where <code dir="auto">sigma = 1 + radius / 2</code>.</td></tr><tr><td>[options.precision]</td><td><code>string</code></td><td><code>“‘integer‘“</code></td><td>How accurate the operation should be, one of: integer, float, approximate.</td></tr><tr><td>[options.minAmplitude]</td><td><code>number</code></td><td><code>0.2</code></td><td>A value between 0.001 and 1. A smaller value will generate a larger, more accurate mask.</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">boxBlurred</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">blur</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const boxBlurred = await sharp(input)  .blur()  .toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">gaussianBlurred</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">blur</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#F78C6C;--1:#AA0982">5</span><span style="--0:#D6DEEB;--1:#403F53">)</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const gaussianBlurred = await sharp(input)  .blur(5)  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="dilate">dilate</h2><a class="sl-anchor-link" href="#dilate"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “dilate”</span></a></div>
<blockquote>
<p>dilate([width]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Expand foreground objects using the dilate morphological operator.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>

















<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[width]</td><td><code>Number</code></td><td><code>1</code></td><td>dilation width in pixels.</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">dilate</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input)  .dilate()  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="erode">erode</h2><a class="sl-anchor-link" href="#erode"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “erode”</span></a></div>
<blockquote>
<p>erode([width]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Shrink foreground objects using the erode morphological operator.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>

















<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[width]</td><td><code>Number</code></td><td><code>1</code></td><td>erosion width in pixels.</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">erode</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input)  .erode()  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="flatten">flatten</h2><a class="sl-anchor-link" href="#flatten"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “flatten”</span></a></div>
<blockquote>
<p>flatten([options]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Merge alpha transparency channel, if any, with a background, then remove the alpha channel.</p>
<p>See also <a href="/api-channel#removealpha">removeAlpha</a>.</p>























<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[options]</td><td><code>Object</code></td><td></td><td></td></tr><tr><td>[options.background]</td><td><code>string</code> | <code>Object</code></td><td><code>”{r: 0, g: 0, b: 0}“</code></td><td>background colour, parsed by the <a href="https://www.npmjs.org/package/color">color</a> module, defaults to black.</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">await</span><span style="--0:#D6DEEB;--1:#403F53"> </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">rgbaInput</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">flatten</span><span style="--0:#D6DEEB;--1:#403F53">({ background: </span><span style="--0:#D9F5DD;--1:#111111">'</span><span style="--0:#ECC48D;--1:#984E4D">#F0A703</span><span style="--0:#D9F5DD;--1:#111111">'</span><span style="--0:#D6DEEB;--1:#403F53"> })</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="await sharp(rgbaInput)  .flatten({ background: &#x27;#F0A703&#x27; })  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="unflatten">unflatten</h2><a class="sl-anchor-link" href="#unflatten"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “unflatten”</span></a></div>
<blockquote>
<p>unflatten()</p>
</blockquote>
<p>Ensure the image has an alpha channel
with all white pixel values made fully transparent.</p>
<p>Existing alpha channel values for non-white pixels remain unchanged.</p>
<p><strong>Since</strong>: 0.32.1<br>
<strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">await</span><span style="--0:#D6DEEB;--1:#403F53"> </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">rgbInput</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">unflatten</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="await sharp(rgbInput)  .unflatten()  .toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">await</span><span style="--0:#D6DEEB;--1:#403F53"> </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">rgbInput</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">threshold</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#F78C6C;--1:#AA0982">128</span><span style="--0:#D6DEEB;--1:#403F53">, { grayscale: </span><span style="--0:#FF6A83;--1:#A24848">false</span><span style="--0:#D6DEEB;--1:#403F53"> }) </span><span style="--0:#919F9F;--1:#5D6376">// converter bright pixels to white</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">unflatten</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="await sharp(rgbInput)  .threshold(128, { grayscale: false }) // converter bright pixels to white  .unflatten()  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="gamma">gamma</h2><a class="sl-anchor-link" href="#gamma"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “gamma”</span></a></div>
<blockquote>
<p>gamma([gamma], [gammaOut]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Apply a gamma correction by reducing the encoding (darken) pre-resize at a factor of <code dir="auto">1/gamma</code>
then increasing the encoding (brighten) post-resize at a factor of <code dir="auto">gamma</code>.
This can improve the perceived brightness of a resized image in non-linear colour spaces.
JPEG and WebP input images will not take advantage of the shrink-on-load performance optimisation
when applying a gamma correction.</p>
<p>Supply a second argument to use a different output gamma value, otherwise the first value is used in both cases.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>























<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[gamma]</td><td><code>number</code></td><td><code>2.2</code></td><td>value between 1.0 and 3.0.</td></tr><tr><td>[gammaOut]</td><td><code>number</code></td><td></td><td>value between 1.0 and 3.0. (optional, defaults to same as <code dir="auto">gamma</code>)</td></tr></tbody></table>
<div class="sl-heading-wrapper level-h2"><h2 id="negate">negate</h2><a class="sl-anchor-link" href="#negate"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “negate”</span></a></div>
<blockquote>
<p>negate([options]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Produce the “negative” of the image.</p>























<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[options]</td><td><code>Object</code></td><td></td><td></td></tr><tr><td>[options.alpha]</td><td><code>Boolean</code></td><td><code>true</code></td><td>Whether or not to negate any alpha channel</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">negate</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input)  .negate()  .toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">negate</span><span style="--0:#D6DEEB;--1:#403F53">({ alpha: </span><span style="--0:#FF6A83;--1:#A24848">false</span><span style="--0:#D6DEEB;--1:#403F53"> })</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input)  .negate({ alpha: false })  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="normalise">normalise</h2><a class="sl-anchor-link" href="#normalise"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “normalise”</span></a></div>
<blockquote>
<p>normalise([options]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Enhance output image contrast by stretching its luminance to cover a full dynamic range.</p>
<p>Uses a histogram-based approach, taking a default range of 1% to 99% to reduce sensitivity to noise at the extremes.</p>
<p>Luminance values below the <code dir="auto">lower</code> percentile will be underexposed by clipping to zero.
Luminance values above the <code dir="auto">upper</code> percentile will be overexposed by clipping to the max pixel value.</p>





























<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[options]</td><td><code>Object</code></td><td></td><td></td></tr><tr><td>[options.lower]</td><td><code>number</code></td><td><code>1</code></td><td>Percentile below which luminance values will be underexposed.</td></tr><tr><td>[options.upper]</td><td><code>number</code></td><td><code>99</code></td><td>Percentile above which luminance values will be overexposed.</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">normalise</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input)  .normalise()  .toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">normalise</span><span style="--0:#D6DEEB;--1:#403F53">({ lower: </span><span style="--0:#F78C6C;--1:#AA0982">0</span><span style="--0:#D6DEEB;--1:#403F53">, upper: </span><span style="--0:#F78C6C;--1:#AA0982">100</span><span style="--0:#D6DEEB;--1:#403F53"> })</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input)  .normalise({ lower: 0, upper: 100 })  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="normalize">normalize</h2><a class="sl-anchor-link" href="#normalize"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “normalize”</span></a></div>
<blockquote>
<p>normalize([options]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Alternative spelling of normalise.</p>





























<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[options]</td><td><code>Object</code></td><td></td><td></td></tr><tr><td>[options.lower]</td><td><code>number</code></td><td><code>1</code></td><td>Percentile below which luminance values will be underexposed.</td></tr><tr><td>[options.upper]</td><td><code>number</code></td><td><code>99</code></td><td>Percentile above which luminance values will be overexposed.</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">normalize</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input)  .normalize()  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="clahe">clahe</h2><a class="sl-anchor-link" href="#clahe"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “clahe”</span></a></div>
<blockquote>
<p>clahe(options) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Perform contrast limiting adaptive histogram equalization
<a href="https://en.wikipedia.org/wiki/Adaptive_histogram_equalization#Contrast_Limited_AHE">CLAHE</a>.</p>
<p>This will, in general, enhance the clarity of the image by bringing out darker details.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>
<p><strong>Since</strong>: 0.28.3</p>



































<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>options</td><td><code>Object</code></td><td></td><td></td></tr><tr><td>options.width</td><td><code>number</code></td><td></td><td>Integral width of the search window, in pixels.</td></tr><tr><td>options.height</td><td><code>number</code></td><td></td><td>Integral height of the search window, in pixels.</td></tr><tr><td>[options.maxSlope]</td><td><code>number</code></td><td><code>3</code></td><td>Integral level of brightening, between 0 and 100, where 0 disables contrast limiting.</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">clahe</span><span style="--0:#D6DEEB;--1:#403F53">({</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">width: </span><span style="--0:#F78C6C;--1:#AA0982">3</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">height: </span><span style="--0:#F78C6C;--1:#AA0982">3</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">})</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="const output = await sharp(input)  .clahe({    width: 3,    height: 3,  })  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="convolve">convolve</h2><a class="sl-anchor-link" href="#convolve"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “convolve”</span></a></div>
<blockquote>
<p>convolve(kernel) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Convolve the image with the specified kernel.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>















































<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>kernel</td><td><code>Object</code></td><td></td><td></td></tr><tr><td>kernel.width</td><td><code>number</code></td><td></td><td>width of the kernel in pixels.</td></tr><tr><td>kernel.height</td><td><code>number</code></td><td></td><td>height of the kernel in pixels.</td></tr><tr><td>kernel.kernel</td><td><code>Array.&#x3C;number></code></td><td></td><td>Array of length <code dir="auto">width*height</code> containing the kernel values.</td></tr><tr><td>[kernel.scale]</td><td><code>number</code></td><td><code>sum</code></td><td>the scale of the kernel in pixels.</td></tr><tr><td>[kernel.offset]</td><td><code>number</code></td><td><code>0</code></td><td>the offset of the kernel in pixels.</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">convolve</span><span style="--0:#D6DEEB;--1:#403F53">({</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">width: </span><span style="--0:#F78C6C;--1:#AA0982">3</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">height: </span><span style="--0:#F78C6C;--1:#AA0982">3</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">kernel: [</span><span style="--0:#C792EA;--1:#8844AE">-</span><span style="--0:#F78C6C;--1:#AA0982">1</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">1</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#C792EA;--1:#8844AE">-</span><span style="--0:#F78C6C;--1:#AA0982">2</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">2</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#C792EA;--1:#8844AE">-</span><span style="--0:#F78C6C;--1:#AA0982">1</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">1</span><span style="--0:#D6DEEB;--1:#403F53">]</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">})</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">raw</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#C792EA;--1:#8844AE">function</span><span style="--0:#D9F5DD;--1:#111111">(</span><span style="--1:#403F53"><span style="--0:#D7DBE0">err</span><span style="--0:#D6DEEB">, </span><span style="--0:#D7DBE0">data</span><span style="--0:#D6DEEB">, </span><span style="--0:#D7DBE0">info</span></span><span style="--0:#D9F5DD;--1:#111111">)</span><span style="--0:#D6DEEB;--1:#403F53"> {</span></div></div><div class="ec-line"><div class="code"><span class="indent">    </span><span style="--0:#919F9F;--1:#5D6376">// data contains the raw pixel data representing the convolution</span></div></div><div class="ec-line"><div class="code"><span class="indent">    </span><span style="--0:#919F9F;--1:#5D6376">// of the input image with the horizontal Sobel operator</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">});</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="sharp(input)  .convolve({    width: 3,    height: 3,    kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1]  })  .raw()  .toBuffer(function(err, data, info) {    // data contains the raw pixel data representing the convolution    // of the input image with the horizontal Sobel operator  });"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="threshold">threshold</h2><a class="sl-anchor-link" href="#threshold"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “threshold”</span></a></div>
<blockquote>
<p>threshold([threshold], [options]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Any pixel value greater than or equal to the threshold value will be set to 255, otherwise it will be set to 0.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>



































<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[threshold]</td><td><code>number</code></td><td><code>128</code></td><td>a value in the range 0-255 representing the level at which the threshold will be applied.</td></tr><tr><td>[options]</td><td><code>Object</code></td><td></td><td></td></tr><tr><td>[options.greyscale]</td><td><code>Boolean</code></td><td><code>true</code></td><td>convert to single channel greyscale.</td></tr><tr><td>[options.grayscale]</td><td><code>Boolean</code></td><td><code>true</code></td><td>alternative spelling for greyscale.</td></tr></tbody></table>
<div class="sl-heading-wrapper level-h2"><h2 id="boolean">boolean</h2><a class="sl-anchor-link" href="#boolean"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “boolean”</span></a></div>
<blockquote>
<p>boolean(operand, operator, [options]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Perform a bitwise boolean operation with operand image.</p>
<p>This operation creates an output image where each pixel is the result of
the selected bitwise boolean <code dir="auto">operation</code> between the corresponding pixels of the input images.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>













































<table><thead><tr><th>Param</th><th>Type</th><th>Description</th></tr></thead><tbody><tr><td>operand</td><td><code>Buffer</code> | <code>string</code></td><td>Buffer containing image data or string containing the path to an image file.</td></tr><tr><td>operator</td><td><code>string</code></td><td>one of <code dir="auto">and</code>, <code dir="auto">or</code> or <code dir="auto">eor</code> to perform that bitwise operation, like the C logic operators <code dir="auto">&#x26;</code>, `</td></tr><tr><td>[options]</td><td><code>Object</code></td><td></td></tr><tr><td>[options.raw]</td><td><code>Object</code></td><td>describes operand when using raw pixel data.</td></tr><tr><td>[options.raw.width]</td><td><code>number</code></td><td></td></tr><tr><td>[options.raw.height]</td><td><code>number</code></td><td></td></tr><tr><td>[options.raw.channels]</td><td><code>number</code></td><td></td></tr></tbody></table>
<div class="sl-heading-wrapper level-h2"><h2 id="linear">linear</h2><a class="sl-anchor-link" href="#linear"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “linear”</span></a></div>
<blockquote>
<p>linear([a], [b]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Apply the linear formula <code dir="auto">a</code> * input + <code dir="auto">b</code> to the image to adjust image levels.</p>
<p>When a single number is provided, it will be used for all image channels.
When an array of numbers is provided, the array length must match the number of channels.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>























<table><thead><tr><th>Param</th><th>Type</th><th>Default</th><th>Description</th></tr></thead><tbody><tr><td>[a]</td><td><code>number</code> | <code>Array.&#x3C;number></code></td><td><code>[]</code></td><td>multiplier</td></tr><tr><td>[b]</td><td><code>number</code> | <code>Array.&#x3C;number></code></td><td><code>[]</code></td><td>offset</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">await</span><span style="--0:#D6DEEB;--1:#403F53"> </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">linear</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#F78C6C;--1:#AA0982">0.5</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">2</span><span style="--0:#D6DEEB;--1:#403F53">)</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="await sharp(input)  .linear(0.5, 2)  .toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">await</span><span style="--0:#D6DEEB;--1:#403F53"> </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">rgbInput</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">linear</span><span style="--0:#D6DEEB;--1:#403F53">(</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">[</span><span style="--0:#F78C6C;--1:#AA0982">0.25</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0.5</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0.75</span><span style="--0:#D6DEEB;--1:#403F53">],</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">[</span><span style="--0:#F78C6C;--1:#AA0982">150</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">100</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">50</span><span style="--0:#D6DEEB;--1:#403F53">]</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">)</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="await sharp(rgbInput)  .linear(    [0.25, 0.5, 0.75],    [150, 100, 50]  )  .toBuffer();"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="recomb">recomb</h2><a class="sl-anchor-link" href="#recomb"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “recomb”</span></a></div>
<blockquote>
<p>recomb(inputMatrix) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Recombine the image with the specified matrix.</p>
<p><strong>Throws</strong>:</p>
<ul>
<li><code>Error</code> Invalid parameters</li>
</ul>
<p><strong>Since</strong>: 0.21.1</p>















<table><thead><tr><th>Param</th><th>Type</th><th>Description</th></tr></thead><tbody><tr><td>inputMatrix</td><td><code>Array.&#x3C;Array.&#x3C;number>></code></td><td>3x3 or 4x4 Recombination matrix</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">recomb</span><span style="--0:#D6DEEB;--1:#403F53">([</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">   </span></span><span style="--0:#D6DEEB;--1:#403F53">[</span><span style="--0:#F78C6C;--1:#AA0982">0.3588</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0.7044</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0.1368</span><span style="--0:#D6DEEB;--1:#403F53">],</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">   </span></span><span style="--0:#D6DEEB;--1:#403F53">[</span><span style="--0:#F78C6C;--1:#AA0982">0.2990</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0.5870</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0.1140</span><span style="--0:#D6DEEB;--1:#403F53">],</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">   </span></span><span style="--0:#D6DEEB;--1:#403F53">[</span><span style="--0:#F78C6C;--1:#AA0982">0.2392</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0.4696</span><span style="--0:#D6DEEB;--1:#403F53">, </span><span style="--0:#F78C6C;--1:#AA0982">0.0912</span><span style="--0:#D6DEEB;--1:#403F53">],</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">])</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">raw</span><span style="--0:#D6DEEB;--1:#403F53">()</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">(</span><span style="--0:#C792EA;--1:#8844AE">function</span><span style="--0:#D9F5DD;--1:#111111">(</span><span style="--1:#403F53"><span style="--0:#D7DBE0">err</span><span style="--0:#D6DEEB">, </span><span style="--0:#D7DBE0">data</span><span style="--0:#D6DEEB">, </span><span style="--0:#D7DBE0">info</span></span><span style="--0:#D9F5DD;--1:#111111">)</span><span style="--0:#D6DEEB;--1:#403F53"> {</span></div></div><div class="ec-line"><div class="code"><span class="indent">    </span><span style="--0:#919F9F;--1:#5D6376">// data contains the raw pixel data after applying the matrix</span></div></div><div class="ec-line"><div class="code"><span class="indent">    </span><span style="--0:#919F9F;--1:#5D6376">// With this example input, a sepia filter has been applied</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">});</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="sharp(input)  .recomb([   [0.3588, 0.7044, 0.1368],   [0.2990, 0.5870, 0.1140],   [0.2392, 0.4696, 0.0912],  ])  .raw()  .toBuffer(function(err, data, info) {    // data contains the raw pixel data after applying the matrix    // With this example input, a sepia filter has been applied  });"><div></div></button></div></figure></div>
<div class="sl-heading-wrapper level-h2"><h2 id="modulate">modulate</h2><a class="sl-anchor-link" href="#modulate"><span aria-hidden="true" class="sl-anchor-icon"><svg width="16" height="16" viewBox="0 0 24 24"><path fill="currentcolor" d="m12.11 15.39-3.88 3.88a2.52 2.52 0 0 1-3.5 0 2.47 2.47 0 0 1 0-3.5l3.88-3.88a1 1 0 0 0-1.42-1.42l-3.88 3.89a4.48 4.48 0 0 0 6.33 6.33l3.89-3.88a1 1 0 1 0-1.42-1.42Zm8.58-12.08a4.49 4.49 0 0 0-6.33 0l-3.89 3.88a1 1 0 0 0 1.42 1.42l3.88-3.88a2.52 2.52 0 0 1 3.5 0 2.47 2.47 0 0 1 0 3.5l-3.88 3.88a1 1 0 1 0 1.42 1.42l3.88-3.89a4.49 4.49 0 0 0 0-6.33ZM8.83 15.17a1 1 0 0 0 1.1.22 1 1 0 0 0 .32-.22l4.92-4.92a1 1 0 0 0-1.42-1.42l-4.92 4.92a1 1 0 0 0 0 1.42Z"></path></svg></span><span class="sr-only" data-pagefind-ignore="">Section titled “modulate”</span></a></div>
<blockquote>
<p>modulate([options]) ⇒ <code>Sharp</code></p>
</blockquote>
<p>Transforms the image using brightness, saturation, hue rotation, and lightness.
Brightness and lightness both operate on luminance, with the difference being that
brightness is multiplicative whereas lightness is additive.</p>
<p><strong>Since</strong>: 0.22.1</p>



































<table><thead><tr><th>Param</th><th>Type</th><th>Description</th></tr></thead><tbody><tr><td>[options]</td><td><code>Object</code></td><td></td></tr><tr><td>[options.brightness]</td><td><code>number</code></td><td>Brightness multiplier</td></tr><tr><td>[options.saturation]</td><td><code>number</code></td><td>Saturation multiplier</td></tr><tr><td>[options.hue]</td><td><code>number</code></td><td>Degrees for hue rotation</td></tr><tr><td>[options.lightness]</td><td><code>number</code></td><td>Lightness addend</td></tr></tbody></table>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#919F9F;--1:#5D6376">// increase brightness by a factor of 2</span></div></div><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">modulate</span><span style="--0:#D6DEEB;--1:#403F53">({</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">brightness: </span><span style="--0:#F78C6C;--1:#AA0982">2</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">})</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="// increase brightness by a factor of 2const output = await sharp(input)  .modulate({    brightness: 2  })  .toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#919F9F;--1:#5D6376">// hue-rotate by 180 degrees</span></div></div><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">modulate</span><span style="--0:#D6DEEB;--1:#403F53">({</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">hue: </span><span style="--0:#F78C6C;--1:#AA0982">180</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">})</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="// hue-rotate by 180 degreesconst output = await sharp(input)  .modulate({    hue: 180  })  .toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#919F9F;--1:#5D6376">// increase lightness by +50</span></div></div><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">modulate</span><span style="--0:#D6DEEB;--1:#403F53">({</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">lightness: </span><span style="--0:#F78C6C;--1:#AA0982">50</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">})</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="// increase lightness by +50const output = await sharp(input)  .modulate({    lightness: 50  })  .toBuffer();"><div></div></button></div></figure></div>
<p><strong>Example</strong></p>
<div class="expressive-code"><figure class="frame not-content"><figcaption class="header"></figcaption><pre data-language="js"><code><div class="ec-line"><div class="code"><span style="--0:#919F9F;--1:#5D6376">// decrease brightness and saturation while also hue-rotating by 90 degrees</span></div></div><div class="ec-line"><div class="code"><span style="--0:#C792EA;--1:#8844AE">const </span><span style="--0:#82AAFF;--1:#3B61B0">output</span><span style="--0:#C792EA;--1:#8844AE"> = await </span><span style="--0:#82AAFF;--1:#3B61B0">sharp</span><span style="--1:#403F53"><span style="--0:#D6DEEB">(</span><span style="--0:#D7DBE0">input</span><span style="--0:#D6DEEB">)</span></span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">modulate</span><span style="--0:#D6DEEB;--1:#403F53">({</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">brightness: </span><span style="--0:#F78C6C;--1:#AA0982">0.5</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">saturation: </span><span style="--0:#F78C6C;--1:#AA0982">0.5</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">    </span></span><span style="--0:#D6DEEB;--1:#403F53">hue: </span><span style="--0:#F78C6C;--1:#AA0982">90</span><span style="--0:#D6DEEB;--1:#403F53">,</span></div></div><div class="ec-line"><div class="code"><span class="indent"><span style="--0:#D6DEEB;--1:#403F53">  </span></span><span style="--0:#D6DEEB;--1:#403F53">})</span></div></div><div class="ec-line"><div class="code"><span class="indent">  </span><span style="--0:#C792EA;--1:#8844AE">.</span><span style="--0:#82AAFF;--1:#3B61B0">toBuffer</span><span style="--0:#D6DEEB;--1:#403F53">();</span></div></div></code></pre><div class="copy"><div aria-live="polite"></div><button title="Copy to clipboard" data-copied="Copied!" data-code="// decrease brightness and saturation while also hue-rotating by 90 degreesconst output = await sharp(input)  .modulate({    brightness: 0.5,    saturation: 0.5,    hue: 90,  })  .toBuffer();"><div></div></button></div></figure></div> </div> <footer class="sl-flex astro-3yyafb3n"> <div class="meta sl-flex astro-3yyafb3n">   </div> <div class="pagination-links print:hidden astro-u2l5gyhi" dir="ltr"> <a href="/api-composite/" rel="prev" class="astro-u2l5gyhi"> <svg aria-hidden="true" class="astro-u2l5gyhi astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1.5rem;"><path d="M17 11H9.41l3.3-3.29a1.004 1.004 0 1 0-1.42-1.42l-5 5a1 1 0 0 0-.21.33 1 1 0 0 0 0 .76 1 1 0 0 0 .21.33l5 5a1.002 1.002 0 0 0 1.639-.325 1 1 0 0 0-.219-1.095L9.41 13H17a1 1 0 0 0 0-2Z"/></svg> <span class="astro-u2l5gyhi"> Previous <br class="astro-u2l5gyhi"> <span class="link-title astro-u2l5gyhi">Compositing images</span> </span> </a> <a href="/api-colour/" rel="next" class="astro-u2l5gyhi"> <svg aria-hidden="true" class="astro-u2l5gyhi astro-c6vsoqas" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="--sl-icon-size: 1.5rem;"><path d="M17.92 11.62a1.001 1.001 0 0 0-.21-.33l-5-5a1.003 1.003 0 1 0-1.42 1.42l3.3 3.29H7a1 1 0 0 0 0 2h7.59l-3.3 3.29a1.002 1.002 0 0 0 .325 1.639 1 1 0 0 0 1.095-.219l5-5a1 1 0 0 0 .21-.33 1 1 0 0 0 0-.76Z"/></svg> <span class="astro-u2l5gyhi"> Next <br class="astro-u2l5gyhi"> <span class="link-title astro-u2l5gyhi">Colour manipulation</span> </span> </a> </div>  </footer> </div> </div>  </main> </div> </div> </div> </div> <script defer src="https://static.cloudflareinsights.com/beacon.min.js/v833ccba57c9e4d2798f2e76cebdd09a11778172276447" integrity="sha512-57MDmcccJXYtNnH+ZiBwzC4jb2rvgVCEokYN+L/nLlmO8rfYT/gIpW2A569iJ/3b+0UEasghjuZH/ma3wIs/EQ==" data-cf-beacon='{"version":"2024.11.0","token":"2d5aea02865a4bff969369abd759d162","r":1,"server_timing":{"name":{"cfCacheStatus":true,"cfEdge":true,"cfExtPri":true,"cfL4":true,"cfOrigin":true,"cfSpeedBrain":true},"location_startswith":null}}' crossorigin="anonymous"></script>
</body></html>

