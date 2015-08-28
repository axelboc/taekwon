# Taekwon

Real-time scoring system for **ITF Taekwon-Do** sparring matches, built with [Node.js](http://nodejs.org) and WebSocket ([Primus](https://github.com/primus/primus)).

- [Installation](#installation)
- [Take it for a spin!](#take-it-for-a-spin)
- [Let's get real](#lets-get-real)
  - [Hardware requirements](#hardware-requirements)
    - [Choosing a Wi-Fi router](#choosing-a-wi-fi-router)
  - [Software requirements](#software-requirements)
  - [Logistics](#logistics)
  - [Network and environment configuration](#network-and-environment-configuration)
    - [Set up a local Wi-Fi network](#set-up-a-local-wi-fi-network)
    - [Give the server a static IP address](#give-the-server-a-static-ip-address)
    - [Edit Taekwon's environment configuration](#edit-taekwons-environment-configuration)
    - [Checkpoint](#checkpoint)
    - [Set up a custom URL](#set-up-a-custom-url)
  - [Running Taekwon in production with `forever`](#running-taekwon-in-production-with-forever)
  - [Ready, set, go!](#ready-set-go)
- [About security](#about-security)


## Installation

1. Install [Node.js](http://nodejs.org/), making sure to include npm, the Node package manager.
2. Clone this Git repository, or download the ZIP file and extract it.
3. Open a terminal as administrator and navigate to Taekwon's directory.
4. Run `npm install -g gulp` to install Gulp globally.
5. Run `npm install` to install the local dependencies.
5. Inside the `config` folder, make a copy of `sample.env` and rename it to `.env`.
6. Run `npm run build` to generate the client scripts.


## Take it for a spin!

At this point, Taekwon is ready to be run locally.

1. Run `npm start` to start the server.
2. Open your web browser and visit [http://localhost/jury](http://localhost/jury). This is the **Jury President** interface.
3. Open a different browser or a new browser session (i.e. a private window in Firefox, or an igognito window in Chrome) and visit [http://localhost](http://localhost). This is the **Corner Judge** interface.

That's it! You can now play around with the system:

1. Enter your name in the Corner Judge interface (**CJ**), and the master password (`tkd` by default) in the Jury President interface (**JP**).
2. **JP** Open one of the rings.
3. **CJ** Join the newly opened ring.
4. **JP** Accept the Corner Judge's request to join the ring.
5. **JP** Create a new match and start the first round.
6. **CJ** Score some points.
7. **JP** Control the state of the match until it ends, and check out the results!


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

All devices must be capable of connecting to a Wi-Fi network except for the server, which you may connect to the router with an Ethernet cable. If setting up a separate computer as the server is not practical, you may choose to make use of one of the Jury Presidents' laptops.

Taekwon works on a local network; it doesn't need access to the Internet. Therefore, you won't need to plug in the router to an ADSL socket; only to a power socket.


#### Choosing a Wi-Fi router

If the tournament is held in an area that already provides a Wi-Fi network *and* you are authorised/able to configure this network, ignore this section. If you can't configure the network, then you should find out on which frequency channel it operates (there are plenty of [mobile apps](https://play.google.com/store/search?q=wifi%20analyzer&hl=en) for that). This way you can configure your own network to operate on a different channel in order to reduce interference. If the existing network can be turned off for the duration of the tournament, that's even better!

So all you need is a basic Wi-Fi router. They're pretty cheap nowadays, but you need one that provides good-enough coverage and uses a protocol that is supported by all the devices. You don't need to worry at all about the bandwidth/speed. As of August 2015, the **802.11n** protocol is well supported and provides a much wider range than 802.11g. If you can, choose a router that operates in the 2.4 GHz band rather than the 5 GHz band. And of course, the more antennas the better!

If the tournament is really big or spread out, you may have to install additional routers to repeat the signal. There's no better way to know for sure than to do some field testing.

One more thing to look for when choosing a router is a feature called **static DNS mapping**. This feature allows a router to map a custom domain name (e.g. taekwon.do, tkd.com, etc.) to a local IP address (e.g. `192.168.1.2`). If you're unable to get your hands on a router that supports it, there are alternatives ... but they are quite complex. For more information, refer to the [Set up a custom URL](#set-up-a-custom-url) section.


### Software requirements

Jury Presidents and Corner Judges access their respective interfaces through a **web browser**. Here are some recommendations on which browsers and versions to choose depending on the platform:

- **Desktop**: latest version of Firefox or Chrome; Internet Explorer 11; Microsoft Edge
- **Android**: latest version of Firefox for Android or Chrome for Android
- **iOS**: Safari 6.1 or above
 
The key technology that restricts the range of compatible browsers is *Web Sockets*. The whole system is dependent on it, as it's what allows the clients to communicate with the server in real-time. Therefore, the [Web Sockets support table](http://caniuse.com/#feat=websockets) can help rule out most incompatible browsers.


### Logistics

Laptops should be plugged in to avoid surprises. You will need power cord extensions and power strips to bring power to the Jury President tables and to the router. Since Taekwon doesn't need access to the Internet, all the router need is power. This makes it easier to maximise coverage by placing the router as close to the center of the tournament area as possible.

All battery-powered devices should be fully charged in the morning of the tournament. It might be wise to have a few chargers handy on the day, or to ask Corner Judges to bring their own.

To avoid interuptions, mobile devices should be configured so as to always remain **awake and unlocked**. They should not be allowed to turn off Wi-Fi to save power.

Pins, patterns and other forms of locking mechanisms should be disabled. This is especially important if there is a chance that Corner Judges will share devices (e.g. when a Corner Judge doesn't have his/her own device).

Typically, Corner Judges access the system by typing a URL in a browser. Although very simple in theory, this turns out to be quite a hindrance in practice: the URL has to be communciated to the judges; the URL may be difficult to remember; the `http://` prefix has to be entered in some browsers; and typing a URL on a touch screen is generally slow and prone to errors. A fairly simple workaround is to bookmark the URL and create a shortcut for it on the device's home screen.

In a perfect scenario, the organiser of the tournament would provide all the devices so as to ensure that they are properly configured. If this is not an option (usually for financial reasons), the best you can do is communicate these instructions to the judges in advance and perhaps do a test run before the tournament.

Finally, it's always good to remember that no system is flawless; something could go wrong despite your best efforts:

- a Corner Judge's device could run out of battery or stop working,
- someone could trip over the router's power cord,
- the power could go out,
- a Jury President could spill water on his/her laptop,
- ... the list is endless!

With this in mind, it's wise to have a back up plan in case something goes wrong. Place scoring sheets, pens and flags under the Corner Judges' chairs, and a penalty board on the Jury President's table. Then, decide and explain to the judges how they should react in various scenarios. If something goes wrong in the middle of a match, should the match be stopped? Should the Corner Judges grab a scoring sheet from under their chairs? If a Corner Judge starts using a scoring sheet, would the Jury President be able to compute the results appropriately? And so on and so forth...


### Network and environment configuration

In the [Take it for a spin!](#take-it-for-a-spin!) section, you accessed the system through [http://localhost](http://localhost). This was very convenient to get up and running quickly and test Taekwon on your local machine, but now we need the system to run over a Wi-Fi network. Setting up the network and getting the devices to communciate with the server is not trivial. Hopefully the instructions below are suffiently vulgarised, but if you don't know anything at all about computer networks, you may need the help of someone who does.


#### Set up a local Wi-Fi network

First, let's access the router's adminsitration interface:

1. Connect the router to your computer with an Ethernet cable (one is usually provided when you buy a new router). Note that you don't need to connect the router to the Internet.
2. Open a web browser and visit [http://192.168.1.1](http://192.168.1.1) (the URL may be different, check the router's documentation).
3. Enter the admin password to gain access (`admin` is often the default; if not, check the documentation). Make sure you change the password right away so that nobody else but you can access the interface.

Then, let's create and configure the Wi-Fi network:

1. Create a new Wi-Fi network and give it a meaningful name (SSID), like *TKD* or the name of the tournament, club, organisation, etc. If a network already exists, you may use it but you should still rename it.
2. Select the protocol and frequency (typically 802.11n and 2.4 GHz)
3. If you know there won't be any other Wi-Fi network at the tournament, let the router pick the best channel. Otherwise, select a channel that is as far away from the other networks' channels as possible (cf. [Choosing a Wi-Fi router](choosing-a-wi-fi-router), and set a narrow channel width (typically 20 MHz).
4. Disable any kind of special features like Turbo Mode, Afterburner, etc. to maximise compatibility with all devices.

If security is a concern, you may protect your network with a security key. The main downside is that it will take longer for the Jury Presidents and Corner Judges to join the network, as typing a security key on a touch screen is no easy task. In terms of logistics, you'll also have to find a way to communicate the security key with them and no one else, and make sure they can remember or find it easily in case they need to reconnect. If you decide to go ahead, use WPA2-PSK as the security protocol and choose a relatively short, memorable key.


#### Give the server a static IP address

The server has to be consistently identifiable on the local network, which means it must always have the same IP address. This can be done in two ways:
- by configuring the server's Wi-Fi adapter with a static IP address, or
- by adding a new reserved IP address in the DHCP server configuration of the router (to do so, you'll need the Wi-Fi adapter's MAC address).

The second solution is safer, as it guarantees that the IP address (usually in the start of the DHCP range, like `192.168.1.2`) will never be assigned to any other device. If your router doesn't support this feature, or you prefer to go with the first solution, make sure to pick an IP address in the end of the DHCP range, like `192.168.1.250`. This will reduce the risk of the router assigning this address to another device. 


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

If you can see the Corner Judge interface in step 4 but not 5, it's most likely due to the server's **firewall**. On Windows, if the Wi-Fi network is identified as *public*, try changing it to *private*. Unfortunately, this may not be possible if the network doesn't have a security key; in this case, disable the firewall all together.


#### Set up a custom URL

You could stop here and Taekwon would work perfectly fine at the tournament. Let's be honest, though, an IP address doesn't make a good URL. It's difficult to remember and tedious to type, especially on a touch screen. This section explains how you might go about mapping a custom URL, like [http://taekwon.do](http://taekwon.do), to your server's IP address. This is especially useful if you can't set up home screen shortcuts on the judges' devices (cf. [Logistics](#logistics) section), 

If your router supports **static DNS mapping**, it's a cake walk:

1. Open your router's administration interface and look for a page called *Static DNS* (or similar).
2. Add a mapping for a domain name of your choosing (e.g. `taekwon.do`) to the server's static IP address (e.g. `192.168.1.2`).
3. Save the changes and restart the router.

If you can't find the *Static DNS* page, things get a little more complicated and outside of the scope of this documentation. One solution might be to host your own DNS server on the server and point the router to it.

Once the custom DNS mapping is in place:

1. Edit `config/.env` and change the value of `BASE_URL` to the new URL (include the `http://` prefix, but do not add a trailing slash).
2. Run `npm run build` to rebuild the client scripts.
3. Run `npm start` to start the server.
4. Try it out!


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

For more information, refer to the [official documentation](https://github.com/foreverjs/forever).


### Ready, set, go!

You're still here? **Congratulations!** You're almost ready to use Taekwon at a tournament. The last step would be to take it for a test run at your local club. This will give you an idea of what to expect, especially in terms of logistics, and a chance to train the judges to use the system.

Oh and of course, don't forget to change the default master password in `config/.env` and to have a look at the various configuration options available in `config/config.json`. When you're done, make sure you run `npm run build` to rebuild the client stripts.

Good luck!


## About security

Taekwon currently implements two main security features:

- The Jury President interface is protected by a configurable password.
- Jury Presidents have to manually accept Corner Judges who try to join their rings.

These two features prevent unauthorised users from using the system quite effectively, but are no silver bullet. Because it runs on a local network, the system doesn't use SSL or any other kind of encryption. All data exchanged betwen the server and the clients is transmitted in clear, including the clients' identifiers. This means that anyone connected to the Wi-Fi network could technically intercept and misuse this data, which is why you should strongly consider [securing the network](#set-up-a-local-wi-fi-network).

