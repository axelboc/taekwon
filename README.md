Taekwon
=======

Real-time scoring system for **ITF Taekwon-Do** sparring matches, based on [Node.js](http://nodejs.org) and [Primus](https://github.com/primus/primus) (on top of [SockJS](https://github.com/sockjs/sockjs-node)).

Hardware configuration
----------------------
1. Assign a static IP address to you computer's Wi-Fi adapter (for instance `192.168.1.99`). 
2. Login to your router's admin interface (usually at http://192.168.1.1).
3. Look for a page named *Static DNS* or similar.
4. Map domain **taekwon.do** to your computer's static IP address.

Installation and usage
----------------------
1. Clone this Git repository on your machine, or download it as a ZIP file.
2. Install [Node.js](http://nodejs.org/).
3. Open a command line window in the project's root folder.
4. Install the project's dependencies with `npm install`.
5. Start the server with `node app`.
6. Open a [modern browser](http://caniuse.com/#feat=websockets) and access the *Jury President* interface by visiting: **http://taekwon.do/jury**.
7. On your tablet or smartphone, open a [modern browser](http://caniuse.com/#feat=websockets) and access the *Corner Judge* interface by visiting: **http://taekwon.do**.
