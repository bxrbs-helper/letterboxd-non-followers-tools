// ==UserScript==
// @name         TEST PANEL LETTERBOXD (DIAGNOSTICO)
// @namespace    debug.lb
// @version      1.0
// @match        https://letterboxd.com/*
// @match        https://www.letterboxd.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  function openPanel() {
    console.log("PANEL FUNCION LLAMADA");

    if (document.getElementById("test-panel")) return;

    const panel = document.createElement("div");
    panel.id = "test-panel";
    panel.style.position = "fixed";
    panel.style.top = "20px";
    panel.style.right = "20px";
    panel.style.zIndex = "999999999";
    panel.style.background = "#111";
    panel.style.color = "#fff";
    panel.style.padding = "20px";
    panel.style.borderRadius = "12px";
    panel.style.boxShadow = "0 10px 30px rgba(0,0,0,0.5)";
    panel.innerHTML = "🎬 PANEL FUNCIONA<br><br>El problema NO es Tampermonkey.";

    document.documentElement.appendChild(panel);
  }

  function createButton() {
    if (document.getElementById("test-fab")) return;

    const btn = document.createElement("button");
    btn.id = "test-fab";
    btn.textContent = "TEST";
    btn.style.position = "fixed";
    btn.style.bottom = "20px";
    btn.style.right = "20px";
    btn.style.zIndex = "999999999";
    btn.style.padding = "12px 16px";
    btn.style.background = "#00c2a8";
    btn.style.border = "none";
    btn.style.borderRadius = "10px";
    btn.style.cursor = "pointer";
    btn.style.fontWeight = "bold";

    btn.addEventListener("click", function(e){
      e.stopPropagation();
      e.preventDefault();
      openPanel();
    }, true);

    document.documentElement.appendChild(btn);
    console.log("BOTON TEST INYECTADO");
  }

  window.addEventListener("load", () => {
    setTimeout(createButton, 1000);
  });

})();
