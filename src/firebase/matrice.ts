// ─── Matrice des rôles — Firestore-backed CRUD ──────────────────────
// Collections: matriceRoles/{id}, matriceTasks/{id} (flat, no subcollection).
// Pure helpers and types are re-exported from mockMatrice so callers
// can import everything from one place.

import {
  collection, doc,
  getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Re-export pure helpers + types ────────────────────────────────────
export type {
  MatriceRole,
  MatriceTask,
  RoleCategory,
  RaciMark,
  DepEdge,
  PersonSummary,
} from './mockMatrice';

export {
  computeDependencies,
  topDependenciesFor,
  listPeople,
  findPersonBySlug,
  slugify,
} from './mockMatrice';

import type { MatriceRole, MatriceTask, RaciMark } from './mockMatrice';

// MARK_WEIGHT is not exported from mockMatrice, so we redeclare here with the same values.
export const MARK_WEIGHT: Record<RaciMark, number> = { R: 3, A: 3, C: 2, I: 1 };

// ── Collection handles ────────────────────────────────────────────────
const ROLES_COL = 'matriceRoles';
const TASKS_COL = 'matriceTasks';

// ── Reads ─────────────────────────────────────────────────────────────

export async function listMatriceRoles(): Promise<MatriceRole[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, ROLES_COL));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatriceRole));
  } catch (err) {
    console.warn('[matrice] listMatriceRoles failed:', err);
    return [];
  }
}

export async function listMatriceTasks(): Promise<MatriceTask[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, TASKS_COL), orderBy('order')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MatriceTask));
  } catch (err) {
    console.warn('[matrice] listMatriceTasks failed:', err);
    return [];
  }
}

// ── Role mutations ────────────────────────────────────────────────────

export async function addRole(role: Omit<MatriceRole, 'id'>): Promise<MatriceRole> {
  if (!db) throw new Error('[matrice] Firebase not configured');
  const ref = await addDoc(collection(db, ROLES_COL), role);
  return { ...role, id: ref.id };
}

export async function updateRoleHolder(roleId: string, holder: string): Promise<void> {
  if (!db) throw new Error('[matrice] Firebase not configured');
  await updateDoc(doc(db, ROLES_COL, roleId), {
    holder: holder.trim() || 'TBD',
  });
}

export async function deleteRole(roleId: string): Promise<void> {
  if (!db) throw new Error('[matrice] Firebase not configured');
  // Cascade-delete all tasks belonging to this role in one batch.
  const tasksSnap = await getDocs(
    query(collection(db, TASKS_COL), where('roleId', '==', roleId)),
  );
  const batch = writeBatch(db);
  tasksSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, ROLES_COL, roleId));
  await batch.commit();
}

// ── Task mutations ────────────────────────────────────────────────────

export async function addTask(roleId: string, label: string): Promise<MatriceTask> {
  if (!db) throw new Error('[matrice] Firebase not configured');
  // Derive order from current sibling count (always append).
  const siblingsSnap = await getDocs(
    query(collection(db, TASKS_COL), where('roleId', '==', roleId)),
  );
  const order = siblingsSnap.size;
  const payload: Omit<MatriceTask, 'id'> = { roleId, label: label.trim(), order };
  const ref = await addDoc(collection(db, TASKS_COL), payload);
  return { ...payload, id: ref.id };
}

export async function deleteTask(taskId: string): Promise<void> {
  if (!db) throw new Error('[matrice] Firebase not configured');
  await deleteDoc(doc(db, TASKS_COL, taskId));
}

export async function renameTask(taskId: string, label: string): Promise<void> {
  if (!db) throw new Error('[matrice] Firebase not configured');
  await updateDoc(doc(db, TASKS_COL, taskId), { label: label.trim() });
}

export async function moveTask(
  taskId: string,
  toRoleId: string,
  toIndex?: number,
): Promise<void> {
  if (!db) throw new Error('[matrice] Firebase not configured');

  // 1. Read the task being moved.
  const taskSnap = await getDocs(
    query(collection(db, TASKS_COL), where('__name__', '==', taskId)),
  );
  // Fallback: fetch all tasks and find the one we want (avoids the
  // __name__ filter which requires a composite index in some SDK versions).
  const allTasksSnap = await getDocs(collection(db, TASKS_COL));
  const allTasks = allTasksSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() } as MatriceTask & { ref: ReturnType<typeof doc> }));

  const movingDoc = allTasksSnap.docs.find((d) => d.id === taskId);
  if (!movingDoc) return;
  const moving = { id: movingDoc.id, ref: movingDoc.ref, ...movingDoc.data() } as MatriceTask & { ref: typeof movingDoc.ref };
  const fromRoleId = moving.roleId;

  // 2. Build sibling lists from the Firestore reads (not from client state).
  const sourceSiblings = allTasks
    .filter((t) => t.id !== taskId && t.roleId === fromRoleId)
    .sort((a, b) => a.order - b.order);

  const targetSiblings = fromRoleId === toRoleId
    ? sourceSiblings
    : allTasks
        .filter((t) => t.id !== taskId && t.roleId === toRoleId)
        .sort((a, b) => a.order - b.order);

  const insertAt =
    toIndex == null || toIndex > targetSiblings.length
      ? targetSiblings.length
      : toIndex;

  targetSiblings.splice(insertAt, 0, { ...moving, roleId: toRoleId, order: insertAt });

  // 3. Commit all order changes + the roleId change atomically.
  const batch = writeBatch(db);

  // Re-order source role siblings (only if different role).
  if (fromRoleId !== toRoleId) {
    sourceSiblings.forEach((t, i) => {
      batch.update(t.ref, { order: i });
    });
  }

  // Re-order target role siblings (includes the moved task at its new slot).
  targetSiblings.forEach((t, i) => {
    const ref = t.id === taskId ? movingDoc.ref : t.ref;
    batch.update(ref, { roleId: toRoleId, order: i });
  });

  await batch.commit();
  void taskSnap; // suppress unused-variable warning
}
