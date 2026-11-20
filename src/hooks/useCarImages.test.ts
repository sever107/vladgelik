// @vitest-environment jsdom
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCarImages } from './useCarImages';

const stored = new Map<string, Blob>();
const roots = new Set<Root>();
const writes = vi.fn((file: Blob, id: string) => stored.set(id, file));
const createObjectURL = vi.fn((_blob: Blob) => `blob:test-${createObjectURL.mock.calls.length}`);
const revokeObjectURL = vi.fn();
const bitmap = () => ({ width: 1024, height: 768, close: vi.fn() }) as unknown as ImageBitmap;

// Model asynchronous IDB reads/writes; all transactions share one persisted map.
const database = {
  transaction: () => {
    const transaction = {
      oncomplete: null as (() => void) | null,
      objectStore: () => ({
        get: (id: string) => {
          const request = { result: undefined as Blob | undefined, onsuccess: null as (() => void) | null };
          queueMicrotask(() => { request.result = stored.get(id); request.onsuccess?.(); });
          return request;
        },
        put: writes,
      }),
    };
    queueMicrotask(() => queueMicrotask(() => transaction.oncomplete?.()));
    return transaction;
  },
};

async function mountImages() {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.add(root);
  let current!: ReturnType<typeof useCarImages>;
  function Harness() {
    current = useCarImages();
    return null;
  }
  await act(async () => { root.render(createElement(StrictMode, null, createElement(Harness))); });
  return {
    get current() { return current; },
    unmount() {
      act(() => root.unmount());
      roots.delete(root);
      container.remove();
    },
  };
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  stored.clear();
  writes.mockClear();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL }));
  vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap()));
  vi.stubGlobal('indexedDB', {
    open: () => {
      const request = { result: database, onsuccess: null as (() => void) | null };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  });
});

afterEach(() => {
  act(() => { for (const root of roots) root.unmount(); });
  roots.clear();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('uploaded photograph lifecycle', () => {
  it('creates each URL once under StrictMode and releases loaded and uploaded URLs', async () => {
    stored.set('gclass', new Blob(['old'], { type: 'image/png' }));
    const images = await mountImages();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const initialUrl = images.current.images.gclass;
    const file = new File(['new'], 'gclass.png', { type: 'image/png' });
    await act(async () => { await images.current.uploadImage('gclass', file); });
    expect(createObjectURL).toHaveBeenCalledTimes(2);
    expect(revokeObjectURL.mock.calls).toEqual([[initialUrl]]);
    const uploadedUrl = images.current.images.gclass;
    images.unmount();
    expect(revokeObjectURL.mock.calls).toEqual([[initialUrl], [uploadedUrl]]);
  });

  it('keeps the latest choice when an earlier image finishes decoding last', async () => {
    let finishEarlier!: (value: ImageBitmap) => void;
    const earlierDecode = new Promise<ImageBitmap>(resolve => { finishEarlier = resolve; });
    const first = new File(['first'], 'earlier.png', { type: 'image/png' });
    const latest = new File(['latest'], 'latest.png', { type: 'image/png' });
    vi.stubGlobal('createImageBitmap', vi.fn((file: File) => file === first ? earlierDecode : Promise.resolve(bitmap())));
    const images = await mountImages();
    let pendingEarlier!: Promise<void>;
    act(() => { pendingEarlier = images.current.uploadImage('gclass', first); });
    await act(async () => { await images.current.uploadImage('gclass', latest); });
    const selectedUrl = images.current.images.gclass;
    await act(async () => { finishEarlier(bitmap()); await pendingEarlier; });
    expect(images.current.images.gclass).toBe(selectedUrl);
    expect(stored.get('gclass')).toBe(latest);
    expect(writes).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('does not allocate a URL or write after an upload outlives its hook', async () => {
    let finishDecode!: (value: ImageBitmap) => void;
    vi.stubGlobal('createImageBitmap', vi.fn(() => new Promise<ImageBitmap>(resolve => { finishDecode = resolve; })));
    const images = await mountImages();
    let upload!: Promise<void>;
    act(() => { upload = images.current.uploadImage('lamborghini', new File(['png'], 'car.png', { type: 'image/png' })); });
    images.unmount();
    await act(async () => { finishDecode(bitmap()); await upload; });
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(writes).not.toHaveBeenCalled();
  });

  it('never exposes native English decode errors while retaining authored validation text', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new DOMException('The source image could not be decoded.'); }));
    const images = await mountImages();
    await act(async () => { await images.current.uploadImage('gclass', new File(['bad'], 'bad.png', { type: 'image/png' })); });
    expect(images.current.imageError).toBe('Не удалось загрузить фотографию. Проверьте PNG и повторите попытку.');
    await act(async () => { await images.current.uploadImage('gclass', new File(['jpg'], 'car.jpg', { type: 'image/jpeg' })); });
    expect(images.current.imageError).toBe('Выберите фотографию в формате PNG.');
  });
});
