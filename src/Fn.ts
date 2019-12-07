export function applyWhenNot(predicate: () => boolean, f: () => void): () => boolean {
  return (): boolean => {
    if (!predicate()) {
      f();
      return false;
    }
    return true;
  };
}

export function when<T>(predicate: (x: T) => boolean, f: (x: T) => T): (x: T) => T {
  return (x): T => predicate(x) ? f(x) : x;
}

export const when2 = <T>(predicate: (x: T) => boolean, f: (x: T) => T): (x: T) => T => {
  return (x): T => predicate(x) ? f(x) : x;
}

export function wtfWrap<T>(f: (x: T) => void): (x: T) => T {
  return (x): T => {
    f(x);
    return x;
  }
}

export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
