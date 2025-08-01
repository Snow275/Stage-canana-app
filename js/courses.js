// js/courses.js
import {
  db,
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc
} from "./firebase.js";

// Référence à la collection Firestore
const coursesCol = collection(db, "courses");

/**
 * Écoute temps réel des items
 * @param {Function} cb callback recevant [{id, text, done, createdAt}, ...]
 * @returns unsubscribe
 */
export function subscribeCourses(cb) {
  return onSnapshot(coursesCol, snap => {
    const items = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.createdAt - b.createdAt);
    cb(items);
  });
}

/** Ajout d’un item */
export function addCourse(data) {
  // data = { text, done }
  return addDoc(coursesCol, { ...data, createdAt: Date.now() });
}

/** Mise à jour d’un item */
export function updateCourse(id, updates) {
  return updateDoc(doc(db, "courses", id), updates);
}

/** Suppression d’un item */
export function removeCourse(id) {
  return deleteDoc(doc(db, "courses", id));
}


/**
 * Module Courses / Packing List – init UI
 */
export function initCourses() {
  const form = document.getElementById("course-form");
  const input = document.getElementById("course-input");
  const list = document.getElementById("course-list");
  const btnExp = document.getElementById("export-courses");

  if (!form || !input || !list || !btnExp) {
    console.error("❌ initCourses: éléments introuvables", { form, input, list, btnExp });
    return;
  }

  // 1) Écoute temps réel
  subscribeCourses(items => {
    list.innerHTML = "";
    items.forEach(renderItem);
  });

  // 2) Gestion du formulaire
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    await addCourse({ text, done: false });
    input.value = "";
  });

  // 3) Export CSV manuel
  btnExp.addEventListener("click", () => {
    subscribeCourses(items => {
      if (!items.length) return alert("Rien à exporter");
      const header = "id,texte,fait";
      const rows = items.map(i =>
        `${i.id},"${i.text.replace(/"/g,'""')}",${i.done}`
      );
      downloadCSV("courses.csv", [header, ...rows].join("\n"));
    })();
  });

  // Affiche un item dans la liste
  function renderItem(i) {
    const li = document.createElement("li");
    li.className = "list-group-item d-flex justify-content-between align-items-center";
    if (i.done) li.classList.add("checked");
    li.innerHTML = `
      <span>${escapeHtml(i.text)}</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1" title="Toggle">✓</button>
        <button class="btn btn-sm btn-outline-danger" title="Delete">❌</button>
      </div>
    `;
    const [btnDone, btnDel] = li.querySelectorAll("button");

    btnDone.onclick = async () => {
      await updateCourse(i.id, { done: !i.done });
    };
    btnDel.onclick = async () => {
      if (confirm("Supprimer cet item ?")) {
        await removeCourse(i.id);
      }
    };

    list.appendChild(li);
  }

  function downloadCSV(filename, text) {
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(text);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
}
