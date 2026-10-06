// =========================================================
// SUPABASE CONFIGURATION
// =========================================================
const SUPABASE_URL = "https://iqnkrsltsugajdbagezd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_i8wRq7NYkawDpc9lvRtxqQ_m7mkf6h_";
const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

// =========================================================
// CLOUDFLARE CONFIGURATION
// =========================================================
const CLOUDFLARE_WORKER_URL = "https://tight-mountain-7d4b.paul-russell.workers.dev";

// =========================================================
// ELEMENTS
// =========================================================
const loginScreen = document.getElementById("loginScreen");
const holdingScreen = document.getElementById("holdingScreen");
const appScreen = document.getElementById("appScreen");
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");
const welcome = document.getElementById("welcome");

// =========================================================
// STARTUP
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {
  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {
    await checkAuthorisation(session.user);
  } else {
    showLogin();
  }
});

// =========================================================
// AUTH STATE
// =========================================================
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (session) {
    await checkAuthorisation(session.user);
  } else {
    showLogin();
  }
});

// =========================================================
// LOGIN
// =========================================================
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginMessage.textContent = "Signing in...";
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMessage.textContent = "Unable to sign in. Please check your email and password.";
    console.error(error);
  }
});

// =========================================================
// CHECK AUTHORISATION
// =========================================================
async function checkAuthorisation(user) {
  const { data, error } = await supabaseClient
    .from("allowed_users")
    .select("display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    showHolding();
    return;
  }

  welcome.textContent = `Hello ${data.display_name}`;
  showApp();
  await loadTodos();
  await loadShopping();
  await loadCalendar();
}

// =========================================================
// SCREEN CONTROL
// =========================================================
function showLogin() {
  loginScreen.classList.remove("hidden");
  holdingScreen.classList.add("hidden");
  appScreen.classList.add("hidden");
}

function showHolding() {
  loginScreen.classList.add("hidden");
  holdingScreen.classList.remove("hidden");
  appScreen.classList.add("hidden");
}

function showApp() {
  loginScreen.classList.add("hidden");
  holdingScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");
}

// =========================================================
// SIGN OUT
// =========================================================
document.getElementById("signOut")?.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

document.getElementById("holdingSignOut")?.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

// =========================================================
// NAVIGATION
// =========================================================
document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-button").forEach((b) => b.classList.remove("active"));
    button.classList.add("active");

    document.querySelectorAll(".app-section").forEach((section) => section.classList.add("hidden"));
    
    const targetSection = document.getElementById(button.dataset.section);
    if (targetSection) {
      targetSection.classList.remove("hidden");
    }
  });
});

// =========================================================
// TODO FORM
// =========================================================
document.getElementById("showTodoForm")?.addEventListener("click", () => {
  document.getElementById("todoForm")?.classList.remove("hidden");
  document.getElementById("todoTitle")?.focus();
});

document.getElementById("cancelTodo")?.addEventListener("click", () => {
  const form = document.getElementById("todoForm");
  if (form) {
    form.reset();
    form.classList.add("hidden");
  }
});

// =========================================================
// ADD TODO
// =========================================================
document.getElementById("todoForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const title = document.getElementById("todoTitle").value.trim();
  const notes = document.getElementById("todoNotes").value.trim();
  const dueDate = document.getElementById("todoDate").value || null;

  if (!title) return;

  const { error } = await supabaseClient.from("todos").insert({
    title,
    notes,
    due_date: dueDate,
    created_by: user.id,
    list_type: "todo"
  });

  if (error) {
    console.error(error);
    alert("There was a problem adding the todo.");
    return;
  }

  const form = document.getElementById("todoForm");
  form.reset();
  form.classList.add("hidden");
  await loadTodos();
});

// =========================================================
// LOAD TODOS
// =========================================================
async function loadTodos() {
  const { data, error } = await supabaseClient
    .from("todos")
    .select(`*, allowed_users:created_by (display_name)`)
    .eq("list_type", "todo")
    .order("completed", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Joined todo query failed. Loading normally.", error);
    const fallback = await supabaseClient
      .from("todos")
      .select("*")
      .eq("list_type", "todo")
      .order("completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (fallback.error) {
      console.error(fallback.error);
      return;
    }
    renderTodos(fallback.data);
    return;
  }
  renderTodos(data);
}

// =========================================================
// RENDER TODOS
// =========================================================
function renderTodos(data) {
  const list = document.getElementById("todoList");
  if (!list) return;
  list.innerHTML = "";

  if (!data || !data.length) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No todos yet.</p>
        <p>Add something using the + Add button.</p>
      </div>
    `;
    return;
  }

  const outstanding = data.filter((todo) => !todo.completed);
  const completed = data.filter((todo) => todo.completed);

  if (outstanding.length) {
    const heading = document.createElement("h3");
    heading.className = "todo-group-heading";
    heading.textContent = "To do";
    list.appendChild(heading);
    outstanding.forEach((todo) => list.appendChild(createTodoElement(todo)));
  }

  if (completed.length) {
    const heading = document.createElement("h3");
    heading.className = "todo-group-heading completed-heading";
    heading.textContent = "Completed";
    list.appendChild(heading);
    completed.forEach((todo) => list.appendChild(createTodoElement(todo)));
  }
}

// =========================================================
// CREATE TODO ELEMENT
// =========================================================
function createTodoElement(todo) {
  const item = document.createElement("div");
  item.className = "todo-item";
  if (todo.completed) {
    item.classList.add("todo-completed");
  }

  const dueStatus = getDueStatus(todo.due_date, todo.completed);
  let addedBy = "";
  if (todo.allowed_users && todo.allowed_users.display_name) {
    addedBy = todo.allowed_users.display_name;
  }

  item.innerHTML = `
    <input type="checkbox" class="todo-checkbox" ${todo.completed ? "checked" : ""}>
    <div class="todo-content">
      <div class="todo-title ${todo.completed ? "completed" : ""}">
        ${escapeHtml(todo.title)}
      </div>
      ${todo.due_date ? `<div class="todo-date ${dueStatus.className}">${dueStatus.text}</div>` : ""}
      ${todo.notes ? `<div class="todo-notes">${escapeHtml(todo.notes)}</div>` : ""}
      ${addedBy ? `<div class="todo-added">Added by ${escapeHtml(addedBy)}</div>` : ""}
    </div>
    <div class="todo-actions">
      <button class="edit-button" title="Edit">✏️</button>
      <button class="delete-button" title="Delete">🗑️</button>
    </div>
  `;

  item.querySelector(".todo-checkbox").addEventListener("change", async (event) => {
    await updateTodo(todo, event.target.checked);
  });

  item.querySelector(".delete-button").addEventListener("click", async () => {
    if (!confirm(`Delete "${todo.title}"?`)) return;

    const { error } = await supabaseClient.from("todos").delete().eq("id", todo.id);
    if (error) {
      console.error(error);
      alert("Unable to delete the todo.");
      return;
    }
    await loadTodos();
  });

  item.querySelector(".edit-button").addEventListener("click", () => {
    editTodo(todo);
  });

  return item;
}

// =========================================================
// UPDATE TODO
// =========================================================
async function updateTodo(todo, completed) {
  const { error } = await supabaseClient
    .from("todos")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null
    })
    .eq("id", todo.id);

  if (error) {
    console.error(error);
    alert("Unable to update the todo.");
    return;
  }
  await loadTodos();
}

// =========================================================
// EDIT TODO
// =========================================================
function editTodo(todo) {
  document.getElementById("todoTitle").value = todo.title || "";
  document.getElementById("todoDate").value = todo.due_date || "";
  document.getElementById("todoNotes").value = todo.notes || "";

  const form = document.getElementById("todoForm");
  form.classList.remove("hidden");
  form.dataset.editingId = todo.id;

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.textContent = "Save changes";

  form.scrollIntoView({ behavior: "smooth", block: "center" });

  form.onsubmit = async (event) => {
    event.preventDefault();
    const title = document.getElementById("todoTitle").value.trim();
    const notes = document.getElementById("todoNotes").value.trim();
    const dueDate = document.getElementById("todoDate").value || null;

    if (!title) return;

    const { error } = await supabaseClient
      .from("todos")
      .update({ title, notes, due_date: dueDate })
      .eq("id", todo.id);

    if (error) {
      console.error(error);
      alert("Unable to save changes.");
      return;
    }

    form.reset();
    form.classList.add("hidden");
    submitButton.textContent = "Add";
    form.onsubmit = null;
    await loadTodos();
  };
}

// =========================================================
// SHOPPING FORM
// =========================================================
document.getElementById("showShoppingForm")?.addEventListener("click", () => {
  document.getElementById("shoppingForm")?.classList.remove("hidden");
  document.getElementById("shoppingTitle")?.focus();
});

document.getElementById("cancelShopping")?.addEventListener("click", () => {
  const form = document.getElementById("shoppingForm");
  if (form) {
    form.reset();
    form.classList.add("hidden");
  }
});

// =========================================================
// ADD SHOPPING ITEM
// =========================================================
document.getElementById("shoppingForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return;

  const title = document.getElementById("shoppingTitle").value.trim();
  if (!title) return;

  const { error } = await supabaseClient.from("todos").insert({
    title,
    created_by: user.id,
    list_type: "shopping"
  });

  if (error) {
    console.error(error);
    alert("There was a problem adding the shopping item.");
    return;
  }

  const form = document.getElementById("shoppingForm");
  form.reset();
  form.classList.add("hidden");
  await loadShopping();
});

// =========================================================
// LOAD SHOPPING LIST
// =========================================================
async function loadShopping() {
  const { data, error } = await supabaseClient
    .from("todos")
    .select("*")
    .eq("list_type", "shopping")
    .order("completed", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  const list = document.getElementById("shoppingList");
  if (!list) return;
  list.innerHTML = "";

  if (!data || !data.length) {
    list.innerHTML = "<p>Your shopping list is empty.</p>";
    return;
  }

  data.forEach((item) => {
    const element = document.createElement("div");
    element.className = "shopping-item";

    element.innerHTML = `
      <input type="checkbox" ${item.completed ? "checked" : ""}>
      <div class="shopping-title ${item.completed ? "completed" : ""}">${escapeHtml(item.title)}</div>
      <button class="delete-button">×</button>
    `;

    element.querySelector("input").addEventListener("change", async (event) => {
      const { error } = await supabaseClient
        .from("todos")
        .update({
          completed: event.target.checked,
          completed_at: event.target.checked ? new Date().toISOString() : null
        })
        .eq("id", item.id);

      if (error) {
        console.error(error);
        alert("Unable to update the shopping item.");
        return;
      }
      await loadShopping();
    });

    element.querySelector(".delete-button").addEventListener("click", async () => {
      if (!confirm("Delete this shopping item?")) return;

      const { error } = await supabaseClient.from("todos").delete().eq("id", item.id);
      if (error) {
        console.error(error);
        alert("Unable to delete the shopping item.");
        return;
      }
      await loadShopping();
    });

    list.appendChild(element);
  });
}

// =========================================================
// AUTOMATIC REFRESH
// =========================================================
setInterval(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    await loadTodos();
    await loadShopping();
  }
}, 30000);

// =========================================================
// HELPERS (DATE & HTML ESCAPING)
// =========================================================
function getDueStatus(dateString, completed) {
  if (!dateString) return { text: "", className: "" };

  if (completed) {
    return { text: `Due ${formatDate(dateString)}`, className: "completed-date" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dateString + "T00:00:00");
  const difference = Math.round((due - today) / 86400000);

  if (difference < 0) {
    return { text: `Overdue — ${formatDate(dateString)}`, className: "overdue" };
  }
  if (difference === 0) {
    return { text: "Due today", className: "due-today" };
  }
  if (difference === 1) {
    return { text: "Due tomorrow", className: "due-tomorrow" };
  }
  return { text: `Due ${formatDate(dateString)}`, className: "" };
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =========================================================
// CALENDAR
// =========================================================
document.getElementById("refreshCalendar")?.addEventListener("click", async () => {
  await loadCalendar();
});

async function loadCalendar() {
  const todayContainer = document.getElementById("calendarTodayList");
  const upcomingContainer = document.getElementById("calendarUpcomingList");

  if (!todayContainer || !upcomingContainer) return;

  todayContainer.innerHTML = `<p class="message">Loading...</p>`;
  upcomingContainer.innerHTML = `<p class="message">Loading...</p>`;

  try {
    const response = await fetch(CLOUDFLARE_WORKER_URL);
    if (!response.ok) throw new Error("Failed to fetch calendar events.");

    const events = await response.json();
    renderCalendarEvents(events);
  } catch (error) {
    console.error("Calendar Load Error:", error);
    todayContainer.innerHTML = `<p class="message">Unable to load today's events.</p>`;
    upcomingContainer.innerHTML = `<p class="message">Unable to load upcoming events.</p>`;
  }
}

function renderCalendarEvents(events) {
  const todayContainer = document.getElementById("calendarTodayList");
  const upcomingContainer = document.getElementById("calendarUpcomingList");

  todayContainer.innerHTML = "";
  upcomingContainer.innerHTML = "";

  if (!events || events.length === 0) {
    todayContainer.innerHTML = `<div class="empty-state"><p>No events today.</p></div>`;
    upcomingContainer.innerHTML = `<div class="empty-state"><p>No upcoming events.</p></div>`;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const todayEvents = [];
  const upcomingEvents = [];

  events.forEach((event) => {
    const eventDate = new Date(event.start);

    if (eventDate >= today && eventDate < tomorrow) {
      todayEvents.push(event);
    } else if (eventDate >= tomorrow && eventDate <= nextWeek) {
      upcomingEvents.push(event);
    }
  });

  if (todayEvents.length === 0) {
    todayContainer.innerHTML = `<div class="empty-state"><p>No events today.</p></div>`;
  } else {
    todayEvents.forEach((event) => todayContainer.appendChild(createEventCard(event)));
  }

  if (upcomingEvents.length === 0) {
    upcomingContainer.innerHTML = `<div class="empty-state"><p>No upcoming events this week.</p></div>`;
  } else {
    upcomingEvents.forEach((event) => upcomingContainer.appendChild(createEventCard(event)));
  }
}

function createEventCard(event) {
  const item = document.createElement("div");
  item.className = "calendar-item";

  const eventDate = formatCalendarDate(event.start, event.isAllDay);

  item.innerHTML = `
    <div class="calendar-date-badge">${eventDate}</div>
    <div class="calendar-content">
      <div class="calendar-title">${escapeHtml(event.summary)}</div>
      ${event.location ? `<div class="calendar-location">📍 ${escapeHtml(event.location)}</div>` : ""}
      ${event.description ? `<div class="calendar-description">${escapeHtml(event.description)}</div>` : ""}
    </div>
  `;
  return item;
}

function formatCalendarDate(dateString, isAllDay) {
  const date = new Date(dateString);
  if (isAllDay) {
    return date.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short"
    }) + " (All Day)";
  }

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// =========================================================
// CHANGE PASSWORD
// =========================================================

document
    .getElementById("showPasswordForm")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById("passwordFormContainer")
                .classList.remove("hidden");

            document
                .getElementById("passwordMessage")
                .textContent = "";

            document
                .getElementById("passwordForm")
                .reset();

            document
                .getElementById("newPassword")
                .focus();

        }
    );


// =========================================================
// CANCEL PASSWORD CHANGE
// =========================================================

document
    .getElementById("cancelPassword")
    .addEventListener(
        "click",
        () => {

            document
                .getElementById("passwordForm")
                .reset();

            document
                .getElementById("passwordMessage")
                .textContent = "";

            document
                .getElementById("passwordFormContainer")
                .classList.add("hidden");

        }
    );


// =========================================================
// UPDATE PASSWORD
// =========================================================

document
    .getElementById("passwordForm")
    .addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const newPassword =
                document
                    .getElementById("newPassword")
                    .value;

            const confirmPassword =
                document
                    .getElementById("confirmPassword")
                    .value;

            const message =
                document
                    .getElementById("passwordMessage");


            // Check passwords match

            if (newPassword !== confirmPassword) {

                message.textContent =
                    "The passwords do not match.";

                return;
            }


            // Minimum length

            if (newPassword.length < 8) {

                message.textContent =
                    "Password must be at least 8 characters.";

                return;
            }


            message.textContent =
                "Changing password...";


            const {
                error
            } =
                await supabaseClient.auth.updateUser({
                    password: newPassword
                });


            if (error) {

                console.error(error);

                message.textContent =
                    "Unable to change the password.";

                return;
            }


            message.textContent =
                "Password changed successfully.";


            document
                .getElementById("passwordForm")
                .reset();


            setTimeout(
                () => {

                    document
                        .getElementById(
                            "passwordFormContainer"
                        )
                        .classList.add("hidden");

                    message.textContent = "";

                },
                2000
            );

        }
    );

// =========================================================
// RECIPES
// =========================================================

let allRecipes = []; // Cache locally for lightning-fast search

async function loadRecipes() {
  const { data, error } = await supabaseClient
    .from("recipes")
    .select("*")
    .order("title", { ascending: true });

  if (error) {
    console.error("Error loading recipes:", error);
    return;
  }

  allRecipes = data;
  renderRecipeCards(allRecipes);
}

// Live Search Filter
document.getElementById("recipeSearch")?.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  
  const filtered = allRecipes.filter((recipe) => {
    const titleMatch = recipe.title.toLowerCase().includes(query);
    const ingredientMatch = recipe.ingredients.some((ing) => ing.toLowerCase().includes(query));
    return titleMatch || ingredientMatch;
  });

  renderRecipeCards(filtered);
});

// Render Thumbnails Grid
function renderRecipeCards(recipes) {
  const container = document.getElementById("recipeGrid");
  if (!container) return;

  container.innerHTML = "";

  if (recipes.length === 0) {
    container.innerHTML = `<p class="empty-state">No recipes found.</p>`;
    return;
  }

  recipes.forEach((recipe) => {
    const card = document.createElement("div");
    card.className = "recipe-card-thumb";
    card.innerHTML = `
      <h3>${escapeHtml(recipe.title)}</h3>
      <p style="color: #64748b; font-size: 0.9em;">${recipe.category || 'General'} • ${recipe.cook_time || ''}</p>
    `;

    card.addEventListener("click", () => openRecipeDetail(recipe));
    container.appendChild(card);
  });
}

// Open 2-Section View
function openRecipeDetail(recipe) {
  document.getElementById("recipeGrid").classList.add("hidden");
  document.getElementById("recipeDetail").classList.remove("hidden");

  document.getElementById("detailTitle").textContent = recipe.title;
  document.getElementById("detailMeta").textContent = 
    `Prep: ${recipe.prep_time || 'N/A'} | Cook: ${recipe.cook_time || 'N/A'} | Serves: ${recipe.servings || 'N/A'}`;

  // Render Ingredients List
  const ingList = document.getElementById("detailIngredients");
  ingList.innerHTML = recipe.ingredients
    .map((ing) => `<li>${escapeHtml(ing)}</li>`)
    .join("");

  // Render Instructions List
  const instList = document.getElementById("detailInstructions");
  instList.innerHTML = recipe.instructions
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");
}

// Back Button
document.getElementById("closeRecipe")?.addEventListener("click", () => {
  document.getElementById("recipeDetail").classList.add("hidden");
  document.getElementById("recipeGrid").classList.remove("hidden");
});
