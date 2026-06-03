import type { Project, Task, Note, ChatMessage } from "./types";

const STORAGE_KEYS = {
  projects: "pm_projects",
  tasks: "pm_tasks",
  notes: "pm_notes",
  messages: "pm_messages",
};

function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export const projectStorage = {
  getAll(): Project[] {
    return getItem<Project[]>(STORAGE_KEYS.projects, []);
  },
  getById(id: string): Project | undefined {
    return this.getAll().find((p) => p.id === id);
  },
  create(project: Omit<Project, "id" | "createdAt" | "updatedAt">): Project {
    const projects = this.getAll();
    const newProject: Project = {
      ...project,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.projects, [...projects, newProject]);
    return newProject;
  },
  update(id: string, updates: Partial<Project>): Project | undefined {
    const projects = this.getAll();
    const idx = projects.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    projects[idx] = { ...projects[idx], ...updates, updatedAt: new Date().toISOString() };
    setItem(STORAGE_KEYS.projects, projects);
    return projects[idx];
  },
  delete(id: string): void {
    const projects = this.getAll().filter((p) => p.id !== id);
    setItem(STORAGE_KEYS.projects, projects);
    taskStorage.deleteByProject(id);
    noteStorage.deleteByProject(id);
    messageStorage.deleteByProject(id);
  },
};

export const taskStorage = {
  getAll(): Task[] {
    return getItem<Task[]>(STORAGE_KEYS.tasks, []);
  },
  getByProject(projectId: string): Task[] {
    return this.getAll().filter((t) => t.projectId === projectId);
  },
  create(task: Omit<Task, "id" | "createdAt">): Task {
    const tasks = this.getAll();
    const newTask: Task = {
      ...task,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.tasks, [...tasks, newTask]);
    return newTask;
  },
  update(id: string, updates: Partial<Task>): Task | undefined {
    const tasks = this.getAll();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;
    tasks[idx] = { ...tasks[idx], ...updates };
    setItem(STORAGE_KEYS.tasks, tasks);
    return tasks[idx];
  },
  delete(id: string): void {
    const tasks = this.getAll().filter((t) => t.id !== id);
    setItem(STORAGE_KEYS.tasks, tasks);
  },
  deleteByProject(projectId: string): void {
    const tasks = this.getAll().filter((t) => t.projectId !== projectId);
    setItem(STORAGE_KEYS.tasks, tasks);
  },
};

export const noteStorage = {
  getAll(): Note[] {
    return getItem<Note[]>(STORAGE_KEYS.notes, []);
  },
  getByProject(projectId: string): Note[] {
    return this.getAll().filter((n) => n.projectId === projectId);
  },
  create(note: Omit<Note, "id" | "createdAt" | "updatedAt">): Note {
    const notes = this.getAll();
    const newNote: Note = {
      ...note,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.notes, [...notes, newNote]);
    return newNote;
  },
  update(id: string, updates: Partial<Note>): Note | undefined {
    const notes = this.getAll();
    const idx = notes.findIndex((n) => n.id === id);
    if (idx === -1) return undefined;
    notes[idx] = { ...notes[idx], ...updates, updatedAt: new Date().toISOString() };
    setItem(STORAGE_KEYS.notes, notes);
    return notes[idx];
  },
  delete(id: string): void {
    const notes = this.getAll().filter((n) => n.id !== id);
    setItem(STORAGE_KEYS.notes, notes);
  },
  deleteByProject(projectId: string): void {
    const notes = this.getAll().filter((n) => n.projectId !== projectId);
    setItem(STORAGE_KEYS.notes, notes);
  },
};

export const messageStorage = {
  getAll(): ChatMessage[] {
    return getItem<ChatMessage[]>(STORAGE_KEYS.messages, []);
  },
  getByProject(projectId: string): ChatMessage[] {
    return this.getAll().filter((m) => m.projectId === projectId);
  },
  create(message: Omit<ChatMessage, "id" | "createdAt">): ChatMessage {
    const messages = this.getAll();
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.messages, [...messages, newMessage]);
    return newMessage;
  },
  deleteByProject(projectId: string): void {
    const messages = this.getAll().filter((m) => m.projectId !== projectId);
    setItem(STORAGE_KEYS.messages, messages);
  },
};
