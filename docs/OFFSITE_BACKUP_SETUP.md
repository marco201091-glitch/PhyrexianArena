# Backup off-site gratuito

Usa un account Google dedicato e un remote `rclone crypt`: il cloud riceve file e nomi cifrati. Google Drive offre fino a 15 GB gratuiti, condivisi con Gmail e Foto; verifica prima lo spazio effettivo dell'account.

## Configurazione una tantum sulla VM

1. Installa rclone con il pacchetto della distribuzione.
2. Esegui `rclone config` e crea un remote Drive, ad esempio `pa-drive`. Su una VM senza browser completa l'autorizzazione OAuth da un computer con browser usando `rclone authorize drive` e incolla il token nella VM.
3. Sempre in `rclone config`, crea un remote `crypt` chiamato `pa-backup-crypt`, con remote sottostante `pa-drive:PhyrexianArenaBackups`; scegli cifratura standard di file e directory e una password lunga unica.
4. Verifica: `rclone lsd pa-backup-crypt:`.
5. Crea `/etc/phyrexian-backup-offsite.env`, permessi `0600 root`, con:

```sh
OFFSITE_RCLONE_DESTINATION=pa-backup-crypt:production
OFFSITE_RETENTION=7
```

6. Installa la nuova `ops/supabase-backup.sh`, eseguila una volta e verifica entrambi i marker:

```sh
sudo /usr/local/sbin/supabase-backup.sh
sudo cat /var/backups/phyrexianarena/last-success
sudo cat /var/backups/phyrexianarena/offsite-last-success
```

7. Controlla dal Drive che i file non siano leggibili e programma un ripristino di prova trimestrale in un database isolato.

Il job fallisce e invia un alert se la copia off-site configurata non riesce. Non impostare l'ambiente off-site finché il remote `crypt` non è stato verificato: senza configurazione il backup locale continua e registra un warning.
