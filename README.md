TODO:
- modificare html storia-del-corso per posizionare meglio timeline+nodi
- servizio 2 (gestione-emergenze) - utilizzare auto scaling group
- modificare utenti con i permessi
- salvare emergenze sullo stesso rds degli utenti
- fare tutto il sito mobile-friendly (soprattutto gestione-emergenze)
- controllo se funziona la posizione del dispositivo x creazione emergenze (da telefono), non utilizzare poisizione EC2...

--------------------------------------------------------------------------------------------------------------------

TEMPLATE RELAZIONE:
- struttura progetto: 5 container (frontend, backend, init-db che inizializza RDS, storia-del-corso, gestione-emergenze)
- servizi AWS:
    - EC2 (syam-meneghel-progetto-cloud-aws-ec2 -> istanza con docker-compose)
    - RDS (syam-meneghel-progetto-cloud-aws-db -> database mysql con utenti+dati -> usr: syam_meneghel, pwd: meneghel_password, db: dashboard_db, endpoint: syam-meneghel-progetto-cloud-aws-db.c9nj1x2p6gk5.eu-west-1.rds.amazonaws.com)
    - security groups: EC2 (syam-meneghel-progetto-cloud-aws-sg-ec2 -> in-out 22 80, out all-tcp)
        + ALTERNATIVA: security group RDS (syam-meneghel-progetto-cloud-aws-sg-rds -> in 3306 con security group EC2) con aggiunta di peering connection tra ec2 e rds!
    - keypair (syam-meneghel-progetto-cloud-aws-keypair.pem)

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
