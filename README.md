TODO:
- utilizzare auto scaling group ASG (AMI, launch template, TG, ALB)
- pubblicare immagini docker su ECR (modificare docker compose?)

-------------------------------------------------------------------------------------------------------------------

TEMPLATE RELAZIONE:
- struttura progetto: 6 container (frontend, backend, db-init, db-reset, storia-del-corso, gestione-emergenze)
- servizi AWS:
    - EC2 (syam-meneghel-progetto-cloud-aws-ec2 -> istanza con docker-compose originale)
    - RDS (syam-meneghel-progetto-cloud-aws-db -> database mysql con utenti+dati -> usr: syam_meneghel, pwd: meneghel_password, db: dashboard_db, endpoint: syam-meneghel-progetto-cloud-aws-db.c9nj1x2p6gk5.eu-west-1.rds.amazonaws.com)
    - security groups: EC2 (syam-meneghel-progetto-cloud-aws-sg-ec2 -> in-out 22 80, out all-tcp)
        + ALTERNATIVA: security group RDS (syam-meneghel-progetto-cloud-aws-sg-rds -> in 3306 con security group EC2) con aggiunta di peering connection tra ec2 e rds! (documentazione)
    - keypair (syam-meneghel-progetto-cloud-aws-keypair.pem)
    - AMI
    - launch template
    - target group
    - ALB
    - ASG
    - ECR
- ottenere posizione del dispositivo x creare segnalazione: NON FUNZIONA su http, funziona solo su https o localhost, quindi servirebbe un dominio o altre soluzioni (documentazione) + compilazione automatica delle informazioni luogo in base alla posizione non funziona sempre per https/localhost (documentazione)

-------------------------------------------------------------------------------------------------------------------

TRACCIA:
# Progetto Cloud AWS

# Obiettivo del progetto
Creare un’interfaccia web protetta da login e accessibile a internet che permetta di accedere
a diversi servizi tramite dei bottoni

## Tecnologie da utilizzare
Utilizzare tutti i servizi AWS necessari per esporre la webapp, mantenendo il focus su
scalabilità e sicurezza.
Per i linguaggi di programmazione frontend e backend c’è completa libertà.
È fortemente consigliato l’utilizzo di container per il deploy delle app.
Se siete familiari a git, utilizzare GitHub, GitLab o altri per condividere il codice con i
compagni.
Servizi

# 1 - Storia del corso
Creare una pagina con una linea del tempo dinamica, con un nodo per ogni mese.
La linea del tempo deve partire da quando è iniziato il corso e concludersi alla fine di questo
anno.
Puntando il mouse su ogni nodo, si deve aprire un fumetto con l’elenco delle materie e
tecnologie scoperte durante le lezioni.

# 2 - Gestione Emergenze
Creare una webapp che prenda in carico e gestisca segnalazioni di emergenza.
## Visualizzazione operatore
Ogni operatore è in grado di creare una segnalazione (da cellulare) contenente:
- Tipologia di emergenza (incidente, terremoto, incendio, ...)
- Descrizione dell’emergenza
- Condivisione della posizione (dati veri di geolocalizzazione o simulati)
- Stato della segnalazione (aperta, in carico, annullata, chiusa)
- Eventuali altri campi se ritenuti necessari
## Visualizzazione centrale operativa
La sede centrale (da PC) visualizza in tempo reale la creazione di nuove richieste e può
interagirci cambiando lo stato delle richieste.
Creare una dashboard con i seguenti valori:
- Numero di segnalazioni aperte e in carico
- Numero di segnalazioni chiuse
- Durata media di una segnalazione da apertura a chiusura
- Mappa con dei punti colorati per ogni richiesta non chiusa e non annullata (rosso =
aperta, blu = in carico)
- Altri grafici a scelta se li tenete pertinenti
Simulare picchi di traffico sulla piattaforma, eseguendo chiamate api al sito tramite script o
con il software Locust
## Tecnologie da utilizzare
Sfruttare un database RDS (lo stesso degli altri progetti) per la gestione del DB
Containerizzare l’app con Docker e Docker Compose.
Sfruttare l’auto scaling group per creare nuove istanze se l’applicazione va sotto stress
(simulazione di carico). Predisporre una AMI per non dover eseguire alcuna procedura
manuale sulle VM istanziate dal ASG.

-------------------------------------------------------------------------------------------------------------------

### COMMIT FATTI:
- storia del corso + gitignore
- dashboard, modifiche storia del corso, docker compose
- modifiche file data.json
- test fix nginx frontend
- test fix path troncato storia del corso
- fix lettura file data.json
- test fix path storia-del-corso
- test 2 fix path storia-del-corso
- fix visualizzazione info data.json
- fix altezza linea e nodi in storia-del-corso
- test fix altezza nodi in storia-del-corso
- test fix timeline e nodi storia-del-corso
- test 2 fix timeline e nodi storia-del-corso
- rimosso gitignore, aggiunte chiavi ssh, aggiunto todo
- predisposizione utilizzo RDS, cambiata keypair, no TODO ma README (todo, template relazione, traccia)
- implementato gestione-emergenze
- repository da privata a pubblica, gitignore per chiavi ssh
- update readme
- fix+update readme
- fix docker-compose (path data.json storia-del-corso)
- test fix login
- fix dashboard login css, test fix login admin
- test fix css
- cambio struttura file progetto, test fix css gestione-emergenze
- test fix redirect index -> login
- fix paths, aggiunto button back in storia-del-corso
- test fix loop nginx (login)
- test fix completo
- test fix nginx dashboard
- test 2 fix completo
- test 3 fix completo
- fix dashboard css + pannello gestione utenti, bottone back in storia-del-corso
- fix messaggio registrati
- test fix messaggio registrati
- test 2 fix messaggio registrati
- test 3 fix messaggio registrati
- fix messaggio registrati
- allineamento git, update readme
- update readme
- test fix visualizzazione mappa gestione-emergenze
- fix gestione-emergenze visualizzazione mappa e test posizione
- update readme (problema posizione in http), test fix connessione db per gestione-emergenze
- aggiunta superadmin (admin), modifiche db gestione-emergenze, test fix connessione db gestione-emergenze, update readme
- update readme (fix da fare)
- test fix db per gestione-emergenze + mappa vista centrale operativa
- update readme (ancora problemi db...)
- test 2 fix db per gestione-emergenze
- update readme (minor fixes)
- rinominato admin e superadmin in root, update readme (reset db)
- test reset db, test utente root (new)
- test fix layout pagine html mobile e desktop
- fix layout pagine, update readme (per AWS)
- fix testo in gestione-emergenze (vista gestione operativa)
- fix warning style.css in gestione-emergenze
- update readme (lista commit)
- cambiata struttura cartelle (db-init e db-reset separati), update docker compose, update readme (AWS)
- aggiunto informazioni luogo in gestione-emergenze come campo opzionale che si auto compila tramite posizione/mappa
- fix docker compose, informazioni luogo in gestione-emergenze
- fix layout gestione-emergenze, tolta compilazione automatica informazioni luogo per posizione (https/localhost), rimesso layout mobile e fix linea storia-del-corso (mobile)