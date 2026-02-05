## 2 - node src/commander.js connect --url ws://localhost:8080 --name alice


## 1 - node src/commander.js ws-start --port 8080


## 3 - node src/commander.js connect --url ws://localhost:8080 --count 5 --name bot --room lobby --message "hello" --interval 1000


## broadcast-server --help
## broadcast-server ws-start --port 8080
## broadcast-server connect --url ws://localhost:8080 --name alice
## broadcast-server ws-start --port 8080 --mongo mongodb://127.0.0.1:27017/broadcast_server


## node src/commander.js ws-start --port 8080 --mongo mongodb://127.0.0.1:27017/broadcast_server
## node src/commander.js connect --url ws://localhost:8080 --count 2 --name lobbybot --room lobby --message "hello lobby" --interval 1000
## node src/commander.js connect --url ws://localhost:8080 --count 2 --name devbot --room dev --message "hi dev room" --interval 1200
## node src/commander.js connect --url ws://localhost:8080 --count 2 --name globalbot --message "global ping" --interval 1500
## node src/commander.js connect --url ws://localhost:8080 --name watcher
