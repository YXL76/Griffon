export class RingBuffer<T> {
  readonly #capacity: number;

  readonly #buffer: (T | undefined)[];

  #first = 0;

  #length = 0;

  constructor(capacity: number) {
    this.#capacity = capacity;
    this.#buffer = new Array(capacity) as T[];
  }

  clear() {
    this.#buffer.fill(undefined);
    this.#first = 0;
    this.#length = 0;
  }

  empty() {
    return this.#length === 0;
  }

  full() {
    return this.#length === this.#capacity;
  }

  last() {
    if (this.#length === 0) return undefined;
    return this.#buffer[this.#last()];
  }

  front() {
    if (this.#length === 0) return undefined;
    return this.#buffer[this.#first];
  }

  push(value: T) {
    if (this.full()) this.shift();
    this.#length++;
    this.#buffer[this.#last()] = value;
    return this.#length;
  }

  pop() {
    if (this.#length === 0) return undefined;
    const last = this.#last();
    const value = this.#buffer[last];
    this.#buffer[last] = undefined;
    this.#length--;
    return value;
  }

  shift() {
    if (this.#length === 0) return undefined;
    const value = this.#buffer[this.#first];
    this.#buffer[this.#first] = undefined;
    this.#length--;
    if (++this.#first > this.#capacity - 1) this.#first = 0;
    return value;
  }

  unshift(value: T) {
    if (this.full()) this.pop();
    if (--this.#first < 0) this.#first = this.#capacity - 1;
    this.#length++;
    this.#buffer[this.#first] = value;
    return this.#length;
  }

  *[Symbol.iterator]() {
    let index = this.#first;
    for (let i = 0; i < this.#length; ++i) {
      yield this.#buffer[index++] as T;
      if (index > this.#capacity - 1) index = 0;
    }
  }

  #last() {
    const index = this.#first + (this.#length - 1);
    return index > this.#capacity - 1 ? index - this.#capacity : index;
  }
}
