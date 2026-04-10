#!/bin/bash

ufw default deny incoming
ufw default allow outgoing

ufw allow from 192.168.100.0/24 to any port 22
ufw allow 443/tcp
ufw allow from 10.0.0.0/8 to any port 5432
ufw allow from 10.0.0.0/8 to any port 3000

ufw limit ssh
ufw enable