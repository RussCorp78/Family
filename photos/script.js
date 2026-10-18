// Temporary test data. Later this array can be replaced with records from Supabase.
const SUPABASE_URL = "https://iqnkrsltsugajdbagezd.supabase.co";
const SUPABASE_KEY = "sb_publishable_i8wRq7NYkawDpc9lvRtxqQ_m7mkf6h_";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

let photos = [];

async function loadPhotos() {
  const { data, error } = await supabaseClient
    .from("Photos")
    .select("*")
    .eq("published", true)
    .order("date_taken", { ascending: false });

  if (error) {
    console.error("Error loading photos:", error);
    return;
  }

  photos = data.map(photo => {
    const { data: imageData } = supabaseClient.storage
      .from("Photos")
      .getPublicUrl(photo.image_path);

    return {
      title: photo.title,
      image: imageData.publicUrl,
      description: photo.description,
      date: photo.date_taken,
      dateTime: photo.date_taken,
      location: photo.location,
      keywords: photo.keywords
        ? photo.keywords.split(",").map(keyword => keyword.trim())
        : []
    };
  });

  matchingIndexes = photos.map((_, index) => index);
  currentPhotoIndex = 0;

  renderPhoto(false);
}

const elements = {
  polaroid: document.querySelector("#polaroid"),
  image: document.querySelector("#photo-image"),
  title: document.querySelector("#photo-title"),
  description: document.querySelector("#photo-description"),
  date: document.querySelector("#photo-date"),
  location: document.querySelector("#photo-location"),
  counter: document.querySelector("#photo-counter"),
  search: document.querySelector("#photo-search"),
  noResults: document.querySelector("#no-results"),
  previous: document.querySelector("#previous-button"),
  next: document.querySelector("#next-button")
};

let currentPhotoIndex = 0;
let matchingIndexes = photos.map((_, index) => index);

function getSearchableText(photo) {
  return [
    photo.title,
    photo.description,
    photo.location,
    ...photo.keywords
  ].join(" ").toLowerCase();
}

function renderPhoto(animate = true) {
  if (matchingIndexes.length === 0) {
    elements.polaroid.hidden = true;
    elements.noResults.hidden = false;
    elements.previous.disabled = true;
    elements.next.disabled = true;
    elements.counter.textContent = "0 / 0";
    return;
  }

  if (!matchingIndexes.includes(currentPhotoIndex)) {
    currentPhotoIndex = matchingIndexes[0];
  }

  const photo = photos[currentPhotoIndex];
  const update = () => {
    elements.image.src = photo.image;
    elements.image.alt = photo.title;
    elements.title.textContent = photo.title;
    elements.description.textContent = photo.description;
    elements.date.textContent = photo.date;
    elements.date.dateTime = photo.dateTime;
    elements.location.textContent = `📍 ${photo.location}`;
    elements.counter.textContent = `${matchingIndexes.indexOf(currentPhotoIndex) + 1} / ${matchingIndexes.length}`;
    elements.polaroid.hidden = false;
    elements.noResults.hidden = true;
    elements.previous.disabled = false;
    elements.next.disabled = false;
    elements.polaroid.classList.remove("changing");
  };

  if (animate) {
    elements.polaroid.classList.add("changing");
    window.setTimeout(update, 140);
  } else {
    update();
  }
}

function move(direction) {
  if (matchingIndexes.length === 0) return;

  const flickClass = direction > 0 ? "flick-left" : "flick-right";
  const arriveClass = direction > 0 ? "arrive-right" : "arrive-left";

  elements.polaroid.classList.add(flickClass);

  setTimeout(() => {
    const position = Math.max(
      0,
      matchingIndexes.indexOf(currentPhotoIndex)
    );

    const nextPosition =
      (position + direction + matchingIndexes.length) %
      matchingIndexes.length;

    currentPhotoIndex = matchingIndexes[nextPosition];

    elements.polaroid.classList.remove(
      "flick-left",
      "flick-right",
      "arrive-left",
      "arrive-right"
    );

    renderPhoto(false);

    // Force the browser to recognise the new animation
    void elements.polaroid.offsetWidth;

    elements.polaroid.classList.add(arriveClass);

    setTimeout(() => {
      elements.polaroid.classList.remove(arriveClass);
    }, 320);

  }, 260);
}

function searchPhotos() {
  const term = elements.search.value.trim().toLowerCase();

  matchingIndexes = photos
    .map((photo, index) => ({ photo, index }))
    .filter(({ photo }) => !term || getSearchableText(photo).includes(term))
    .map(({ index }) => index);

  currentPhotoIndex = matchingIndexes[0] ?? 0;
  renderPhoto(false);
}

elements.previous.addEventListener("click", () => move(-1));
elements.next.addEventListener("click", () => move(1));
elements.search.addEventListener("input", searchPhotos);

document.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") move(-1);
  if (event.key === "ArrowRight") move(1);
});

loadPhotos();
