// =========================================================
// SUPABASE CONFIGURATION
// =========================================================

const SUPABASE_URL =
"https://iqnkrsltsugajdbagezd.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
"sb_publishable_i8wRq7NYkawDpc9lvRtxqQ_m7mkf6h_";

const supabaseClient =
supabase.createClient(
SUPABASE_URL,
SUPABASE_PUBLISHABLE_KEY
);


// =========================================================
// ELEMENTS
// =========================================================

const loginScreen =
document.getElementById("loginScreen");

const holdingScreen =
document.getElementById("holdingScreen");

const appScreen =
document.getElementById("appScreen");

const loginForm =
document.getElementById("loginForm");

const loginMessage =
document.getElementById("loginMessage");

const welcome =
document.getElementById("welcome");


// =========================================================
// STARTUP
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

const {
data: {
session
}
} = await supabaseClient.auth.getSession();

if (session) {

await checkAuthorisation(
session.user
);

} else {

showLogin();

}

});


// =========================================================
// AUTH STATE
// =========================================================

supabaseClient.auth.onAuthStateChange(
async (event, session) => {

if (session) {

await checkAuthorisation(
session.user
);

} else {

showLogin();

}

}
);


// =========================================================
// LOGIN
// =========================================================

loginForm.addEventListener(
"submit",
async (event) => {

event.preventDefault();

loginMessage.textContent =
"Signing in...";

const email =
document
.getElementById("email")
.value
.trim();

const password =
document
.getElementById("password")
.value;

const {
error
} =
await supabaseClient.auth
.signInWithPassword({
email,
password
});

if (error) {

loginMessage.textContent =
"Unable to sign in. Please check your email and password.";

console.error(error);

}

}
);


// =========================================================
// CHECK AUTHORISATION
// =========================================================

async function checkAuthorisation(user) {

const {
data,
error
} =
await supabaseClient
.from("allowed_users")
.select("display_name, email")
.eq("id", user.id)
.maybeSingle();

if (error) {

console.error(error);

showHolding();

return;
}

if (!data) {

showHolding();

return;
}

welcome.textContent =
`Hello ${data.display_name}`;

showApp();

await loadTodos();

await loadDiary();

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

document
.getElementById("signOut")
.addEventListener(
"click",
async () => {

await supabaseClient.auth.signOut();

}
);


document
.getElementById("holdingSignOut")
.addEventListener(
"click",
async () => {

await supabaseClient.auth.signOut();

}
);


// =========================================================
// NAVIGATION
// =========================================================

document
.querySelectorAll(".nav-button")
.forEach(button => {

button.addEventListener(
"click",
() => {

document
.querySelectorAll(".nav-button")
.forEach(b =>
b.classList.remove("active")
);

button.classList.add("active");

document
.querySelectorAll(".app-section")
.forEach(section =>
section.classList.add("hidden")
);

document
.getElementById(
button.dataset.section
)
.classList.remove("hidden");

}
);

});


// =========================================================
// TODO FORM
// =========================================================

document
.getElementById("showTodoForm")
.addEventListener(
"click",
() => {

document
.getElementById("todoForm")
.classList.remove("hidden");

}
);


document
.getElementById("cancelTodo")
.addEventListener(
"click",
() => {

document
.getElementById("todoForm")
.reset();

document
.getElementById("todoForm")
.classList.add("hidden");

}
);


// =========================================================
// ADD TODO
// =========================================================

document
.getElementById("todoForm")
.addEventListener(
"submit",
async event => {

event.preventDefault();

const {
data: {
user
}
} =
await supabaseClient.auth
.getUser();

if (!user) return;

const title =
document
.getElementById("todoTitle")
.value
.trim();

const notes =
document
.getElementById("todoNotes")
.value
.trim();

const dueDate =
document
.getElementById("todoDate")
.value || null;

const {
error
} =
await supabaseClient
.from("todos")
.insert({
title,
notes,
due_date: dueDate,
created_by: user.id
});

if (error) {

console.error(error);

alert(
"There was a problem adding the todo."
);

return;
}

document
.getElementById("todoForm")
.reset();

document
.getElementById("todoForm")
.classList.add("hidden");

await loadTodos();

}
);


// =========================================================
// LOAD TODOS
// =========================================================

async function loadTodos() {

const {
data,
error
} =
await supabaseClient
.from("todos")
.select("*")
.order("completed", {
ascending: true
})
.order("due_date", {
ascending: true,
nullsFirst: false
})
.order("created_at", {
ascending: false
});

if (error) {

console.error(error);

return;
}

const list =
document.getElementById("todoList");

list.innerHTML = "";

if (!data.length) {

list.innerHTML =
"<p>No todos yet.</p>";

return;
}

data.forEach(todo => {

const item =
document.createElement("div");

item.className =
"todo-item";

item.innerHTML = `

<input
type="checkbox"
${todo.completed ? "checked" : ""}
>

<div class="todo-content">

<div class="todo-title ${
todo.completed
? "completed"
: ""
}">
${escapeHtml(todo.title)}
</div>

${
todo.due_date
? `
<div class="todo-date">
Due ${formatDate(todo.due_date)}
</div>
`
: ""
}

${
todo.notes
? `
<div class="todo-notes">
${escapeHtml(todo.notes)}
</div>
`
: ""
}

</div>

<button
class="delete-button">
×
</button>
`;


// Complete checkbox

item
.querySelector("input")
.addEventListener(
"change",
async event => {

await updateTodo(
todo,
event.target.checked
);

}
);


// Delete

item
.querySelector(".delete-button")
.addEventListener(
"click",
async () => {

if (
!confirm(
"Delete this todo?"
)
) {
return;
}

const {
error
} =
await supabaseClient
.from("todos")
.delete()
.eq("id", todo.id);

if (error) {

console.error(error);

alert(
"Unable to delete the todo."
);

return;
}

await loadTodos();

}
);


list.appendChild(item);

});

}


// =========================================================
// UPDATE TODO
// =========================================================

async function updateTodo(todo, completed) {

const {
error
} =
await supabaseClient
.from("todos")
.update({
completed,
completed_at:
completed
? new Date().toISOString()
: null
})
.eq("id", todo.id);

if (error) {

console.error(error);

alert(
"Unable to update the todo."
);

return;
}

await loadTodos();

}


// =========================================================
// DIARY FORM
// =========================================================

document
.getElementById("showDiaryForm")
.addEventListener(
"click",
() => {

document
.getElementById("diaryDate")
.value =
new Date()
.toISOString()
.slice(0, 10);

document
.getElementById("diaryForm")
.classList.remove("hidden");

}
);


document
.getElementById("cancelDiary")
.addEventListener(
"click",
() => {

document
.getElementById("diaryForm")
.reset();

document
.getElementById("diaryForm")
.classList.add("hidden");

}
);


// =========================================================
// ADD DIARY ENTRY
// =========================================================

document
.getElementById("diaryForm")
.addEventListener(
"submit",
async event => {

event.preventDefault();

const {
data: {
user
}
} =
await supabaseClient.auth
.getUser();

if (!user) return;

const diaryDate =
document
.getElementById("diaryDate")
.value;

const title =
document
.getElementById("diaryTitle")
.value
.trim();

const content =
document
.getElementById("diaryContent")
.value
.trim();

const {
error
} =
await supabaseClient
.from("diary")
.insert({
diary_date: diaryDate,
title,
content,
created_by: user.id
});

if (error) {

console.error(error);

alert(
"There was a problem saving the diary entry."
);

return;
}

document
.getElementById("diaryForm")
.reset();

document
.getElementById("diaryForm")
.classList.add("hidden");

await loadDiary();

}
);


// =========================================================
// LOAD DIARY
// =========================================================

async function loadDiary() {

const {
data,
error
} =
await supabaseClient
.from("diary")
.select("*")
.order("diary_date", {
ascending: false
})
.order("created_at", {
ascending: false
});

if (error) {

console.error(error);

return;
}

const list =
document.getElementById("diaryList");

list.innerHTML = "";

if (!data.length) {

list.innerHTML =
"<p>No diary entries yet.</p>";

return;
}

data.forEach(entry => {

const item =
document.createElement("article");

item.className =
"diary-entry";

item.innerHTML = `

<div class="diary-date">
${formatDate(entry.diary_date)}
</div>

${
entry.title
? `
<h3>
${escapeHtml(entry.title)}
</h3>
`
: ""
}

<div class="diary-content">
${escapeHtml(entry.content)}
</div>

<button
class="diary-delete">
Delete
</button>
`;


item
.querySelector(".diary-delete")
.addEventListener(
"click",
async () => {

if (
!confirm(
"Delete this diary entry?"
)
) {
return;
}

const {
error
} =
await supabaseClient
.from("diary")
.delete()
.eq("id", entry.id);

if (error) {

console.error(error);

alert(
"Unable to delete the entry."
);

return;
}

await loadDiary();

}
);


list.appendChild(item);

});

}


// =========================================================
// HELPERS
// =========================================================

function formatDate(dateString) {

if (!dateString) return "";

const date =
new Date(
dateString + "T12:00:00"
);

return date.toLocaleDateString(
"en-GB",
{
day: "numeric",
month: "short",
year: "numeric"
}
);

}


function escapeHtml(value) {

return String(value)
.replaceAll("&", "&amp;")
.replaceAll("<", "&lt;")
.replaceAll(">", "&gt;")
.replaceAll('"', "&quot;")
.replaceAll("'", "&#039;");

}
