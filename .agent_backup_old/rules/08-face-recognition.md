# Face Recognition Architecture (Updated)

> **Law 03**: Touch performs local face indexing and search for customer photos. Master-App face recognition is limited to Photographer Login only.

---

## Architecture Overview

### Master-App: Photographer Face Login

Master-App uses face recognition exclusively for security and workflow authentication.

- **Photographer Login**: Authenticate photographers at the station using webcam input.
- **Worker Management**: Parallel CPU tasks managed via the unified `WorkerPool`.
- **Exclusion**: Master **does not** index customer photos for face search. This preserves CPU for high-volume 100GB+ photo processing and cloud sync.

### Touch-App: Customer Face Search

Touch-App is the primary engine for customer-facing AI features.

- **Local Indexing**: Analyze photos locally upon import to build search descriptors.
- **Localized Search**: Query face recognition on displayed photos for selection.
- **Privacy First**: All searching and indexing happens 100% offline on the kiosk hardware.

---

## Master-App Implementation details

### Photographer Face Enrollment

Photographers are enrolled in the Management Hub or during their first login on Master.

```typescript
// faceService.ts (Master-App)
public async enrollPhotographer(imagePath: string, photographerId: string) {
  const analysis = await this.pool.run({
    type: "analyze",
    path: imagePath
  });

  if (analysis.faces.length > 0) {
    const descriptor = analysis.faces[0].descriptor;
    await this.db.run(
      "UPDATE photographers SET face_descriptor = ? WHERE id = ?",
      [JSON.stringify(descriptor), photographerId]
    );
  }
}
```

### Authentication Flow

Comparing webcam frames against the stored photographer descriptor.

---

## Touch-App Implementation details

### Background Indexing

Touch-App monitors its `uploads` folder and indexes incoming albums.

```javascript
// faceMonitor.js (Touch-App)
async function indexAlbum(albumPath) {
  const photos = await fs.promises.readdir(path.join(albumPath, "highres"));
  for (const photo of photos) {
    const descriptors = await detectFaces(
      path.join(albumPath, "highres", photo),
    );
    await saveDescriptors(photo, descriptors);
  }
}
```

---

## Summary of Changes

| Task               | Master-App                | Touch-App             |
| ------------------ | ------------------------- | --------------------- |
| **Photo Indexing** | ❌ Disabled               | ✅ Enabled (Local)    |
| **Face Search**    | ❌ Disabled               | ✅ Enabled (Customer) |
| **Login Security** | ✅ Enabled (Photographer) | ❌ N/A                |
| **Hardware Use**   | Priority: IO & Process    | Priority: UI & Search |

**Key Principle**: By removing face indexing from Master, we ensure zero bottlenecks during massive photo imports (>100GB), delegating the search burden to the distributed Touch kiosks.
