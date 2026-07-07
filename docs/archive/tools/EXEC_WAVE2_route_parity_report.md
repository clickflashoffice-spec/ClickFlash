# Express vs Worker Route Parity Report

## Express Routes (Archived)


### controllers (3 routes)

- `GET` `dbManager` (docs\archive\backends\gallery\controllers\collectionController.js)
- `GET` `logger` (docs\archive\backends\gallery\controllers\collectionController.js)
- `GET` `auditLogger` (docs\archive\backends\gallery\controllers\collectionController.js)

### middleware (1 routes)

- `GET` `auditLogger` (docs\archive\backends\gallery\middleware\auth.js)

## Worker Routes (Current)


## Gap Analysis

### Routes ONLY in Express (NOT in Worker): 3

- [ ] `GET auditLogger`
- [ ] `GET dbManager`
- [ ] `GET logger`

### Routes ONLY in Worker (NEW): 0
