export const state = () => ({
  //Don't forget to add new state objects to the module's CLEAR_ALL!
  notes: []
});

export const getters = {
  allNotes(state, getters) {
    return state.notes;
  },
  notesOf: (state, getters) => subject => {
    return state.notes.filter(note => {
      if (Array.isArray(note)) return false;
      return note.subject.slug === subject;
    });
  },
  note: (state, getters) => (subject, filename) => {
    let note = getters
      .notesOf(subject)
      .filter(note => note.slug === `${subject.slug}--${filename}`);
    if (note.length) return note[0];
    return null;
  },
  noteByUUID: (state, getters) => uuid => {
    return state.notes.find(n => n.uuid === uuid);
  }
};

export const mutations = {
  CLEAR_ALL(state) {
    state.notes = [];
  },
  SET_NOTES(state, notes) {
    if (notes) {
      state.notes = notes;
    } else {
      console.error(`Mutation aborted: given \`notes\` is falsey`);
    }
  },
  ADD_NOTE(state, note) {
    state.notes.push(note);
  },
  DELETE_NOTE(state, uuid) {
    state.notes = state.notes.filter(n => n.uuid !== uuid);
  },
  SET_NOTE_PROGRESS(state, args) {
    let progress = args.progress;
    let uuid = args.uuid;
    if (
      progress === "?" ||
      isNaN(progress) ||
      progress === null ||
      progress === -1
    ) {
      progress = null;
    }
    if (progress !== null && (progress > 1 || progress < 1)) {
      console.warn(`Progress is outside range (${progress}). Clamping value`);
      progress = progress > 1 ? 1 : 0;
    }

    let note = state.notes.find(n => n.uuid === uuid);
    if (!note) {
      console.error(
        `SET_NOTE_PROGRESS: Note with UUID "${uuid}" not found in the state.`
      );
    } else {
      note.learn = progress;
      state.notes = state.notes.filter(n => n.uuid !== uuid);
      state.notes.push(note);
    }
  },
  UPDATE_NOTE(state, { uuid, data }) {
    let note = state.notes.find(n => n.uuid === uuid);
    Object.assign(note, data);
    state.notes = state.notes.filter(n => n.uuid !== uuid);
    state.notes.push(note);
  }
};

export const actions = {};
