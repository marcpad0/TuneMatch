# TuneMatch
### Un'app che ti connette con persone in base ai tuoi gusti musicali, utilizzando l'intelligenza artificiale.

TuneMatch analizza le tue canzoni preferite per creare abbinamenti con utenti simili. Oltre a trovare nuove connessioni, l’app ti suggerisce brani e artisti in linea con i tuoi gusti e quelli delle persone con cui vieni abbinato, migliorando l’esperienza musicale e sociale.

## Target
Giovani che vogliono connettersi con altri persone tramite la musica.

## Problema
Molte persone non hanno amici con gusti musicali simili o hanno difficoltà a trovare community in cui condividere la propria passione per specifici generi o artisti.

## Competitor
* Tastebuds
* Vampr
* Last.fm
* TikTok
* Jammber

## Tecnologie usate
* GIT
* VUE
* NODEJS

### Esempi di API

#### Login
* Input: `{ "User": "David", "Password": "Davide" }`
* Output: `{ "Name": "David", "Surname": "Borali", "isAdmin": false, "DateOfBirth": "23/12/2006", "Position": "Bergamo", "Id": "787fdsgs37t" }`

#### Message
* Input: `{ "Message": "<message>", "Date": "23/12/2024" }`
* Output: `{ "Message": "<other user response>", "Date": "23/12/2024" }`

#### Liked
* Input: `{ "Id": "787fdsgs37t" }`
* Output: `{ "like": [ "all stars" ] }`

## Requisiti
Connessione all'Account Spotify

* Permetti agli utenti di collegare il proprio account Spotify per accedere facilmente alla loro libreria musicale e alle playlist.

Interazione tramite Messaggi e Profilo

* Consenti agli utenti di relazionarsi tra loro attraverso messaggi diretti e la creazione di profili personalizzati, dove possono condividere i propri gusti musicali e scoprire nuovi amici con interessi simili.

Classifica dei Brani Preferiti

* Implementa un sistema di classificazione dei brani preferiti basato su ""like"" e sul genere musicale. Gli utenti possono esprimere le loro preferenze e ricevere raccomandazioni personalizzate in base ai loro ascolti.

Login/Registrazione

* Rendi il processo di login e registrazione semplice e intuitivo. Offri opzioni di accesso tramite email, social media e, naturalmente, Spotify, per facilitare l'ingresso nell'app.

## Requisiti Funzionali

### 1. Connessione all'Account Spotify
Gli utenti possono collegare il proprio account Spotify per accedere alla loro libreria musicale e alle playlist.

### 2. Interazione tramite Messaggi e Profilo
* Gli utenti possono inviare messaggi diretti tra di loro.
* Gli utenti possono creare profili personalizzati.
* Gli utenti possono condividere gusti musicali e connettersi con altri utenti con interessi simili.

### 3. Classifica dei Brani Preferiti
* Gli utenti possono esprimere le loro preferenze sui brani tramite un sistema di "like".
* Il sistema categorizza i brani in base al genere musicale.
* Gli utenti ricevono raccomandazioni personalizzate in base ai loro ascolti.

### 4. Login/Registrazione
* Gli utenti possono registrarsi tramite email, social media e Spotify.
* Il processo di login deve essere semplice e intuitivo.

## Requisiti Non Funzionali

### 1. Usabilità
L'interfaccia deve essere intuitiva e facile da navigare.

### 2. Sicurezza
I dati degli utenti devono essere protetti, specialmente durante il processo di login e la gestione delle informazioni personali.

### 3. Prestazioni
L'app deve caricarsi rapidamente e gestire le interazioni in tempo reale senza ritardi significativi.

### 4. Scalabilità
L'app deve essere in grado di gestire un numero crescente di utenti e interazioni senza compromettere le prestazioni.

### 5. Compatibilità
L'app deve essere compatibile con diverse piattaforme (iOS, Android, web).

## Requisiti di Dominio

### 1. Gestione della Musica
Deve supportare l'integrazione con il servizio di streaming musicale di Spotify, gestendo l'accesso alla libreria musicale e alle playlist.

### 2. Social Networking
Deve permettere interazioni sociali tra gli utenti, inclusa la creazione di reti e connessioni basate su interessi musicali comuni.

## Casi d'uso

![YUML](aa67cf3b.jpg)
