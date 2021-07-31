# API endpoints

## /
- GET: restituisce info sulle API

## /login
- GET: restituisce JWT token (HTTP Basic Authentication)

## /register
- POST: aggiunge utente a database e restituisce JWT token

## /user (???)
- GET: restituisce informazioni sull'utente loggato
- PUT: modifica account utente  (TODO ???)
- DELETE: elimina account utente (???)

## /habits
- GET: restituisce lista habit (default: non archiviati) (query param: filter, skip, limit, [category ?])
- POST: aggiunge habit e lo restituisce

## /habits/:id
- GET: restituisce l'habit con id = :id
- PUT: modifica l'habit con id = :id (query param: archive ???)
- DELETE: elimina l'habit con id = :id

## /habits/:id/history
- GET: restituisce la storia dell'habit
- POST: aggiunge nuova HistoryEntry all'habit

## /habits/:id/history/:hist_id
- PUT: modifica HistoryEntry type
- DELETE: elimina HistoryEntry

## /habits/:id/stats
- GET: restituisce delle statistiche sull'habit

## /categories
- GET: restituisce lista categorie
- POST: aggiunge una categoria ??? (probabilmente non serve)

## /categories/:id (???)
- PUT: modifica categoria (???)
- DELETE: modifica categoria  ??? (probabilmente non serve)
