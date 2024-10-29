---
title: "Connect Your Docker Apps to a Domain"
date: "2024-10-22"
tags: ["Tech", "Docker", "NGINX", "VPS"]
---

## Table of Contents

1. [Introduction](#introduction)
2. [Update Your System](#update-your-system)
3. [NGINX Setup](#nginx-setup)
4. [Set DNS Records](#set-dns-records)
5. [SSL Certification](#ssl-certification)
6. [Additional Commands](#additional-commands)
   - [List the symlinks (enabled NGINX instances)](#list-the-symlinks-enabled-nginx-instances-created-for-your-applications)
   - [List the available sites for NGINX](#list-the-available-sites-for-nginx)
7. [Side Notes](#side-notes)

## Introduction

This has been something I really struggled when I first try to setup a config for accessing my docker containers using my domain and at the time I couldn't find a proper document that I can understand so I told myself why not write it yourself so here it is.

## Update Your System

As a classic, update your system and later install NGINX to your machine.

```bash
sudo apt update
sudo apt install nginx
```

## NGINX Setup

After that, go to the following directory and create a config file for your application

```bash
cd /etc/nginx/sites-available/
sudo nano /etc/nginx/sites-available/my-app
```

Later, add the following  to your config file with the correct information

```bash
server {
    listen 80;
    server_name my-app.your-domain.com;

    location / {
        proxy_pass http://localhost:port-of-your-app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

You can check the ports of your docker applications using `docker ps` inside your machine.

Then create a symlink from the file you created to the folder where NGINX holds enabled sites.

```bash
sudo ln -s /etc/nginx/sites-available/my-app /etc/nginx/sites-enabled/
```

after that test your config file and restart your nginx instance

```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Set DNS Records

For every app you create with the statements below here, you need to set separate DNS records in your domain provider.

Here is how you can do it:

1. Go to your domain provider
2. Open your domain settings and find DNS Records
3. Create a new "A" record with the following configs:
	- Name (Subdomain): the name you used in the creation process. (e.g. my-app)
	- Value: Public IP Address of your server (where you run your application)

You can check if the DNS Records have been changed using [this tool](https://dnschecker.org/). It should show the IP  Address of your server when you input your subdomain (my-app.yourdomain.com) if you have done everything correctly.

## SSL Certification

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d my-app.your-domain.com
```

## Additional Commands

#### List the symlinks (enabled NGINX instances) created for your applications:

```bash
ls -l /etc/nginx/sites-enabled/
```
### Example output:

```bash
/etc/nginx/sites-enabled/my-app -> /etc/nginx/sites-available/my-app
```

#### List the available sites for NGINX: 

```bash
ls /etc/nginx/sites-available/
```

## Side Notes:

1. In case you fuck-up in the process ( like I did :D ) [here](https://gist.github.com/xameeramir/a5cb675fb6a6a64098365e89a239541d) you can find the default enabled site config file for NGINX. Located under 

```bash
/etc/nginx/sites-enabled/default
```

2. You should keep the places where "my-app" is written same, so for example if you are setting up a config for uptime kuma everywhere you should use "kuma" (name depends on you). If you change any of those to a different string it will not work as I experienced.
