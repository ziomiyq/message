document.addEventListener("DOMContentLoaded", () => {
// LETOUT! — Post a Thought
// Thoughts are stored in Supabase so they can be shared across visitors.

const SUPABASE_URL = "https://mgdywszmxzluptzohumc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SVJO77qF5GweYYKuo3dZDQ_GuRfJjqT";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const thoughtGrid = document.getElementById("thoughtGrid");
const thoughtViewer = document.getElementById("thoughtViewer");
const viewerClose = document.getElementById("viewerClose");
const viewerCategory = document.getElementById("viewerCategory");
const viewerDate = document.getElementById("viewerDate");
const viewerText = document.getElementById("viewerText");

const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const postBtn = document.getElementById("postBtn");
const featuredPostBtn = document.getElementById("featuredPostBtn");
const thoughtForm = document.getElementById("thoughtForm");
const thoughtInput = document.getElementById("thoughtInput");
const thoughtCategory = document.getElementById("thoughtCategory");
const charCount = document.getElementById("charCount");
const suggestionForm = document.getElementById("suggestionForm");
const suggestionInput = document.getElementById("suggestionInput");
const suggestionCount = document.getElementById("suggestionCount");
const suggestionStatus = document.getElementById("suggestionStatus");
const suggestionsClosedMessage = document.getElementById("suggestionsClosedMessage");
const cannotPostPopup = document.getElementById("cannotPostPopup");
const cannotPostClose = document.getElementById("cannotPostClose");
const cannotPostOkay = document.getElementById("cannotPostOkay");

const searchSuggestions = document.getElementById("searchSuggestions");
const menuBtn = document.getElementById("menuBtn");
const navEl = document.getElementById("nav");

const defaultThoughts = [
  { id: 1, text: "Why does the weekend disappear so much faster than Monday?", category: "random", date: "Today" },
  { id: 2, text: "I understand the lesson perfectly until the teacher says, “Okay, your turn.”", category: "school", date: "Today" },
  { id: 3, text: "Maybe doing absolutely nothing is still doing something.", category: "life", date: "Yesterday" },
  { id: 4, text: "My brain at 2 AM: let's remember something embarrassing from five years ago.", category: "funny", date: "Yesterday" },
  { id: 5, text: "Do other people also rehearse what they're going to say before asking a simple question?", category: "question", date: "2 days ago" },
  { id: 6, text: "Sometimes I open an app and immediately forget why I opened it.", category: "funny", date: "2 days ago" }
];

let thoughts = [];
let siteSettings = { can_post: true, can_suggest: true };


async function loadSiteSettings() {
  if (!supabaseClient) return;

  const { data, error } = await supabaseClient
    .from("site_settings")
    .select("can_post, can_suggest")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.warn("Could not load site settings; keeping posting and suggestions open.", error);
    return;
  }

  if (data) siteSettings = { can_post: data.can_post !== false, can_suggest: data.can_suggest !== false };
  applySiteSettings();
}

function applySiteSettings() {
  if (postBtn) {
    postBtn.disabled = false;
    postBtn.classList.toggle("disabled", !siteSettings.can_post);
  }
  if (featuredPostBtn) {
    featuredPostBtn.disabled = false;
    featuredPostBtn.classList.toggle("disabled", !siteSettings.can_post);
  }

  if (suggestionForm) {
    suggestionForm.classList.toggle("hidden", !siteSettings.can_suggest);
  }
  if (suggestionsClosedMessage) suggestionsClosedMessage.hidden = siteSettings.can_suggest;
}

async function loadThoughts() {
  // Always show the page, even if Supabase's CDN/API is temporarily unavailable.
  if (!supabaseClient) {
    console.warn("Supabase library is unavailable. Showing default thoughts.");
    thoughts = defaultThoughts;
    renderThoughts();
    return;
  }

  const { data, error } = await supabaseClient
    .from("thoughts")
    .select("id, text, category, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading thoughts:", error);
    thoughts = defaultThoughts;
    renderThoughts();
    return;
  }

  thoughts = (data || []).map(thought => ({
    id: thought.id,
    text: thought.text,
    category: thought.category,
    created_at: thought.created_at,
    date: formatDate(thought.created_at)
  }));

  renderThoughts();
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function formatDate(value) {
  if (!value) return "Just now";

  // Keep the labels used by the built-in demo thoughts.
  if (typeof value === "string" && ["Today", "Yesterday", "2 days ago"].includes(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Math.max(0, Date.now() - date.getTime());
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays === 2) return "2 days ago";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function exactDate(value) {
  if (!value || ["Today", "Yesterday", "2 days ago"].includes(value)) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  });
}
function categoryName(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function renderThoughts() {
  const search = String(searchInput.value || "").toLowerCase().trim();
  const category = categoryFilter.value;

  const visible = thoughts.filter(thought => {
    const matchesSearch =
      search === "" ||
      String(thought.text || "").toLowerCase().includes(search) ||
      String(thought.category || "").toLowerCase().includes(search);

    const matchesCategory =
      category === "all" || thought.category === category;

    return matchesSearch && matchesCategory;
  });

  thoughtGrid.innerHTML = "";

  visible.forEach(thought => {
    const article = document.createElement("article");
    article.className = "thought-card";
    article.dataset.id = thought.id;
    article.innerHTML = `
      <div class="thought-top">
        <span class="category">${escapeHTML(categoryName(thought.category))}</span>
        <span class="thought-date">${escapeHTML(formatDate(thought.created_at || thought.date) || "Just now")}</span>
      </div>
      <p class="thought-text">${escapeHTML(thought.text)}</p>
    `;
    thoughtGrid.appendChild(article);
  });

  emptyState.hidden = visible.length !== 0;

  thoughtGrid.querySelectorAll(".thought-card").forEach(card => {
    const openCard = () => {
      const id = card.dataset.id;
      const thought = thoughts.find(item => String(item.id) === String(id));
      if (thought) openThoughtViewer(thought);
    };

    card.addEventListener("click", openCard);
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCard();
      }
    });
  });

  if (search === "" && category === "all") {
    resultCount.textContent = `Showing all ${thoughts.length} thought${thoughts.length === 1 ? "" : "s"}`;
  } else {
    resultCount.textContent = `${visible.length} thought${visible.length === 1 ? "" : "s"} found`;
  }

}

function openThoughtViewer(thought) {
  if (!thoughtViewer) return;

  viewerCategory.textContent = categoryName(thought.category);
  viewerDate.textContent = formatDate(thought.created_at || thought.date) || "Just now";
  viewerDate.title = exactDate(thought.created_at) || "";
  viewerText.textContent = thought.text;
  thoughtViewer.classList.add("show");
  thoughtViewer.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeThoughtViewer() {
  if (!thoughtViewer) return;

  thoughtViewer.classList.remove("show");
  thoughtViewer.setAttribute("aria-hidden", "true");
  document.body.style.overflow = modal.classList.contains("show") ? "hidden" : "";
}

function showCannotPostPopup() {
  if (!cannotPostPopup) return;
  cannotPostPopup.classList.add("show");
  cannotPostPopup.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => cannotPostOkay?.focus(), 50);
}

function closeCannotPostPopup() {
  if (!cannotPostPopup) return;
  cannotPostPopup.classList.remove("show");
  cannotPostPopup.setAttribute("aria-hidden", "true");
  document.body.style.overflow = modal.classList.contains("show") ? "hidden" : "";
}

function openModal() {
  if (!siteSettings.can_post) {
    showCannotPostPopup();
    return;
  }
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => thoughtInput.focus(), 100);
}

function closeThoughtModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function showSuggestions(query) {
  const q = query.toLowerCase().trim();
  searchSuggestions.innerHTML = "";

  if (!q) {
    searchSuggestions.classList.remove("active");
    return;
  }

  const matches = [...new Set(
    thoughts
      .filter(t =>
        t.text.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
      .map(t => t.text)
  )].slice(0, 6);

  if (!matches.length) {
    searchSuggestions.classList.remove("active");
    return;
  }

  matches.forEach(match => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = match;
    button.addEventListener("click", () => {
      searchInput.value = match;
      searchSuggestions.classList.remove("active");
      renderThoughts();
      document.getElementById("thoughts").scrollIntoView({ behavior: "smooth" });
    });
    searchSuggestions.appendChild(button);
  });

  searchSuggestions.classList.add("active");
}

if (viewerClose) viewerClose.addEventListener("click", closeThoughtViewer);

if (thoughtViewer) {
  thoughtViewer.addEventListener("click", event => {
    if (event.target === thoughtViewer) closeThoughtViewer();
  });
}

searchInput.addEventListener("input", () => {
  showSuggestions(searchInput.value);
  renderThoughts();
});

categoryFilter.addEventListener("change", renderThoughts);

postBtn.addEventListener("click", openModal);
featuredPostBtn.addEventListener("click", openModal);

cannotPostClose?.addEventListener("click", closeCannotPostPopup);
cannotPostOkay?.addEventListener("click", closeCannotPostPopup);
cannotPostPopup?.addEventListener("click", event => {
  if (event.target === cannotPostPopup) closeCannotPostPopup();
});

closeModal.addEventListener("click", closeThoughtModal);

modal.addEventListener("click", event => {
  if (event.target === modal) closeThoughtModal();
});

thoughtInput.addEventListener("input", () => {
  charCount.textContent = thoughtInput.value.length;
});

suggestionInput.addEventListener("input", () => {
  suggestionCount.textContent = `${suggestionInput.value.length} / 1000`;
});

suggestionForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!siteSettings.can_suggest) return;

  const text = suggestionInput.value.trim();
  if (!text) return;

  suggestionStatus.textContent = "Sending…";

  if (!supabaseClient) {
    suggestionStatus.textContent = "Couldn't connect. Please try again.";
    return;
  }

  const { error } = await supabaseClient
    .from("suggestions")
    .insert([{ text }]);

  if (error) {
    console.error("Error posting suggestion:", error);
    suggestionStatus.textContent = "Couldn't send it. Please try again.";
    return;
  }

  suggestionForm.reset();
  suggestionCount.textContent = "0 / 1000";
  suggestionStatus.textContent = "Thanks! Your suggestion was sent.";
});

thoughtForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!siteSettings.can_post) { closeThoughtModal(); return; }

  const text = thoughtInput.value.trim();
  if (!text) return;

  const { data, error } = await supabaseClient
    .from("thoughts")
    .insert([
      {
        text,
        category: thoughtCategory.value
      }
    ])
    .select()
    .single();

  if (error) {
    console.error("Error posting thought:", error);
    alert("Couldn't post your thought. Please try again.");
    return;
  }

  thoughts.unshift({
    id: data.id,
    text: data.text,
    category: data.category,
    created_at: data.created_at || new Date().toISOString(),
    date: formatDate(data.created_at || new Date().toISOString())
  });

  searchInput.value = "";
  categoryFilter.value = "all";
  thoughtForm.reset();
  charCount.textContent = "0";
  closeThoughtModal();
  renderThoughts();

  setTimeout(() => {
    document.getElementById("thoughts").scrollIntoView({ behavior: "smooth" });
  }, 150);
});

document.addEventListener("click", event => {
  if (!event.target.closest(".search-area")) {
    searchSuggestions.classList.remove("active");
  }
});

// Keep relative timestamps (e.g. "Just now", "12 minutes ago", "1 hour ago") fresh while the page is open.
setInterval(() => {
  if (thoughts.length) renderThoughts();
}, 30000);

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }

  if (event.key === "Escape") {
    if (cannotPostPopup?.classList.contains("show")) {
      closeCannotPostPopup();
    } else if (thoughtViewer?.classList.contains("show")) {
      closeThoughtViewer();
    } else if (modal.classList.contains("show")) {
      closeThoughtModal();
    }
  }
});

document.querySelectorAll(".category-jump").forEach(button => {
  button.addEventListener("click", () => {
    categoryFilter.value = button.dataset.category;
    renderThoughts();
    document.getElementById("thoughts").scrollIntoView({ behavior: "smooth" });
  });
});

if (menuBtn && navEl) {
  menuBtn.addEventListener("click", () => {
    navEl.classList.toggle("mobile-open");
  });

  navEl.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => navEl.classList.remove("mobile-open"));
  });
}

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", event => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (target) {
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  });
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(".animate").forEach(el => observer.observe(el));

loadSiteSettings();
loadThoughts();

});
    
