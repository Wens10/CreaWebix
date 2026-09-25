(() => {
  const STORAGE_KEY = "creawebix-chat";
  const MAX_LENGTH = 1000;
  const WELCOME =
    "Bonjour 👋 Je suis l'assistant de CréaWebix. Posez-moi vos questions sur nos services, nos tarifs ou votre projet web !";

  let messages = [];
  let sending = false;

  try {
    messages = JSON.parse(sessionStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    messages = [];
  }

  function save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-20)));
    } catch {
      // Stockage indisponible : la conversation ne sera simplement pas conservée
    }
  }

  // ── Construction de l'interface ──
  const toggle = document.createElement("button");
  toggle.className = "chatbot-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Ouvrir le chat");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML = '<i class="fas fa-comment-dots"></i>';

  const panel = document.createElement("div");
  panel.className = "chatbot-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Chat CréaWebix");
  panel.hidden = true;
  panel.innerHTML = `
    <div class="chatbot-header">
      <div>
        <strong>Assistant CréaWebix</strong>
        <span>Réponse instantanée</span>
      </div>
      <button type="button" class="chatbot-close" aria-label="Fermer le chat"><i class="fas fa-xmark"></i></button>
    </div>
    <div class="chatbot-messages" aria-live="polite"></div>
    <form class="chatbot-form">
      <textarea rows="1" maxlength="${MAX_LENGTH}" placeholder="Écrivez votre message…" aria-label="Votre message" required></textarea>
      <button type="submit" aria-label="Envoyer"><i class="fas fa-paper-plane"></i></button>
    </form>
    <p class="chatbot-notice">Assistant automatique : pour un devis précis, utilisez le <a href="/#contact">formulaire de contact</a>.</p>
  `;

  document.body.append(toggle, panel);

  const list = panel.querySelector(".chatbot-messages");
  const form = panel.querySelector(".chatbot-form");
  const input = form.querySelector("textarea");
  const sendButton = form.querySelector("button");

  // Transforme les liens du texte (/#contact, /service-x.html, https://…) en liens cliquables
  function appendText(element, text) {
    const pattern = /(https?:\/\/[^\s)]+|\/(?:#[\w-]+|[\w-]+\.html(?:#[\w-]+)?))/g;
    let last = 0;

    for (const match of text.matchAll(pattern)) {
      element.append(text.slice(last, match.index));

      const link = document.createElement("a");
      const url = match[0].replace(/[.,;:!?]+$/, "");
      link.href = url;
      link.textContent =
        url === "/#contact"
          ? "Demander un devis"
          : url.startsWith("/")
            ? "voir la page"
            : url;
      if (url.startsWith("http")) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      element.append(link, match[0].slice(url.length));
      last = match.index + match[0].length;
    }

    element.append(text.slice(last));
  }

  function addBubble(role, text) {
    const bubble = document.createElement("div");
    bubble.className = `chatbot-msg chatbot-msg-${role}`;
    // Le modèle peut quand même renvoyer un peu de Markdown : on retire le gras
    appendText(bubble, text.replace(/\*\*(.+?)\*\*/g, "$1"));
    list.append(bubble);
    list.scrollTop = list.scrollHeight;

    return bubble;
  }

  function render() {
    list.replaceChildren();
    addBubble("assistant", WELCOME);
    messages.forEach(({role, content}) => addBubble(role, content));
  }

  function setOpen(open) {
    panel.hidden = !open;
    toggle.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le chat" : "Ouvrir le chat");
    toggle.innerHTML = open
      ? '<i class="fas fa-xmark"></i>'
      : '<i class="fas fa-comment-dots"></i>';
    if (open) {
      list.scrollTop = list.scrollHeight;
      input.focus();
    }
  }

  async function send(text) {
    sending = true;
    sendButton.disabled = true;

    messages.push({role: "user", content: text});
    save();
    addBubble("user", text);

    const typing = addBubble("assistant", "…");
    typing.classList.add("chatbot-typing");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify({messages}),
      });
      const data = await response.json().catch(() => ({}));

      typing.remove();

      if (response.ok && data.reply) {
        messages.push({role: "assistant", content: data.reply});
        save();
        addBubble("assistant", data.reply);
      } else {
        // Le message n'a pas abouti : on le retire de l'historique pour pouvoir le renvoyer
        messages.pop();
        save();
        addBubble(
          "error",
          data.error ?? "Le chat a rencontré un problème. Réessayez plus tard.",
        );
      }
    } catch {
      typing.remove();
      messages.pop();
      save();
      addBubble("error", "Impossible de joindre le serveur. Vérifiez votre connexion.");
    } finally {
      sending = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  // ── Événements ──
  toggle.addEventListener("click", () => setOpen(panel.hidden));
  panel.querySelector(".chatbot-close").addEventListener("click", () => {
    setOpen(false);
    toggle.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = input.value.trim();
    if (!text || sending) return;

    input.value = "";
    input.style.height = "";
    send(text);
  });

  // Entrée envoie, Maj+Entrée fait un retour à la ligne
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  });

  render();
})();
