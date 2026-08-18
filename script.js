/* ==========================================================================
   script.js — Carta para Paz
   Contenido en assets/content/story.js (window.STORY).
   Fase 4: animaciones GSAP — transiciones de escena, reveals, typewriter, sobre.
   ========================================================================== */

(() => {
  "use strict";

  /* ========================================================================
     STATE
     ======================================================================== */
  const story = window.STORY;

  const state = {
    current: -1,
    unlocked: false,
  };

  const SCENE_ORDER = [
    "fecha",
    "origen",
    "conocerte",
    "recuerdos",
    "video",
    "distancia",
    "hice",
    "aceptacion",
    "safe-place",
    "silencio",
    "despedida",
    "firma",
  ];

  const KEYPAD_LAYOUT = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];
  let entered = "";

  /* ========================================================================
     MOTION
     ======================================================================== */
  const motion = {
    hasGsap: typeof gsap !== "undefined",
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };

  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
    motion.reduced = e.matches;
  });

  function animate(callback) {
    if (!motion.reduced && motion.hasGsap) callback();
  }

  /* ========================================================================
     DOM
     ======================================================================== */
  const els = {
    lockScreen: document.getElementById("lockScreen"),
    heartLock: document.getElementById("heartLock"),
    dots: document.getElementById("dots"),
    keypad: document.getElementById("keypad"),
    hintToggle: document.getElementById("hintToggle"),
    hintText: document.getElementById("hintText"),
    app: document.getElementById("app"),
    floatingUI: document.querySelector(".floating-ui"),
    musicToggle: document.getElementById("musicToggle"),
    spotifyModal: document.getElementById("spotifyModal"),
    spotifyClose: document.getElementById("spotifyClose"),
    spotifyEmbed: document.getElementById("spotifyEmbed"),
    nav: document.querySelector(".scene-nav"),
    nextBtn: document.getElementById("nextBtn"),
    backBtn: document.getElementById("backBtn"),
    lightbox: document.getElementById("lightbox"),
    lightboxClose: document.getElementById("lightboxClose"),
  };

  const sceneEls = {};

  /* ========================================================================
     LOCK SCREEN
     ======================================================================== */
  function renderDots() {
    const dotEls = els.dots.querySelectorAll(".dot");
    dotEls.forEach((dot, i) => dot.classList.toggle("filled", i < entered.length));
  }

  function shakeLock() {
    animate(() => {
      gsap.fromTo(els.lockScreen, { x: -6 }, { x: 6, duration: 0.08, repeat: 4, yoyo: true });
    });
  }

  function handleKey(key) {
    if (key === "⌫") {
      entered = entered.slice(0, -1);
      renderDots();
      return;
    }
    if (key === "✓") {
      if (entered === story.meta.pin) unlock();
      else failCode();
      return;
    }
    if (entered.length >= story.meta.pin.length) return;
    entered += key;
    renderDots();
    if (entered.length === story.meta.pin.length) {
      setTimeout(() => {
        if (entered === story.meta.pin) unlock();
        else failCode();
      }, 200);
    }
  }

  function failCode() {
    shakeLock();
    entered = "";
    renderDots();
  }

  function buildKeypad() {
    KEYPAD_LAYOUT.forEach((key) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = key;
      btn.setAttribute("aria-label", key === "⌫" ? "Borrar" : key === "✓" ? "Aceptar" : key);
      btn.addEventListener("click", () => handleKey(key));
      els.keypad.appendChild(btn);
    });
  }

  function unlock() {
    state.unlocked = true;
    const reveal = () => {
      els.lockScreen.hidden = true;
      els.app.hidden = false;
      els.floatingUI.hidden = false;
      els.nav.hidden = false;
      goToScene(0);
    };
    if (motion.hasGsap && !motion.reduced) {
      gsap.to(els.heartLock, { scale: 1.12, duration: 0.4, ease: "back.out(1.7)" });
      gsap.to(els.lockScreen, { opacity: 0, duration: 0.8, delay: 0.3, onComplete: reveal });
    } else {
      reveal();
    }
  }

  /* ========================================================================
     RENDER HELPERS
     ======================================================================== */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderTextBlocks(container, blocks) {
    blocks.forEach((text) => container.appendChild(el("p", "block", text)));
  }

  let photoIndex = 0;

  function renderPhoto(container, photoKey) {
    const photo = story.photos[photoKey];
    if (!photo) return;
    const tilt = photoIndex % 2 === 0 ? "-1.5deg" : "1.5deg";
    photoIndex += 1;

    const fig = el("figure", "photo");
    fig.setAttribute("data-photo", photoKey);

    const frame = el("div", "photo-frame");
    frame.style.setProperty("--tilt", tilt);

    const img = el("img");
    img.src = photo.src;
    img.alt = photo.caption || story.meta.name;
    img.loading = "eager";
    img.decoding = "async";
    frame.appendChild(img);
    fig.appendChild(frame);

    if (photo.caption) fig.appendChild(el("figcaption", "photo-caption", photo.caption));

    fig.addEventListener("click", () => openLightbox(photo));

    container.appendChild(fig);
  }

  /* ------------------------------------------------------------------------
     Envelope — apertura con GSAP + typewriter del saludo
     ------------------------------------------------------------------------ */
  function renderEnvelope(container, data) {
    const wrap = el("div", "envelope-wrap");

    const envelope = el("button", "envelope");
    envelope.type = "button";
    envelope.setAttribute("aria-label", "Abrir la carta");
    envelope.innerHTML =
      '<div class="envelope-back"></div>' +
      '<div class="letter-paper"><span class="greeting">' + data.greeting + "</span></div>" +
      '<div class="envelope-front"></div>' +
      '<div class="envelope-flap"></div>';
    wrap.appendChild(envelope);

    const hint = el("p", "envelope-hint", "Toca para abrir");
    wrap.appendChild(hint);

    const content = el("div", "letter-content");
    content.hidden = true;
    const greeting = el("p", "greeting", data.greeting);
    content.appendChild(greeting);
    const blocksBox = el("div");
    renderTextBlocks(blocksBox, data.blocks);
    content.appendChild(blocksBox);

    envelope.addEventListener("click", () => {
      if (envelope.dataset.opening === "1") return;
      envelope.dataset.opening = "1";
      hint.hidden = true;
      openEnvelope(envelope, content, greeting, blocksBox);
    });

    wrap.appendChild(content);
    container.appendChild(wrap);
  }

  function openEnvelope(envelope, content, greeting, blocksBox) {
    const flap = envelope.querySelector(".envelope-flap");
    const paper = envelope.querySelector(".letter-paper");

    const reveal = () => {
      envelope.hidden = true;
      content.hidden = false;
      typewriter(greeting, () => revealBlocks(blocksBox));
    };

    if (motion.reduced || !motion.hasGsap) {
      reveal();
      return;
    }

    const tl = gsap.timeline();
    tl.to(flap, { rotateX: 180, duration: 0.7, ease: "power2.inOut" })
      .to(paper, { y: -36, duration: 0.6, ease: "power2.out" }, "-=0.35")
      .to(envelope, { opacity: 0, duration: 0.4, ease: "power1.out" }, "-=0.3")
      .add(reveal);
  }

  function typewriter(target, done) {
    if (motion.reduced || !motion.hasGsap) {
      if (done) done();
      return;
    }
    const fullText = target.textContent;
    target.textContent = "";
    target.classList.add("type-caret");
    let i = 0;
    const step = () => {
      i += 1;
      target.textContent = fullText.slice(0, i);
      if (i < fullText.length) {
        setTimeout(step, 90);
      } else {
        target.classList.remove("type-caret");
        if (done) done();
      }
    };
    step();
  }

  function revealBlocks(box) {
    animate(() => {
      gsap.from(box.children, {
        opacity: 0,
        y: 16,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
      });
    });
  }

  /* ------------------------------------------------------------------------
     Video — carga bajo demanda + reveal
     ------------------------------------------------------------------------ */
  function renderVideo(container, data) {
    const cta = el("button", "cta", data.cta || "Ver");
    cta.type = "button";
    cta.setAttribute("aria-label", "Reproducir video");

    const videoWrap = el("div", "video-wrap");
    videoWrap.hidden = true;

    const video = el("video");
    video.id = "mrLoverman";
    video.controls = true;
    video.playsInline = true;
    video.preload = "none";
    video.poster = story.video.poster;
    videoWrap.appendChild(video);

    cta.addEventListener("click", () => {
      if (!video.src) {
        const src = document.createElement("source");
        src.src = story.video.src;
        src.type = "video/mp4";
        video.appendChild(src);
      }
      cta.hidden = true;
      videoWrap.hidden = false;
      animate(() => {
        gsap.from(videoWrap, { opacity: 0, y: 20, duration: 0.6, ease: "power2.out" });
      });
      video.load();
      video.play().catch(() => {});
    });

    container.appendChild(cta);
    container.appendChild(videoWrap);
  }

  /* ------------------------------------------------------------------------
     Spotify card (escena safe-place)
     ------------------------------------------------------------------------ */
  function renderSong(container) {
    const play = el("button", "cta", "Escuchar Safe Place");
    play.type = "button";
    play.setAttribute("aria-label", "Escuchar Safe Place");

    const card = el("div", "spotify-card");
    card.hidden = true;
    card.appendChild(el("p", "spotify-title", story.meta.name));
    card.appendChild(el("p", "spotify-note", "Reproduce esta canción mientras lees."));
    const embedBox = el("div", "spotify-embed");
    card.appendChild(embedBox);

    play.addEventListener("click", () => {
      play.hidden = true;
      card.hidden = false;
      loadSpotifyInto(embedBox);
      animate(() => {
        gsap.from(card, { opacity: 0, y: 20, duration: 0.6, ease: "power2.out" });
      });
    });

    container.appendChild(play);
    container.appendChild(card);
  }

  function renderSignature(container) {
    container.appendChild(el("p", "signature-closing", "Con amor,"));
    container.appendChild(el("p", "signature-name", story.meta.signature));
    container.appendChild(el("p", "signature-for", "para " + story.meta.name));
    container.appendChild(el("p", "signature-date", formatMonthYear(new Date())));
  }

  function formatMonthYear(date) {
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    const month = months[date.getMonth()];
    return month.charAt(0).toUpperCase() + month.slice(1) + ", " + date.getFullYear();
  }

  function renderScene(id) {
    const scene = sceneEls[id];
    const inner = scene.querySelector(".scene-inner");
    inner.innerHTML = "";
    const data = story.scenes[id];

    if (data.title) inner.appendChild(el("h2", "scene-title", data.title));
    if (data.quote) inner.appendChild(el("blockquote", "scene-quote", story.phrase.central));
    if (data.envelope) {
      renderEnvelope(inner, data);
    } else if (data.blocks) {
      renderTextBlocks(inner, data.blocks);
    }
    if (data.photo) renderPhoto(inner, data.photo);
    if (Array.isArray(data.photos)) data.photos.forEach((key) => renderPhoto(inner, key));
    if (id === "video") renderVideo(inner, data);
    if (data.song) renderSong(inner);
    if (data.signature) renderSignature(inner);
    if (id === "silencio") inner.appendChild(el("p", "silence-mark", "…"));
  }

  function renderAllScenes() {
    SCENE_ORDER.forEach((id) => renderScene(id));
  }

  /* ========================================================================
     NAVIGATION + SCENE TRANSITIONS
     ======================================================================== */
  function animateSceneEnter(sceneEl) {
    animate(() => {
      const inner = sceneEl.querySelector(".scene-inner");
      const children = Array.from(inner.children).filter((c) => !c.hidden && !c.classList.contains("photo"));
      if (children.length) {
        gsap.from(children, {
          opacity: 0,
          y: 22,
          duration: 0.65,
          stagger: 0.12,
          ease: "power2.out",
        });
      }
      const photos = inner.querySelectorAll(".photo");
      if (photos.length) {
        const isDesktop = window.matchMedia("(min-width: 768px)").matches;
        gsap.from(photos, {
          opacity: 0,
          scale: 0.96,
          [isDesktop ? "x" : "y"]: isDesktop ? 40 : 24,
          filter: "blur(6px)",
          duration: 0.8,
          stagger: 0.14,
          ease: "power2.out",
        });
      }
    });
  }

  function goToScene(index) {
    if (index < 0 || index >= SCENE_ORDER.length) return;
    const prevIndex = state.current;
    state.current = index;
    const target = sceneEls[SCENE_ORDER[index]];

    const show = () => {
      SCENE_ORDER.forEach((id, i) => {
        sceneEls[id].hidden = i !== index;
      });
      if (prevIndex >= 0 && motion.hasGsap) {
        gsap.set(sceneEls[SCENE_ORDER[prevIndex]].querySelector(".scene-inner"), {
          clearProps: "opacity,transform,filter",
        });
      }
      window.scrollTo({ top: 0, behavior: "instant" });
      animateSceneEnter(target);
    };

    if (prevIndex >= 0 && !motion.reduced && motion.hasGsap) {
      const prevEl = sceneEls[SCENE_ORDER[prevIndex]];
      gsap.to(prevEl.querySelector(".scene-inner"), {
        opacity: 0,
        y: -20,
        duration: 0.25,
        ease: "power1.in",
        onComplete: show,
      });
    } else {
      show();
    }

    els.backBtn.disabled = index === 0;
    els.nextBtn.disabled = index === SCENE_ORDER.length - 1;
  }

  function nextScene() {
    if (state.current < SCENE_ORDER.length - 1) goToScene(state.current + 1);
  }

  function prevScene() {
    if (state.current > 0) goToScene(state.current - 1);
  }

  /* ========================================================================
     LIGHTBOX
     ======================================================================== */
  function openLightbox(photo) {
    const img = els.lightbox.querySelector(".lightbox-img");
    const cap = els.lightbox.querySelector(".lightbox-caption");
    img.src = photo.src;
    img.alt = photo.caption || story.meta.name;
    cap.textContent = photo.caption || "";
    cap.hidden = !photo.caption;
    els.lightbox.hidden = false;
    animate(() => gsap.fromTo(els.lightbox, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" }));
  }

  function closeLightbox() {
    els.lightbox.hidden = true;
  }

  /* ========================================================================
     SPOTIFY
     ======================================================================== */
  function loadSpotifyInto(container) {
    const iframe = document.createElement("iframe");
    iframe.src = story.song.embedUrl;
    iframe.width = "100%";
    iframe.height = "152";
    iframe.frameBorder = "0";
    iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    iframe.loading = "lazy";
    iframe.title = story.song.title;
    container.appendChild(iframe);
  }

  function openSpotifyModal() {
    if (els.spotifyEmbed.children.length === 0) loadSpotifyInto(els.spotifyEmbed);
    els.spotifyModal.hidden = false;
    els.spotifyClose.focus();
  }

  function closeSpotifyModal() {
    els.spotifyModal.hidden = true;
  }

  /* ========================================================================
     INIT
     ======================================================================== */
  function init() {
    SCENE_ORDER.forEach((id) => {
      sceneEls[id] = els.app.querySelector(`[data-scene="${id}"]`);
    });

    buildKeypad();
    renderDots();
    renderAllScenes();

    els.hintToggle.addEventListener("click", () => {
      els.hintText.hidden = !els.hintText.hidden;
      if (els.hintText.hidden) return;
      els.hintText.textContent = story.login.hint;
    });

    els.nextBtn.addEventListener("click", nextScene);
    els.backBtn.addEventListener("click", prevScene);
    els.musicToggle.addEventListener("click", openSpotifyModal);
    els.spotifyClose.addEventListener("click", closeSpotifyModal);
    els.lightbox.addEventListener("click", closeLightbox);
    els.lightboxClose.addEventListener("click", (event) => {
      event.stopPropagation();
      closeLightbox();
    });

    document.addEventListener("keydown", (event) => {
      if (!state.unlocked) return;
      if (event.key === "Escape") {
        if (!els.lightbox.hidden) closeLightbox();
        else if (!els.spotifyModal.hidden) closeSpotifyModal();
        return;
      }
      if (!els.lightbox.hidden || !els.spotifyModal.hidden) return;
      if (event.key === "ArrowDown" || event.key === "ArrowRight") nextScene();
      if (event.key === "ArrowUp" || event.key === "ArrowLeft") prevScene();
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
