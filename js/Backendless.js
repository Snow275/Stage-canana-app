const APP_ID = "948A3DAD-06F1-4F45-BECA-A039688312DD";
const REST_KEY = "8C69AAC6-204C-48CE-A60B-137706E8E183";
const BASE_URL = `https://api.backendless.com/${APP_ID}/${REST_KEY}/data`;

export async function getTasks() {
  const res = await fetch(`${BASE_URL}/Taches?sortBy=created%20desc`);
  if (!res.ok) throw new Error("Erreur Backendless GET");
  return res.json();
}

export async function addTask(titre) {
  const res = await fetch(`${BASE_URL}/Taches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titre, fait: false }),
  });
  if (!res.ok) throw new Error("Erreur Backendless POST");
  return res.json();
}

export async function toggleTask(objectId, fait) {
  const res = await fetch(`${BASE_URL}/Taches/${objectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fait }),
  });
  if (!res.ok) throw new Error("Erreur Backendless PATCH");
  return res.json();
}

export async function deleteTask(objectId) {
  const res = await fetch(`${BASE_URL}/Taches/${objectId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erreur Backendless DELETE");
  return true;
}
