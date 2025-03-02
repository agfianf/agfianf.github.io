---

draft: false
authors:
  - me
date: 
    created: 2025-03-02
    updated: 2025-03-02
categories:
    - devops
tags:
    - devops
    - digital-skola
    - docker
    - rust
    - homework


comments: true

---

# Task 7: Networking, Security, and Orchestration of Docker

Today we will learn about Docker networking, security, and orchestration. We will also learn how to use Docker Compose to manage multi-container applications.

<!-- more -->
???+ info "Project Challange"

    **Deskripsi:**
    Sebuah startup ingin membangun aplikasi berbasis web dengan arsitektur berikut:
    
    1. Frontend: Menggunakan Nginx.
    2. Backend: API sederhana berbasis Python.
    3. Database: PostgreSQL untuk menyimpan data aplikasi.
    4. Networking: Backend dan database harus saling terhubung dengan jaringan.
    5. Volume: Database PostgreSQL memerlukan penyimpanan data yang persisten.
    
    **Tugas Peserta:**
    
    1. Buat Docker Compose file untuk menjalankan semua service.
    2. Pastikan Nginx dapat diakses melalui browser.
    3. Gunakan Docker Volume untuk menyimpan data PostgreSQL.
    4. Pastikan semua container saling terhubung melalui jaringan.


!!! warning "Notes"

    Ada beberapa hal yang saya **ganti** dari project challange ini namun tanpa mengurangi esensi dari project ini. Yaitu:

    1. Frontend: Saya menggunakan **html+css+js** sederhana untuk frontend yang akan berinteraksi dengan RestAPI.
    2. Backend: Saya menggunakan **Rust** sebagai backendnya.

    **Full source code bisa dilihat di [Github](https://github.com/agfianf/todo-app-rust)**

Here, i will just explain the **docker-compose.yml** file that i created for this project.

## 0. Architecture

![architecture](../../../assets/devops/project-7/architecture-task-7.png)
///caption
architecture of the project. 
_source: my own_
///

## 1. Docker Compose Explanation

we will use Docker Compose to manage our multi-container application. We have 3 services in this docker-compose file:

1. **PostgreSQL**: The database service.
2. **App**: The backend service.
3. **Frontend**: The frontend service.

=== "service: postgres"

    ???+ quote "service: postgres"

        ```yaml
        postgres:
            image: postgres:16-alpine
            container_name: todo_app_postgres
            environment:
                POSTGRES_USER: postgres
                POSTGRES_PASSWORD: postgres
                POSTGRES_DB: todo_db
            ports:
                - "5432:5432" # (1)
            volumes:
                - ./tmp/postgres:/var/lib/postgresql/data # (2)
            restart: unless-stopped # (3)
            networks:
                - app-network # (4)
        ```

        1. **Expose PostgreSQL Port**: Port 5432 of the PostgreSQL container is exposed to the host machine, allowing external access to the database.
        2. **Persistent Storage**: The PostgreSQL data is stored in a local directory (`./tmp/postgres`) to ensure data persistence even if the container is removed. It means also, if we made some changes it will be saved in the local directory, also if we do some changes in the local directory, it will be reflected in the container. Be careful!
        3. **Restart Policy**: The container will `restart-unless` it is explicitly stopped, ensuring high availability.
        4. **Network Configuration**: The PostgreSQL container is connected to a custom bridge network (`app-network`), allowing communication with other containers.

        We create container

=== "service: app"

    ???+ quote "service: app"

        ```yaml
        app:
            image: todo-app:latest
            build:
                context: ./todo-app
                dockerfile: Dockerfile
            ports:
                - "8080:8080"
            environment:
                - DATABASE_URL=postgres://postgres:postgres@postgres:5432/todo_db # (1)
            depends_on:
                - postgres # (2)
            networks:
                - app-network
        ```

        1. **Environment Variables**: The database connection string is passed as an environment variable to the application container. The url like this: `postgres://postgres:postgres@postgres:5432/todo_db` is the connection string to connect to the PostgreSQL database. The format is like this: `postgres://<username>:<password>@<hostname>:<port>/<database_name>`. The `hostname` is the name of the service in the docker-compose file, in this case, it is `postgres`.
        2. **Service Dependency**: The application container depends on the PostgreSQL container, ensuring that the database is started before the application.

=== "service: frontend"

    ???+ quote "service: frontend"

        ```yaml
        frontend:
            image: node:18
            working_dir: /app
            volumes:
                - ./frontend:/app 
            command: npx http-server -p 8081  # (1)
            ports:
                - "8081:8081"
            depends_on:
                - app # (2)
            networks:
                - app-network
        ```

        1. **Frontend Service**: A simple Node.js server is used to serve the frontend files, allowing access to the web application.
        2. **Service Dependency**: The frontend container depends on the application container, ensuring that the backend is started before the frontend.

=== "network"

    ???+ quote "networks"

        ```yaml
        networks:
            app-network:
                driver: bridge
        ```

        A custom **bridge** network is created with name `app-network` to allow communication between containers. Bridge networks are the default network type in Docker, **allowing containers to communicate with each other**. So we can use the service name as the hostname to connect to other services.


Here is the full docker-compose.yml file:

??? quote "docker-compose.yml"

    ```yaml
    version: '3.8' # version of docker-compose file format

    services:
        postgres:
            image: postgres:16-alpine
            container_name: todo_app_postgres
            environment:
                POSTGRES_USER: postgres
                POSTGRES_PASSWORD: postgres
                POSTGRES_DB: todo_db
            ports:
                - "5432:5432" # (1)
            volumes:
                - ./tmp/postgres:/var/lib/postgresql/data # (2)
            restart: unless-stopped # (3)
            networks:
                - app-network # (4)

        app:
            image: todo-app:latest
            build:
                context: ./todo-app
                dockerfile: Dockerfile
            ports:
                - "8080:8080"
            environment:
                - DATABASE_URL=postgres://postgres:postgres@postgres:5432/todo_db # (5)
            depends_on:
                - postgres # (6)
            networks:
                - app-network

        frontend:
            image: node:18
            working_dir: /app
            volumes:
                - ./frontend:/app 
            command: npx http-server -p 8081  # (7)
            ports:
                - "8081:8081"
            depends_on:
                - app
            networks:
                - app-network

    networks:
        app-network:
            driver: bridge # (8)
    ```

## 2. Run the Docker Compose

`docker-compose` really makes our life easier. to run this docker-compose file, just run this command:

=== "build and run the docker-compose"

    ```bash
    # running project
    docker-compose up -d --build
    ```

    The container will be build by pull each image from the docker hub and build the image from the Dockerfile in the `todo-app` directory.
    
    - `-d` flag is used to run the containers in detached mode, allowing them to run in the background.
    - `--build` flag is used to build the images before starting the containers.



=== "stop the docker-compose"

    ```bash
    # to stop the docker-compose
    docker-compose down

    ```


## 3. Result

### 3.1 Frontend

![frontend](../../../assets/devops/project-7/logs-fe.png)
///caption
logs of the frontend container.
_source: my own_
///

![frontend](../../../assets/devops/project-7/result-frontend.png)

### 3.2 Backend
![frontend](../../../assets/devops/project-7/logs-be.png)
///caption
logs of the backend container.
_source: my own_
///

![frontend](../../../assets/devops/project-7/result-backend.png)

### 3.3 Database
![frontend](../../../assets/devops/project-7/logs-db.png)
///caption
logs of the database container.
_source: my own_
///

![frontend](../../../assets/devops/project-7/result-db.png)

## 4. You can do it too!

```
git clone https://github.com/agfianf/todo-app-rust
cd todo-app-rust
docker-compose up -d --build
```

- Access the frontend at [http://localhost:8081](http://localhost:8081)

!!! info "Notes"

    if you find this useful, please give me a :star: on my [repo](https://github.com/agfianf/todo-app-rust)

Thanks!