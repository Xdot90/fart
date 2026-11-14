# Blue Cola

A themeable web proxy portal built with Node.js, Express, Ultraviolet and Bare Server.

## Structure

```
blue-cola/
├── package.json
├── server.js
├── README.md
└── public/
    ├── index.html
    ├── style.css
    ├── app.js
    ├── sw.js
    └── uv/
        └── uv.config.js      (UV bundle/handler/client/sw are served from the npm package)
```

## Run locally

```bash
npm install
npm start
# open http://localhost:8080
```

Set `PORT=3000 npm start` to change the port. `ISOLATE=1` adds COOP/COEP headers (off by default because COEP blocks third-party iframes).

## Deploy on a Linux VPS (Ubuntu/Debian) with PM2 + Nginx + HTTPS

```bash
# 1. Node 20, git, nginx, certbot
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx certbot python3-certbot-nginx

# 2. App
sudo mkdir -p /var/www/blue-cola && sudo chown $USER /var/www/blue-cola
cp -r ./* /var/www/blue-cola/    # or git clone your repo here
cd /var/www/blue-cola
npm install --omit=dev

# 3. PM2
sudo npm install -g pm2
PORT=8080 pm2 start server.js --name blue-cola
pm2 save
pm2 startup        # run the command it prints

# 4. Nginx
sudo tee /etc/nginx/sites-available/blue-cola >/dev/null <<'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/blue-cola /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 5. HTTPS (service workers require it)
sudo certbot --nginx -d YOUR_DOMAIN
```

Point your domain's A record at the VPS before running certbot. Update with `git pull && npm install && pm2 restart blue-cola`.

## Customizing

- Themes: edit the `[data-theme=...]` blocks in `public/style.css` and the `THEMES` list in `public/app.js`.
- Quick-launch cards: edit the `.cards` block in `public/index.html`.
- Movies tab: opens `https://movy.sx` through the proxy (`MOVIE_URL` in `public/app.js`). Content comes from that third-party site; Blue Cola hosts no media.
