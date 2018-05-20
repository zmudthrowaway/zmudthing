# Zmud thing

This is a barebones client/server app for playing muds.  "Barebones" means I threw it together in a day and am not going to maintain it, if you're not comfortable editing javascript to customize it for yourself, don't use it.  "client/server app" means you need a server to host it on which can telnet to the mud, and then you use a browser to connect to that server.   "muds" are tedious text-based games that take years to play, and are populated with the sort of people who play tedious text-based games that take years to play.  

To use:

1) install node and git figure out how to use them 
2) clone this repo somewhere and do "npm install"
3) edit server.js and change web.host to the internal ip of the machine you're on, and change telnet.host/port to the address of the mud you waste your precious free time on
4) "npm run start"
5) open a browser and go to 10.0.0.1:4321

If all goes well, the server connected to the mud via telnet, your browser connected to the server via websocket, and you can now play.

6) Use the widgets in the ui to add macros, triggers, etc to make it easier to play
7) Edit the html and js to add more functionality 

![this thing in action](https://github.com/zmudthrowaway/zmudthing/blob/master/ss.png)