# Taekwon

Real-time scoring system for **ITF Taekwon-Do** sparring matches based on [Node.js](http://nodejs.org) and [Primus](https://github.com/primus/primus) (on top of [SockJS](https://github.com/sockjs/sockjs-node)).


## Installation

1. Install [Node.js](http://nodejs.org/), making sure to include npm, the Node package manager, during the installation process.
2. Clone this Git repository on your machine, or download the ZIP file and extract it.
3. Open a terminal as administrator and navigate to the project's root folder.
4. Run `npm install -g gulp`, followed by `npm install` to install the dependencies (this might take a while).
5. Inside the `config` folder, make a copy of the `sample.env` file and rename it to `.env`.
6. Run `npm run build` to complete the set up process.


## First run

At this point, the system is ready to be run locally. Take it for a spin!

1. Run `npm start` to start the server.
2. Open your web browser and visit http://localhost/jury. This is the **Jury President** interface.
3. Open a different browser or a new browser session (i.e. a private window in Firefox, or an igognito window in Chrome) and visit http://localhost. This is the **Corner Judge** interface.

That's it! You can now play around with the system:

1. Enter your name in the Corner Judge interface (CJ), and the master password (`tkd` by default) in the Jury President interface (JP).
2. [JP] Open one of the rings.
3. [CJ] Join the newly opened ring.
4. [JP] Accept the Corner Judge's request to join the ring.
5. [JP] Create a new match and start the first round.
6. [CJ] Score some points.
7. [JP] Control the state of the match until it ends, and check out the results!


## Tournament set-up

### Hardware requirements

To use *Taekwon* at a tournament, you will need the following pieces of hardware:

- 1 smartphone or tablet per Corner Judge
- 1 large tablet or laptop per Jury President
- 1 laptop or desktop computer to run the server
- 1 Wi-Fi router

A 2-ring tournament would therefore require:

- 8 smartphones or tablets
- 2 laptops or large tables
- 1 laptop or desktop computer
- 1 Wi-Fi router

All the devices must be capable of connecting to a Wi-Fi network. If setting up a separate computer as the server is not practical, you may choose to make use of one of the Jury Presidents' laptops.


### Software requirements

Jury Presidents and Corner Judges access their respective interfaces through a **web browser**. Below are recommendations on which browsers and versions to choose depending on the platform:

- **Desktop**: latest version of Firefox or Chrome; Internet Explorer 11; Microsoft Edge
- **Android**: latest version of Firefox for Android or Chrome for Android
- **iOS**: Safari 6.1 or above
 
The key technology that restricts the range of compatible browsers is *Web Sockets*. The whole system is dependent on it, as it's what allows the client interfaces to communicate with the server in real-time. Therefore, the [Web Sockets support table](http://caniuse.com/#feat=websockets) can help identify most incompatible browsers.


### Logistics

Laptops should be plugged in to avoid surprises. You will need power cord extensions and power strips to bring power to the Jury President tables.

All battery-powered devices should be fully charged in the morning of the tournament. It might be wise to have a few chargers handy on the day, or to ask Corner Judges to bring their own.

To avoid interuptions, mobile devices should be configured so as to always remain **awake and unlocked**. They should not be allowed to turn off Wi-Fi to save power.

Pins, patterns and other forms of security should be disabled. This is especially important if there is a chance that Corner Judges will share devices (e.g. when a Corner Judge doesn't have his/her own device).

In a perfect scenario, the organiser of the tournament would provide all the devices and ensure that they are properly configured. If this is not an option, the best you can do is communicate these instructions to the judges and perhaps do a test run before the tournament.


### Server and router configuration

1. Assign a static IP address to the server's Wi-Fi adapter (for instance `192.168.1.99`).
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
