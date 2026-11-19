export type ReportPhoto = {
  id: string;
  eventId: string;
  name: string;
  caption: string | null;
  blob: Blob;
  width: number;
  height: number;
  order: number;
};

const DATABASE_NAME = "eventscribe-presentation-media";
const STORE_NAME = "photos";

function openPhotoDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Photo storage is unavailable in this browser."));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" }).createIndex("eventId", "eventId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Photo storage could not be opened."));
  });
}

function preparedPhoto(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error(`Could not process ${file.name}.`));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve({ blob, width, height }) : reject(new Error(`Could not process ${file.name}.`)),
        "image/jpeg",
        0.82,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}. Please choose a valid image.`));
    };
    image.src = url;
  });
}

export async function savePresentationPhoto(eventId: string, file: File, caption?: string): Promise<void> {
  const prepared = await preparedPhoto(file);
  const existing = await getPresentationPhotos(eventId);
  const database = await openPhotoDatabase();
  try {
    const photo: ReportPhoto = {
      id: crypto.randomUUID(),
      eventId,
      name: file.name,
      caption: caption?.trim() || null,
      blob: prepared.blob,
      width: prepared.width,
      height: prepared.height,
      order: existing.length,
    };
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(photo);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("The photo could not be saved."));
      transaction.onabort = () => reject(transaction.error ?? new Error("The photo could not be saved."));
    });
  } finally {
    database.close();
  }
}

export async function getPresentationPhotos(eventId: string): Promise<ReportPhoto[]> {
  const database = await openPhotoDatabase();
  try {
    return await new Promise<ReportPhoto[]>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readonly")
        .objectStore(STORE_NAME)
        .index("eventId")
        .getAll(eventId);
      request.onsuccess = () => resolve((request.result as ReportPhoto[]).sort((a, b) => a.order - b.order));
      request.onerror = () => reject(request.error ?? new Error("The photos could not be loaded."));
    });
  } finally {
    database.close();
  }
}

export async function deletePresentationPhotos(eventId: string): Promise<void> {
  const photos = await getPresentationPhotos(eventId);
  if (!photos.length) return;
  const database = await openPhotoDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      for (const photo of photos) store.delete(photo.id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("The photos could not be deleted."));
      transaction.onabort = () => reject(transaction.error ?? new Error("The photos could not be deleted."));
    });
  } finally {
    database.close();
  }
}
