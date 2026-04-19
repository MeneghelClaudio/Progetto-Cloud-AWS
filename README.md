TEMPLATE RELAZIONE:
- struttura progetto: 6 container (frontend, backend, db-init, db-reset, storia-del-corso, gestione-emergenze)
- accesso tramite dns alb: syam-meneghel-prog-cloud-aws-alb-913263589.eu-west-1.elb.amazonaws.com
- servizi AWS:
    - EC2 (syam-meneghel-progetto-cloud-aws-ec2 -> istanza con docker-compose originale)
    - RDS (syam-meneghel-progetto-cloud-aws-db -> database mysql con utenti+dati -> usr: syam_meneghel, pwd: meneghel_password, db: dashboard_db, endpoint: syam-meneghel-progetto-cloud-aws-db.c9nj1x2p6gk5.eu-west-1.rds.amazonaws.com)
    - security groups:
        - EC2 (syam-meneghel-progetto-cloud-aws-sg-ec2 -> in-out 22 80, out all-tcp)
        + ALTERNATIVA: security group RDS (syam-meneghel-progetto-cloud-aws-sg-rds -> in 3306 con security group EC2) con aggiunta di peering connection tra ec2 e rds! (documentazione)
        - ALB (syam-meneghel-progetto-cloud-aws-sg-alb -> in 80, out all (default))
        - modifica EC2 -> inbound, su 80 mettere sg-alb come source!
    - keypair (syam-meneghel-progetto-cloud-aws-keypair.pem)
    - ECR (repository: 240595528763.dkr.ecr.eu-west-1.amazonaws.com/syam/meneghel-progetto-cloud-aws, 6 immagini divise per tag: frontend, backend, db-init, db-reset, storia-del-corso, gestione-emergenze, cambiato il docker compose con le reference alle immagini pubblicate in ECR)
    - S3 (syam-meneghel-progetto-cloud-aws-s3, bucket s3 con accesso pubblico con all'interno il file docker-compose.yml utilizzato dalle EC2 per fare il build dei container, donwload del file da S3 con: aws s3 cp s3://syam-meneghel-progetto-cloud-aws-s3/docker-compose.yml Progetto-Cloud-AWS/)
    - AWS CLI + IAM (installato AWS CLI v2 su ec2 di base, poi configure con credenziali IAM)
    - AMI (syam-meneghel-progetto-cloud-aws-ami)
    - LT, launch template (syam-meneghel-progetto-cloud-aws-lt, con security group syam-meneghel-progetto-cloud-aws-sg-ec2 e keypair syam-meneghel-progetto-cloud-aws-keypair.pem)
    - TG, target group (instances, syam-meneghel-prog-cloud-aws-tg, HTTP 80, vpc default, nessun target registrato, attivato stickiness con cookie del load balancer x evitare problema loop di login con 2 istanze!)
    - ALB (application load balancer, syam-meneghel-prog-cloud-aws-alb, vpc default con 2 zone, security group syam-meneghel-progetto-cloud-aws-sg-alb (non sg-ec2!), HTTP 80 con target group syam-meneghel-prog-cloud-aws-tg)
    - ASG (syam-meneghel-progetto-cloud-aws-asg, launch template syam-meneghel-progetto-cloud-aws-lt, vpc default con 2 az, balanced best effort, load balancer con target group syam-meneghel-prog-cloud-aws-tg, group size: desired=1 min=1 max=2)
        - per test di creazione di istanze, cambiare i valori (desired-min-max) da (1-1-2) a (2-1-3)!
- ottenere posizione del dispositivo x creare segnalazione: NON FUNZIONA su http, funziona solo su https o localhost, quindi servirebbe un dominio o altre soluzioni (documentazione) + compilazione automatica delle informazioni luogo in base alla posizione non funziona sempre per https/localhost (documentazione)
- script "user data" x launch template (file: script_user_data_lt.sh):
    - comando di debug dei log: cat /var/log/user-data.log
- per resettare il db:
    - cd app
    - sudo docker-compose run --rm db-reset

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
- test fix layout storia-del-corso (mobile) e gestione-emergenze (desktop)
- rimosso qualunque layout mobile, test fix gestione-emergenze x desktop
- test 2 fix gestione-emergenze x desktop
- test 3 fix gestione-emergenze x desktop
- versione finale (fix gestione-emergenze x desktop)
- update docker compose con riferimento alle immagini docker pushate in AWS ECR, update readme (template documentazione)
- versione finale con tutti i servizi AWS implementati, update readme (documentazione)
- update readme (documentazione)