Source: https://developer.apple.com/videos/play/wwdc2026/254
Title: Integrate MusicKit into your app - WWDC26 - Videos - Apple Developer
Fetched: 2026-09-08T00:43:41.465Z

* * *

* * *

Integrate MusicKit into your app - WWDC26 - Videos - Apple Developer

[View in English](https://developer.apple.com/videos/play/wwdc2026/254/#)

[More Videos](https://developer.apple.com/videos/)

![](https://developer.apple.com/assets/elements/icons/symbols/gobackward5.svg)![](https://developer.apple.com/assets/elements/icons/symbols/goforward5.svg)

![](https://devimages-cdn.apple.com/wwdc-services/images/9B2E82C5-4DDF-4B9A-9459-328D8E297696/10777/10777_wide_900x506_2x.jpg)

- [About](https://developer.apple.com/videos/play/wwdc2026/254/#)
- [Summary](https://developer.apple.com/videos/play/wwdc2026/254/#)
- [Transcript](https://developer.apple.com/videos/play/wwdc2026/254/#)
- [Code](https://developer.apple.com/videos/play/wwdc2026/254/#)

- # Integrate MusicKit into your app



Bring the power of Apple Music into your app using MusicKit. We'll cover authorization, subscription-status checks, music selection, playback control, and cross-storefront song sharing. Learn how to use the new Music Picker to let people browse the Apple Music catalog and their personal libraries. We'll also break down the differences between SystemMusicPlayer and ApplicationMusicPlayer, and show you how to observe playback state.


## Chapters



  - 0:00 - [Introduction](https://developer.apple.com/videos/play/wwdc2026/254/?time=0)
  - 2:11 - [Project setup and authorization](https://developer.apple.com/videos/play/wwdc2026/254/?time=131)
  - 7:10 - [Music items and music picker](https://developer.apple.com/videos/play/wwdc2026/254/?time=430)
  - 10:54 - [Music players and playback](https://developer.apple.com/videos/play/wwdc2026/254/?time=654)
  - 16:26 - [Catalog requests](https://developer.apple.com/videos/play/wwdc2026/254/?time=986)
  - 20:11 - [Next steps](https://developer.apple.com/videos/play/wwdc2026/254/?time=1211)

## Resources

  - [Integrating MusicKit into your app](https://developer.apple.com/documentation/MusicKit/integrating-musickit-into-your-app)
  - [Apple Services Performance Partner Program](https://performance-partners.apple.com/home)
  - [MusicKit](https://developer.apple.com/documentation/musickit)
    - [HD Video](https://devstreaming-cdn.apple.com/videos/wwdc/2026/254/5/d4b2c60a-8a2a-41d1-a55a-0fd60d927798/downloads/wwdc2026-254_hd.mp4?dl=1)
    - [SD Video](https://devstreaming-cdn.apple.com/videos/wwdc/2026/254/5/d4b2c60a-8a2a-41d1-a55a-0fd60d927798/downloads/wwdc2026-254_sd.mp4?dl=1)

## Related Videos

#### WWDC23

  - [Discover Observation in SwiftUI](https://developer.apple.com/videos/play/wwdc2023/10149)

#### WWDC22

  - [Explore more content with MusicKit](https://developer.apple.com/videos/play/wwdc2022/110347)
  - [Meet Apple Music API and MusicKit](https://developer.apple.com/videos/play/wwdc2022/10148)
- Search this video…






















0:07







[Hi, and welcome to WWDC 2026.](https://developer.apple.com/videos/play/wwdc2026/254/?time=7) [I'm Cathy, an engineer on the MusicKit team!](https://developer.apple.com/videos/play/wwdc2026/254/?time=12) [Today, my teammate Alan and I want to demonstrate](https://developer.apple.com/videos/play/wwdc2026/254/?time=16) [how to integrate MusicKit into an app.](https://developer.apple.com/videos/play/wwdc2026/254/?time=20)







0:24







[MusicKit is a Swift framework for Apple platforms](https://developer.apple.com/videos/play/wwdc2026/254/?time=24) [that offers a set of APIs](https://developer.apple.com/videos/play/wwdc2026/254/?time=28) [for your apps to access and play music.](https://developer.apple.com/videos/play/wwdc2026/254/?time=30) [Designed with Swift concurrency and SwiftUI in mind,](https://developer.apple.com/videos/play/wwdc2026/254/?time=35) [MusicKit streamlines integration with Apple Music.](https://developer.apple.com/videos/play/wwdc2026/254/?time=39) [You can build rich, music enhanced experiences,](https://developer.apple.com/videos/play/wwdc2026/254/?time=43) [so people can browse and play the Apple Music catalog](https://developer.apple.com/videos/play/wwdc2026/254/?time=47) [and a person's media library](https://developer.apple.com/videos/play/wwdc2026/254/?time=51) [straight from an app.](https://developer.apple.com/videos/play/wwdc2026/254/?time=54) [Alan and I will cover many key MusicKit concepts today](https://developer.apple.com/videos/play/wwdc2026/254/?time=56) [while enhancing the workout app he and I made.](https://developer.apple.com/videos/play/wwdc2026/254/?time=60) [First, I'll explain how to configure Xcode and handle music access.](https://developer.apple.com/videos/play/wwdc2026/254/?time=63) [Then, I will cover what a MusicKit music item is](https://developer.apple.com/videos/play/wwdc2026/254/?time=70) [and how I can select one.](https://developer.apple.com/videos/play/wwdc2026/254/?time=74)







1:18







[Alan will build on my music selection work](https://developer.apple.com/videos/play/wwdc2026/254/?time=78) [and prepare selected songs for playback.](https://developer.apple.com/videos/play/wwdc2026/254/?time=80) [And lastly, Alan will dive into music catalog requests](https://developer.apple.com/videos/play/wwdc2026/254/?time=85) [to further customize the app he and I made.](https://developer.apple.com/videos/play/wwdc2026/254/?time=89) [Now, I want to go through the flow of the workout app](https://developer.apple.com/videos/play/wwdc2026/254/?time=94) [before diving into MusicKit integration.](https://developer.apple.com/videos/play/wwdc2026/254/?time=97) [To follow along, you can find the completed sample code](https://developer.apple.com/videos/play/wwdc2026/254/?time=102) [at the developer documentation site.](https://developer.apple.com/videos/play/wwdc2026/254/?time=105)







1:49







[I'll run the app and go through the current flow.](https://developer.apple.com/videos/play/wwdc2026/254/?time=109) [When I start a bike workout, a screen pops up with a stopwatch,](https://developer.apple.com/videos/play/wwdc2026/254/?time=113) [along with a button to end my session.](https://developer.apple.com/videos/play/wwdc2026/254/?time=117)







2:03







[This is a good start, but I'd like to pick music to play during my workouts,](https://developer.apple.com/videos/play/wwdc2026/254/?time=123) [so I want to integrate MusicKit!](https://developer.apple.com/videos/play/wwdc2026/254/?time=128) [Before I start to code, I need to configure some settings](https://developer.apple.com/videos/play/wwdc2026/254/?time=131) [as part of my project setup.](https://developer.apple.com/videos/play/wwdc2026/254/?time=134) [One of those settings is registering for a developer token](https://developer.apple.com/videos/play/wwdc2026/254/?time=137) [on the developer portal, which is needed to make MusicKit requests.](https://developer.apple.com/videos/play/wwdc2026/254/?time=141) [Once you register for a developer token,](https://developer.apple.com/videos/play/wwdc2026/254/?time=146) [it's generated on your behalf automatically.](https://developer.apple.com/videos/play/wwdc2026/254/?time=149)







2:34







[To enable automatic token generation,](https://developer.apple.com/videos/play/wwdc2026/254/?time=154) [I'll navigate to the page](https://developer.apple.com/videos/play/wwdc2026/254/?time=157) [where I register my App ID.](https://developer.apple.com/videos/play/wwdc2026/254/?time=159) [I need to make sure the MusicKit checkbox is checked in the App Services tab.](https://developer.apple.com/videos/play/wwdc2026/254/?time=162)







2:49







[The tokens are associated with my developer account,](https://developer.apple.com/videos/play/wwdc2026/254/?time=169) [so I'll want to verify that I'm logged into that same account in Xcode.](https://developer.apple.com/videos/play/wwdc2026/254/?time=172) [Now, I'll return back to the app!](https://developer.apple.com/videos/play/wwdc2026/254/?time=179) [I'd like to pick music to play during my workout,](https://developer.apple.com/videos/play/wwdc2026/254/?time=182) [but before I can pick music,](https://developer.apple.com/videos/play/wwdc2026/254/?time=185) [I have to give permission for MusicKit to access my music content.](https://developer.apple.com/videos/play/wwdc2026/254/?time=187) [To request authorization,](https://developer.apple.com/videos/play/wwdc2026/254/?time=192) [I will use MusicKit's MusicAuthorization request method,](https://developer.apple.com/videos/play/wwdc2026/254/?time=195) [which is an asynchronous method](https://developer.apple.com/videos/play/wwdc2026/254/?time=200) [that returns whether the app's music access is approved.](https://developer.apple.com/videos/play/wwdc2026/254/?time=202) [MusicKit will then prompt the person with a permissions alert.](https://developer.apple.com/videos/play/wwdc2026/254/?time=207) [I have the ability to configure the description of this alert](https://developer.apple.com/videos/play/wwdc2026/254/?time=213) [with more context for how my app will use the access,](https://developer.apple.com/videos/play/wwdc2026/254/?time=218) [which I can do in my project settings.](https://developer.apple.com/videos/play/wwdc2026/254/?time=221)







3:45







[To provide a reason to access music content,](https://developer.apple.com/videos/play/wwdc2026/254/?time=225) [I'll navigate to the Signing & Capabilities tab of my Xcode project,](https://developer.apple.com/videos/play/wwdc2026/254/?time=229) [and add the Media Library capability.](https://developer.apple.com/videos/play/wwdc2026/254/?time=234) [In the text box, I can describe how my app intends to use](https://developer.apple.com/videos/play/wwdc2026/254/?time=239) [the person's music library.](https://developer.apple.com/videos/play/wwdc2026/254/?time=243) [This description will appear at the bottom of the permissions alert](https://developer.apple.com/videos/play/wwdc2026/254/?time=246) [when you request authorization.](https://developer.apple.com/videos/play/wwdc2026/254/?time=250) [If the person isn't subscribed but wants to listen to content](https://developer.apple.com/videos/play/wwdc2026/254/?time=253) [in the Apple Music catalog,](https://developer.apple.com/videos/play/wwdc2026/254/?time=257) [I want to give them a way to subscribe.](https://developer.apple.com/videos/play/wwdc2026/254/?time=259) [An Apple Music subscription is not required to use MusicKit,](https://developer.apple.com/videos/play/wwdc2026/254/?time=262) [but the app will only be able to access purchased or synced music without one.](https://developer.apple.com/videos/play/wwdc2026/254/?time=267) [If there isn't an active subscription,](https://developer.apple.com/videos/play/wwdc2026/254/?time=273) [I can use a MusicKit subscription offer view modifier](https://developer.apple.com/videos/play/wwdc2026/254/?time=275) [to give an opportunity to subscribe to Apple Music, without leaving my app.](https://developer.apple.com/videos/play/wwdc2026/254/?time=281) [The .musicSubscriptionOffer is a view modifier](https://developer.apple.com/videos/play/wwdc2026/254/?time=286) [that accepts an isPresented binding parameter,](https://developer.apple.com/videos/play/wwdc2026/254/?time=290) [which changes in this view when the button is tapped.](https://developer.apple.com/videos/play/wwdc2026/254/?time=293)







5:00







[When presented, the subscription offer UI gives people steps](https://developer.apple.com/videos/play/wwdc2026/254/?time=300) [to quickly sign up for an Apple Music subscription.](https://developer.apple.com/videos/play/wwdc2026/254/?time=304) [As a developer,](https://developer.apple.com/videos/play/wwdc2026/254/?time=309) [you have the potential to earn commissions](https://developer.apple.com/videos/play/wwdc2026/254/?time=310) [when someone subscribes to Apple Music through your app,](https://developer.apple.com/videos/play/wwdc2026/254/?time=313) [as part of the Apple Services Performance Partner Program.](https://developer.apple.com/videos/play/wwdc2026/254/?time=317) [You can specify your information for this program](https://developer.apple.com/videos/play/wwdc2026/254/?time=322) [in a MusicSubscriptionOffer.Options structure,](https://developer.apple.com/videos/play/wwdc2026/254/?time=325) [and pass it into the view modifier.](https://developer.apple.com/videos/play/wwdc2026/254/?time=330) [The options struct also allows you to set a message identifier,](https://developer.apple.com/videos/play/wwdc2026/254/?time=333) [which changes what UI is presented.](https://developer.apple.com/videos/play/wwdc2026/254/?time=338) [Since my ultimate goal is to play music, I'll set the messageIdentifier](https://developer.apple.com/videos/play/wwdc2026/254/?time=341) [for my options as .playMusic.](https://developer.apple.com/videos/play/wwdc2026/254/?time=346)







5:51







[You can customize the message identifier](https://developer.apple.com/videos/play/wwdc2026/254/?time=351) [to have different UI treatments for your use case.](https://developer.apple.com/videos/play/wwdc2026/254/?time=354)







5:58







[In the main view, I need to declare a @State property](https://developer.apple.com/videos/play/wwdc2026/254/?time=358) [representing the subscription status.](https://developer.apple.com/videos/play/wwdc2026/254/?time=362) [I only want to have the subscription button if the person isn't subscribed,](https://developer.apple.com/videos/play/wwdc2026/254/?time=365) [and has the potential to become subscribed.](https://developer.apple.com/videos/play/wwdc2026/254/?time=370) [To update the subscription status,](https://developer.apple.com/videos/play/wwdc2026/254/?time=374) [I can add a .task that runs when authorization is granted.](https://developer.apple.com/videos/play/wwdc2026/254/?time=377) [In here, I'll grab the current value, as well as listen for any updates](https://developer.apple.com/videos/play/wwdc2026/254/?time=381) [that might occur and set the value accordingly.](https://developer.apple.com/videos/play/wwdc2026/254/?time=387)







6:36







[Now that I'm authorized and subscribed, I can use my subscription](https://developer.apple.com/videos/play/wwdc2026/254/?time=396) [to play music from the Apple Music catalog](https://developer.apple.com/videos/play/wwdc2026/254/?time=400) [during my workout!](https://developer.apple.com/videos/play/wwdc2026/254/?time=403) [First, I need to pick a song to play.](https://developer.apple.com/videos/play/wwdc2026/254/?time=405) [Specifically, I am going to pick a MusicKit song object.](https://developer.apple.com/videos/play/wwdc2026/254/?time=408) [MusicItems are the building blocks for using MusicKit APIs,](https://developer.apple.com/videos/play/wwdc2026/254/?time=414) [so I'll begin with explaining those.](https://developer.apple.com/videos/play/wwdc2026/254/?time=418) [Then, I'll explain how to pick music items using the music picker.](https://developer.apple.com/videos/play/wwdc2026/254/?time=421) [I'll dive into music items first.](https://developer.apple.com/videos/play/wwdc2026/254/?time=427) [An Album music item, for example, is a value type](https://developer.apple.com/videos/play/wwdc2026/254/?time=430) [in MusicKit's model layer.](https://developer.apple.com/videos/play/wwdc2026/254/?time=434)







7:18







[Each music item has Attributes, which are simple built-in properties.](https://developer.apple.com/videos/play/wwdc2026/254/?time=438) [An Album object, for example, has attributes that describe](https://developer.apple.com/videos/play/wwdc2026/254/?time=444) [the title of the album,](https://developer.apple.com/videos/play/wwdc2026/254/?time=449) [or what the album's contentRating is.](https://developer.apple.com/videos/play/wwdc2026/254/?time=451)







7:35







[Music items also have Relationships which describe related content,](https://developer.apple.com/videos/play/wwdc2026/254/?time=455) [like an Album's tracks, another MusicKit music item type.](https://developer.apple.com/videos/play/wwdc2026/254/?time=461)







7:47







[Associations describe a type's related content as well,](https://developer.apple.com/videos/play/wwdc2026/254/?time=467) [but associations generally have weaker ties to the type than a relationship has.](https://developer.apple.com/videos/play/wwdc2026/254/?time=471) [One Album association is the otherVersions,](https://developer.apple.com/videos/play/wwdc2026/254/?time=478) [which is a collection of other albums.](https://developer.apple.com/videos/play/wwdc2026/254/?time=482)







8:06







[So far I've focused on Album but there are many other MusicKit music item types,](https://developer.apple.com/videos/play/wwdc2026/254/?time=486) [like Genres, Stations, and Playlists.](https://developer.apple.com/videos/play/wwdc2026/254/?time=492) [Now that I've covered what music items are,](https://developer.apple.com/videos/play/wwdc2026/254/?time=497) [it's time to start using them!](https://developer.apple.com/videos/play/wwdc2026/254/?time=500) [To pick music to listen to for my workout, I can utilize the music picker,](https://developer.apple.com/videos/play/wwdc2026/254/?time=502) [which surfaces both the Apple Music catalog and the music library](https://developer.apple.com/videos/play/wwdc2026/254/?time=508) [in a single, unified interface.](https://developer.apple.com/videos/play/wwdc2026/254/?time=514) [The music picker leverages many kinds of MusicKit requests in one place,](https://developer.apple.com/videos/play/wwdc2026/254/?time=517) [allowing for several ways to discover music someone may want to pick.](https://developer.apple.com/videos/play/wwdc2026/254/?time=522) [To pick a MusicKit song,](https://developer.apple.com/videos/play/wwdc2026/254/?time=528) [I need to add the .musicPicker SwiftUI view modifier!](https://developer.apple.com/videos/play/wwdc2026/254/?time=530) [I have a base button already, but I need to add some state variables,](https://developer.apple.com/videos/play/wwdc2026/254/?time=535) [starting with a toggle for if the picker should be shown.](https://developer.apple.com/videos/play/wwdc2026/254/?time=540) [Next, the selected song property represents an initial song selection.](https://developer.apple.com/videos/play/wwdc2026/254/?time=544) [I don't have anything selected, so it can be nil here by default.](https://developer.apple.com/videos/play/wwdc2026/254/?time=550)







9:16







[Now, I can add the modifier.](https://developer.apple.com/videos/play/wwdc2026/254/?time=556)







9:21







[Now, I'm going to add my musicPickerButton button to my main view](https://developer.apple.com/videos/play/wwdc2026/254/?time=561) [where I added the other buttons.](https://developer.apple.com/videos/play/wwdc2026/254/?time=566) [The music picker does not require a subscription,](https://developer.apple.com/videos/play/wwdc2026/254/?time=569) [which is why I have it regardless of the subscription check.](https://developer.apple.com/videos/play/wwdc2026/254/?time=572) [If there is no subscription, the picker will only show music items](https://developer.apple.com/videos/play/wwdc2026/254/?time=576) [from the person's library, rather than both the library and catalog.](https://developer.apple.com/videos/play/wwdc2026/254/?time=580) [I'll now build and run this!](https://developer.apple.com/videos/play/wwdc2026/254/?time=586) [I really like Olivia Dean, so I'll pick my current favorite Olivia Dean song.](https://developer.apple.com/videos/play/wwdc2026/254/?time=589) [To do so, I'm going to tap the search bar, and search for the song.](https://developer.apple.com/videos/play/wwdc2026/254/?time=595) [Once I find the result I want, I can tap the plus button](https://developer.apple.com/videos/play/wwdc2026/254/?time=600) [on the right of the song information,](https://developer.apple.com/videos/play/wwdc2026/254/?time=604) [and dismiss the picker.](https://developer.apple.com/videos/play/wwdc2026/254/?time=606) [Great, I have "Lady Lady" selected for my bike ride,](https://developer.apple.com/videos/play/wwdc2026/254/?time=609) [but for a 30 minute workout, I want to listen to more than one song.](https://developer.apple.com/videos/play/wwdc2026/254/?time=612)







10:18







[I need to allow for multi-selection in the picker](https://developer.apple.com/videos/play/wwdc2026/254/?time=618) [by changing the selection object to an array.](https://developer.apple.com/videos/play/wwdc2026/254/?time=622)







10:26







[I'll pick 3 songs to start,](https://developer.apple.com/videos/play/wwdc2026/254/?time=626) [but I can also select entire albums or playlists](https://developer.apple.com/videos/play/wwdc2026/254/?time=629) [by going to their detail pages and pressing the plus button at the top.](https://developer.apple.com/videos/play/wwdc2026/254/?time=633) [Okay, I've chosen my songs and can now dismiss the picker.](https://developer.apple.com/videos/play/wwdc2026/254/?time=638)







10:44







[Now that I've selected music, I want to play it.](https://developer.apple.com/videos/play/wwdc2026/254/?time=644) [My teammate, Alan, will take it from here](https://developer.apple.com/videos/play/wwdc2026/254/?time=648) [to go over adding playback to the workout app.](https://developer.apple.com/videos/play/wwdc2026/254/?time=650) [Thanks, Cathy.](https://developer.apple.com/videos/play/wwdc2026/254/?time=654) [Time to play some music, using MusicKit's MusicPlayers!](https://developer.apple.com/videos/play/wwdc2026/254/?time=656) [MusicKit offers two different players, SystemMusicPlayer](https://developer.apple.com/videos/play/wwdc2026/254/?time=660) [and ApplicationMusicPlayer.](https://developer.apple.com/videos/play/wwdc2026/254/?time=664) [Both players are subclasses of MusicPlayer.](https://developer.apple.com/videos/play/wwdc2026/254/?time=667) [SystemMusicPlayer controls the system Music app,](https://developer.apple.com/videos/play/wwdc2026/254/?time=671) [while ApplicationMusicPlayer plays from your app.](https://developer.apple.com/videos/play/wwdc2026/254/?time=675)







11:20







[With SystemMusicPlayer, you may only set the queue.](https://developer.apple.com/videos/play/wwdc2026/254/?time=680) [You can't see what is in the queue except for the currently playing item.](https://developer.apple.com/videos/play/wwdc2026/254/?time=684) [Meanwhile, you have full read and write access](https://developer.apple.com/videos/play/wwdc2026/254/?time=689) [to the ApplicationMusicPlayer's queue.](https://developer.apple.com/videos/play/wwdc2026/254/?time=693)







11:37







[Both music players let you set whether a queue will show up](https://developer.apple.com/videos/play/wwdc2026/254/?time=697) [in the Music app's Recently Played](https://developer.apple.com/videos/play/wwdc2026/254/?time=702) [and both allow you to set playback state,](https://developer.apple.com/videos/play/wwdc2026/254/?time=705) [such as the Repeat and Shuffle mode.](https://developer.apple.com/videos/play/wwdc2026/254/?time=708)







11:53







[Finally, because SystemMusicPlayer controls the system's Music app,](https://developer.apple.com/videos/play/wwdc2026/254/?time=713) [it will continue playing even when your app is backgrounded or quits.](https://developer.apple.com/videos/play/wwdc2026/254/?time=718) [For the same backgrounding behavior using ApplicationMusicPlayer,](https://developer.apple.com/videos/play/wwdc2026/254/?time=724) [enable the Audio Background Mode capability](https://developer.apple.com/videos/play/wwdc2026/254/?time=729) [in the Xcode project settings.](https://developer.apple.com/videos/play/wwdc2026/254/?time=732) [A queue consists of a collection of playable music items,](https://developer.apple.com/videos/play/wwdc2026/254/?time=735) [such as songs.](https://developer.apple.com/videos/play/wwdc2026/254/?time=740) [A queue is set on a MusicPlayer.](https://developer.apple.com/videos/play/wwdc2026/254/?time=742) [The MusicPlayer's repeat or shuffle behaviour is configurable by its state.](https://developer.apple.com/videos/play/wwdc2026/254/?time=745)







12:33







[To start playing, call play() on the MusicPlayer.](https://developer.apple.com/videos/play/wwdc2026/254/?time=753) [To stop playing, call pause().](https://developer.apple.com/videos/play/wwdc2026/254/?time=758)







12:43







[First, the MusicPlayer loads the queue.](https://developer.apple.com/videos/play/wwdc2026/254/?time=763)







12:49







[Then, the MusicPlayer has to load the audio assets](https://developer.apple.com/videos/play/wwdc2026/254/?time=769) [before the player can output music!](https://developer.apple.com/videos/play/wwdc2026/254/?time=773) [This may take a bit of time.](https://developer.apple.com/videos/play/wwdc2026/254/?time=777)







13:02







[If you know ahead of time what to play, buffer the MusicPlayer](https://developer.apple.com/videos/play/wwdc2026/254/?time=782) [using prepareToPlay().](https://developer.apple.com/videos/play/wwdc2026/254/?time=787) [This reduces the amount of time needed to output music when you call play().](https://developer.apple.com/videos/play/wwdc2026/254/?time=789)







13:16







[A queue can be created from any playable music item, such as songs](https://developer.apple.com/videos/play/wwdc2026/254/?time=796) [or container types, such as an album or playlist.](https://developer.apple.com/videos/play/wwdc2026/254/?time=801)







13:28







[Using the special queue initializers for container types](https://developer.apple.com/videos/play/wwdc2026/254/?time=808) [allows the music player to lazily load the container's items,](https://developer.apple.com/videos/play/wwdc2026/254/?time=812) [further reducing the load time!](https://developer.apple.com/videos/play/wwdc2026/254/?time=817) [When music is played using MusicKit, it will generally appear](https://developer.apple.com/videos/play/wwdc2026/254/?time=820) [in the person's listening history in the Music app.](https://developer.apple.com/videos/play/wwdc2026/254/?time=824) [affectsListeningHistory is an instance property](https://developer.apple.com/videos/play/wwdc2026/254/?time=827) [that determines whether the queue will show](https://developer.apple.com/videos/play/wwdc2026/254/?time=830) [in the person's Recently Played shelf in the Music app.](https://developer.apple.com/videos/play/wwdc2026/254/?time=833) [It defaults to "true" but respects the Use Listening History setting](https://developer.apple.com/videos/play/wwdc2026/254/?time=837) [for the Music app.](https://developer.apple.com/videos/play/wwdc2026/254/?time=842) [To observe and control the player, both MusicPlayers have observable](https://developer.apple.com/videos/play/wwdc2026/254/?time=844) [properties for their playback state and queue.](https://developer.apple.com/videos/play/wwdc2026/254/?time=850)







14:14







[ApplicationMusicPlayer has a queue where you have full control.](https://developer.apple.com/videos/play/wwdc2026/254/?time=854) [These are observable classes that you can use directly in your SwiftUI view .](https://developer.apple.com/videos/play/wwdc2026/254/?time=859) [To learn more about observation in Swift, check out the Discover Observation](https://developer.apple.com/videos/play/wwdc2026/254/?time=865) [in SwiftUI session from WWDC 2023.](https://developer.apple.com/videos/play/wwdc2026/254/?time=869) [In the workout app, I'd like to put the artwork](https://developer.apple.com/videos/play/wwdc2026/254/?time=874) [front and center during a workout.](https://developer.apple.com/videos/play/wwdc2026/254/?time=877) [I'll also show the title and subtitle of the current song, and a set of controls.](https://developer.apple.com/videos/play/wwdc2026/254/?time=880)







14:49







[To get the currently playing song, I'll reference the player's queue.](https://developer.apple.com/videos/play/wwdc2026/254/?time=889) [Then, if the currently playing song in the queue has an artwork,](https://developer.apple.com/videos/play/wwdc2026/254/?time=895) [I'll use MusicKit's ArtworkImage SwiftUI view to display the artwork.](https://developer.apple.com/videos/play/wwdc2026/254/?time=899)







15:06







[To show the song info, I'll use the title and subtitle](https://developer.apple.com/videos/play/wwdc2026/254/?time=906) [of the currently playing entry.](https://developer.apple.com/videos/play/wwdc2026/254/?time=911)







15:14







[To control play/pause, I'll add a button.](https://developer.apple.com/videos/play/wwdc2026/254/?time=914) [I'll read the state of ApplicationMusicPlayer](https://developer.apple.com/videos/play/wwdc2026/254/?time=918) [and derive whether it's currently playing by checking playbackStatus.](https://developer.apple.com/videos/play/wwdc2026/254/?time=922)







15:27







[The button calls "pause" when the player is currently playing](https://developer.apple.com/videos/play/wwdc2026/254/?time=927) [and "play" otherwise.](https://developer.apple.com/videos/play/wwdc2026/254/?time=931)







15:38







[Finally, the Back button calls skipToPreviousEntry](https://developer.apple.com/videos/play/wwdc2026/254/?time=938) [to go to the previous song](https://developer.apple.com/videos/play/wwdc2026/254/?time=942) [and skipToNextEntry in the Next button.](https://developer.apple.com/videos/play/wwdc2026/254/?time=944)







15:51







[In the music picker, I can tap on the plus button at the top of my running playlist](https://developer.apple.com/videos/play/wwdc2026/254/?time=951) [to choose all the songs in this playlist.](https://developer.apple.com/videos/play/wwdc2026/254/?time=956) [Then, I'll tap on Done.](https://developer.apple.com/videos/play/wwdc2026/254/?time=959) [The first song is playing now,](https://developer.apple.com/videos/play/wwdc2026/254/?time=961) [and the ArtworkImage I just put reflects the currently playing song!](https://developer.apple.com/videos/play/wwdc2026/254/?time=963) [I'll tap on Pause, and the player pauses.](https://developer.apple.com/videos/play/wwdc2026/254/?time=967) [Tap on Next, and the artwork now shows the next song!](https://developer.apple.com/videos/play/wwdc2026/254/?time=971) [I'd like to make it more convenient for those using my app](https://developer.apple.com/videos/play/wwdc2026/254/?time=975) [to get their workout going](https://developer.apple.com/videos/play/wwdc2026/254/?time=978) [by suggesting some songs that they can tap on in the workout view](https://developer.apple.com/videos/play/wwdc2026/254/?time=980) [to quickly start listening!](https://developer.apple.com/videos/play/wwdc2026/254/?time=983) [Catalog requests allow your app to query Apple Music and provide music content](https://developer.apple.com/videos/play/wwdc2026/254/?time=986) [independent of the person's library, such as curated content for your app.](https://developer.apple.com/videos/play/wwdc2026/254/?time=991)







16:37







[In MusicKit, structured music catalog requests](https://developer.apple.com/videos/play/wwdc2026/254/?time=997) [allow you to fetch content from Apple Music API.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1000) [MusicKit offers several structured requests,](https://developer.apple.com/videos/play/wwdc2026/254/?time=1005) [such as getting items based on a specific filter, searching for music,](https://developer.apple.com/videos/play/wwdc2026/254/?time=1008) [and other Apple Music curated and personalized content!](https://developer.apple.com/videos/play/wwdc2026/254/?time=1013) [Explore the MusicKit documentation for the full list and how to use them.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1017) [MusicCatalogResourceRequest](https://developer.apple.com/videos/play/wwdc2026/254/?time=1023) [is a structured catalog request](https://developer.apple.com/videos/play/wwdc2026/254/?time=1025) [for a specific resource.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1027) [In this example, we'll make a request for songs.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1029) [A request contains some configurations, such as options,](https://developer.apple.com/videos/play/wwdc2026/254/?time=1033) [if you want to set the behavior of the request.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1037) [I'll talk more about options in a moment.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1040)







17:24







[You can set properties on the request that specifies relationships](https://developer.apple.com/videos/play/wwdc2026/254/?time=1044) [and associations you also want to fulfill](https://developer.apple.com/videos/play/wwdc2026/254/?time=1049) [as part of this songs request.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1051) [For example, you may also want the Artists relationship of the song.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1054)







17:40







[And, you can set a limit on the number of items to return in the response.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1060)







17:47







[When you call the asynchronous response() method, MusicKit fulfills the request.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1067)







17:54







[The method returns a MusicCatalogResourceResponse](https://developer.apple.com/videos/play/wwdc2026/254/?time=1074) [which contains the results of the request](https://developer.apple.com/videos/play/wwdc2026/254/?time=1078) [as a strongly-typed MusicItemCollection.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1081) [MusicItemCollection is a MusicKit type, containing a collection of music items.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1085) [In this example, it contains Songs.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1090)







18:15







[MusicItemCollection supports pagination,](https://developer.apple.com/videos/play/wwdc2026/254/?time=1095) [so if your request produced too many results,](https://developer.apple.com/videos/play/wwdc2026/254/?time=1098) [hasNextBatch will be "true" and you can get the next page](https://developer.apple.com/videos/play/wwdc2026/254/?time=1101) [using the asynchronous nextBatch() method.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1104) [When making resource requests,](https://developer.apple.com/videos/play/wwdc2026/254/?time=1108) [resource availability depends on the account's settings](https://developer.apple.com/videos/play/wwdc2026/254/?time=1110) [and storefront or region.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1113) [For example, a resource you request in one region](https://developer.apple.com/videos/play/wwdc2026/254/?time=1115) [may have an equivalent resource with a different ID in another region.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1119) [Additionally, a resource for explicit content](https://developer.apple.com/videos/play/wwdc2026/254/?time=1124) [may have an equivalent clean resource](https://developer.apple.com/videos/play/wwdc2026/254/?time=1128) [when the account does not allow explicit content.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1130)







18:58







[I'll make a fetchSongs method that has an input of a collection of song IDs,](https://developer.apple.com/videos/play/wwdc2026/254/?time=1138) [where the first ID is treated as a featured song.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1143) [The method uses a MusicCatalogResourceRequest](https://developer.apple.com/videos/play/wwdc2026/254/?time=1147) [for songs that match the IDs](https://developer.apple.com/videos/play/wwdc2026/254/?time=1151) [in the songIDs argument.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1152)







19:16







[I'll also add the findEquivalents option flag](https://developer.apple.com/videos/play/wwdc2026/254/?time=1156) [to enable the resource equivalency behavior I just talked about.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1159) [Then, I'll call the response() method to fetch the content.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1164)







19:30







[To capture the featured song, I'll use the item(for:) method](https://developer.apple.com/videos/play/wwdc2026/254/?time=1170) [using the first ID in the input collection of IDs.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1174) [The catalog request is not guaranteed to return everything that was requested,](https://developer.apple.com/videos/play/wwdc2026/254/?time=1179) [such as if a resource is unavailable.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1184)







19:48







[Finally, I'll get the other songs in order.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1188)







19:53







[Now I'm ready for my workout!](https://developer.apple.com/videos/play/wwdc2026/254/?time=1193) [I'll go back to my app, start another workout,](https://developer.apple.com/videos/play/wwdc2026/254/?time=1195) [and now I have a shelf of some songs that you can quickly pick](https://developer.apple.com/videos/play/wwdc2026/254/?time=1198) [when you want to get your workout going now!](https://developer.apple.com/videos/play/wwdc2026/254/?time=1202) [Tapping on one of these artworks will immediately start playing it!](https://developer.apple.com/videos/play/wwdc2026/254/?time=1205) [That's all you need to know about integrating MusicKit into your app!](https://developer.apple.com/videos/play/wwdc2026/254/?time=1211) [As Cathy talked about, adopt the music picker view modifier](https://developer.apple.com/videos/play/wwdc2026/254/?time=1216) [to provide a unified and familiar music picking experience in your app!](https://developer.apple.com/videos/play/wwdc2026/254/?time=1220) [The Apple Music catalog contains a wealth of content that your app can play.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1226) [For example, add some background music to enrich your app experience!](https://developer.apple.com/videos/play/wwdc2026/254/?time=1230) [And, check out other MusicKit APIs, such as requests to browse and modify](https://developer.apple.com/videos/play/wwdc2026/254/?time=1235) [library content covered in "Explore more content with MusicKit",](https://developer.apple.com/videos/play/wwdc2026/254/?time=1241) [from WWDC2022.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1245) [If you're interested in integrating on Android or the web,](https://developer.apple.com/videos/play/wwdc2026/254/?time=1248) [check out "Meet Apple Music API and MusicKit".](https://developer.apple.com/videos/play/wwdc2026/254/?time=1252) [Thank you for watching.](https://developer.apple.com/videos/play/wwdc2026/254/?time=1257)

- - Copy Code
      4:47 - [Presents the Apple Music subscription offer](https://developer.apple.com/videos/play/wwdc2026/254/?time=287)


      ```
      @State var showSubscriptionOffer = false

      let options = MusicSubscriptionOffer.Options(
          messageIdentifier: .playMusic
      )

      @ViewBuilder
      var musicSubsriptionButton: some View {
          Button("Subscribe to Apple Music", systemImage: "music.note") {
              showSubscriptionOffer = true
          }
          .musicSubscriptionOffer(isPresented: $showSubscriptionOffer, options: options)
      }
      ```

  - Copy Code
    5:59 - [Adds subscription button to main view](https://developer.apple.com/videos/play/wwdc2026/254/?time=359)


    ```
    @State var subscription: MusicSubscription?

    var body: some View {
      	VStack {
            // ...
            if let subscription, subscription.canBecomeSubscriber {
                musicSubscriptionButton
            }
        }
        .task(id: isAuthorized) {
    	      self.subscription = try? await MusicSubscription.current
            for await subscription in MusicSubscription.subscriptionUpdates {
                self.subscription = subscription
            }
        }
    }
    ```

  - Copy Code
    8:48 - [Add .musicPicker() modifier](https://developer.apple.com/videos/play/wwdc2026/254/?time=528)


    ```
    @State var showMusicPicker = false
    @State var selectedSong: Song? = nil

    @ViewBuilder
    var musicPickerButton: some View {
        Button("Pick some Music", systemImage: "music.note.list") {
            showMusicPicker = true
        }
        .musicPicker(isPresented: $showMusicPicker, selection: $selectedSong)
    }

    var body: some View {
        VStack {
            if let subscription, subscription.canBecomeSubscriber {
                musicSubscriptionButton
            }
            musicPickerButton
        }
    }
    ```

  - Copy Code
    14:49 - [Artwork](https://developer.apple.com/videos/play/wwdc2026/254/?time=889)


    ```
    @State var queue = ApplicationMusicPlayer.shared.queue

    var body: some View {
        VStack {
            if let artwork = queue.currentEntry?.artwork {
                ArtworkImage(artwork, width: 200, height: 200)
            } else {
                // Placeholder artwork
                RoundedRectangle(cornerRadius: 16)
                    .fill(.quaternary)
                    .frame(width: 200, height: 200)
            }
        }
    }
    ```

  - Copy Code
    15:06 - [Current entry info](https://developer.apple.com/videos/play/wwdc2026/254/?time=906)


    ```
    @State var queue = ApplicationMusicPlayer.shared.queue

    var body: some View {
        VStack {
            // ...
            if let currentSong = queue.currentEntry {
                Text(currentSong.title)
                    .font(.title3.bold())

                if let subtitle = currentSong.subtitle {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
    ```

  - Copy Code
    15:14 - [Playback controls (play, pause)](https://developer.apple.com/videos/play/wwdc2026/254/?time=914)


    ```
    let player = ApplicationMusicPlayer.shared
    @State var state = ApplicationMusicPlayer.shared.state

    var isPlaying: Bool {
        state.playbackStatus == .playing
    }

    var playPause: some View {
        Button (
            isPlaying ? "Pause": "Play",
            systemImage: isplaying ? "pause.fill" : "play.fill"
        ) {
            if isPlaying {
                player.pause()
            } else {
                Task {
                    try await player.play()
                }
            }
        }
    }
    ```

  - Copy Code
    15:38 - [Playback controls (next, previous)](https://developer.apple.com/videos/play/wwdc2026/254/?time=938)


    ```
    let player = ApplicationMusicPlayer.shared

    var controls: some View {
        HStack {
            Button("Back", systemImage: "backward.fill") {
                Task {
                    try await player.skipToPreviousEntry()
                }
            }
            // ...
            Button("Next", systemImage: "forward.fill") {
                Task {
                    try await player.skipToNextEntry()
                }
            }
        }
    }
    ```

  - Copy Code
    18:58 - [Music catalog resource request](https://developer.apple.com/videos/play/wwdc2026/254/?time=1138)


    ```
    func fetchSongs(songIDs: [MusicItemID]) async throws -> (featured: Song?, other: [Song]) {
        var request = MusicCatalogResourceRequest‹Song>(matching: \.id, memberOf: songIDs)
        request.options = [.findEquivalents]

        let response = try await request.response()

        let featuredSongID = songIDs[0]
        let featuredSong = response.item(for: featuredSongID)

        let others: [Song] = songIDs[1...].compactMap { songID in
            return response.item(for: songID)
        }

        return (featuredSong, others)
    }
    ```


- - 0:00 - [Introduction](https://developer.apple.com/videos/play/wwdc2026/254/?time=0)
  - An introduction to MusicKit and an overview of how to build a music-enhanced workout app using Swift concurrency and SwiftUI.

  - 2:11 - [Project setup and authorization](https://developer.apple.com/videos/play/wwdc2026/254/?time=131)
  - Learn how to configure your Xcode project with the necessary capabilities, request music library authorization, and present Apple Music subscription offers to users.

  - 7:10 - [Music items and music picker](https://developer.apple.com/videos/play/wwdc2026/254/?time=430)
  - Explore the properties and relationships of MusicKit music items, and use the music picker view modifier to let users browse and select songs from the Apple Music catalog or their own library.

  - 10:54 - [Music players and playback](https://developer.apple.com/videos/play/wwdc2026/254/?time=654)
  - Dive into using SystemMusicPlayer and ApplicationMusicPlayer. Discover how to set up playback queues, observe playback state, and build UI controls for playback in SwiftUI.

  - 16:26 - [Catalog requests](https://developer.apple.com/videos/play/wwdc2026/254/?time=986)
  - Use structured catalog requests like MusicCatalogResourceRequest to fetch curated Apple Music content, and learn how to handle localization and content equivalency.

  - 20:11 - [Next steps](https://developer.apple.com/videos/play/wwdc2026/254/?time=1211)
  - A quick recap of MusicKit capabilities and pointers to related sessions for further learning.