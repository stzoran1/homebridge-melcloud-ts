# homebridge-melcloud-ts-zubadan

An readonly TypeScript version of [Dids's Homebridge plugin](https://github.com/Dids/homebridge-melcloud-ts) for Mitsubishi Melcloud, focused and tested with Zubadan heatpump. Can read temp data from Zone1, hot water tank and outside temperature

# Installation

Follow the instruction in [homebridge](https://www.npmjs.com/package/homebridge) for the homebridge server installation.
The plugin is published through [NPM](https://www.npmjs.com/package/homebridge-melcloud-ts-zubadan) and should be installed "globally" by typing:

> npm install -g homebridge-melcloud-ts-zubadan

# Configuration

Remember to configure the plugin in config.json in your home directory inside the .homebridge directory.
Look for a sample config in [config.json example](https://github.com/stzoran1/homebridge-melcloud-ts-zubadan/blob/master/config.json). 
Simply specify you Melcloud credentials and the language id from one of the following numeric codes:
+ 0	=	en	English
+ 1	=	bg	Български
+ 2	=	cs	Čeština
+ 3	=	da	Dansk
+ 4	=	de	Deutsch
+ 5	=	et	Eesti
+ 6	=	es	Español
+ 7	=	fr	Français
+ 8	=	hy	Հայերեն
+ 9	=	lv	Latviešu
+ 10	=	lt	Lietuvių
+ 11	=	hu	Magyar
+ 12	=	nl	Nederlands
+ 13	=	no	Norwegian
+ 14	=	pl	Polski
+ 15	=	pt	Português
+ 16	=	ru	Русский
+ 17	=	fi	Suomi
+ 18	=	sv	Svenska
+ 19	=	it	Italiano
+ 20	=	uk	Українська
+ 21	=	tr	Türkçe
+ 22	=	el	Ελληνικά
+ 23	=	hr	Hrvatski
+ 24	=	ro	Română
+ 25	=	sl	Slovenščina

# Credit

Thanks to Dids for the [original project](https://github.com/Dids/homebridge-melcloud-ts).

Thanks to ilcato for the original project, as well as Simon “mGeek” Rubuano for his work on [reverse engineering Melcloud] (http://mgeek.fr/blog/un-peu-de-reverse-engineering-sur-melcloud).
