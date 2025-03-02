---

draft: false
authors:
  - me
date: 
    created: 2025-02-27
    updated: 2025-02-27
categories:
    - devops
tags:
    - devops
    - digital-skola
    - shell-scripting
    - homework

comments: true

---

# Task Sesi 5: Shell Scripting

!!! info "Project Challange"

    **Deskripsi:**

    Anda adalah seorang DevOps Engineer di sebuah perusahaan yang memiliki banyak file log di
    direktori `/var/logs`. Anda diminta untuk membuat bash script untuk:
    
    - Membuat direktori baru dengan nama `backup_ddmmyyyy` berdasarkan tanggal saat ini.
    - Memindahkan semua file .log dari `/var/logs` ke direktori backup.
    - Membuat arsip zip dari direktori backup.
    - Menampilkan pesan sukses setelah proses selesai.

    ---

    **Tugas Peserta:**
    
    Buat Bash Script berdasarkan langkah di atas. Pastikan script:
    
    - Dapat dijalankan berulang kali tanpa menyebabkan konflik nama direktori.
    - Menangani error, misalnya jika direktori atau file tidak ditemukan.

<!-- more -->

## Project


!!! warning "Notes"
    
    - Due to time constraints and deadlines, I will use date resolution with **second-level precision**. `backup_ddmmyyyy` will be renamed to `backup_ddmmyyyy_HHMMSS`.
    - Instead of using the `mv` (move) command, I will use the `cp` (copy) command because I am unsure if the file is still being used by other processes. To avoid issues, I will copy the file to the backup directory.
    - The cron job frequency is set to 1 minute for testing purposes. In a real-world scenario, it can be adjusted to 1 hour or 1 day, depending on how long the backup process takes.

### 1. Check list-file logfile in `/var/log`

Frist, check list file `*.log` in `/var/log` using this commmand: 

- `ls /var/log/*.log`. 

These are the list of `*.log` in `/var/log` and we will zip all of this `*.log`:

```bash
/var/log/alternatives.log  /var/log/auth.log       /var/log/cloud-init-output.log  /var/log/dpkg.log
/var/log/apport.log        /var/log/bootstrap.log  /var/log/cloud-init.log         /var/log/kern.log
```


### 2. Create a directory with the name `backup_ddmmyyyy`

We create a directory with the name `backup_ddmmyyyy` using this command:

```bash
echo $(date +"%d%m%Y_%H%M%S")
# 27022025_093856 

mkdir backup_$(date +"%d%m%Y_%H%M%S")
# backup_27022025_093856
```

Then, we create shell script `backup.sh`:

!!! quote "backup.sh"

    ```bash linenums="1" hl_lines="4 5 8 11-18"
    #!/bin/bash

    echo "[Start backup]"
    current_time=$(date +"%d%m%Y_%H%M%S") # (1)
    foldername="backup_$current_time"
    echo "Create folder $foldername"
    
    mkdir $foldername
    ```

    1. `date +"%d%m%Y_%H%M%S"` will return the current date and time in the format of `ddmmyyyy_HHMMSS`.<br><br>:warning: the `+` and `%d..` should be **not have space between** them.


### 3. Move all logfile to the directory

Moving/copying all `*.log` to the directory we need to check if the directory exist or not.

???+ info "Check if directory exist"

    Explanation:

    -d is a test command to check if the directory exist or not.

    ```bash
    test -d testdir && echo "Directory exist" || echo "Directory not exist"

    # or

    if [ -d testdir ]; then
        echo "Directory exist"
    else
        echo "Directory not exist"
    fi
    ```


!!! quote "backup.sh"

    ```bash linenums="1" hl_lines="9 11-18"
    #!/bin/bash

    echo "[Start backup]"
    current_time=$(date +"%d%m%Y_%H%M%S")
    foldername="backup_$current_time"
    echo "Create folder $foldername"
    
    mkdir $foldername
    echo "Move all .log to $foldername"

    if [ -d $foldername ]; then
        echo "folder exist"
        cp /var/log/*.log $foldername
    else
        echo "folder not exist. Please create folder before"
        mkdir $foldername
        cp /var/log/*.log $foldername
    fi
    ```

### 4. Zip the directory

Zipping the directory need to install `zip` package. You can install it using this command:

```bash
sudo apt install zip
```

Then, we can zip the directory using this command:

```bash
zip -r backup_27022025_093856.zip backup_27022025_093856
```

Explanation:

- `-r` is a flag to zip the directory recursively. It means that if the directory has subdirectories, it will zip all of them too.
- `backup_27022025_093856.zip` is the name of the zip file.
- `backup_27022025_093856` is the name of the directory to be zipped.

!!! quote "backup.sh"

    ```bash linenums="1" hl_lines="20 21"
    #!/bin/bash

    echo "[Start backup]"
    current_time=$(date +"%d%m%Y_%H%M%S")
    foldername="backup_$current_time"
    echo "Create folder $foldername"
    
    mkdir $foldername
    echo "Move all .log to $foldername"

    if [ -d $foldername ]; then
        echo "folder exist"
        cp /var/log/*.log $foldername
    else
        echo "folder not exist. Please create folder before"
        mkdir $foldername
        cp /var/log/*.log $foldername
    fi

    zip -r $foldername.zip $foldername
    echo "Successfully Zip $foldername to $foldername.zip"
    ```

### 5. Add success message

We add success message and calculate compression after zipping the directory.

!!! quote "backup.sh"

    ```bash linenums="1" hl_lines="23-25 27-229"
    #!/bin/bash

    echo "[Start backup]"
    current_time=$(date +"%d%m%Y_%H%M%S")
    foldername="backup_$current_time"
    echo "Create folder $foldername"
    
    mkdir $foldername
    echo "Move all .log to $foldername"

    if [ -d $foldername ]; then
        echo "folder exist"
        cp /var/log/*.log $foldername
    else
        echo "folder not exist. Please create folder before"
        mkdir $foldername
        cp /var/log/*.log $foldername
    fi

    zip -r $foldername.zip $foldername
    echo "Successfully Zip $foldername to $foldername.zip"
    
    zip_bytes=$(du -b $foldername.zip | cut -f1)
    folder_bytes=$(du -b $foldername | cut -f1)
    rm -rf $foldername

    saved_bytes=$(($folder_bytes - $zip_bytes))
    saved_percent=$(($saved_bytes * 100 / $folder_bytes))
    echo "Saved $saved_bytes bytes | ($saved_percent%) from $folder_bytes bytes to $zip_bytes bytes"
    ```

!!! quote "sample-output"

    ```bash
    [Start backup]
    Create folder backup_27022025_160059 ...
    Move all .log to backup_27022025_160059
    folder exist
    Zipping backup_27022025_160059 ...
        adding: backup_27022025_160059/ (stored 0%)
        adding: backup_27022025_160059/alternatives.log (deflated 92%)
        adding: backup_27022025_160059/dpkg.log (deflated 92%)
        adding: backup_27022025_160059/bootstrap.log (deflated 88%)
        adding: backup_27022025_160059/kern.log (deflated 81%)
        adding: backup_27022025_160059/apport.log (stored 0%)
        adding: backup_27022025_160059/cloud-init.log (deflated 88%)
        adding: backup_27022025_160059/cloud-init-output.log (deflated 73%)
        adding: backup_27022025_160059/auth.log (deflated 90%)
    Successfully Zip backup_27022025_160059 to backup_backup_27022025_160059.zip
    Successfully backup backup_27022025_160059 to backup_backup_27022025_160059.zip
    Saved 1069540 bytes | (90%) from 1187738 bytes to 118198 bytes
    ```

    You can see the saved bytes and saved percent from the original folder to the zip file.
    That can compress the file up to 90%

### 6. Add to Crontab

To run the script every minute, we can add it to crontab:

```bash
crontab -e
```

Add this line:

```bash
*/1 * * * * /home/u24-1/backup.sh
```

### Result

???+ info "full `backup.sh`"

    ```bash
    #! /bin/bash

    echo "[Start backup]"
    current_time=$(date +"%d%m%Y_%H%M%S")
    foldername="backup_$current_time"
    echo "Create folder $foldername ..."

    mkdir $foldername
    echo "Move all .log to $foldername"

    if [ -d $foldername ]; then
        echo "folder exist"
        cp /var/log/*.log $foldername
    else
        echo "folder not exist. Please create folder before"
        mkdir $foldername
        cp /var/log/*.log $foldername
    fi

    echo "Zipping $foldername ..."
    zip -r $foldername.zip $foldername
    echo "Successfully Zip $foldername to $foldername.zip"

    zip_bytes=$(du -b $foldername.zip | cut -f1)
    folder_bytes=$(du -b $foldername | cut -f1)
    rm -rf $foldername

    saved_bytes=$(($folder_bytes - $zip_bytes))
    saved_percent=$(($saved_bytes * 100 / $folder_bytes))
    echo "Saved $saved_bytes bytes | ($saved_percent%) from $folder_bytes bytes to $zip_bytes bytes"
    ```

!!! tip "result"
    
    `ls -l`

    ```bash
    ls -l
    total 972
    -rwxrwxr-x 1 u24-1 u24-1    837 Feb 27 16:10 backup.sh
    -rw-rw-r-- 1 u24-1 u24-1 118334 Feb 27 16:09 backup_27022025_160948.zip
    -rw-rw-r-- 1 u24-1 u24-1 118334 Feb 27 16:10 backup_27022025_161038.zip
    -rw-rw-r-- 1 u24-1 u24-1 118349 Feb 27 16:12 backup_27022025_161201.zip
    -rw-rw-r-- 1 u24-1 u24-1 118374 Feb 27 16:13 backup_27022025_161301.zip
    -rw-rw-r-- 1 u24-1 u24-1 118395 Feb 27 16:14 backup_27022025_161401.zip
    -rw-rw-r-- 1 u24-1 u24-1 118439 Feb 27 16:15 backup_27022025_161502.zip
    -rw-rw-r-- 1 u24-1 u24-1 118464 Feb 27 16:16 backup_27022025_161601.zip
    -rw-rw-r-- 1 u24-1 u24-1 118334 Feb 27 16:08 backup_backup_27022025_160856.zip
    -rw-rw-r-- 1 u24-1 u24-1  33280 Feb 26 01:22 server1.txt
    ```

    This is the result of the script. You can see that the script will create a new zip file every minute.
    Sorry! The file `server1.txt` is the result of the previous project.
