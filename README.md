# Taekwon

Real-time scoring system for **ITF Taekwon-Do** sparring matches, built with [Node.js](http://nodejs.org) and [Primus](https://github.com/primus/primus).

- [Installation](#installation)
- [Take it for a spin!](#take-it-for-a-spin)
- [Quick tour of the interface](#quick-tour-of-the-interface)
  - [Identification](#identification)
  - [Open/join a ring](#openjoin-a-ring)
  - [Match settings](#match-settings)
  - [Authorisation process](#authorisation-process)
  - [New match](#new-match)
  - [Round in progress](#round-in-progress)
  - [Break](#break)
  - [Injury/timeout](#injurytimeout)
  - [Result](#result)
  - [Additional rounds](#additional-rounds)
- [Let's get real](#lets-get-real)
  - [Hardware requirements](#hardware-requirements)
    - [Choosing a Wi-Fi router](#choosing-a-wi-fi-router)
  - [Software requirements](#software-requirements)
  - [Logistics](#logistics)
    - [Have a back-up plan](#have-a-back-up-plan)
  - [Network and environment configuration](#network-and-environment-configuration)
    - [Set up a local Wi-Fi network](#set-up-a-local-wi-fi-network)
    - [Give the server a static IP address](#give-the-server-a-static-ip-address)
    - [Edit Taekwon's environment configuration](#edit-taekwons-environment-configuration)
    - [Checkpoint](#checkpoint)
    - [Set up a custom URL](#set-up-a-custom-url)
  - [Running Taekwon in production with `forever`](#running-taekwon-in-production-with-forever)
  - [Ready, set, go!](#ready-set-go)
- [About security](#about-security)
- [Reference](#reference)
  - [NPM scripts](#npm-scripts)
  - [Tournament management](#tournament-management)


## Installation

1. Install [Node.js](http://nodejs.org/), making sure to include npm, the Node package manager.
2. Clone this Git repository, or download the ZIP file and extract it.
3. Open a terminal as administrator and navigate to Taekwon's directory.
4. Run `npm install` to install the local dependencies.
5. Inside the `config` folder, make a copy of `sample.env` and rename it to `.env`.
6. Run `npm run build` to generate the client scripts.


## Take it for a spin!

At this point, Taekwon is ready to be run locally.

1. Run `npm start` to start the server.
2. Open your web browser and visit **[http://localhost/jury](http://localhost/jury)**. This is the **Jury President** interface.
3. Open a different browser or a new browser session (i.e. a private window in Firefox, or an incognito window in Chrome) and visit **[http://localhost](http://localhost)**. This is the **Corner Judge** interface.

That's it! You can now play around with the system:

1. Enter your name in the Corner Judge interface (**CJ**), and the password (`tkd` by default) in the Jury President interface (**JP**).
2. **JP** Open one of the rings.
3. **CJ** Join the newly opened ring.
4. **JP** Accept the Corner Judge's request to join the ring.
5. **JP** Create a new match and start the first round.
6. **CJ** Score some points.
7. **JP** Control the state of the match until it ends, and check out the results!


## Quick tour of the interface

This section should give you a general idea of how to use the Jury President and Corner Judge interfaces. Click on the thumbnails to view the full-size screenshots.

### Identification

| Screenshot | Description |
|:---:|---|
| [![thumb-jp-identify](https://cloud.githubusercontent.com/assets/2936402/9620894/431fdd2e-5163-11e5-99a0-1fdee17ac79b.png)](https://cloud.githubusercontent.com/assets/2936402/9620865/3b020018-5163-11e5-86ab-a2bd68c6883d.png) | The Jury President must enter the **password**, as configured in `config/config.json`. |
| [![thumb-cj-identify](https://cloud.githubusercontent.com/assets/2936402/9620882/42f1cf1a-5163-11e5-996c-01bc718a8730.png)](https://cloud.githubusercontent.com/assets/2936402/9620857/3ad867f8-5163-11e5-875a-d2ca00063f84.png) | The Corner Judge must enter his/her **name**. |


### Open/join a ring

| Screenshot | Description |
|:---:|---|
| [![thumb-jp-open-ring](https://cloud.githubusercontent.com/assets/2936402/9620901/434b2312-5163-11e5-925d-222cd05075d8.png)](https://cloud.githubusercontent.com/assets/2936402/9620875/3b2c63a8-5163-11e5-9484-505e350f609f.png) | The Jury President may **select a ring to open**. The buttons are disabled once the rings are opened. |
| [![thumb-cj-join-ring](https://cloud.githubusercontent.com/assets/2936402/9620883/42f40078-5163-11e5-9f08-6e59dbb65366.png)](https://cloud.githubusercontent.com/assets/2936402/9620854/3ad70688-5163-11e5-8871-f3f5ef528bf2.png) | The Corner Judge may **select a ring to join**. The buttons are disabled until the rings are opened by the Jury Presidents. If a ring is full (i.e. if all of the Corner Judge slots of the ring are filled), a message is displayed. |


### Match settings

| Screenshot | Description |
|:---:|---|
| [![thumb-jp-config-match](https://cloud.githubusercontent.com/assets/2936402/9682219/dd4a4b88-5347-11e5-8647-c8a259a3c428.png)](https://cloud.githubusercontent.com/assets/2936402/9682246/1e1339ea-5348-11e5-824c-359948f0befe.png) | The Jury President has opened a ring and can now **manage the ring's Corner Judges** (sidebar) and **configure the settings** for the first match. The settings include the duration of the rounds, breaks and injury timeouts, and the number of *main* rounds (1 or 2). In the sidebar, the number of Corner Judge *slots* can be adjusted to equal the number of Corner Judges that are expected to join the ring. |


### Authorisation process

| Screenshot | Description |
|:---:|---|
| [![thumb-cj-wait-authorisation](https://cloud.githubusercontent.com/assets/2936402/9620884/42f43a02-5163-11e5-95b0-638a6f750470.png)](https://cloud.githubusercontent.com/assets/2936402/9620853/3ad6e5ea-5163-11e5-9774-53c1d90069c4.png) | Having selected a ring to join, the Corner Judge must **wait** for the Jury President to accept the request. |
| [![thumb-jp-authorise](https://cloud.githubusercontent.com/assets/2936402/9682218/dd4923ac-5347-11e5-8938-61d513a7696c.png)](https://cloud.githubusercontent.com/assets/2936402/9682214/d883e514-5347-11e5-8fb3-56df2e49791e.png) | The Jury President can either **accept of reject** the request. |
| [![thumb-cj-wait-for-new-match](https://cloud.githubusercontent.com/assets/2936402/9620881/42cbc752-5163-11e5-91d0-71694130d4ea.png)](https://cloud.githubusercontent.com/assets/2936402/9620858/3ad8cec8-5163-11e5-9084-8f07d54fbcc4.png) | Upon acceptance, the Corner Judge is shown the **scoring interface** overlayed with a message informing him/her that no match is currently in progress. If the Jury President were to lose connection with the server, the overlay would show a different message. |
| [![thumb-jp-new-match](https://cloud.githubusercontent.com/assets/2936402/9682242/14e98748-5348-11e5-8fd3-4eb17c8d43ec.png)](https://cloud.githubusercontent.com/assets/2936402/9682216/d8d358c4-5347-11e5-81c4-cdd97eca00cc.png) | The Corner Judge now appears as ***Connected*** in the sidebar of the Jury President interface. If the Corner Judge were to lose connection with the server, a different message would be shown. The Jury President may force a Corner Judge to leave the ring at any time by pressing the cross next to the Corner Judge's name in the sidebar. |


### New match

| Screenshot | Description |
|:---:|---|
| [![thumb-jp-start-round](https://cloud.githubusercontent.com/assets/2936402/9620902/434bf1ca-5163-11e5-89e8-312c9d00b511.png)](https://cloud.githubusercontent.com/assets/2936402/9620874/3b2a19b8-5163-11e5-98e9-ee8fdd784893.png) | Once the match has been adequately configured and all the Corner Judges have joined the ring (and appear as *Connected* in the sidebar), the Jury President may press the *New Match* button. This reveals the *match panel*, which allows the Jury President to **control and monitor the match**. |
| [![thumb-cj-wait-for-round-start](https://cloud.githubusercontent.com/assets/2936402/9620888/4315e8fa-5163-11e5-844a-3d0037dcd2b0.png)](https://cloud.githubusercontent.com/assets/2936402/9620859/3af90d64-5163-11e5-92f9-29b16157f882.png) | The Corner Judge is informed that a round is about to begin. |

> At this point, the centre referee would have called the competitors onto the ring and be checking that they are wearing the required protections.


### Round in progress

The Jury President must press the *Start* button at the same time as the referee commands the competitors to start sparring.

| Screenshot | Description |
|:---:|---|
| [![thumb-jp-monitor-round](https://cloud.githubusercontent.com/assets/2936402/9620899/433f1068-5163-11e5-8132-887edb97b219.png)](https://cloud.githubusercontent.com/assets/2936402/9620872/3b24143c-5163-11e5-8297-aae277b596de.png) | The Jury President can now **monitor the timer and the scores**, and **increment the warnings and fouls** as they are given by the centre referee. |
| [![thumb-cj-score](https://cloud.githubusercontent.com/assets/2936402/9620885/42f4c9e0-5163-11e5-8fc0-6f6022d2c28b.png)](https://cloud.githubusercontent.com/assets/2936402/9620856/3ad8833c-5163-11e5-8e21-07f03fb8f315.png) | The Corner Judge **scores** using the buttons on either side of the interface, and receives instant feedback that the scores have been processed in the form of numbers slowly *falling* through the centre. The Corner Judge may undo a score by pressing the *Undo* button at the top. |


### Break

When the timer reaches zero and beeps, the Jury President must notify the centre referee, who then commands the competitors to stop sparring. The Jury Presisdent must then press the *End* button to **end the round* (if possible after a short delay so that the Corner Judges have enough time to input their last scores, if any).

Assuming this is a two-round match, after the competitors have bowed to each other, the centre referee sends them off to their coaches for a break. At this point the Jury President must press the *Start* button again to **start the break**.

| Screenshot | Description |
|:---:|---|
| [![thumb-jp-manage-break](https://cloud.githubusercontent.com/assets/2936402/9620895/43223718-5163-11e5-9b42-5f2535c791b8.png)](https://cloud.githubusercontent.com/assets/2936402/9620867/3b04b916-5163-11e5-9578-960dbc23d966.png) | The Jury President has started the break. The penalties cannot be modified. When the timer reaches zero, the Jury President must notify the centre referee and press the *End* button to move on to the second round. |
| [![thumb-cj-wait-for-break-end](https://cloud.githubusercontent.com/assets/2936402/9620886/42f5278c-5163-11e5-981d-e0cdb7df7535.png)](https://cloud.githubusercontent.com/assets/2936402/9620855/3ad84a8e-5163-11e5-9017-7af957de0e2d.png) | The Corner Judge is notified that a break is in progress. Scoring is, of course, disabled. |

> When the break ends, the centre referee instructs the competitors to come back onto the ring and the [same steps](#round-in-progress) are repeated.


### Injury/timeout

During a round, the centre referee may instruct the Jury President to **pause the timer**, typically when an injury occurs. In this case, the Jury President simply presses the *Start injury* button to start the injury timer.

| Screenshot | Description |
|:---:|---|
| [![thumb-jp-manage-injury](https://cloud.githubusercontent.com/assets/2936402/9620896/4323ef90-5163-11e5-84e3-e0987f8089a3.png)](https://cloud.githubusercontent.com/assets/2936402/9620870/3b065b36-5163-11e5-84a6-472d3a30f8b8.png) | The Jury President has started a timeout. The penalties can be modified. When the centre referee resumes the match, the Jury President must press the *End injury* button. |
| [![thumb-cj-wait-for-timeout-end](https://cloud.githubusercontent.com/assets/2936402/9620892/431e15ca-5163-11e5-8044-c70d518c8717.png)](https://cloud.githubusercontent.com/assets/2936402/9620862/3afc3476-5163-11e5-877e-ad6967b21d23.png) | The Corner Judge is notified that a timeout is in progress. Scoring is disabled. |


### Result

| Screenshot | Description |
|:---:|---|
| [![thumb-jp-check-result](https://cloud.githubusercontent.com/assets/2936402/9620889/431a1902-5163-11e5-8ca0-6636b92d4c03.png)](https://cloud.githubusercontent.com/assets/2936402/9620861/3afb53da-5163-11e5-8413-91a05dd20014.png) | The *result panel* is displayed at the end of the second round, when the Jury President presses the *End* button. The results include the **winner of the match** and the **final scoreboard**. The latter collates the penalties given by the centre referee and the scores given by each Corner Judge. The numbers are totaled in the last column and the resulting winner for each Corner Judge is highlighted. Two options are offered to the Jury President at this point: starting a new match with the same configuration, or returning to the *configuration panel* to configure the next match. |

> Announcing the winner can be done in multiple way; here is one: the Jury President stands up, holding the two flags; the centre referee grabs the arms of the competitors and counts to three; the Jury President lifts the flag of the winner; the centre referee lifts the arm of the winner.


### Additional rounds

| Screenshot | Description |
|:---:|---|
| [![thumb-jp-continue-match](https://cloud.githubusercontent.com/assets/2936402/9620878/41ce8bfa-5163-11e5-98fb-b410f1891956.png)](https://cloud.githubusercontent.com/assets/2936402/9620869/3b055970-5163-11e5-8cda-10fad06b5fef.png) | In the case of a **draw**, the Jury President can either continue to the next round, the **tie breaker** or end the match. |
| [![thumb-jp-check-tie-breaker-result](https://cloud.githubusercontent.com/assets/2936402/9620887/42f9e6aa-5163-11e5-8bf0-af7be2ccbf67.png)](https://cloud.githubusercontent.com/assets/2936402/9620864/3afda36a-5163-11e5-924e-dccf26aea8da.png) | If the tie breaker itself results in a draw, the Jury President may choose to continue on to the **golden point** round. |
| [![thumb-jp-manage-golden-point](https://cloud.githubusercontent.com/assets/2936402/9620897/43242c94-5163-11e5-8a7c-4a928403306b.png)](https://cloud.githubusercontent.com/assets/2936402/9620868/3b04ca3c-5163-11e5-8053-433fddb5eb54.png) | During a golden point round, the timer counts up. There is no time limit; it is up to the Jury President to **monitor the scores** and raise a flag when a majority of the Corner Judges agree that one of the competitors has scored. |


## Let's get real

By the end of this section you'll know all about using Taekwon at a tournament. We'll list the hardware and software requirements, discuss some of the logistics involved, set up the Wi-Fi network, and learn how to configure and run the server in production.

### Hardware requirements

To use Taekwon at a tournament, you will need the following pieces of hardware:

- 1 smartphone or tablet per **Corner Judge**
- 1 large tablet or laptop per **Jury President**
- 1 laptop or desktop computer to act as the **server**
- 1 Wi-Fi **router**

A two-ring tournament with one Jury President and four Corner Judges per ring would therefore require:

- 8 smartphones or tablets
- 2 laptops or large tablets
- 1 laptop or desktop computer
- 1 Wi-Fi router

All devices must be capable of using Wi-Fi, except for the server, which you may plug in directy to the router with an Ethernet cable. If setting up a separate computer as the server is not practical, you may choose to make use of one of the Jury Presidents' laptops.

> Taekwon works on a local network; it doesn't need access to the Internet. Therefore, you won't need to plug in the router to an ADSL socket; only to a power socket.


#### Choosing a Wi-Fi router

If the tournament is held in an area that already provides a Wi-Fi network *and* you are authorised/able to configure this network, ignore this section. If you can't configure the network, then you should find out on which frequency channel it operates (there are plenty of [mobile apps](https://play.google.com/store/search?q=wifi%20analyzer&hl=en) for that). This way you can configure your own network to operate on a different channel in order to reduce interference. If the existing network can be turned off for the duration of the tournament, that's even better!

So all you need is a basic Wi-Fi router. They're pretty cheap nowadays, but you need one that provides good-enough coverage and uses a protocol that is supported by all the devices. You don't need to worry at all about the bandwidth/speed. As of August 2015, the **802.11n** protocol is well supported and provides a much wider range than 802.11g. If you can, choose a router that operates in the 2.4 GHz band rather than the 5 GHz band. And of course, the more antennas the better!

> If the tournament is really big or spread out, you may have to install additional routers to repeat the signal. There's no better way to know for sure than to do some field testing.

One more thing to look for when choosing a router is a feature called **static DNS mapping**. This feature allows a router to map a custom domain name (e.g. taekwon.do, tkd.com, etc.) to a local IP address (e.g. `192.168.1.2`). If you're unable to get your hands on a router that supports it, there are alternatives ... but they are quite complex. For more information, refer to the [Set up a custom URL](#set-up-a-custom-url) section.


### Software requirements

Jury Presidents and Corner Judges access their respective interfaces through a **web browser**. Here are some recommendations on which browsers and versions to choose depending on the platform:

- **Desktop**: latest version of Firefox or Chrome; Internet Explorer 11; Microsoft Edge
- **Android**: latest version of Firefox for Android or Chrome for Android
- **iOS**: Safari 6.1 or above
 
> The key technology that restricts the range of compatible browsers is *Web Sockets*. The whole system is dependent on it, as it's what allows the clients to communicate with the server in real-time. Therefore, the [Web Sockets support table](http://caniuse.com/#feat=websockets) can help rule out most incompatible browsers.


### Logistics

Laptops should be **plugged in** to avoid surprises. You will need power cord extensions and power strips to bring power to the Jury President tables and to the router. Since Taekwon doesn't need access to the Internet, all the router need is power. This makes it easier to maximise coverage by placing the router as close to the centre of the tournament area as possible.

All battery-powered devices should be **fully charged** in the morning of the tournament. It might be wise to have a few chargers handy on the day, or to ask Corner Judges to bring their own.

To avoid interuptions, mobile devices should be configured so as to always remain **awake and unlocked**. They should not be allowed to turn off Wi-Fi to save power.

Pins, patterns and other forms of **locking mechanisms should be disabled**. This is especially important if there is a chance that Corner Judges will share devices (e.g. when a Corner Judge doesn't have his/her own device).

Typically, Corner Judges access the system by typing a URL in a browser. Although very simple in theory, this turns out to be quite a hindrance in practice: the URL has to be communciated to the judges; the URL may be difficult to remember; the `http://` prefix has to be entered in some browsers; and typing a URL on a touch screen is generally slow and prone to errors. A fairly simple workaround is to **bookmark the URL** and create a shortcut for it on the device's home screen.

> In a perfect scenario, the organiser of the tournament would provide all the devices so as to ensure that they are properly configured. If this is not an option (usually for financial reasons), the best you can do is communicate these instructions to the judges in advance and perhaps do a test run before the tournament.

#### Have a back-up plan

It's always good to remember that no system is flawless; something could go wrong despite your best efforts:

- a Corner Judge's device could run out of battery or stop working,
- someone could trip over the router's power cord,
- the power could go out,
- a Jury President could spill water on his/her laptop,
- ... the list is endless!

With this in mind, it's wise to have a back up plan in case something goes wrong. Place scoring sheets, pens and flags under the Corner Judges' chairs, and a penalty board on the Jury President's table. Then, decide and explain to the judges how they should react in various scenarios. If something goes wrong in the middle of a match, should the match be stopped? Should the Corner Judges grab a scoring sheet from under their chairs? If a Corner Judge starts using a scoring sheet, would the Jury President be able to compute the results appropriately? And so on and so forth...


### Network and environment configuration

In the [Take it for a spin!](#take-it-for-a-spin!) section, you accessed the system through [http://localhost](http://localhost). This was very convenient to get up and running quickly and test Taekwon on your local machine, but now we need the system to run over a Wi-Fi network. Setting up the network and getting the devices to communicate with the server is not trivial. Hopefully the instructions below are sufficiently vulgarised, but if you don't know anything at all about computer networks, you may need the help of someone who does.


#### Set up a local Wi-Fi network

First, let's access the router's administration interface:

1. Connect the router to your computer with an Ethernet cable (one is usually provided when you buy a new router). Note that you don't need to connect the router to the Internet.
2. Open a web browser and visit [http://192.168.1.1](http://192.168.1.1) (the URL may be different, check the router's documentation).
3. Enter the admin password to gain access (`admin` is often the default; if not, check the documentation). Make sure you change the password right away so that nobody else but you can access the interface.

Then, let's create and configure the Wi-Fi network:

1. Create a new Wi-Fi network and give it a meaningful name (SSID), like *TKD* or the name of the tournament, club, organisation, etc. If a network already exists, you may use it but you should still rename it.
2. Select the protocol and frequency (typically 802.11n and 2.4 GHz)
3. If you know there won't be any other Wi-Fi network at the tournament, let the router pick the best channel. Otherwise, select a channel that is as far away from the other networks' channels as possible (cf. [Choosing a Wi-Fi router](choosing-a-wi-fi-router), and set a narrow channel width (typically 20 MHz).
4. Disable any kind of special features like Turbo Mode, Afterburner, etc. to maximise compatibility with all devices.

> If security is a concern, you may protect your network with a security key. The main downside is that it will take longer for the Jury Presidents and Corner Judges to join the network, as typing a security key on a touch screen is no easy task. In terms of logistics, you'll also have to find a way to communicate the security key with them and no one else, and make sure they can remember or find it easily in case they need to reconnect. If you decide to go ahead, use WPA2-PSK as the security protocol and choose a relatively short, memorable key.


#### Give the server a static IP address

The server has to be consistently identifiable on the local network, which means it must always have the same IP address. This can be done in two ways:
- by assigning a static IP address to the server's network adapter, or
- in the configuration of the router's DHCP server, by mapping an IP address to the MAC address of the server's network adapter.

If you go for the first option, make sure you also configure the IP range of the router's DHCP server so that the server's IP address never gets allocated to another device. For instance, if you choose 192.168.1.2 as the server's IP address, configure the DHCP IP range to start at 192.168.1.3.


#### Edit Taekwon's environment configuration

Remember `config/.env`, the environment configuration file that you created when running the system [for the first time](#take-it-for-a-spin!)? Well it's time to edit it.

1. Change the value of `BASE_URL` from `http://localhost` to `http://192.168.1.2` (i.e. the IP address that you chose for the server).
2. Open a terminal and navigate to Taekwon's directory.
3. Run `npm run build` to rebuild the client scripts.


#### Checkpoint

Let's see if everything's working so far.

1. Disconnect the server from the router and join the Wi-Fi network that you just created. Your OS may show a warning because of the lack of Internet access; just ignore it.
2. Open a terminal and navigate to Taekwon's directory.
3. Run `npm start` to start the system.
4. Open your browser and enter the static IP of the server as the URL (e.g. [http://192.168.1.2](http://192.168.1.2)). The Corner Judge interface should appear.
5. Connect your smartphone or tablet to the Wi-Fi network, and try the same thing. Depending on your mobile browser, you may have to enter the URL in full (including `http://`) to force it to visit the URL instead of running a web search.

> If you can see the Corner Judge interface in step 4 but not 5, it's most likely due to the server's **firewall**. You'll need to disable it or create an inbound rule for Node.JS.


#### Set up a custom URL

You could stop here and Taekwon would work perfectly fine at the tournament. Let's be honest, though, an IP address doesn't make a good URL. It's difficult to remember and tedious to type, especially on a touch screen. This section explains how you might go about mapping a custom URL, like [http://taekwon.do](http://taekwon.do), to your server's IP address. This is especially useful if you can't set up home screen shortcuts on the judges' devices (cf. [Logistics](#logistics) section), 

If your router supports creating **static DNS mappings** (the technology is called *DNS Masquerading*), it's a cake walk:

1. Open your router's administration interface and look for a page called *Static DNS* (or similar).
2. Add a mapping for a domain name of your choosing (e.g. `taekwon.do`) to the server's static IP address (e.g. `192.168.1.2`).
3. Save the changes and restart the router.

Once the custom DNS mapping is in place:

1. Edit `config/.env` and change the value of `BASE_URL` to the new URL (include the `http://` prefix, but do not add a trailing slash).
2. Run `npm run build` to rebuild the client scripts.
3. Run `npm start` to start the server.
4. Try it out!

> If you can't find the *Static DNS* page, things get a little more complicated and outside of the scope of this documentation. One solution might be to host your own DNS server on the server and point the router to it. This page summarises the issue and points to some good resources: [Accessing Websites on a Local Network (LAN) Web Server](https://www.devside.net/wamp-server/accessing-websites-on-a-local-network-lan-web-server).


### Running Taekwon in production with `forever`

The most difficult part is done: you've managed to get Taekwon to work over a Wi-Fi network! But so far, you've been running the system *in development*. This means that:

- lots of debugging messages are being logged to the terminal and to your browser's developer console (which can be opened by pressing F12), and
- if a critical error were to occur, the server would crash and not be able to restart.

Development mode is great for testing and debugging, but it's not robust enough to withstand real-life conditions. It's time to learn how to run Taekwon *in production*.

The first step is to switch the `NODE_ENV` flag from `development` to `production` in `config/.env`. Once you're done, run `npm run build` to rebuild the client scripts.

The second step has to do with the way Taekwon is started. Basically, instead of running `npm start`, we're going to use a process management tool called `forever`. This tool will **restart** Taekwon automatically if it ever crashes. When restarting, Taekwon is able to restore its entire state like nothing happened (rings, judges, matches, etc.) So by using `forever` we guarantee that the system will remain perfectly functional for the duration of the tournament.

To install `forever` on the server, open a terminal as administrator and run `npm install forever -g`. You can then run the following commands from inside Taekwon's directory:

- `forever start app` to start the system (`app.js`)
- `forever stop app` to stop it
- `forever list` to check whether the system is running
- `forever logs app` to display the logs to the console (in production, only fatal errors are logged)
- `forever logs app -f` to stream the logs to the console (hit `Ctrl-C` to stop the streaming)
- `forever logs` to display the name and location of the log file

> For more information, refer to the [official documentation](https://github.com/foreverjs/forever).


### Ready, set, go!

You're still here? **Congratulations!** You're almost ready to use Taekwon at a tournament. The last step would be to take it for a test run at your local club. This will give you an idea of what to expect, especially in terms of logistics, and a chance to train the judges to use the system.

Oh and of course, don't forget to change the default Jury President password in `config/config.json` and to have a look at the various configuration options available. When you're done, make sure you run `npm run build` to rebuild the client scripts.

**Good luck!**


## About security

Taekwon currently implements two main security features:

- The Jury President interface is protected by a configurable password.
- Jury Presidents have to manually accept Corner Judges who try to join their rings.

These two features prevent unauthorised users from using the system quite effectively, but are no silver bullet. Because it runs on a local network, the system doesn't use SSL or any other kind of encryption. All data exchanged between the server and the clients is transmitted in clear, including the clients' identifiers. This means that anyone connected to the Wi-Fi network could technically intercept and misuse this data, which is why you should strongly consider [securing the network](#set-up-a-local-wi-fi-network).


## Reference

### NPM scripts

- `npm run dev`

This is the preferred command to run in development. It uses Gulp to build the client scripts, lint all the JavaScript files, start the server with [nodemon](https://github.com/remy/nodemon) and watch for file changes. When a file in the `clients` folder changes, Gulp rebuilds the client scripts automatically. When a file in the `app` folder changes, nodemon restarts the server automatically.

- `npm run build`

This command just builds the client scripts. It neither starts the server nor watches for file changes. Run this after modifying `config/.env`.

- `npm start`

This is an alias of `node app`; it simply starts the server. Don't use it in production: [use `forever start app`](#running-taekwon-in-production-with-forever).

- `npm run reset`

This command deletes the `data` folder, which stores the system's database files. This is a good way to start fresh when testing. It can also be useful if you're experiencing problems, or when the database files become too big. Make sure you back up the folder before running the command. Note that you can achieve the same thing by deleting the folder manually.


### Tournament management

When the server starts, it looks for an open tournament in the database. A tournament is *open* if it was started on the same day. If no tournament is found, a new one is started.

To force the start of a new tournament even if one is already open, use `--force`:

- `npm run dev -- --force`
- `npm start -- --force`
- `node app --force`

**BEWARE!** Do not start the server with `forever start app --force`, as if it were to then crash and restart, the ongoing tournament would not be restored. Instead, run `npm start -- --force`, stop the script, and then run `forever start app`.   
