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

const coursesCol = collection(db, "courses");

export function subscribeCourses(cb) {
  return onSnapshot(coursesCol, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(items);
  });
}
export function addCourse(data) {
  return addDoc(coursesCol, { ...data, createdAt: Date.now() });
}
export function updateCourse(id, updates) {
  return updateDoc(doc(db, "courses", id), updates);
}
export function deleteCourse(id) {
  return deleteDoc(doc(db, "courses", id));
}

/**
 * Module Courses – UI
 */
export function initCourses() {
  const form   = document.getElementById('course-form');
  const input  = document.getElementById('course-input');
  const list   = document.getElementById('course-list');
  const btnExp = document.getElementById('export-courses');

  subscribeCourses(items => {
    list.innerHTML = "";
    items.forEach(renderItem);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    addCourse({ text, done: false }).then(() => input.value = "");
  });

  btnExp.addEventListener('click', () => {
    subscribeCourses(items => {
      if (!items.length) return alert('Rien à exporter');
      const header = 'id,texte,fait';
      const rows = items.map(i => `${i.id},"${i.text}",${i.done}`);
      const csv = [header, ...rows].join('\n');
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      a.download = 'courses.csv';
      a.click();
    });
  });

  function renderItem(i) {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    if (i.done) li.classList.add('checked');
    li.innerHTML = `
      <span>${i.text}</span>
      <div>
        <button class="btn btn-sm btn-outline-success me-1">✓</button>
        <button class="btn btn-sm btn-outline-danger">❌</button>
      </div>
    `;
    const [btnDone, btnDel] = li.querySelectorAll('button');
    btnDone.onclick = () => updateCourse(i.id, { done: !i.done });
    btnDel.onclick  = () => deleteCourse(i.id);
    list.appendChild(li);
  }
}
