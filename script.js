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
await checkAuthorisation(session.user);
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
await checkAuthorisation(session.user);
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
await loadShopping();
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
document
.getElementById("todoTitle")
.focus();
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
if (!title) return;
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
.select(`
*,
allowed_users:created_by (
display_name
)
`)
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
/*
If the joined user information isn't available,
fall back to loading the todos normally.
*/
if (error) {
console.warn(
"Joined todo query failed. Loading normally.",
error
);
const fallback =
await supabaseClient
.from("todos")
.select("*")
.eq("list_type", "todo")
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
if (fallback.error) {
console.error(fallback.error);
return;
}
renderTodos(
fallback.data
);
return;
}
renderTodos(data);
}
// =========================================================
// RENDER TODOS
// =========================================================
function renderTodos(data) {
const list =
document.getElementById("todoList");
list.innerHTML = "";
if (!data || !data.length) {
list.innerHTML =
`
<div class="empty-state">
<p>No todos yet.</p>
<p>Add something using the + Add button.</p>
</div>
`;
return;
}
const outstanding =
data.filter(todo =>
!todo.completed
);
const completed =
data.filter(todo =>
todo.completed
);
// -----------------------------------------------------
// OUTSTANDING
// -----------------------------------------------------
if (outstanding.length) {
const heading =
document.createElement("h3");
heading.className =
"todo-group-heading";
heading.textContent =
"To do";
list.appendChild(heading);
outstanding.forEach(todo => {
list.appendChild(
createTodoElement(todo)
);
});
}
// -----------------------------------------------------
// COMPLETED
// -----------------------------------------------------
if (completed.length) {
const heading =
document.createElement("h3");
heading.className =
"todo-group-heading completed-heading";
heading.textContent =
"Completed";
list.appendChild(heading);
completed.forEach(todo => {
list.appendChild(
createTodoElement(todo)
);
});
}
}
// =========================================================
// CREATE TODO ELEMENT
// =========================================================
function createTodoElement(todo) {
const item =
document.createElement("div");
item.className =
"todo-item";
if (todo.completed) {
item.classList.add(
"todo-completed"
);
}
const dueStatus =
getDueStatus(
todo.due_date,
todo.completed
);
let addedBy =
"";
if (
todo.allowed_users &&
todo.allowed_users.display_name
) {
addedBy =
todo.allowed_users.display_name;
}
item.innerHTML = `
<input
type="checkbox"
class="todo-checkbox"
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
<div class="
todo-date
${dueStatus.className}
">
${dueStatus.text}
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
${
addedBy
? `
<div class="todo-added">
Added by ${escapeHtml(addedBy)}
</div>
`
: ""
}
</div>
<div class="todo-actions">
<button
class="edit-button"
title="Edit">
✏️
</button>
<button
class="delete-button"
title="Delete">
🗑️
</button>
</div>
`;
// -----------------------------------------------------
// CHECKBOX
// -----------------------------------------------------
item
.querySelector(".todo-checkbox")
.addEventListener(
"change",
async event => {
await updateTodo(
todo,
event.target.checked
);
}
);
// -----------------------------------------------------
// DELETE
// -----------------------------------------------------
item
.querySelector(".delete-button")
.addEventListener(
"click",
async () => {
if (
!confirm(
`Delete "${todo.title}"?`
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
// -----------------------------------------------------
// EDIT
// -----------------------------------------------------
item
.querySelector(".edit-button")
.addEventListener(
"click",
() => {
editTodo(todo);
}
);
return item;
}
// =========================================================
// UPDATE TODO
// =========================================================
async function updateTodo(
todo,
completed
) {
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
// EDIT TODO
// =========================================================
function editTodo(todo) {
document
.getElementById("todoTitle")
.value =
todo.title || "";
document
.getElementById("todoDate")
.value =
todo.due_date || "";
document
.getElementById("todoNotes")
.value =
todo.notes || "";
const form =
document.getElementById("todoForm");
form.classList.remove("hidden");
form.dataset.editingId =
todo.id;
const submitButton =
form.querySelector(
"button[type='submit']"
);
submitButton.textContent =
"Save changes";
form.scrollIntoView({
behavior: "smooth",
block: "center"
});
/*
Temporarily replace the normal submit
behaviour with edit behaviour.
*/
form.onsubmit =
async event => {
event.preventDefault();
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
if (!title) return;
const {
error
} =
await supabaseClient
.from("todos")
.update({
title,
notes,
due_date: dueDate
})
.eq(
"id",
todo.id
);
if (error) {
console.error(error);
alert(
"Unable to save changes."
);
return;
}
form.reset();
form.classList.add(
"hidden"
);
submitButton.textContent =
"Add";
form.onsubmit = null;
await loadTodos();
};
}

// =========================================================
// SHOPPING FORM
// =========================================================

document
.getElementById("showShoppingForm")
.addEventListener(
"click",
() => {

document
.getElementById("shoppingForm")
.classList.remove("hidden");

document
.getElementById("shoppingTitle")
.focus();

}
);


document
.getElementById("cancelShopping")
.addEventListener(
"click",
() => {

document
.getElementById("shoppingForm")
.reset();

document
.getElementById("shoppingForm")
.classList.add("hidden");

}
);


// =========================================================
// ADD SHOPPING ITEM
// =========================================================

document
.getElementById("shoppingForm")
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
.getElementById("shoppingTitle")
.value
.trim();

if (!title) return;

const {
error
} =
await supabaseClient
.from("todos")
.insert({
title,
created_by: user.id,
list_type: "shopping"
});

if (error) {

console.error(error);

alert(
"There was a problem adding the shopping item."
);

return;
}

document
.getElementById("shoppingForm")
.reset();

document
.getElementById("shoppingForm")
.classList.add("hidden");

await loadShopping();

}
);


// =========================================================
// LOAD SHOPPING LIST
// =========================================================

async function loadShopping() {

const {
data,
error
} =
await supabaseClient
.from("todos")
.select("*")
.eq("list_type", "shopping")
.order("completed", {
ascending: true
})
.order("created_at", {
ascending: false
});

if (error) {

console.error(error);

return;
}

const list =
document.getElementById("shoppingList");

list.innerHTML = "";

if (!data.length) {

list.innerHTML =
"<p>Your shopping list is empty.</p>";

return;
}

data.forEach(item => {

const element =
document.createElement("div");

element.className =
"shopping-item";


element.innerHTML = `

<input
type="checkbox"
${item.completed ? "checked" : ""}
>

<div class="shopping-title ${
item.completed
? "completed"
: ""
}">
${escapeHtml(item.title)}
</div>

<button
class="delete-button">
×
</button>

`;


// Complete item

element
.querySelector("input")
.addEventListener(
"change",
async event => {

const {
error
} =
await supabaseClient
.from("todos")
.update({
completed:
event.target.checked,

completed_at:
event.target.checked
? new Date().toISOString()
: null
})
.eq("id", item.id);

if (error) {

console.error(error);

alert(
"Unable to update the shopping item."
);

return;
}

await loadShopping();

}
);


// Delete item

element
.querySelector(".delete-button")
.addEventListener(
"click",
async () => {

if (
!confirm(
"Delete this shopping item?"
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
.eq("id", item.id);

if (error) {

console.error(error);

alert(
"Unable to delete the shopping item."
);

return;
}

await loadShopping();

}
);


list.appendChild(element);

});

}

// =========================================================
// DIARY
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
// AUTOMATIC TODO REFRESH
// =========================================================
setInterval(
async () => {
const {
data: {
session
}
} =
await supabaseClient.auth
.getSession();
if (session) {
await loadTodos();
}
},
30000
);
// =========================================================
// DUE DATE
// =========================================================
function getDueStatus(
dateString,
completed
) {
if (!dateString) {
return {
text: "",
className: ""
};
}
if (completed) {
return {
text:
`Due ${formatDate(dateString)}`,
className:
"completed-date"
};
}
const today =
new Date();
today.setHours(
0,
0,
0,
0
);
const due =
new Date(
dateString + "T00:00:00"
);
const difference =
Math.round(
(
due - today
) /
86400000
);
if (difference < 0) {
return {
text:
`Overdue — ${formatDate(dateString)}`,
className:
"overdue"
};
}
if (difference === 0) {
return {
text: "Due today",
className:
"due-today"
};
}
if (difference === 1) {
return {
text: "Due tomorrow",
className:
"due-tomorrow"
};
}
return {
text:
`Due ${formatDate(dateString)}`,
className: ""
};
}
// =========================================================
// FORMAT DATE
// =========================================================
function formatDate(
dateString
) {
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
// =========================================================
// ESCAPE HTML
// =========================================================
function escapeHtml(
value
) {
return String(value)
.replaceAll(
"&",
"&amp;"
)
.replaceAll(
"<",
"&lt;"
)
.replaceAll(
">",
"&gt;"
)
.replaceAll(
'"',
"&quot;"
)
.replaceAll(
"'",
"&#039;"
);
}
