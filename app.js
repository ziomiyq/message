document.addEventListener("DOMContentLoaded", () => {
// LETOUT! — Post a Thought
// Thoughts are stored in Supabase so they can be shared across visitors.

const SUPABASE_URL = "https://mgdywszmxzluptzohumc.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_SVJO77qF5GweYYKuo3dZDQ_GuRfJjqT";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const thoughtGrid = document.getElementById("thoughtGrid");

const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const postBtn = document.getElementById("postBtn");
const featuredPostBtn = document.getElementById("featuredPostBtn");
const thoughtForm = document.getElementById("thoughtForm");
const thoughtInput = document.getElementById("thoughtInput");
const thoughtCategory = document.getElementById("thoughtCategory");
const charCount = document.getElementById("charCount");

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

async function loadThoughts() {
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

  thoughts = data.map(thought => ({
    id: thought.id,
    text: thought.text,
    category: thought.category,
    date: new Date(thought.created_at).toLocaleDateString()
  }));

  renderThoughts();
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
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
    article.innerHTML = `
      <div class="thought-top">
        <span class="category">${escapeHTML(categoryName(thought.category))}</span>
        <span class="thought-date">${escapeHTML(thought.date || "Just now")}</span>
      </div>
      <p class="thought-text">${escapeHTML(thought.text)}</p>
    `;
    thoughtGrid.appendChild(article);
  });

  emptyState.hidden = visible.length !== 0;

  if (search === "" && category === "all") {
    resultCount.textContent = `Showing all ${thoughts.length} thought${thoughts.length === 1 ? "" : "s"}`;
  } else {
    resultCount.textContent = `${visible.length} thought${visible.length === 1 ? "" : "s"} found`;
  }

}

function openModal() {
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

searchInput.addEventListener("input", () => {
  showSuggestions(searchInput.value);
  renderThoughts();
});

categoryFilter.addEventListener("change", renderThoughts);

postBtn.addEventListener("click", openModal);
featuredPostBtn.addEventListener("click", openModal);

closeModal.addEventListener("click", closeThoughtModal);

modal.addEventListener("click", event => {
  if (event.target === modal) closeThoughtModal();
});

thoughtInput.addEventListener("input", () => {
  charCount.textContent = thoughtInput.value.length;
});

thoughtForm.addEventListener("submit", async event => {
  event.preventDefault();

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
    date: "Just now"
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

document.addEventListener("keydown", event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
  }

  if (event.key === "Escape" && modal.classList.contains("show")) {
    closeThoughtModal();
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

loadThoughts();

});
        
